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
  collection: vi.fn(),
};
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
}));

import { obterPainelIndicadoresAdmin } from '../src/index.js';

type HttpHandler = (req: unknown, res: unknown) => Promise<void> | void;

interface ResponseBody {
  error?: string;
  mensagem?: string;
  sucesso?: boolean;
  dados?: Record<string, unknown>;
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
      return this;
    },
    send(data: unknown) {
      if (typeof data === 'object') {
        this.body = data as ResponseBody;
      }
      return this;
    },
    end() {
      return this;
    },
    on(event: string, cb: (...args: unknown[]) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event]?.push(cb);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      listeners[event]?.forEach((cb) => cb(...args));
    },
  };
  return res;
}

describe('obterPainelIndicadoresAdmin endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita método HTTP não suportado com 405', async () => {
    const req = {
      method: 'DELETE',
      headers: {},
      query: {},
      body: {},
    };
    const res = createMockResponse();

    await (obterPainelIndicadoresAdmin as unknown as HttpHandler)(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body?.error).toContain('Método não permitido');
  });

  it('rejeita chamada sem header de autorização com 401', async () => {
    const req = {
      method: 'GET',
      headers: {},
      query: {},
      body: {},
    };
    const res = createMockResponse();

    await (obterPainelIndicadoresAdmin as unknown as HttpHandler)(req, res);

    expect(res.statusCode).toBe(401);
  });

  it('rejeita chamada de usuário comum sem claim de admin com 403', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'user-comum',
      role: 'cliente',
      admin: false,
    });

    const req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token-cliente-comum',
      },
      query: {},
      body: {},
    };
    const res = createMockResponse();

    await (obterPainelIndicadoresAdmin as unknown as HttpHandler)(req, res);

    expect(res.statusCode).toBe(403);
  });

  it('permite consulta de administradora autenticada e retorna os 8 indicadores consolidados', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'admin-tais',
      role: 'admin',
      admin: true,
    });

    // Mocks do Firestore retornando coleções vazias para simulação
    mockFirestore.collection.mockImplementation((colName: string) => {
      if (colName === 'agendamentos') {
        return {
          orderBy: () => ({
            get: vi.fn().mockResolvedValue({ docs: [] }),
          }),
          get: vi.fn().mockResolvedValue({ docs: [] }),
        };
      }
      if (colName === 'clientes') {
        return {
          orderBy: () => ({
            get: vi.fn().mockResolvedValue({ docs: [] }),
          }),
          get: vi.fn().mockResolvedValue({ docs: [] }),
        };
      }
      if (colName === 'servicos') {
        return {
          get: vi.fn().mockResolvedValue({ docs: [] }),
        };
      }
      return {
        get: vi.fn().mockResolvedValue({ docs: [] }),
      };
    });

    const req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token-admin-valido',
      },
      query: {
        dataReferencia: '2026-11-16',
        mesReferencia: '2026-11',
      },
      body: {},
    };
    const res = createMockResponse();

    await (obterPainelIndicadoresAdmin as unknown as HttpHandler)(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.sucesso).toBe(true);
    expect(res.body?.dados).toBeDefined();

    const dados = res.body?.dados as Record<string, unknown>;
    expect(dados['dataReferencia']).toBe('2026-11-16');
    expect(dados['indicadores']).toBeDefined();
    expect(dados['categorias']).toBeDefined();
  });
});
