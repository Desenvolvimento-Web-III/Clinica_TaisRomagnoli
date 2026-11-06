import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import {
  AuthError,
  extrairBearerToken,
  validarIdToken,
  extrairUsuarioAutenticado,
  extrairUsuarioOpcional,
  exigirAdministrador,
  autenticarMiddleware,
  comAutenticacao,
  type AuthTokenVerifier,
  type AuthenticatedRequest,
} from '../src/middlewares/auth-middleware.js';

describe('Auth Middleware reutilizável de autenticação', () => {
  let mockVerifier: AuthTokenVerifier;
  let mockVerifyIdToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockVerifyIdToken = vi.fn();
    mockVerifier = {
      verifyIdToken: mockVerifyIdToken,
    };
  });

  describe('extrairBearerToken', () => {
    it('extrai o token corretamente com prefixo Bearer', () => {
      const token = extrairBearerToken('Bearer meu-token-jwt-123');
      expect(token).toBe('meu-token-jwt-123');
    });

    it('extrai o token com prefixo case-insensitive (bearer)', () => {
      const token = extrairBearerToken('bearer token-minusculo');
      expect(token).toBe('token-minusculo');
    });

    it('remove espaços em branco excedentes ao redor do token', () => {
      const token = extrairBearerToken('Bearer    token-com-espacos   ');
      expect(token).toBe('token-com-espacos');
    });

    it('extrai o token quando o header é fornecido como array de strings', () => {
      const token = extrairBearerToken(['Bearer token-em-array']);
      expect(token).toBe('token-em-array');
    });

    it('lança erro 401 se o cabeçalho for indefinido ou nulo', () => {
      expect(() => extrairBearerToken(undefined)).toThrowError(AuthError);
      expect(() => extrairBearerToken(undefined)).toThrow('Acesso não autenticado');
    });

    it('lança erro 401 se o cabeçalho não iniciar com Bearer', () => {
      expect(() => extrairBearerToken('Basic dXNlcjpwYXNz')).toThrowError(AuthError);
      expect(() => extrairBearerToken('Basic dXNlcjpwYXNz')).toThrow('Forneça o token Bearer');
    });

    it('lança erro 401 se o cabeçalho contiver apenas "Bearer" sem o token', () => {
      expect(() => extrairBearerToken('Bearer ')).toThrowError(AuthError);
      expect(() => extrairBearerToken('Bearer   ')).toThrow('Token de autenticação ausente');
    });
  });

  describe('validarIdToken', () => {
    it('decodifica com sucesso token com claim admin booleana', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-admin-1',
        name: 'Tais Romagnoli',
        email: 'admin@clinicataisromagnoli.com.br',
        phone_number: '+5511999998888',
        admin: true,
      });

      const user = await validarIdToken('token-valido', mockVerifier);
      expect(user).toEqual({
        uid: 'user-admin-1',
        nome: 'Tais Romagnoli',
        email: 'admin@clinicataisromagnoli.com.br',
        telefone: '+5511999998888',
        isAdmin: true,
      });
      expect(mockVerifyIdToken).toHaveBeenCalledWith('token-valido');
    });

    it('decodifica com sucesso token com claim role="admin"', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-admin-2',
        email: 'gestora@clinica.com.br',
        role: 'admin',
      });

      const user = await validarIdToken('token-valido', mockVerifier);
      expect(user.isAdmin).toBe(true);
      expect(user.nome).toBe('gestora@clinica.com.br');
      expect(user.telefone).toBeUndefined();
    });

    it('define fallback do nome para "Cliente" se name e email estiverem ausentes', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-anonimo',
        role: 'cliente',
      });

      const user = await validarIdToken('token-valido', mockVerifier);
      expect(user.nome).toBe('Cliente');
      expect(user.isAdmin).toBe(false);
    });

    it('converte erro auth/id-token-expired para AuthError 401 amigável', async () => {
      mockVerifyIdToken.mockRejectedValueOnce({ code: 'auth/id-token-expired' });

      await expect(validarIdToken('token-expirado', mockVerifier)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Token de autenticação expirado. Faça login novamente.',
      });
    });

    it('converte erro auth/id-token-revoked para AuthError 401 amigável', async () => {
      mockVerifyIdToken.mockRejectedValueOnce({ code: 'auth/id-token-revoked' });

      await expect(validarIdToken('token-revogado', mockVerifier)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Token de autenticação revogado. Faça login novamente.',
      });
    });

    it('converte erro auth/invalid-id-token para AuthError 401 amigável', async () => {
      mockVerifyIdToken.mockRejectedValueOnce({ code: 'auth/invalid-id-token' });

      await expect(validarIdToken('token-invalido', mockVerifier)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Token de autenticação inválido.',
      });
    });

    it('converte erro auth/argument-error para AuthError 401 amigável', async () => {
      mockVerifyIdToken.mockRejectedValueOnce({ code: 'auth/argument-error' });

      await expect(validarIdToken('token-formato-errado', mockVerifier)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Token de autenticação inválido.',
      });
    });

    it('converte outro erro qualquer na verificação para AuthError 401', async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Falha de rede'));

      await expect(validarIdToken('token-falha', mockVerifier)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Falha na validação do token de autenticação.',
      });
    });
  });

  describe('extrairUsuarioAutenticado', () => {
    it('funciona recebendo a string direta do cabeçalho', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-string',
        email: 'user@exemplo.com',
      });

      const user = await extrairUsuarioAutenticado('Bearer token-str', mockVerifier);
      expect(user.uid).toBe('user-string');
    });

    it('funciona recebendo um objeto de requisição com authorization minúsculo', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-req-lower',
        email: 'user@exemplo.com',
      });

      const user = await extrairUsuarioAutenticado(
        { headers: { authorization: 'Bearer token-req-lower' } },
        mockVerifier,
      );
      expect(user.uid).toBe('user-req-lower');
    });

    it('funciona recebendo um objeto de requisição com Authorization maiúsculo', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-req-upper',
        email: 'user@exemplo.com',
      });

      const user = await extrairUsuarioAutenticado(
        { headers: { Authorization: 'Bearer token-req-upper' } },
        mockVerifier,
      );
      expect(user.uid).toBe('user-req-upper');
    });
  });

  describe('extrairUsuarioOpcional', () => {
    it('retorna UserContext se o token for válido', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-opcional',
        email: 'opcional@exemplo.com',
      });

      const user = await extrairUsuarioOpcional('Bearer token-opcional', mockVerifier);
      expect(user).not.toBeNull();
      expect(user?.uid).toBe('user-opcional');
    });

    it('retorna null se o cabeçalho for ausente', async () => {
      const user = await extrairUsuarioOpcional(undefined, mockVerifier);
      expect(user).toBeNull();
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('retorna null se o cabeçalho não contiver prefixo Bearer', async () => {
      const user = await extrairUsuarioOpcional('Basic 123', mockVerifier);
      expect(user).toBeNull();
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('retorna null se a verificação do token falhar', async () => {
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Token expirado'));

      const user = await extrairUsuarioOpcional('Bearer token-expirado', mockVerifier);
      expect(user).toBeNull();
    });
  });

  describe('exigirAdministrador', () => {
    it('não lança erro para usuário com isAdmin: true', () => {
      expect(() =>
        exigirAdministrador({
          uid: 'admin-1',
          nome: 'Admin',
          isAdmin: true,
        }),
      ).not.toThrow();
    });

    it('lança AuthError 401 se usuário for nulo ou indefinido', () => {
      expect(() => exigirAdministrador(null)).toThrowError(AuthError);
      expect(() => exigirAdministrador(null)).toThrow('Acesso não autenticado');
    });

    it('lança AuthError 403 se usuário não for administradora', () => {
      expect(() =>
        exigirAdministrador({
          uid: 'cliente-1',
          nome: 'Mariana',
          isAdmin: false,
        }),
      ).toThrowError(AuthError);

      try {
        exigirAdministrador({
          uid: 'cliente-1',
          nome: 'Mariana',
          isAdmin: false,
        });
      } catch (err) {
        expect((err as AuthError).statusCode).toBe(403);
        expect((err as AuthError).message).toContain('Apenas a administradora possui permissão');
      }
    });
  });

  describe('autenticarMiddleware', () => {
    function createMockRes() {
      const res: {
        statusCode: number;
        data?: unknown;
        status: (code: number) => typeof res;
        json: (data: unknown) => typeof res;
      } = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(data: unknown) {
          this.data = data;
          return this;
        },
      };
      return res as unknown as Response & { statusCode: number; data?: unknown };
    }

    it('anexa req.user e chama next() quando o token é válido', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-mid-1',
        email: 'mid@exemplo.com',
        admin: false,
      });

      const middleware = autenticarMiddleware(
        { obrigatorio: true, apenasAdmin: false },
        mockVerifier,
      );
      const req = {
        headers: { authorization: 'Bearer token-mid' },
      } as unknown as AuthenticatedRequest;
      const res = createMockRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(
        expect.objectContaining({
          uid: 'user-mid-1',
          email: 'mid@exemplo.com',
          isAdmin: false,
        }),
      );
      expect(res.statusCode).toBe(200);
    });

    it('retorna 401 e não chama next() quando o token for ausente', async () => {
      const middleware = autenticarMiddleware({ obrigatorio: true }, mockVerifier);
      const req = { headers: {} } as unknown as Request;
      const res = createMockRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ error: 'Acesso não autenticado. Forneça o token Bearer.' });
    });

    it('retorna 403 e não chama next() quando apenasAdmin: true e usuário não é admin', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-cliente',
        email: 'cliente@exemplo.com',
        admin: false,
      });

      const middleware = autenticarMiddleware(
        { obrigatorio: true, apenasAdmin: true },
        mockVerifier,
      );
      const req = {
        headers: { authorization: 'Bearer token-cliente' },
      } as unknown as Request;
      const res = createMockRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.data).toEqual({
        error:
          'Acesso negado. Apenas a administradora possui permissão para realizar esta operação.',
      });
    });

    it('permite acesso opcional (obrigatorio: false) com token ausente definindo req.user = null', async () => {
      const middleware = autenticarMiddleware({ obrigatorio: false }, mockVerifier);
      const req = { headers: {} } as unknown as Request & { user?: unknown };
      const res = createMockRes();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
      expect(res.statusCode).toBe(200);
    });
  });

  describe('comAutenticacao', () => {
    function createMockRes() {
      const res: {
        statusCode: number;
        data?: unknown;
        status: (code: number) => typeof res;
        json: (data: unknown) => typeof res;
      } = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(data: unknown) {
          this.data = data;
          return this;
        },
      };
      return res as unknown as Response & { statusCode: number; data?: unknown };
    }

    it('executa o handler com o usuário autenticado', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-handler',
        email: 'handler@exemplo.com',
        admin: true,
      });

      const handler = vi.fn();
      const wrapped = comAutenticacao(handler, {}, mockVerifier);

      const req = {
        headers: { authorization: 'Bearer token-ok' },
      } as unknown as Request;
      const res = createMockRes();

      await wrapped(req, res);

      expect(handler).toHaveBeenCalledWith(
        req,
        res,
        expect.objectContaining({
          uid: 'user-handler',
          isAdmin: true,
        }),
      );
    });

    it('captura AuthError e responde com status e mensagem adequados', async () => {
      const handler = vi.fn();
      const wrapped = comAutenticacao(handler, {}, mockVerifier);

      const req = { headers: {} } as unknown as Request;
      const res = createMockRes();

      await wrapped(req, res);

      expect(handler).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ error: 'Acesso não autenticado. Forneça o token Bearer.' });
    });
  });
});
