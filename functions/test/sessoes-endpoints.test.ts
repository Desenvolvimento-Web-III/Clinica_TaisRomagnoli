import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}));

const mockVerifyIdToken = vi.fn();
const mockRevokeRefreshTokens = vi.fn();
const mockGetUser = vi.fn();

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
    revokeRefreshTokens: mockRevokeRefreshTokens,
    getUser: mockGetUser,
  }),
}));

const mockDocSet = vi.fn().mockResolvedValue(undefined);
const mockCollectionAdd = vi.fn().mockResolvedValue({ id: 'auditoria-123' });
const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      set: mockDocSet,
    })),
    add: mockCollectionAdd,
  })),
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
}));

import { revogarSessoes, iniciarSessaoUnica, consultarSessao } from '../src/index.js';

type HttpHandler = (req: unknown, res: unknown) => Promise<void> | void;

interface ResponseBody {
  error?: string;
  mensagem?: string;
  sucesso?: boolean;
  dados?: unknown;
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
      this.body = data as ResponseBody;
      this.emit('finish');
      return this;
    },
    send(data: unknown) {
      this.body = data as ResponseBody;
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
        listeners[event].forEach((cb) => cb(...args));
      }
    },
  };
  return res;
}

function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    headers: {},
    query: {},
    body: {},
    ...overrides,
  };
}

describe('Endpoints HTTP de Revogação de Sessão e Sessão Única', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('revogarSessoes endpoint', () => {
    it('retorna 405 se o método não for POST', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await (revogarSessoes as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.body?.error).toContain('Método não permitido');
    });

    it('retorna 401 se cabeçalho de autorização for ausente', async () => {
      const req = createMockRequest({ method: 'POST', headers: {} });
      const res = createMockResponse();

      await (revogarSessoes as HttpHandler)(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body?.error).toContain('Acesso não autenticado');
    });

    it('retorna 403 se cliente comum tentar revogar sessões de terceiros', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-1',
        role: 'client',
        client: true,
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-cliente' },
        body: { targetUid: 'outro-cliente' },
      });
      const res = createMockResponse();

      await (revogarSessoes as HttpHandler)(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toContain('Acesso negado');
    });

    it('executa com sucesso a revogação das próprias sessões (auto-revogação)', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-1',
        role: 'client',
        client: true,
      });
      mockGetUser.mockResolvedValueOnce({ uid: 'cliente-1' });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-cliente' },
        body: { motivo: 'Invalidação preventiva de outros aparelhos' },
      });
      const res = createMockResponse();

      await (revogarSessoes as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('cliente-1');
    });

    it('executa com sucesso quando administradora revoga sessões de terceiro', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-1',
        role: 'admin',
        admin: true,
      });
      mockGetUser.mockResolvedValueOnce({ uid: 'cliente-alvo' });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-admin' },
        body: { targetUid: 'cliente-alvo', motivo: 'Suspeita de invasão' },
      });
      const res = createMockResponse();

      await (revogarSessoes as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('cliente-alvo');
    });
  });

  describe('iniciarSessaoUnica endpoint', () => {
    it('retorna 405 se o método não for POST', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await (iniciarSessaoUnica as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
    });

    it('aplica política de sessão única invalidando tokens anteriores', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-1',
        role: 'client',
        client: true,
      });
      mockGetUser.mockResolvedValueOnce({ uid: 'cliente-1' });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-cliente' },
        body: { motivo: 'Novo acesso web' },
      });
      const res = createMockResponse();

      await (iniciarSessaoUnica as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect(res.body?.mensagem).toContain('sessão única');
      expect((res.body?.dados as { sessionId?: string })?.sessionId).toBeDefined();
      expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('cliente-1');
    });

    it('recebe sessionId customizado no body e persiste', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-1',
        role: 'client',
        client: true,
      });
      mockGetUser.mockResolvedValueOnce({ uid: 'cliente-1' });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-cliente' },
        body: { motivo: 'Novo acesso web', sessionId: 'sessao-device-b' },
      });
      const res = createMockResponse();

      await (iniciarSessaoUnica as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect((res.body?.dados as { sessionId?: string })?.sessionId).toBe('sessao-device-b');
      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          activeSessionId: 'sessao-device-b',
        }),
        { merge: true },
      );
    });
  });

  describe('consultarSessao endpoint', () => {
    it('retorna 405 se o método não for GET', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      await (consultarSessao as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
    });

    it('retorna 200 com os dados de sessão do usuário', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-1',
        role: 'client',
        client: true,
      });
      mockGetUser.mockResolvedValueOnce({
        uid: 'cliente-1',
        email: 'cliente@exemplo.com',
        tokensValidAfterTime: 'Thu, 07 Nov 2026 01:00:00 GMT',
        disabled: false,
      });

      const req = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer token-cliente' },
      });
      const res = createMockResponse();

      await (consultarSessao as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.dados).toEqual(
        expect.objectContaining({
          uid: 'cliente-1',
          tokensValidAfterTime: 'Thu, 07 Nov 2026 01:00:00 GMT',
          disabled: false,
        }),
      );
    });
  });
});
