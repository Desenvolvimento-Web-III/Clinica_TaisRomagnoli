import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}));

const mockVerifyIdToken = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
}));

const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: vi.fn().mockResolvedValue(undefined),
    })),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: [] }),
  })),
  batch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
};
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
}));

import { criarReservaTemporaria, expirarReservasTemporarias } from '../src/index.js';

type HttpHandler = (req: unknown, res: unknown) => Promise<void> | void;

interface ResponseBody {
  error?: string;
  mensagem?: string;
  sucesso?: boolean;
  dados?: unknown[] | Record<string, unknown>;
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
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data as ResponseBody;
      return this;
    },
    send(data: unknown) {
      this.body = data as ResponseBody;
      return this;
    },
    end() {
      return this;
    },
    setHeader(key: string, val: string) {
      this.headers[key.toLowerCase()] = val;
      return this;
    },
    getHeader(key: string) {
      return this.headers[key.toLowerCase()];
    },
    on(event: string, cb: (...args: unknown[]) => void) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      const list = listeners[event] || [];
      for (const fn of list) {
        fn(...args);
      }
    },
  };
  return res;
}

async function executeEndpoint(
  handler: unknown,
  req: Record<string, unknown>,
): Promise<MockResponse> {
  const res = createMockResponse();
  await (handler as HttpHandler)(req, res);
  return res;
}

describe('Endpoints de Reserva Temporária (Cloud Functions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /criarReservaTemporaria', () => {
    it('retorna 405 se o método não for POST', async () => {
      const res = await executeEndpoint(criarReservaTemporaria, {
        method: 'GET',
        headers: {},
      });
      expect(res.statusCode).toBe(405);
      expect(res.body?.error).toContain('Método não permitido');
    });

    it('retorna 401 se não houver token de autenticação', async () => {
      const res = await executeEndpoint(criarReservaTemporaria, {
        method: 'POST',
        headers: {},
        body: {},
      });
      expect(res.statusCode).toBe(401);
    });

    it('retorna 400 se o corpo da requisição for inválido (faltando campos obrigatórios)', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-cliente-1',
        name: 'Cliente Mariana',
      });

      const res = await executeEndpoint(criarReservaTemporaria, {
        method: 'POST',
        headers: { authorization: 'Bearer token-valido' },
        body: {
          servicoId: '', // Inválido
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /expirarReservasTemporarias', () => {
    it('retorna 405 se o método não for POST', async () => {
      const res = await executeEndpoint(expirarReservasTemporarias, {
        method: 'GET',
        headers: {},
      });
      expect(res.statusCode).toBe(405);
      expect(res.body?.error).toContain('Método não permitido');
    });

    it('retorna 403 se o usuário não for administradora', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-cliente-1',
        name: 'Cliente Mariana',
        role: 'cliente',
        admin: false,
      });

      const res = await executeEndpoint(expirarReservasTemporarias, {
        method: 'POST',
        headers: { authorization: 'Bearer token-cliente' },
      });

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toContain('Apenas a administradora');
    });
  });
});
