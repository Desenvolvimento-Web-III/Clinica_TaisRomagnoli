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
import {
  cadastrarServico,
  editarServico,
  desativarServico,
  reativarServico,
  excluirServico,
  obterServicos,
  obterServico,
} from '../src/index.js';

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

describe('Serviços HTTP Endpoints (functions/src/index.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cadastrarServico endpoint', () => {
    it('retorna 405 se método for diferente de POST', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await (cadastrarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.body?.error).toContain('Método não permitido');
    });

    it('retorna 401 se cabeçalho Authorization for ausente', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      await (cadastrarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body?.error).toContain('Acesso não autenticado');
    });

    it('retorna 403 se usuário não for administradora', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-cliente',
        role: 'cliente',
        admin: false,
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-cliente' },
        body: {
          nome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          preco: 150,
          descricao: 'Descrição longa e válida para o teste.',
        },
      });
      const res = createMockResponse();

      await (cadastrarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toContain('Apenas a administradora');
    });

    it('cadastra com sucesso novo serviço com duração, preço, sinal, descrição e status (201)', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais',
        role: 'admin',
        admin: true,
      });

      const mockDocSet = vi.fn().mockResolvedValue(undefined);
      const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
      const mockWhereGet = vi.fn().mockResolvedValue({ docs: [] });

      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({ get: mockWhereGet }),
        doc: vi.fn().mockReturnValue({ get: mockDocGet, set: mockDocSet }),
        get: mockWhereGet,
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-admin' },
        body: {
          nome: 'Massagem Desportiva',
          duracaoMinutos: 60,
          preco: 170,
          descricao: 'Massagem profunda para recuperação muscular pré e pós-treino.',
          ativo: true,
        },
      });
      const res = createMockResponse();

      await (cadastrarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body?.mensagem).toBe('Serviço cadastrado com sucesso.');
      const dados = res.body?.dados as Record<string, unknown>;
      expect(dados.nome).toBe('Massagem Desportiva');
      expect(dados.duracaoMinutos).toBe(60);
      expect(dados.preco).toBe(170);
      expect(dados.sinal).toBe(51); // 30% padrão
      expect(dados.sinalPercentual).toBe(30);
      expect(dados.ativo).toBe(true);
      expect(dados.id).toBe('massagem-desportiva');
    });

    it('permite cadastrar serviço inativo com status ativo: false (201)', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais',
        role: 'admin',
        admin: true,
      });

      const mockDocSet = vi.fn().mockResolvedValue(undefined);
      const mockDocGet = vi.fn().mockResolvedValue({ exists: false });
      const mockWhereGet = vi.fn().mockResolvedValue({ docs: [] });

      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({ get: mockWhereGet }),
        doc: vi.fn().mockReturnValue({ get: mockDocGet, set: mockDocSet }),
        get: mockWhereGet,
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-admin' },
        body: {
          nome: 'Procedimento Piloto',
          duracaoMinutos: 45,
          preco: 130,
          descricao: 'Serviço em fase de homologação.',
          ativo: false,
        },
      });
      const res = createMockResponse();

      await (cadastrarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(201);
      const dados = res.body?.dados as Record<string, unknown>;
      expect(dados.ativo).toBe(false);
    });

    it('retorna 400 se payload for inválido', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais',
        role: 'admin',
        admin: true,
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-admin' },
        body: {
          nome: 'Nome',
          // sem duracaoMinutos, preco, descricao
        },
      });
      const res = createMockResponse();

      await (cadastrarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain('Dados do serviço inválidos');
    });

    it('retorna 409 se serviço com mesmo nome já existir no catálogo', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais',
        role: 'admin',
        admin: true,
      });

      mockFirestore.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValueOnce({
            docs: [
              {
                id: 'srv-existente',
                data: () => ({
                  nome: 'Massagem Relaxante',
                  duracaoMinutos: 60,
                  preco: 150,
                  ativo: true,
                }),
              },
            ],
          }),
        }),
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-admin' },
        body: {
          nome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          preco: 150,
          descricao: 'Tentativa de duplicação de nome.',
        },
      });
      const res = createMockResponse();

      await (cadastrarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(409);
      expect(res.body?.error).toContain('Já existe um serviço cadastrado com este nome');
    });
  });

  describe('editarServico endpoint', () => {
    it('retorna 405 se método for inválido', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await (editarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
    });

    it('retorna 403 se não for admin', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-1',
        role: 'cliente',
      });

      const req = createMockRequest({
        method: 'PUT',
        headers: { authorization: 'Bearer token-cliente' },
        body: { id: 'srv-1', nome: 'Edit' },
      });
      const res = createMockResponse();

      await (editarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('desativarServico endpoint', () => {
    it('retorna 405 se método for inválido', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await (desativarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
    });

    it('retorna 401 sem token Bearer', async () => {
      const req = createMockRequest({ method: 'POST', body: { servicoId: 'srv-1' } });
      const res = createMockResponse();

      await (desativarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('reativarServico endpoint', () => {
    it('retorna 405 se método for inválido', async () => {
      const req = createMockRequest({ method: 'DELETE' });
      const res = createMockResponse();

      await (reativarServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
    });
  });

  describe('excluirServico endpoint', () => {
    it('retorna 405 se método for GET', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await (excluirServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
    });
  });

  describe('obterServicos endpoint', () => {
    it('retorna 405 se método for POST', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      await (obterServicos as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
    });

    it('retorna 200 e lista de serviços para requisição pública', async () => {
      mockFirestore.collection.mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValueOnce({
            docs: [
              {
                id: 'srv-1',
                data: () => ({
                  name: 'Massagem Relaxante',
                  durationMinutes: 60,
                  priceInCents: 15000,
                  active: true,
                }),
              },
            ],
          }),
        }),
      });

      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await (obterServicos as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body?.dados)).toBe(true);
      expect(res.body?.dados as unknown[]).toHaveLength(1);
    });
  });

  describe('obterServico endpoint', () => {
    it('retorna 400 se id não for informado', async () => {
      const req = createMockRequest({ method: 'GET', query: {} });
      const res = createMockResponse();

      await (obterServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain('obrigatório');
    });

    it('retorna 404 se serviço não existir', async () => {
      mockFirestore.collection.mockReturnValueOnce({
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValueOnce({ exists: false }),
        }),
      });

      const req = createMockRequest({ method: 'GET', query: { id: 'srv-nao-existe' } });
      const res = createMockResponse();

      await (obterServico as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body?.error).toContain('não encontrado');
    });
  });
});
