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
const mockDocUpdate = vi.fn().mockResolvedValue(undefined);
const mockDocDelete = vi.fn().mockResolvedValue(undefined);
const mockDocGet = vi.fn().mockResolvedValue({
  exists: true,
  data: () => ({
    id: 'item-1',
    nome: 'Serviço de Teste',
    ativo: true,
    duracaoMinutos: 60,
    preco: 100,
    sinalPercentual: 30,
    diasFolga: [0, 2],
    intervaloMinutos: 30,
    clienteId: 'cliente-1',
    clienteNome: 'Cliente Teste',
    servicoId: 'serv-1',
    servicoNome: 'Serviço Teste',
    status: 'confirmado',
    dataHoraInicio: '2026-11-20T10:00:00.000Z',
    dataHoraFim: '2026-11-20T11:00:00.000Z',
    intervaloAposMinutos: 30,
    valorTotalEmCentavos: 10000,
    valorSinalEmCentavos: 3000,
    saldoRestanteEmCentavos: 7000,
    profissionalId: 'prof-tais-romagnoli',
    profissionalNome: 'Tais Romagnoli',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  }),
});
const mockSubCollection = {
  doc: vi.fn(() => mockDoc),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue({ docs: [] }),
};
const mockDoc = {
  set: mockDocSet,
  update: mockDocUpdate,
  delete: mockDocDelete,
  get: mockDocGet,
  collection: vi.fn(() => mockSubCollection),
};
const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => mockDoc),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: [] }),
  })),
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
}));

import {
  atualizarHorariosFuncionamento,
  processarLembretes,
  cadastrarServico,
  editarServico,
  desativarServico,
  reativarServico,
  excluirServico,
  atribuirFuncaoAdministrativa,
  criarBloqueioAgenda,
  removerBloqueioAgenda,
  alternarStatusBloqueioAgenda,
  criarHorarioFixoCliente,
  removerHorarioFixoCliente,
  atualizarHorarioFixoCliente,
  cadastrarProfissional,
  atualizarProfissional,
  vincularProfissionalAoServicoEndpoint,
  atualizarStatusAgendamento,
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

describe('[Backend] Proteger operações administrativas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const operacoesAdministrativas: Array<{
    name: string;
    handler: unknown;
    method: string;
    validBody?: Record<string, unknown>;
    query?: Record<string, unknown>;
  }> = [
    {
      name: 'atualizarHorariosFuncionamento',
      handler: atualizarHorariosFuncionamento,
      method: 'POST',
      validBody: {
        dias: [
          {
            diaSemana: 1,
            nomeDia: 'Segunda-feira',
            ativo: true,
            horarios: [{ inicio: '09:00', fim: '18:00' }],
          },
        ],
      },
    },
    {
      name: 'processarLembretes',
      handler: processarLembretes,
      method: 'POST',
      validBody: {},
    },
    {
      name: 'cadastrarServico',
      handler: cadastrarServico,
      method: 'POST',
      validBody: {
        nome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        preco: 120,
        descricao: 'Massagem relaxante com óleos essenciais.',
      },
    },
    {
      name: 'editarServico',
      handler: editarServico,
      method: 'POST',
      validBody: {
        id: 'serv-1',
        nome: 'Massagem Relaxante Atualizada',
        duracaoMinutos: 60,
        preco: 150,
      },
    },
    {
      name: 'desativarServico',
      handler: desativarServico,
      method: 'POST',
      validBody: { id: 'serv-1' },
    },
    {
      name: 'reativarServico',
      handler: reativarServico,
      method: 'POST',
      validBody: { id: 'serv-1' },
    },
    {
      name: 'excluirServico',
      handler: excluirServico,
      method: 'POST',
      validBody: { id: 'serv-1' },
    },
    {
      name: 'atribuirFuncaoAdministrativa',
      handler: atribuirFuncaoAdministrativa,
      method: 'POST',
      validBody: { targetUid: 'target-user-123', admin: true },
    },
    {
      name: 'criarBloqueioAgenda',
      handler: criarBloqueioAgenda,
      method: 'POST',
      validBody: {
        tipo: 'unico',
        data: '2026-12-25',
        horaInicio: '08:00',
        horaFim: '18:00',
        motivo: 'Feriado de Natal',
      },
    },
    {
      name: 'removerBloqueioAgenda',
      handler: removerBloqueioAgenda,
      method: 'DELETE',
      query: { id: 'bloq-1' },
    },
    {
      name: 'alternarStatusBloqueioAgenda',
      handler: alternarStatusBloqueioAgenda,
      method: 'PATCH',
      validBody: { id: 'bloq-1', ativo: false },
    },
    {
      name: 'criarHorarioFixoCliente',
      handler: criarHorarioFixoCliente,
      method: 'POST',
      validBody: {
        clienteId: 'cliente-123',
        clienteNome: 'Maria Silva',
        diaSemana: 1,
        horaInicio: '10:00',
        horaFim: '11:00',
        frequencia: 'semanal',
        dataInicio: '2026-11-01',
        servicoId: 'serv-1',
      },
    },
    {
      name: 'removerHorarioFixoCliente',
      handler: removerHorarioFixoCliente,
      method: 'DELETE',
      query: { id: 'fixo-1' },
    },
    {
      name: 'atualizarHorarioFixoCliente',
      handler: atualizarHorarioFixoCliente,
      method: 'PUT',
      validBody: {
        id: 'fixo-1',
        diaSemana: 2,
        horaInicio: '14:00',
        horaFim: '15:00',
        frequencia: 'semanal',
      },
    },
    {
      name: 'cadastrarProfissional',
      handler: cadastrarProfissional,
      method: 'POST',
      validBody: {
        nome: 'Dra. Roberta Santos',
        especialidade: 'Fisioterapia e Acupuntura',
      },
    },
    {
      name: 'atualizarProfissional',
      handler: atualizarProfissional,
      method: 'PUT',
      validBody: {
        id: 'prof-tais-romagnoli',
        nome: 'Dra. Taís Romagnoli Atualizada',
      },
    },
    {
      name: 'vincularProfissionalAoServicoEndpoint',
      handler: vincularProfissionalAoServicoEndpoint,
      method: 'POST',
      validBody: {
        servicoId: 'serv-1',
        profissionalId: 'prof-tais-romagnoli',
        habilitado: true,
      },
    },
    {
      name: 'atualizarStatusAgendamento',
      handler: atualizarStatusAgendamento,
      method: 'POST',
      validBody: {
        agendamentoId: 'ag-1',
        novoStatus: 'falta',
        motivo: 'Cliente faltou',
      },
    },
  ];

  describe('Validação de token ausente (HTTP 401)', () => {
    operacoesAdministrativas.forEach(({ name, handler, method, validBody, query }) => {
      it(`rejeita ${name} com HTTP 401 quando o cabeçalho Authorization não é fornecido`, async () => {
        const req = createMockRequest({ method, headers: {}, body: validBody, query });
        const res = createMockResponse();

        await (handler as HttpHandler)(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body?.error).toContain('Acesso não autenticado');
      });

      it(`rejeita ${name} com HTTP 401 quando o cabeçalho Authorization não for Bearer`, async () => {
        const req = createMockRequest({
          method,
          headers: { authorization: 'Basic YWRtaW46c2VuaGE=' },
          body: validBody,
          query,
        });
        const res = createMockResponse();

        await (handler as HttpHandler)(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body?.error).toContain('Forneça o token Bearer');
      });
    });
  });

  describe('Validação de função admin / autorização de clientes comuns (HTTP 403)', () => {
    operacoesAdministrativas.forEach(({ name, handler, method, validBody, query }) => {
      it(`rejeita ${name} com HTTP 403 quando o usuário autenticado não é administradora`, async () => {
        // Mock do token de um cliente comum (sem claim admin)
        mockVerifyIdToken.mockResolvedValueOnce({
          uid: 'cliente-comum-uid',
          email: 'cliente@exemplo.com',
          role: 'client',
          admin: false,
        });

        const req = createMockRequest({
          method,
          headers: { authorization: 'Bearer token-cliente-valido' },
          body: validBody,
          query,
        });
        const res = createMockResponse();

        await (handler as HttpHandler)(req, res);

        expect(res.statusCode).toBe(403);
        expect(res.body?.error).toMatch(/permissão|negado|administrador/i);
      });
    });
  });

  describe('Permissão concedida para usuária administradora', () => {
    it('permite que administradora execute cadastrarServico', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-uid',
        email: 'admin@clinicataisromagnoli.com.br',
        role: 'admin',
        admin: true,
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-admin-valido' },
        body: {
          nome: 'Drenagem Linfática Teste',
          duracaoMinutos: 60,
          preco: 140,
          descricao: 'Drenagem linfática manual completa para desinchar.',
        },
      });
      const res = createMockResponse();

      await (cadastrarServico as HttpHandler)(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body?.mensagem).toContain('sucesso');
    });

    it('permite que administradora execute cadastrarProfissional', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-uid',
        email: 'admin@clinicataisromagnoli.com.br',
        role: 'admin',
        admin: true,
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-admin-valido' },
        body: {
          nome: 'Dra. Nova Profissional',
          especialidade: 'Estética Avançada',
        },
      });
      const res = createMockResponse();

      await (cadastrarProfissional as HttpHandler)(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body?.mensagem).toContain('sucesso');
    });

    it('permite que administradora execute criarBloqueioAgenda', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-uid',
        email: 'admin@clinicataisromagnoli.com.br',
        role: 'admin',
        admin: true,
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-admin-valido' },
        body: {
          tipo: 'unico',
          data: '2026-11-20',
          horaInicio: '09:00',
          horaFim: '12:00',
          motivo: 'Treinamento interno',
        },
      });
      const res = createMockResponse();

      await (criarBloqueioAgenda as HttpHandler)(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body?.mensagem).toContain('sucesso');
    });

    it('permite que administradora execute criarHorarioFixoCliente', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-uid',
        email: 'admin@clinicataisromagnoli.com.br',
        role: 'admin',
        admin: true,
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-admin-valido' },
        body: {
          clienteId: 'cliente-999',
          clienteNome: 'Paciente Recorrente',
          diaSemana: 3,
          horaInicio: '15:00',
          horaFim: '16:00',
          frequencia: 'semanal',
          dataInicio: '2026-11-01',
          servicoId: 'serv-1',
        },
      });
      const res = createMockResponse();

      await (criarHorarioFixoCliente as HttpHandler)(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body?.mensagem).toContain('sucesso');
    });

    it('permite que administradora execute atualizarStatusAgendamento', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-uid',
        email: 'admin@clinicataisromagnoli.com.br',
        role: 'admin',
        admin: true,
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-admin-valido' },
        body: {
          agendamentoId: 'item-1',
          novoStatus: 'falta',
          motivo: 'Paciente não compareceu',
        },
      });
      const res = createMockResponse();

      await (atualizarStatusAgendamento as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.mensagem).toContain('falta');
    });
  });
});
