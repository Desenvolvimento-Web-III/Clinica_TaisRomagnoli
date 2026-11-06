import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  atribuirFuncaoAdminInputSchema,
  DEFAULT_INITIAL_ADMIN,
  type AtribuirFuncaoAdminInput,
} from '@clinica/shared';
import type { UserContext } from '../agendamentos/agendamentos-service.js';

export class CustomClaimsBusinessError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'CustomClaimsBusinessError';
  }
}

export type ClaimsAuthAdapter = Pick<Auth, 'getUser' | 'getUserByEmail' | 'setCustomUserClaims'>;
export type ClaimsFirestoreAdapter = Pick<Firestore, 'collection'>;

export interface AtribuirClaimsResult {
  uid: string;
  email?: string;
  role: 'admin' | 'client' | 'cliente';
  admin: boolean;
  client?: boolean;
  mensagem: string;
}

/**
 * Atribui a função administrativa a um usuário através de Custom Claims no Firebase Admin SDK.
 *
 * Regra de Segurança Rigorosa:
 * - Não permite autoatribuição por clientes comuns (HTTP 403).
 * - Apenas usuários autenticados com privilégio administrativo (ou bootstrap autorizado) podem atribuir a função.
 */
export async function atribuirFuncaoAdministrativa(
  input: unknown,
  caller: UserContext | null | undefined,
  auth: ClaimsAuthAdapter,
  firestore?: ClaimsFirestoreAdapter,
): Promise<AtribuirClaimsResult> {
  // 1. Verificação de autenticação
  if (!caller || !caller.uid) {
    throw new CustomClaimsBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  const parsed: AtribuirFuncaoAdminInput = atribuirFuncaoAdminInputSchema.parse(input);

  // 2. Proteção contra Autoatribuição e Elevação de Privilégios
  if (!caller.isAdmin) {
    const isSelfAssignment =
      (parsed.targetUid && parsed.targetUid === caller.uid) ||
      (parsed.email && caller.email && parsed.email.toLowerCase() === caller.email.toLowerCase());

    if (parsed.role === 'admin') {
      if (isSelfAssignment) {
        throw new CustomClaimsBusinessError(
          'Autoatribuição de função administrativa não é permitida.',
          403,
        );
      }

      throw new CustomClaimsBusinessError(
        'Acesso negado. Apenas a administradora possui permissão para atribuir funções administrativas.',
        403,
      );
    }

    if (!isSelfAssignment) {
      throw new CustomClaimsBusinessError(
        'Acesso negado. Apenas a administradora possui permissão para gerenciar funções de outros usuários.',
        403,
      );
    }
  }

  // 3. Localização do usuário alvo no Firebase Authentication
  let targetUid = parsed.targetUid;
  let targetEmail = parsed.email;

  try {
    if (targetUid) {
      const userRecord = await auth.getUser(targetUid);
      targetEmail = userRecord.email;
    } else if (targetEmail) {
      const userRecord = await auth.getUserByEmail(targetEmail);
      targetUid = userRecord.uid;
    }
  } catch (error: unknown) {
    const errObj = error as { code?: string; message?: string };
    if (errObj.code === 'auth/user-not-found') {
      throw new CustomClaimsBusinessError(
        `Usuário não encontrado no Firebase Authentication: ${targetUid || targetEmail}`,
        404,
      );
    }
    throw error;
  }

  if (!targetUid) {
    throw new CustomClaimsBusinessError('Não foi possível identificar o UID do usuário alvo.', 400);
  }

  const isAdminRole = parsed.role === 'admin';
  const customClaims: Record<string, unknown> = {
    role: parsed.role,
    admin: isAdminRole,
  };
  if (parsed.role === 'client') {
    customClaims['client'] = true;
  }

  // 4. Definição segura das Custom Claims via Firebase Admin SDK
  await auth.setCustomUserClaims(targetUid, customClaims);

  // 5. Sincronização de persistência no Firestore (se fornecido)
  if (firestore) {
    const agoraIso = new Date().toISOString();

    // Sincroniza documento em /usuarios/{targetUid}
    const userDocRef = firestore.collection('usuarios').doc(targetUid);
    await userDocRef.set(
      {
        uid: targetUid,
        email: targetEmail || '',
        role: parsed.role,
        status: 'ativo',
        updatedAt: agoraIso,
      },
      { merge: true },
    );

    // Se houver cadastro de cliente em /clientes/{targetUid}, sincroniza papel administrativo
    const clienteDocRef = firestore.collection('clientes').doc(targetUid);
    const clienteSnap = await clienteDocRef.get();
    if (clienteSnap.exists) {
      await clienteDocRef.set(
        {
          role: parsed.role,
          updatedAt: agoraIso,
        },
        { merge: true },
      );
    }
  }

  return {
    uid: targetUid,
    email: targetEmail,
    role: parsed.role,
    admin: isAdminRole,
    mensagem: isAdminRole
      ? 'Função administrativa atribuída com sucesso via Custom Claims.'
      : 'Função administrativa revogada com sucesso.',
  };
}

/**
 * Utilitário de backend para inicializar/definir as Custom Claims da administradora oficial da clínica
 * (Tais Romagnoli, admin@clinicataisromagnoli.com.br) usando o Firebase Admin SDK.
 */
export async function definirAdministradoraInicial(
  auth: ClaimsAuthAdapter,
  firestore?: ClaimsFirestoreAdapter,
  adminEmail = DEFAULT_INITIAL_ADMIN.email,
): Promise<AtribuirClaimsResult> {
  let adminUid = DEFAULT_INITIAL_ADMIN.uid;

  try {
    const userRecord = await auth.getUserByEmail(adminEmail);
    adminUid = userRecord.uid;
  } catch {
    // Caso o usuário ainda não exista no Auth (ex: ambiente limpo de testes ou emulador),
    // tenta buscar pelo UID padrão
    try {
      const userRecord = await auth.getUser(adminUid);
      adminUid = userRecord.uid;
    } catch {
      // Usuário não encontrado no Auth; mantém o UID padrão para configuração de seed
    }
  }

  const customClaims = {
    role: 'admin',
    admin: true,
  };

  await auth.setCustomUserClaims(adminUid, customClaims);

  if (firestore) {
    const agoraIso = new Date().toISOString();
    await firestore.collection('usuarios').doc(adminUid).set(
      {
        uid: adminUid,
        nome: DEFAULT_INITIAL_ADMIN.nome,
        email: adminEmail,
        telefone: DEFAULT_INITIAL_ADMIN.telefone,
        role: 'admin',
        status: 'ativo',
        updatedAt: agoraIso,
      },
      { merge: true },
    );
  }

  return {
    uid: adminUid,
    email: adminEmail,
    role: 'admin',
    admin: true,
    mensagem: 'Conta da administradora configurada com sucesso pelo Firebase Admin SDK.',
  };
}

/**
 * Consulta as Custom Claims ativas de um usuário pelo Firebase Admin SDK.
 */
export async function consultarClaimsUsuario(
  targetUid: string,
  caller: UserContext | null | undefined,
  auth: Pick<Auth, 'getUser'>,
): Promise<Record<string, unknown>> {
  if (!caller || !caller.uid) {
    throw new CustomClaimsBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  if (!caller.isAdmin && caller.uid !== targetUid) {
    throw new CustomClaimsBusinessError(
      'Acesso negado. Apenas a administradora pode consultar claims de outros usuários.',
      403,
    );
  }

  const userRecord = await auth.getUser(targetUid);
  return userRecord.customClaims || {};
}

/**
 * Aplica as Custom Claims de cliente no Firebase Auth (role: 'cliente', admin: false, client: true).
 */
export async function definirClaimsCliente(
  targetUid: string,
  auth: Pick<Auth, 'setCustomUserClaims'>,
  role: 'client' | 'cliente' = 'cliente',
): Promise<AtribuirClaimsResult> {
  const customClaims = {
    role,
    admin: false,
    client: true,
  };
  await auth.setCustomUserClaims(targetUid, customClaims);

  return {
    uid: targetUid,
    role,
    admin: false,
    client: true,
    mensagem: 'Claims de cliente aplicadas com sucesso pelo Firebase Admin SDK.',
  };
}

/**
 * Aplica claims de função (admin ou client/cliente) diretamente pelo Firebase Admin SDK.
 * Diferencia administradora e cliente sem confiar em dados enviados pelo frontend.
 */
export async function aplicarClaimsPerfil(
  targetUid: string,
  role: 'admin' | 'client' | 'cliente',
  auth: ClaimsAuthAdapter,
  firestore?: ClaimsFirestoreAdapter,
): Promise<AtribuirClaimsResult> {
  const isAdmin = role === 'admin';
  const customClaims = {
    role,
    admin: isAdmin,
    client: !isAdmin,
  };

  await auth.setCustomUserClaims(targetUid, customClaims);

  if (firestore) {
    const agoraIso = new Date().toISOString();
    await firestore.collection('usuarios').doc(targetUid).set(
      {
        uid: targetUid,
        role,
        status: 'ativo',
        updatedAt: agoraIso,
      },
      { merge: true },
    );
  }

  return {
    uid: targetUid,
    role,
    admin: isAdmin,
    client: !isAdmin,
    mensagem: `Função ${role} atribuída com sucesso via Custom Claims no Firebase Admin SDK.`,
  };
}
