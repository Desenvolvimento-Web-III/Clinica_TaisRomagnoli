import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}));

const mockVerifyIdToken = vi.fn();
const mockSetCustomUserClaims = vi.fn();
const mockGetUser = vi.fn();
const mockGetUserByEmail = vi.fn();

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
    setCustomUserClaims: mockSetCustomUserClaims,
    getUser: mockGetUser,
    getUserByEmail: mockGetUserByEmail,
  }),
}));

const mockDocSet = vi.fn().mockResolvedValue(undefined);
const mockDocGet = vi.fn().mockResolvedValue({ exists: true, data: () => ({}) });
const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      set: mockDocSet,
      get: mockDocGet,
    })),
  })),
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
}));

import {
  atribuirFuncaoAdministrativa,
  consultarCustomClaims,
  inicializarContaAdministradora,
} from '../src/index.js';

type HttpHandler = (req: unknown, res: unknown) => Promise<void> | void;

interface ResponseBody {
  error?: string;
  mensagem?: string;
  sucesso?: boolean;
  dados?: unknown;
  uid?: string;
  role?: string;
  admin?: boolean;
}

interface MockResponse {
  statusCode: number;
  body: ResponseBody | null;
  headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
  send: (data: unknown) => MockResponse;
  end: () => MockResponse;
  setHeader: (key: string, val: string) => MockResponse;
  getHeader: (key: string) => string | undefined;
  on: (event: string, cb: (...args: unknown[]) => void) => MockResponse;
  emit: (event: string, ...args: unknown[]) => void;
}

function createMockResponse(): MockResponse {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const res: MockResponse = {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(key: string, val: string) {
      this.headers[key.toLowerCase()] = val;
      return this;
    },
    getHeader(key: string) {
      return this.headers[key.toLowerCase()];
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      this.emit('finish');
      return this;
    },
    send(data: unknown) {
      this.body = data;
      this.emit('finish');
      return this;
    },
    end() {
      this.emit('finish');
      return this;
    },
    on(event: string, cb: (...args: unknown[]) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      if (listeners[event]) {
        for (const cb of listeners[event]) {
          cb(...args);
        }
      }
    },
  };
  return res;
}

describe('Endpoints HTTP de Custom Claims (Firebase Functions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSetCustomUserClaims.mockResolvedValue(undefined);
    mockGetUser.mockImplementation(async (uid: string) => ({
      uid,
      email: `${uid}@exemplo.com`,
      customClaims: {},
    }));
    mockGetUserByEmail.mockImplementation(async (email: string) => ({
      uid: `uid-${email.split('@')[0]}`,
      email,
      customClaims: {},
    }));
  });

  describe('POST /atribuirFuncaoAdministrativa', () => {
    it('retorna 405 se o método não for POST', async () => {
      const res = createMockResponse();
      await (atribuirFuncaoAdministrativa as unknown as HttpHandler)(
        { method: 'GET', headers: {} },
        res,
      );

      expect(res.statusCode).toBe(405);
      expect(res.body?.error).toContain('Método não permitido');
    });

    it('retorna 401 se a requisição não tiver header de autorização', async () => {
      const res = createMockResponse();
      await (atribuirFuncaoAdministrativa as unknown as HttpHandler)(
        { method: 'POST', headers: {} },
        res,
      );

      expect(res.statusCode).toBe(401);
      expect(res.body?.error).toContain('Acesso não autenticado');
    });

    it('retorna 403 se cliente comum tentar se autoatribuir função de admin', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-hacker',
        email: 'hacker@exemplo.com',
        role: 'cliente',
        admin: false,
      });

      const res = createMockResponse();
      await (atribuirFuncaoAdministrativa as unknown as HttpHandler)(
        {
          method: 'POST',
          headers: { authorization: 'Bearer token-cliente' },
          body: { targetUid: 'cliente-hacker', role: 'admin' },
        },
        res,
      );

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toBe('Autoatribuição de função administrativa não é permitida.');
      expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
    });

    it('retorna 403 se cliente comum tentar promover outro usuário', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-comum',
        email: 'cliente@exemplo.com',
        role: 'cliente',
        admin: false,
      });

      const res = createMockResponse();
      await (atribuirFuncaoAdministrativa as unknown as HttpHandler)(
        {
          method: 'POST',
          headers: { authorization: 'Bearer token-cliente' },
          body: { targetUid: 'outro-alvo', role: 'admin' },
        },
        res,
      );

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toContain('Apenas a administradora possui permissão');
      expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
    });

    it('retorna 200 e atribui Custom Claims quando a administradora autenticada solicita', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais',
        email: 'admin@clinicataisromagnoli.com.br',
        role: 'admin',
        admin: true,
      });

      const res = createMockResponse();
      await (atribuirFuncaoAdministrativa as unknown as HttpHandler)(
        {
          method: 'POST',
          headers: { authorization: 'Bearer token-admin' },
          body: { targetUid: 'cliente-promovido', role: 'admin' },
        },
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect(res.body?.dados?.admin).toBe(true);
      expect(mockSetCustomUserClaims).toHaveBeenCalledWith('cliente-promovido', {
        role: 'admin',
        admin: true,
      });
    });
  });

  describe('GET /consultarCustomClaims', () => {
    it('retorna 405 se o método não for GET', async () => {
      const res = createMockResponse();
      await (consultarCustomClaims as unknown as HttpHandler)({ method: 'POST', headers: {} }, res);

      expect(res.statusCode).toBe(405);
    });

    it('retorna 200 e as claims do usuário autenticado', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-1',
        email: 'cliente1@exemplo.com',
        role: 'cliente',
        admin: false,
      });
      mockGetUser.mockResolvedValueOnce({
        uid: 'cliente-1',
        customClaims: { role: 'cliente', admin: false },
      });

      const res = createMockResponse();
      await (consultarCustomClaims as unknown as HttpHandler)(
        {
          method: 'GET',
          headers: { authorization: 'Bearer token-valid' },
          query: {},
        },
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body?.dados).toEqual({ role: 'cliente', admin: false });
    });
  });

  describe('POST /inicializarContaAdministradora', () => {
    it('permite que a administradora inicialize a conta oficial via Firebase Admin SDK', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais-romagnoli',
        email: 'admin@clinicataisromagnoli.com.br',
        role: 'admin',
        admin: true,
      });

      const res = createMockResponse();
      await (inicializarContaAdministradora as unknown as HttpHandler)(
        {
          method: 'POST',
          headers: { authorization: 'Bearer token-admin' },
        },
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect(mockSetCustomUserClaims).toHaveBeenCalled();
    });

    it('rejeita chamada de inicialização se usuário for cliente comum', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'invasor',
        email: 'invasor@exemplo.com',
        role: 'cliente',
        admin: false,
      });

      const res = createMockResponse();
      await (inicializarContaAdministradora as unknown as HttpHandler)(
        {
          method: 'POST',
          headers: { authorization: 'Bearer token-invasor' },
        },
        res,
      );

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toContain('Acesso negado');
    });
  });
});
