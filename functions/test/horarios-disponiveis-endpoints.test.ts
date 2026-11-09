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

const mockDocGet = vi.fn().mockResolvedValue({
  exists: false,
});

const mockQueryGet = vi.fn().mockResolvedValue({
  docs: [],
});

const mockFirestore = {
  collection: vi.fn((colName?: string) => ({
    doc: vi.fn((docId?: string) => ({
      get: () => {
        if (colName === 'servicos' && docId === 'serv-relaxante') {
          return Promise.resolve({
            exists: true,
            data: () => ({
              id: 'serv-relaxante',
              nome: 'Massagem Relaxante',
              duracaoMinutos: 60,
              preco: 160,
              sinal: 48,
              ativo: true,
            }),
          });
        }
        if (colName === 'servicos' && docId === 'serv-desativado') {
          return Promise.resolve({
            exists: true,
            data: () => ({
              id: 'serv-desativado',
              nome: 'Serviço Desativado',
              duracaoMinutos: 60,
              preco: 160,
              ativo: false,
            }),
          });
        }
        return mockDocGet();
      },
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
    })),
    where: vi.fn().mockReturnThis(),
    get: mockQueryGet,
  })),
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
}));

import { obterHorariosDisponiveis } from '../src/index.js';

type HttpHandler = (req: unknown, res: unknown) => Promise<void> | void;

interface ResponseBody {
  sucesso?: boolean;
  error?: string;
  dados?: {
    data: string;
    duracaoMinutos: number;
    intervaloMinutos: number;
    horarios: string[];
  };
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
      if (typeof data === 'object') {
        this.body = data as ResponseBody;
      }
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

describe('obterHorariosDisponiveis endpoint', () => {
  const handler = obterHorariosDisponiveis as unknown as HttpHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita métodos não permitidos com 405 (ex: PUT, DELETE)', async () => {
    const req = { method: 'DELETE', headers: {} };
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('rejeita requisição com parâmetros inválidos com 400', async () => {
    const req = {
      method: 'GET',
      headers: {},
      query: { data: 'data-invalida' },
    };
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('retorna grade de horários disponíveis com 200 via GET para data e duracaoMinutos válidos', async () => {
    const req = {
      method: 'GET',
      headers: {},
      query: {
        data: '2026-11-16', // Segunda-feira
        duracaoMinutos: '60',
      },
    };
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body?.sucesso).toBe(true);
    expect(res.body?.dados?.duracaoMinutos).toBe(60);
    expect(res.body?.dados?.intervaloMinutos).toBe(30);
    expect(res.body?.dados?.horarios).toContain('08:00');
    expect(res.body?.dados?.horarios).toContain('14:00');
  });

  it('retorna grade de horários disponíveis com 200 via POST buscando duração pelo servicoId', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: {
        data: '2026-11-16',
        servicoId: 'serv-relaxante',
      },
    };
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body?.sucesso).toBe(true);
    expect(res.body?.dados?.duracaoMinutos).toBe(60);
  });

  it('retorna 404 quando o servicoId não é encontrado', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: {
        data: '2026-11-16',
        servicoId: 'servico-nao-existe',
      },
    };
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(404);
  });

  it('retorna 422 quando o serviço selecionado está desativado', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: {
        data: '2026-11-16',
        servicoId: 'serv-desativado',
      },
    };
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(422);
  });
});
