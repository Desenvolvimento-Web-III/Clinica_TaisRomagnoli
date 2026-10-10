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

// Import endpoints after mocks
import { criarPerfil, obterPerfil } from '../src/index.js';

type HttpHandler = (req: unknown, res: unknown) => Promise<void> | void;

interface ResponseBody {
  error?: string;
  mensagem?: string;
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
    method: 'GET',
    headers: {},
    query: {},
    body: {},
    ...overrides,
  };
}

describe('Endpoints HTTP de Clientes (Functions)', () => {
  let clientesDb: Map<string, Record<string, unknown>>;
  let notificacoesDb: Map<string, Record<string, unknown>>;

  beforeEach(() => {
    vi.clearAllMocks();
    clientesDb = new Map();
    notificacoesDb = new Map();

    mockFirestore.collection.mockImplementation((collectionName: string) => {
      if (collectionName === 'clientes') {
        return {
          doc: (docId: string) => ({
            get: vi.fn().mockImplementation(async () => {
              const data = clientesDb.get(docId);
              return {
                exists: !!data,
                data: () => data,
              };
            }),
            set: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
              clientesDb.set(docId, data);
            }),
            update: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
              const existing = clientesDb.get(docId) || {};
              clientesDb.set(docId, { ...existing, ...data });
            }),
            collection: (subName: string) => {
              if (subName === 'notificacoes') {
                return {
                  doc: (notifId: string) => ({
                    set: vi.fn().mockImplementation(async (notifData: Record<string, unknown>) => {
                      notificacoesDb.set(`${docId}/${notifId}`, notifData);
                    }),
                  }),
                };
              }
              return {
                doc: () => ({ set: vi.fn().mockResolvedValue(undefined) }),
              };
            },
          }),
          where: vi.fn().mockImplementation((_field: string, _op: string, value: string) => ({
            limit: vi.fn().mockImplementation(() => ({
              get: vi.fn().mockImplementation(async () => {
                const results: { data: () => unknown }[] = [];
                for (const item of clientesDb.values()) {
                  if (item['email'] === value) {
                    results.push({ data: () => item });
                  }
                }
                return {
                  empty: results.length === 0,
                  docs: results,
                };
              }),
            })),
          })),
        };
      }

      if (collectionName === 'notificacoes') {
        return {
          doc: (docId: string) => ({
            set: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
              notificacoesDb.set(docId, data);
            }),
          }),
        };
      }

      return {
        doc: () => ({
          get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
          set: vi.fn().mockResolvedValue(undefined),
        }),
      };
    });
  });

  describe('POST /criarPerfil', () => {
    it('retorna 405 se o método não for POST', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await (criarPerfil as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.body?.error).toContain('Método não permitido');
    });

    it('retorna 401 se a requisição não possuir token Bearer válido', async () => {
      const req = createMockRequest({ method: 'POST', headers: {} });
      const res = createMockResponse();

      await (criarPerfil as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body?.error).toContain('Acesso não autenticado');
    });

    it('retorna 400 se o payload contiver dados de perfil inválidos', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-123',
        email: 'cliente@exemplo.com',
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-valido' },
        body: {
          nome: '', // Inválido: vazio
          email: 'email-invalido',
          telefone: '123',
        },
      });
      const res = createMockResponse();

      await (criarPerfil as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain('Dados do perfil inválidos');
    });

    it('retorna 201 e registra o perfil com sucesso quando autenticado e dados válidos', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-novo-1',
        email: 'novo@exemplo.com',
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-novo' },
        body: {
          nome: 'Novo Cliente',
          email: 'novo@exemplo.com',
          telefone: '(11) 98765-4321',
        },
      });
      const res = createMockResponse();

      await (criarPerfil as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body?.mensagem).toContain('Perfil do cliente registrado com sucesso');
      expect((res.body?.dados as Record<string, unknown>)?.['uid']).toBe('cliente-novo-1');
      expect((res.body?.dados as Record<string, unknown>)?.['role']).toBe('cliente');
      expect((res.body?.dados as Record<string, unknown>)?.['status']).toBe('ativo');
    });

    it('retorna 409 se outro usuário já possui cadastro com o mesmo email', async () => {
      clientesDb.set('cliente-existente', {
        uid: 'cliente-existente',
        nome: 'Existente',
        email: 'duplicado@exemplo.com',
        telefone: '(11) 99999-1111',
      });

      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-diferente',
        email: 'duplicado@exemplo.com',
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-outro' },
        body: {
          nome: 'Tentativa Conflito',
          email: 'duplicado@exemplo.com',
          telefone: '(11) 98888-2222',
        },
      });
      const res = createMockResponse();

      await (criarPerfil as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(409);
      expect(res.body?.error).toContain(
        'Já existe um cliente cadastrado com este endereço de e-mail',
      );
    });
  });

  describe('GET /obterPerfil', () => {
    beforeEach(() => {
      clientesDb.set('cliente-123', {
        uid: 'cliente-123',
        nome: 'Mariana Lima',
        email: 'mariana@exemplo.com',
        telefone: '(11) 98765-4321',
        role: 'cliente',
        status: 'ativo',
        createdAt: '2026-09-01T10:00:00Z',
      });
    });

    it('retorna 405 se o método não for GET', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      await (obterPerfil as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
    });

    it('retorna 200 com os dados do próprio perfil do usuário', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-123',
        email: 'mariana@exemplo.com',
      });

      const req = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer token-mariana' },
        query: {},
      });
      const res = createMockResponse();

      await (obterPerfil as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect((res.body?.dados as Record<string, unknown>)?.['nome']).toBe('Mariana Lima');
    });

    it('retorna 403 se um cliente comum tentar acessar perfil de outro cliente', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-hacker',
        email: 'hacker@exemplo.com',
        role: 'cliente',
      });

      const req = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer token-hacker' },
        query: { uid: 'cliente-123' },
      });
      const res = createMockResponse();

      await (obterPerfil as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toContain('Acesso negado');
    });

    it('retorna 404 se o perfil não existir', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-inexistente',
        email: 'inexistente@exemplo.com',
      });

      const req = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer token-inexistente' },
        query: {},
      });
      const res = createMockResponse();

      await (obterPerfil as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body?.error).toContain('Perfil do cliente não encontrado');
    });
  });
});
