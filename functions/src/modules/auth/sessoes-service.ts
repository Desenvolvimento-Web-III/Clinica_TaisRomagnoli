import { randomUUID } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  revogarSessoesInputSchema,
  type RevogarSessoesInput,
  type ResultadoRevogacaoSessao,
} from '@clinica/shared';
import type { UserContext } from '../../middlewares/auth-middleware.js';

export class SessaoBusinessError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'SessaoBusinessError';
  }
}

export type SessoesAuthAdapter = Pick<Auth, 'revokeRefreshTokens' | 'getUser'>;
export type SessoesFirestoreAdapter = Pick<Firestore, 'collection'>;

export interface StatusSessaoResult {
  uid: string;
  email?: string;
  tokensValidAfterTime?: string;
  disabled: boolean;
  activeSessionId?: string;
}

/**
 * Revoga todos os refresh tokens de um usuário no Firebase Authentication,
 * invalidando sessões ativas anteriores (para política de sessão única, invalidação
 * de acessos antigos ou encerramento administrativo de sessão).
 */
export async function revogarSessoesUsuario(
  input: unknown,
  caller: UserContext | null | undefined,
  auth: SessoesAuthAdapter,
  firestore?: SessoesFirestoreAdapter,
): Promise<ResultadoRevogacaoSessao> {
  // 1. Verificação de autenticação do requisitante
  if (!caller || !caller.uid) {
    throw new SessaoBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  const parsed: RevogarSessoesInput = revogarSessoesInputSchema.parse(input || {});
  const targetUid = parsed.targetUid || caller.uid;

  // 2. Verificação de autorização:
  // Usuário comum pode revogar apenas suas próprias sessões.
  // Apenas administradora pode revogar sessões de terceiros.
  if (targetUid !== caller.uid && !caller.isAdmin) {
    throw new SessaoBusinessError(
      'Acesso negado. Apenas a administradora possui permissão para revogar sessões de outros usuários.',
      403,
    );
  }

  // 3. Validação da existência do usuário no Firebase Authentication
  try {
    await auth.getUser(targetUid);
  } catch (error: unknown) {
    const errObj = error as { code?: string };
    if (errObj.code === 'auth/user-not-found') {
      throw new SessaoBusinessError(
        `Usuário não encontrado no Firebase Authentication: ${targetUid}`,
        404,
      );
    }
    throw error;
  }

  // 4. Revogação de refresh tokens via Firebase Admin SDK
  await auth.revokeRefreshTokens(targetUid);
  const agoraIso = new Date().toISOString();
  const sessionId = parsed.politicaSessaoUnica
    ? parsed.sessionId || randomUUID()
    : parsed.sessionId;

  // 5. Registro de auditoria e persistência de sessão única no Firestore (se fornecido)
  if (firestore) {
    try {
      const userDocRef = firestore.collection('usuarios').doc(targetUid);
      const userUpdatePayload: Record<string, unknown> = {
        ultimaRevogacaoSessoesEm: agoraIso,
        motivoUltimaRevogacao:
          parsed.motivo ||
          (parsed.politicaSessaoUnica ? 'Sessão única iniciada' : 'Revogação manual'),
        revogadoPor: caller.uid,
        updatedAt: agoraIso,
      };

      if (sessionId) {
        userUpdatePayload.activeSessionId = sessionId;
        userUpdatePayload.activeSessionCreatedAt = agoraIso;
      }

      await userDocRef.set(userUpdatePayload, { merge: true });

      // Atualiza também no perfil do cliente se a coleção existir
      if (sessionId) {
        try {
          const clienteDocRef = firestore.collection('clientes').doc(targetUid);
          await clienteDocRef.set(
            {
              activeSessionId: sessionId,
              activeSessionCreatedAt: agoraIso,
              updatedAt: agoraIso,
            },
            { merge: true },
          );
        } catch {
          // Ignora silenciosamente se o documento do cliente não estiver presente
        }
      }

      await firestore.collection('auditoria_sessoes').add({
        targetUid,
        revogadoPor: caller.uid,
        motivo:
          parsed.motivo ||
          (parsed.politicaSessaoUnica
            ? 'Início de nova sessão sob política de sessão única'
            : 'Invalidação de acessos antigos'),
        politicaSessaoUnica: Boolean(parsed.politicaSessaoUnica),
        sessionId: sessionId ?? null,
        dataHora: agoraIso,
      });
    } catch (auditError) {
      console.warn(
        'Falha não-bloqueante no registro de auditoria de revogação de sessão:',
        auditError,
      );
    }
  }

  const mensagem = parsed.politicaSessaoUnica
    ? 'Política de sessão única aplicada com sucesso. Sessões anteriores foram invalidadas.'
    : 'Sessões anteriores e refresh tokens foram revogados com sucesso.';

  return {
    uid: targetUid,
    sessionId: parsed.politicaSessaoUnica ? sessionId : parsed.sessionId,
    revogadoEm: agoraIso,
    mensagem,
    motivo: parsed.motivo,
    politicaSessaoUnica: parsed.politicaSessaoUnica,
  };
}

/**
 * Aplica a política de sessão única para a conta do usuário que está chamando a Function.
 * Ao iniciar uma nova sessão, invalida todos os acessos e refresh tokens anteriores.
 */
export async function aplicarPoliticaSessaoUnica(
  caller: UserContext | null | undefined,
  auth: SessoesAuthAdapter,
  firestore?: SessoesFirestoreAdapter,
  motivo?: string,
  sessionId?: string,
): Promise<ResultadoRevogacaoSessao> {
  return await revogarSessoesUsuario(
    {
      targetUid: caller?.uid,
      politicaSessaoUnica: true,
      motivo: motivo || 'Início de nova sessão sob política de sessão única',
      sessionId,
    },
    caller,
    auth,
    firestore,
  );
}

/**
 * Consulta metadados de sessão de um usuário (tokensValidAfterTime e activeSessionId).
 */
export async function consultarStatusSessao(
  targetUid: string,
  caller: UserContext | null | undefined,
  auth: SessoesAuthAdapter,
  firestore?: SessoesFirestoreAdapter,
): Promise<StatusSessaoResult> {
  if (!caller || !caller.uid) {
    throw new SessaoBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  if (targetUid !== caller.uid && !caller.isAdmin) {
    throw new SessaoBusinessError(
      'Acesso negado. Apenas a administradora possui permissão para consultar status de sessões de terceiros.',
      403,
    );
  }

  try {
    const user = await auth.getUser(targetUid);
    let activeSessionId: string | undefined;

    if (firestore) {
      try {
        const userDocRef = firestore.collection('usuarios').doc(targetUid);
        if ('get' in userDocRef && typeof (userDocRef as { get: unknown }).get === 'function') {
          const snap = await (
            userDocRef as {
              get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> }>;
            }
          ).get();
          if (snap?.exists) {
            activeSessionId = snap.data()?.activeSessionId as string | undefined;
          }
        }
      } catch {
        // Ignora silenciosamente indisponibilidade do documento do Firestore
      }
    }

    return {
      uid: user.uid,
      email: user.email,
      tokensValidAfterTime: user.tokensValidAfterTime,
      disabled: Boolean(user.disabled),
      activeSessionId,
    };
  } catch (error: unknown) {
    const errObj = error as { code?: string };
    if (errObj.code === 'auth/user-not-found') {
      throw new SessaoBusinessError(
        `Usuário não encontrado no Firebase Authentication: ${targetUid}`,
        404,
      );
    }
    throw error;
  }
}
