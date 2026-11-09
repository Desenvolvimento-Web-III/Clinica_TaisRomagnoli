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

  // 5. Registro de auditoria no Firestore (se fornecido)
  if (firestore) {
    try {
      const userDocRef = firestore.collection('usuarios').doc(targetUid);
      await userDocRef.set(
        {
          ultimaRevogacaoSessoesEm: agoraIso,
          motivoUltimaRevogacao:
            parsed.motivo ||
            (parsed.politicaSessaoUnica ? 'Sessão única iniciada' : 'Revogação manual'),
          revogadoPor: caller.uid,
          updatedAt: agoraIso,
        },
        { merge: true },
      );

      await firestore.collection('auditoria_sessoes').add({
        targetUid,
        revogadoPor: caller.uid,
        motivo:
          parsed.motivo ||
          (parsed.politicaSessaoUnica
            ? 'Início de nova sessão sob política de sessão única'
            : 'Invalidação de acessos antigos'),
        politicaSessaoUnica: Boolean(parsed.politicaSessaoUnica),
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
): Promise<ResultadoRevogacaoSessao> {
  return await revogarSessoesUsuario(
    {
      targetUid: caller?.uid,
      politicaSessaoUnica: true,
      motivo: motivo || 'Início de nova sessão única',
    },
    caller,
    auth,
    firestore,
  );
}

/**
 * Consulta metadados de sessão de um usuário (tokensValidAfterTime).
 */
export async function consultarStatusSessao(
  targetUid: string,
  caller: UserContext | null | undefined,
  auth: SessoesAuthAdapter,
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
    return {
      uid: user.uid,
      email: user.email,
      tokensValidAfterTime: user.tokensValidAfterTime,
      disabled: Boolean(user.disabled),
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
