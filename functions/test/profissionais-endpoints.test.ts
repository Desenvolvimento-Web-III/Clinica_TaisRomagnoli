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
const mockDocDelete = vi.fn().mockResolvedValue(undefined);
const mockDocGet = vi.fn();
const mockQueryGet = vi.fn();

const mockFirestore = {
  collection: vi.fn((colName?: string) => ({
    doc: vi.fn((docId?: string) => ({
      get: () => mockDocGet(colName, docId),
      set: (data: unknown, options?: unknown) => mockDocSet(colName, docId, data, options),
      delete: () => mockDocDelete(colName, docId),
    })),
    where: vi.fn().mockReturnThis(),
    get: () => mockQueryGet(colName),
  })),
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
}));

import {
  obterProfissionais,
  obterProfissional,
  cadastrarProfissional,
  atualizarProfissional,
  vincularProfissionalAoServicoEndpoint,
  listarServicosProfissional,
} from '../src/index.js';

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

describe('Endpoints de Profissionais - Cloud Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockDocGet.mockImplementation((colName?: string, docId?: string) => {
      if (colName === 'profissionais' && docId === 'prof-tais-romagnoli') {
        return Promise.resolve({
          exists: true,
          id: 'prof-tais-romagnoli',
          data: () => ({
            id: 'prof-tais-romagnoli',
            nome: 'Tais Romagnoli',
            especialidade: 'Massoterapeuta',
            ativo: true,
            diasFolga: [0, 2],
            intervaloMinutos: 30,
            createdAt: '2026-09-05T00:00:00.000Z',
          }),
        });
      }

      if (colName === 'servicos' && docId === 'massagem-relaxante') {
        return Promise.resolve({
          exists: true,
          id: 'massagem-relaxante',
          data: () => ({
            id: 'massagem-relaxante',
            nome: 'Massagem Relaxante',
            duracaoMinutos: 60,
            preco: 170,
            precoEmCentavos: 17000,
            sinal: 51,
            sinalEmCentavos: 5100,
            sinalPercentual: 30,
            descricao: 'Massagem relaxante corporal profunda.',
            ativo: true,
            profissionaisHabilitados: ['prof-tais-romagnoli'],
            profissionalPadraoId: 'prof-tais-romagnoli',
          }),
        });
      }

      return Promise.resolve({ exists: false, data: () => null });
    });

    mockQueryGet.mockImplementation((colName?: string) => {
      if (colName === 'profissionais') {
        return Promise.resolve({
          empty: false,
          docs: [
            {
              id: 'prof-tais-romagnoli',
              data: () => ({
                id: 'prof-tais-romagnoli',
                nome: 'Tais Romagnoli',
                especialidade: 'Massoterapeuta',
                ativo: true,
                diasFolga: [0, 2],
                intervaloMinutos: 30,
                createdAt: '2026-09-05T00:00:00.000Z',
              }),
            },
          ],
        });
      }

      if (colName === 'servicos') {
        return Promise.resolve({
          empty: false,
          docs: [
            {
              id: 'massagem-relaxante',
              data: () => ({
                id: 'massagem-relaxante',
                nome: 'Massagem Relaxante',
                duracaoMinutos: 60,
                preco: 170,
                precoEmCentavos: 17000,
                sinal: 51,
                sinalEmCentavos: 5100,
                sinalPercentual: 30,
                descricao: 'Massagem relaxante corporal profunda.',
                ativo: true,
                profissionaisHabilitados: ['prof-tais-romagnoli'],
                profissionalPadraoId: 'prof-tais-romagnoli',
              }),
            },
          ],
        });
      }

      return Promise.resolve({ empty: true, docs: [] });
    });
  });

  describe('GET /obterProfissionais', () => {
    it('retorna status 200 com a lista de profissionais cadastrados', async () => {
      const req = {
        method: 'GET',
        headers: {},
        query: {},
      };
      const res = createMockResponse();

      await (obterProfissionais as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect(Array.isArray(res.body?.dados)).toBe(true);
      const lista = res.body?.dados as Array<{ id: string; nome: string }>;
      expect(lista.some((p) => p.id === 'prof-tais-romagnoli')).toBe(true);
    });

    it('rejeita métodos diferentes de GET com 405', async () => {
      const req = { method: 'POST', headers: {} };
      const res = createMockResponse();

      await (obterProfissionais as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.body?.error).toContain('Método não permitido');
    });
  });

  describe('GET /obterProfissional', () => {
    it('retorna os dados da profissional por ID com status 200', async () => {
      const req = {
        method: 'GET',
        headers: {},
        query: { id: 'prof-tais-romagnoli' },
      };
      const res = createMockResponse();

      await (obterProfissional as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      const prof = res.body?.dados as { id: string; nome: string };
      expect(prof.id).toBe('prof-tais-romagnoli');
      expect(prof.nome).toBe('Tais Romagnoli');
    });

    it('retorna 404 quando o profissional não é encontrado', async () => {
      const req = {
        method: 'GET',
        headers: {},
        query: { id: 'prof-inexistente' },
      };
      const res = createMockResponse();

      await (obterProfissional as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body?.error).toContain('Profissional não encontrado');
    });
  });

  describe('POST /cadastrarProfissional', () => {
    it('cadastra novo profissional com sucesso quando enviado por administradora autenticada (status 201)', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'admin-1',
        name: 'Tais Romagnoli',
        role: 'admin',
        admin: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token-admin' },
        body: {
          nome: 'Camila Ferreira',
          especialidade: 'Massoterapeuta Especialista',
          diasFolga: [0, 2],
          intervaloMinutos: 30,
        },
      };
      const res = createMockResponse();

      await (cadastrarProfissional as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body?.sucesso).toBe(true);
      expect(res.body?.mensagem).toContain('Profissional cadastrado com sucesso');
      expect(mockDocSet).toHaveBeenCalled();
    });

    it('rejeita com 403 se o solicitante não for administrador', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'cliente-1',
        name: 'Cliente Comum',
        role: 'client',
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token-cliente' },
        body: {
          nome: 'Camila Ferreira',
          especialidade: 'Massoterapeuta',
        },
      };
      const res = createMockResponse();

      await (cadastrarProfissional as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toContain('Apenas a administradora');
    });
  });

  describe('PUT /atualizarProfissional', () => {
    it('atualiza os dados do profissional com sucesso quando solicitada por administradora', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'admin-1',
        name: 'Tais Romagnoli',
        role: 'admin',
        admin: true,
      });

      const req = {
        method: 'PUT',
        headers: { authorization: 'Bearer token-admin' },
        body: {
          id: 'prof-tais-romagnoli',
          especialidade: 'Massoterapeuta Especialista Master',
          intervaloMinutos: 30,
        },
      };
      const res = createMockResponse();

      await (atualizarProfissional as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect(res.body?.mensagem).toContain('Profissional atualizado com sucesso');
    });
  });

  describe('POST /vincularProfissionalAoServicoEndpoint', () => {
    it('vincula com sucesso um profissional ao serviço', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'admin-1',
        name: 'Tais Romagnoli',
        role: 'admin',
        admin: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token-admin' },
        body: {
          servicoId: 'massagem-relaxante',
          profissionalId: 'prof-tais-romagnoli',
          habilitado: true,
        },
      };
      const res = createMockResponse();

      await (vincularProfissionalAoServicoEndpoint as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect(res.body?.mensagem).toContain('Vínculo do profissional com o serviço atualizado');
    });
  });

  describe('GET /listarServicosProfissional', () => {
    it('retorna os serviços oferecidos pelo profissional com status 200', async () => {
      const req = {
        method: 'GET',
        headers: {},
        query: { profissionalId: 'prof-tais-romagnoli' },
      };
      const res = createMockResponse();

      await (listarServicosProfissional as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect(Array.isArray(res.body?.dados)).toBe(true);
    });
  });
});
