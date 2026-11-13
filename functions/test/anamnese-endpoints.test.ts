import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}));

const mockVerifyIdToken = vi.fn();
const mockGetUser = vi.fn();

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
    getUser: mockGetUser,
  }),
}));

const mockDocSet = vi.fn().mockResolvedValue(undefined);
const mockDocGet = vi.fn();
const mockCollection = vi.fn();

const mockFirestore = {
  collection: mockCollection,
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
}));

import { salvarFichaAnamnese, obterFichaAnamnese, atualizarLiberacaoMedica } from '../src/index.js';
import {
  INITIAL_ANAMNESE_DATA,
  type FichaAnamneseData,
  type FichaAnamneseRecord,
} from '@clinica/shared';

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
      if (typeof data === 'string') {
        try {
          this.body = JSON.parse(data) as ResponseBody;
        } catch {
          this.body = { error: data };
        }
      } else {
        this.body = data as ResponseBody;
      }
      return this;
    },
    end() {
      return this;
    },
    setHeader(key: string, val: string) {
      this.headers[key] = val;
      return this;
    },
    getHeader(key: string) {
      return this.headers[key];
    },
    on(event: string, cb: (...args: unknown[]) => void) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      const cbs = listeners[event] || [];
      for (const cb of cbs) cb(...args);
    },
  };
  return res;
}

describe('Anamnese Endpoints HTTP Cloud Functions', () => {
  const handlerSalvar = salvarFichaAnamnese as unknown as HttpHandler;
  const handlerObter = obterFichaAnamnese as unknown as HttpHandler;
  const handlerLiberacaoMedica = atualizarLiberacaoMedica as unknown as HttpHandler;

  const dadosValidos: FichaAnamneseData = {
    ...INITIAL_ANAMNESE_DATA,
    consentimentoConfirmado: true,
  };

  const clientToken = 'token-cliente-123';
  const adminToken = 'token-admin-tais';
  const otherClientToken = 'token-cliente-999';

  beforeEach(() => {
    vi.clearAllMocks();

    mockVerifyIdToken.mockImplementation(async (token: string) => {
      if (token === clientToken) {
        return {
          uid: 'cliente_123',
          name: 'Maria Silva',
          email: 'maria@exemplo.com',
          role: 'cliente',
          client: true,
          admin: false,
        };
      }
      if (token === adminToken) {
        return {
          uid: 'admin_tais',
          name: 'Dra. Taís Romagnoli',
          email: 'tais@clinica.com.br',
          role: 'admin',
          admin: true,
        };
      }
      if (token === otherClientToken) {
        return {
          uid: 'cliente_999',
          name: 'Carlos Santos',
          email: 'carlos@exemplo.com',
          role: 'cliente',
          client: true,
          admin: false,
        };
      }
      const err = new Error('Invalid token');
      (err as unknown as { code: string }).code = 'auth/invalid-id-token';
      throw err;
    });

    const mockDoc = {
      set: mockDocSet,
      get: mockDocGet,
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          set: mockDocSet,
          get: mockDocGet,
        })),
      })),
    };

    mockCollection.mockImplementation(() => ({
      doc: vi.fn(() => mockDoc),
      add: vi.fn().mockResolvedValue({ id: 'doc-id' }),
    }));
  });

  describe('POST /salvarFichaAnamnese', () => {
    it('rejeita métodos não permitidos com HTTP 405', async () => {
      const res = createMockResponse();
      await handlerSalvar({ method: 'DELETE', headers: {} }, res);
      expect(res.statusCode).toBe(405);
    });

    it('rejeita com HTTP 401 quando não houver header de autorização', async () => {
      const res = createMockResponse();
      await handlerSalvar({ method: 'POST', headers: {}, body: { dados: dadosValidos } }, res);
      expect(res.statusCode).toBe(401);
      expect(res.body?.error).toMatch(/token/i);
    });

    it('rejeita com HTTP 403 quando um cliente tenta salvar a ficha de outro cliente', async () => {
      const res = createMockResponse();
      await handlerSalvar(
        {
          method: 'POST',
          headers: { authorization: `Bearer ${otherClientToken}` },
          body: { clienteId: 'cliente_123', dados: dadosValidos },
        },
        res,
      );
      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toMatch(/não autorizado/i);
    });

    it('salva com sucesso (HTTP 200) quando cliente titular envia sua própria ficha', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      const res = createMockResponse();
      await handlerSalvar(
        {
          method: 'POST',
          headers: { authorization: `Bearer ${clientToken}` },
          body: { dados: dadosValidos },
        },
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect((res.body?.dados as { clienteId: string })?.clienteId).toBe('cliente_123');
      expect(mockDocSet).toHaveBeenCalled();
    });

    it('salva com sucesso (HTTP 200) quando administradora salva a ficha de um cliente', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      const res = createMockResponse();
      await handlerSalvar(
        {
          method: 'POST',
          headers: { authorization: `Bearer ${adminToken}` },
          body: { clienteId: 'cliente_123', dados: dadosValidos },
        },
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect((res.body?.dados as { clienteId: string })?.clienteId).toBe('cliente_123');
    });

    it('rejeita com HTTP 400 quando o payload for inválido', async () => {
      const res = createMockResponse();
      await handlerSalvar(
        {
          method: 'POST',
          headers: { authorization: `Bearer ${clientToken}` },
          body: { dados: { ...dadosValidos, consentimentoConfirmado: false } },
        },
        res,
      );

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toMatch(/inválidos/i);
    });
  });

  describe('GET /obterFichaAnamnese', () => {
    it('rejeita métodos não permitidos com HTTP 405', async () => {
      const res = createMockResponse();
      await handlerObter({ method: 'POST', headers: {} }, res);
      expect(res.statusCode).toBe(405);
    });

    it('rejeita com HTTP 401 quando não autenticado', async () => {
      const res = createMockResponse();
      await handlerObter({ method: 'GET', headers: {}, query: {} }, res);
      expect(res.statusCode).toBe(401);
    });

    it('rejeita com HTTP 403 quando cliente tenta consultar ficha alheia', async () => {
      const res = createMockResponse();
      await handlerObter(
        {
          method: 'GET',
          headers: { authorization: `Bearer ${otherClientToken}` },
          query: { clienteId: 'cliente_123' },
        },
        res,
      );

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toMatch(/não autorizado/i);
    });

    it('retorna HTTP 404 quando ficha não for encontrada', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      const res = createMockResponse();
      await handlerObter(
        {
          method: 'GET',
          headers: { authorization: `Bearer ${clientToken}` },
          query: {},
        },
        res,
      );

      expect(res.statusCode).toBe(404);
      expect(res.body?.error).toMatch(/não encontrada/i);
    });

    it('retorna HTTP 200 com a ficha para o titular', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...dadosValidos,
          clienteId: 'cliente_123',
          submittedAt: '2026-11-08T10:00:00Z',
          updatedAt: '2026-11-08T10:00:00Z',
          pontosAtencao: [],
        }),
      });

      const res = createMockResponse();
      await handlerObter(
        {
          method: 'GET',
          headers: { authorization: `Bearer ${clientToken}` },
          query: {},
        },
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect((res.body?.dados as { clienteId: string })?.clienteId).toBe('cliente_123');
    });

    it('retorna HTTP 200 com a ficha para a administradora', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...dadosValidos,
          clienteId: 'cliente_123',
          submittedAt: '2026-11-08T10:00:00Z',
          updatedAt: '2026-11-08T10:00:00Z',
          pontosAtencao: [],
        }),
      });

      const res = createMockResponse();
      await handlerObter(
        {
          method: 'GET',
          headers: { authorization: `Bearer ${adminToken}` },
          query: { clienteId: 'cliente_123' },
        },
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      expect((res.body?.dados as { clienteId: string })?.clienteId).toBe('cliente_123');
    });
  });

  describe('POST /atualizarLiberacaoMedica e bloqueio na ficha HTTP', () => {
    it('rejeita com HTTP 403 quando cliente tenta enviar liberacaoMedicaAprovada=true em salvarFichaAnamnese', async () => {
      mockDocGet.mockResolvedValue({ exists: false });

      const res = createMockResponse();
      await handlerSalvar(
        {
          method: 'POST',
          headers: { authorization: `Bearer ${clientToken}` },
          body: {
            dados: {
              ...dadosValidos,
              tratamentoOncologico: { resposta: true, detalhes: 'Quimioterapia em 2026' },
            },
            liberacaoMedicaAprovada: true,
          },
        },
        res,
      );

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toMatch(/administradora/i);
    });

    it('rejeita atualizarLiberacaoMedica com HTTP 405 em método GET e HTTP 401 sem token', async () => {
      const resGet = createMockResponse();
      await handlerLiberacaoMedica({ method: 'GET', headers: {} }, resGet);
      expect(resGet.statusCode).toBe(405);

      const resUnauth = createMockResponse();
      await handlerLiberacaoMedica(
        { method: 'POST', headers: {}, body: { clienteId: 'cliente_123', aprovada: true } },
        resUnauth,
      );
      expect(resUnauth.statusCode).toBe(401);
    });

    it('rejeita atualizarLiberacaoMedica com HTTP 403 para cliente comum e HTTP 404 para ficha inexistente', async () => {
      const resForbidden = createMockResponse();
      await handlerLiberacaoMedica(
        {
          method: 'POST',
          headers: { authorization: `Bearer ${clientToken}` },
          body: { clienteId: 'cliente_123', aprovada: true },
        },
        resForbidden,
      );
      expect(resForbidden.statusCode).toBe(403);

      mockDocGet.mockResolvedValue({ exists: false });
      const resNotFound = createMockResponse();
      await handlerLiberacaoMedica(
        {
          method: 'POST',
          headers: { authorization: `Bearer ${adminToken}` },
          body: { clienteId: 'cliente_inexistente', aprovada: true },
        },
        resNotFound,
      );
      expect(resNotFound.statusCode).toBe(404);
    });

    it('permite que a administradora registre aprovação de liberação médica com HTTP 200', async () => {
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ...dadosValidos,
          clienteId: 'cliente_123',
          tratamentoOncologico: { resposta: true, detalhes: 'Laudo em validação' },
          pontosAtencao: ['Tratamento Oncológico: Laudo em validação'],
          exigeLiberacaoMedica: true,
          contraindicacoes: ['Tratamento Oncológico: Laudo em validação'],
          liberacaoMedicaAprovada: false,
          submittedAt: '2026-11-08T10:00:00Z',
          updatedAt: '2026-11-08T10:00:00Z',
        }),
      });

      const res = createMockResponse();
      await handlerLiberacaoMedica(
        {
          method: 'POST',
          headers: { authorization: `Bearer ${adminToken}` },
          body: {
            clienteId: 'cliente_123',
            aprovada: true,
            observacoes: 'Atestado médico aprovado para sessões adaptadas.',
          },
        },
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
      const dados = res.body?.dados as FichaAnamneseRecord;
      expect(dados.liberacaoMedicaAprovada).toBe(true);
      expect(dados.liberacaoMedicaAprovadaPor).toBe('admin_tais');
      expect(mockDocSet).toHaveBeenCalled();
    });
  });
});
