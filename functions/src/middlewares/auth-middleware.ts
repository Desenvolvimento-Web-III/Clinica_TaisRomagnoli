import { getAuth, type Auth, type DecodedIdToken } from 'firebase-admin/auth';
import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';

export interface UserContext {
  uid: string;
  nome: string;
  email?: string;
  telefone?: string;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: UserContext;
}

export interface OptionalAuthenticatedRequest extends Request {
  user?: UserContext | null;
}

export type AuthTokenVerifier = Pick<Auth, 'verifyIdToken'>;

export interface RequestWithHeaders {
  headers?: Record<string, string | string[] | undefined>;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode = 401,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Extrai o token Bearer do cabeçalho de autorização.
 * Suporta formatos padrão 'Bearer <token>'.
 */
export function extrairBearerToken(authorizationHeader?: string | string[]): string {
  const headerValue = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;

  if (!headerValue || typeof headerValue !== 'string') {
    throw new AuthError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  const trimmed = headerValue.trim();
  const bearerRegex = /^bearer(\s+|$)/i;

  if (!bearerRegex.test(trimmed)) {
    throw new AuthError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  const token = trimmed.replace(/^bearer\s*/i, '').trim();
  if (!token) {
    throw new AuthError('Token de autenticação ausente.', 401);
  }

  return token;
}

/**
 * Valida o ID Token do Firebase Authentication e monta o contexto do usuário.
 */
export async function validarIdToken(
  idToken: string,
  authVerifier: AuthTokenVerifier = getAuth(),
): Promise<UserContext> {
  let decoded: DecodedIdToken;

  try {
    decoded = await authVerifier.verifyIdToken(idToken);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/id-token-expired') {
      throw new AuthError('Token de autenticação expirado. Faça login novamente.', 401);
    }
    if (err.code === 'auth/id-token-revoked') {
      throw new AuthError('Token de autenticação revogado. Faça login novamente.', 401);
    }
    if (err.code === 'auth/argument-error' || err.code === 'auth/invalid-id-token') {
      throw new AuthError('Token de autenticação inválido.', 401);
    }
    throw new AuthError('Falha na validação do token de autenticação.', 401);
  }

  const isAdmin = decoded['admin'] === true || decoded['role'] === 'admin';

  return {
    uid: decoded.uid,
    nome: (decoded['name'] as string) || (decoded['email'] as string) || 'Cliente',
    email: decoded.email,
    telefone: (decoded['phone_number'] as string) || undefined,
    isAdmin,
  };
}

/**
 * Helper que extrai o cabeçalho Authorization seja de uma string direta ou de um objeto Request.
 */
function obterHeaderAuthorization(
  authorizationOrReq?: string | RequestWithHeaders,
): string | undefined {
  if (typeof authorizationOrReq === 'string') {
    return authorizationOrReq;
  }
  if (authorizationOrReq && typeof authorizationOrReq === 'object' && authorizationOrReq.headers) {
    const headers = authorizationOrReq.headers;
    const header = headers['authorization'] || headers['Authorization'];
    return Array.isArray(header) ? header[0] : header;
  }
  return undefined;
}

/**
 * Centraliza a leitura e validação do ID token para Functions autenticadas.
 * Aceita o valor do cabeçalho 'Authorization' ou o próprio objeto Request.
 */
export async function extrairUsuarioAutenticado(
  authorizationOrReq?: string | RequestWithHeaders,
  authVerifier: AuthTokenVerifier = getAuth(),
): Promise<UserContext> {
  const header = obterHeaderAuthorization(authorizationOrReq);
  const token = extrairBearerToken(header);
  return await validarIdToken(token, authVerifier);
}

/**
 * Extrai o usuário de forma opcional (para rotas públicas com recursos extras para autenticados).
 * Retorna null silenciosamente se o token estiver ausente ou for inválido.
 */
export async function extrairUsuarioOpcional(
  authorizationOrReq?: string | RequestWithHeaders,
  authVerifier: AuthTokenVerifier = getAuth(),
): Promise<UserContext | null> {
  try {
    const header = obterHeaderAuthorization(authorizationOrReq);
    if (!header || !/^bearer\s+/i.test(header.trim())) {
      return null;
    }
    const token = extrairBearerToken(header);
    return await validarIdToken(token, authVerifier);
  } catch {
    return null;
  }
}

/**
 * Garante que o usuário autenticado possua a função de administradora da clínica.
 */
export function exigirAdministrador(
  user: UserContext | null | undefined,
  mensagemPersonalizada?: string,
): asserts user is UserContext {
  if (!user || !user.uid) {
    throw new AuthError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }
  if (!user.isAdmin) {
    throw new AuthError(
      mensagemPersonalizada ||
        'Acesso negado. Apenas a administradora possui permissão para realizar esta operação.',
      403,
    );
  }
}

export interface MiddlewareAuthOptions {
  obrigatorio?: boolean;
  apenasAdmin?: boolean;
}

/**
 * Middleware compatível com Express / Firebase onRequest.
 * Insere `req.user` na requisição em caso de sucesso ou responde com HTTP 401/403 em caso de falha.
 */
export function autenticarMiddleware(
  options: MiddlewareAuthOptions = { obrigatorio: true, apenasAdmin: false },
  authVerifier: AuthTokenVerifier = getAuth(),
) {
  const obrigatorio = options.obrigatorio ?? true;
  const apenasAdmin = options.apenasAdmin ?? false;

  return async (req: Request, res: Response, next: () => void | Promise<void>): Promise<void> => {
    try {
      if (!obrigatorio) {
        const user = await extrairUsuarioOpcional(req, authVerifier);
        (req as OptionalAuthenticatedRequest).user = user;
        await next();
        return;
      }

      const user = await extrairUsuarioAutenticado(req, authVerifier);
      if (apenasAdmin) {
        exigirAdministrador(user);
      }

      (req as AuthenticatedRequest).user = user;
      await next();
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Erro interno ao autenticar requisição.' });
    }
  };
}

/**
 * Higher-order function para criar endpoints onRequest com autenticação embutida.
 */
export function comAutenticacao(
  handler: (req: Request, res: Response, user: UserContext) => Promise<void> | void,
  options: { apenasAdmin?: boolean } = {},
  authVerifier: AuthTokenVerifier = getAuth(),
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await extrairUsuarioAutenticado(req, authVerifier);
      if (options.apenasAdmin) {
        exigirAdministrador(user);
      }
      await handler(req, res, user);
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      throw error;
    }
  };
}
