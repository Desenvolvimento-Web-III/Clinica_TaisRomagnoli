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
const mockDocUpdate = vi.fn().mockResolvedValue(undefined);
const mockDocGet = vi.fn().mockResolvedValue({
  exists: true,
  data: () => ({
    id: 'bloq-1',
    tipo: 'unico',
    data: '2026-11-20',
    horaInicio: '14:00',
    horaFim: '16:00',
    diaInteiro: false,
    motivo: 'Teste',
    ativo: true,
    criadoPor: 'admin-1',
    criadoEm: '2026-11-07T00:00:00.000Z',
  }),
});

const mockQueryGet = vi.fn().mockResolvedValue({
  docs: [
    {
      data: () => ({
        id: 'bloq-1',
        tipo: 'unico',
        data: '2026-11-20',
        horaInicio: '14:00',
        horaFim: '16:00',
        diaInteiro: false,
        motivo: 'Teste',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-07T00:00:00.000Z',
      }),
    },
  ],
});

const mockFirestore = {
  collection: vi.fn((colName?: string) => ({
    doc: vi.fn((docId?: string) => ({
      get: () => {
        if (colName === 'horarios_fixos') {
          return Promise.resolve({
            exists: true,
            data: () => ({
              id: docId || 'fixo-1',
              clienteId: 'cli-1',
              clienteNome: 'Mariana',
              diaSemana: 3,
              horaInicio: '09:00',
              horaFim: '10:00',
              dataInicio: '2026-11-01',
              frequencia: 'semanal',
              ativo: true,
              criadoPor: 'admin-1',
              criadoEm: '2026-11-07T00:00:00.000Z',
            }),
          });
        }
        return mockDocGet();
      },
      set: mockDocSet,
      delete: mockDocDelete,
      update: mockDocUpdate,
    })),
    where: vi.fn().mockReturnThis(),
    get: mockQueryGet,
  })),
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
}));

import {
  criarBloqueioAgenda,
  listarBloqueiosAgenda,
  removerBloqueioAgenda,
  alternarStatusBloqueioAgenda,
  criarHorarioFixoCliente,
  listarHorariosFixosClientes,
  removerHorarioFixoCliente,
  atualizarHorarioFixoCliente,
  verificarDisponibilidadeHorario,
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

describe('Bloqueios e Horários Fixos - Endpoints HTTP Cloud Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criarBloqueioAgenda', () => {
    const handler = criarBloqueioAgenda as unknown as HttpHandler;

    it('rejeita método GET com 405', async () => {
      const req = { method: 'GET', headers: {} };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(405);
    });

    it('rejeita requisição sem token com 401', async () => {
      const req = { method: 'POST', headers: {}, body: {} };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('rejeita chamada por usuário comum sem claim de admin com 403', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-comum-1',
        email: 'user@exemplo.com',
        role: 'cliente',
        admin: false,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token-comum' },
        body: {
          tipo: 'unico',
          data: '2026-11-20',
          horaInicio: '14:00',
          horaFim: '16:00',
          motivo: 'Tentativa não autorizada',
        },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(403);
    });

    it('cria bloqueio com sucesso com token de admin com 201', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais-1',
        email: 'admin@clinicataisromagnoli.com.br',
        role: 'admin',
        admin: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token-admin' },
        body: {
          tipo: 'unico',
          data: '2026-11-20',
          horaInicio: '14:00',
          horaFim: '16:00',
          motivo: 'Compromisso externo da profissional',
        },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.body?.sucesso).toBe(true);
    });
  });

  describe('listarBloqueiosAgenda', () => {
    const handler = listarBloqueiosAgenda as unknown as HttpHandler;

    it('rejeita método POST com 405', async () => {
      const req = { method: 'POST', headers: {} };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(405);
    });

    it('lista bloqueios com token autenticado com 200', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-comum-1',
        email: 'user@exemplo.com',
      });

      const req = {
        method: 'GET',
        headers: { authorization: 'Bearer token-comum' },
        query: {},
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body?.dados).toBeDefined();
    });
  });

  describe('removerBloqueioAgenda', () => {
    const handler = removerBloqueioAgenda as unknown as HttpHandler;

    it('rejeita remoção por cliente comum com 403', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-comum-1',
        email: 'user@exemplo.com',
        role: 'cliente',
        admin: false,
      });

      const req = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token-comum' },
        query: { id: 'bloq-1' },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(403);
    });

    it('remove bloqueio com token de admin com 200', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais-1',
        email: 'admin@clinicataisromagnoli.com.br',
        role: 'admin',
        admin: true,
      });

      const req = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token-admin' },
        query: { id: 'bloq-1' },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
    });
  });

  describe('alternarStatusBloqueioAgenda', () => {
    const handler = alternarStatusBloqueioAgenda as unknown as HttpHandler;

    it('rejeita alteração de status por cliente comum com 403', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-comum-1',
        role: 'cliente',
        admin: false,
      });

      const req = {
        method: 'PATCH',
        headers: { authorization: 'Bearer token-comum' },
        body: { id: 'bloq-1', ativo: false },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(403);
    });

    it('altera status do bloqueio com sucesso para administradora com 200', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais-1',
        role: 'admin',
        admin: true,
      });

      const req = {
        method: 'PATCH',
        headers: { authorization: 'Bearer token-admin' },
        body: { id: 'bloq-1', ativo: false },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
    });
  });

  describe('criarHorarioFixoCliente', () => {
    const handler = criarHorarioFixoCliente as unknown as HttpHandler;

    it('rejeita criação de horário fixo por cliente comum com 403', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-comum-1',
        role: 'cliente',
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token-comum' },
        body: {
          clienteId: 'cli-1',
          clienteNome: 'Mariana',
          diaSemana: 3,
          horaInicio: '09:00',
          horaFim: '10:00',
          dataInicio: '2026-11-01',
        },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(403);
    });

    it('cria horário fixo com sucesso para administradora com 201', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais-1',
        role: 'admin',
        admin: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer token-admin' },
        body: {
          clienteId: 'cli-1',
          clienteNome: 'Mariana',
          diaSemana: 3,
          horaInicio: '09:00',
          horaFim: '10:00',
          dataInicio: '2026-11-01',
        },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.body?.sucesso).toBe(true);
    });
  });

  describe('listarHorariosFixosClientes', () => {
    const handler = listarHorariosFixosClientes as unknown as HttpHandler;

    it('lista horários fixos para cliente autenticado com 200', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cli-1',
        role: 'cliente',
      });

      const req = {
        method: 'GET',
        headers: { authorization: 'Bearer token-cli' },
        query: {},
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body?.dados).toBeDefined();
    });
  });

  describe('removerHorarioFixoCliente', () => {
    const handler = removerHorarioFixoCliente as unknown as HttpHandler;

    it('rejeita remoção por cliente comum com 403', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-comum-1',
        role: 'cliente',
      });

      const req = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token-comum' },
        query: { id: 'fixo-1' },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(403);
    });

    it('remove horário fixo com token de admin com 200', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais-1',
        role: 'admin',
        admin: true,
      });

      const req = {
        method: 'DELETE',
        headers: { authorization: 'Bearer token-admin' },
        query: { id: 'fixo-1' },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
    });
  });

  describe('atualizarHorarioFixoCliente', () => {
    const handler = atualizarHorarioFixoCliente as unknown as HttpHandler;

    it('rejeita atualização por cliente comum com 403', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-comum-1',
        role: 'cliente',
      });

      const req = {
        method: 'PUT',
        headers: { authorization: 'Bearer token-comum' },
        body: { id: 'fixo-1', ativo: false },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(403);
    });

    it('atualiza horário fixo com sucesso para administradora com 200', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais-1',
        role: 'admin',
        admin: true,
      });

      const req = {
        method: 'PUT',
        headers: { authorization: 'Bearer token-admin' },
        body: { id: 'fixo-1', ativo: false },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body?.sucesso).toBe(true);
    });
  });

  describe('verificarDisponibilidadeHorario', () => {
    const handler = verificarDisponibilidadeHorario as unknown as HttpHandler;

    it('rejeita requisição sem datas com 400', async () => {
      const req = {
        method: 'POST',
        headers: {},
        body: {},
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('retorna disponibilidade com 200 para horários válidos', async () => {
      const req = {
        method: 'POST',
        headers: {},
        body: {
          dataHoraInicioIso: '2026-11-16T08:00:00.000Z',
          dataHoraFimIso: '2026-11-16T09:00:00.000Z',
        },
      };
      const res = createMockResponse();

      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body?.dados).toBeDefined();
    });
  });
});
