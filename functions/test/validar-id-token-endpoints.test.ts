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
const mockDocGet = vi.fn().mockResolvedValue({ exists: true, data: () => ({}) });
const mockSubCollection = {
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue({ docs: [] }),
};
const mockDoc = {
  set: mockDocSet,
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
  solicitarAgendamento,
  alterarAgendamento,
  cancelarAgendamento,
  listarMeusAgendamentos,
  listarMinhasNotificacoes,
  marcarNotificacaoLida,
  processarLembretes,
  cadastrarServico,
  editarServico,
  desativarServico,
  reativarServico,
  excluirServico,
  criarPerfil,
  obterPerfil,
  atribuirFuncaoAdministrativa,
  consultarCustomClaims,
  inicializarContaAdministradora,
  revogarSessoes,
  iniciarSessaoUnica,
  consultarSessao,
  criarBloqueioAgenda,
  listarBloqueiosAgenda,
  removerBloqueioAgenda,
  alternarStatusBloqueioAgenda,
  criarHorarioFixoCliente,
  listarHorariosFixosClientes,
  removerHorarioFixoCliente,
  atualizarHorarioFixoCliente,
  cadastrarProfissional,
  atualizarProfissional,
  vincularProfissionalAoServicoEndpoint,
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

describe('[Backend] Validação de ID Token nas Cloud Functions protegidas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const protectedEndpoints: Array<{ name: string; handler: unknown; method: string }> = [
    {
      name: 'atualizarHorariosFuncionamento',
      handler: atualizarHorariosFuncionamento,
      method: 'POST',
    },
    { name: 'solicitarAgendamento', handler: solicitarAgendamento, method: 'POST' },
    { name: 'alterarAgendamento', handler: alterarAgendamento, method: 'POST' },
    { name: 'cancelarAgendamento', handler: cancelarAgendamento, method: 'POST' },
    { name: 'listarMeusAgendamentos', handler: listarMeusAgendamentos, method: 'GET' },
    { name: 'listarMinhasNotificacoes', handler: listarMinhasNotificacoes, method: 'GET' },
    { name: 'marcarNotificacaoLida', handler: marcarNotificacaoLida, method: 'POST' },
    { name: 'processarLembretes', handler: processarLembretes, method: 'POST' },
    { name: 'cadastrarServico', handler: cadastrarServico, method: 'POST' },
    { name: 'editarServico', handler: editarServico, method: 'POST' },
    { name: 'desativarServico', handler: desativarServico, method: 'POST' },
    { name: 'reativarServico', handler: reativarServico, method: 'POST' },
    { name: 'excluirServico', handler: excluirServico, method: 'POST' },
    { name: 'criarPerfil', handler: criarPerfil, method: 'POST' },
    { name: 'obterPerfil', handler: obterPerfil, method: 'GET' },
    { name: 'atribuirFuncaoAdministrativa', handler: atribuirFuncaoAdministrativa, method: 'POST' },
    { name: 'consultarCustomClaims', handler: consultarCustomClaims, method: 'GET' },
    {
      name: 'inicializarContaAdministradora',
      handler: inicializarContaAdministradora,
      method: 'POST',
    },
    { name: 'revogarSessoes', handler: revogarSessoes, method: 'POST' },
    { name: 'iniciarSessaoUnica', handler: iniciarSessaoUnica, method: 'POST' },
    { name: 'consultarSessao', handler: consultarSessao, method: 'GET' },
    { name: 'criarBloqueioAgenda', handler: criarBloqueioAgenda, method: 'POST' },
    { name: 'listarBloqueiosAgenda', handler: listarBloqueiosAgenda, method: 'GET' },
    { name: 'removerBloqueioAgenda', handler: removerBloqueioAgenda, method: 'DELETE' },
    {
      name: 'alternarStatusBloqueioAgenda',
      handler: alternarStatusBloqueioAgenda,
      method: 'PATCH',
    },
    { name: 'criarHorarioFixoCliente', handler: criarHorarioFixoCliente, method: 'POST' },
    { name: 'listarHorariosFixosClientes', handler: listarHorariosFixosClientes, method: 'GET' },
    { name: 'removerHorarioFixoCliente', handler: removerHorarioFixoCliente, method: 'DELETE' },
    { name: 'atualizarHorarioFixoCliente', handler: atualizarHorarioFixoCliente, method: 'PUT' },
    { name: 'cadastrarProfissional', handler: cadastrarProfissional, method: 'POST' },
    { name: 'atualizarProfissional', handler: atualizarProfissional, method: 'PUT' },
    {
      name: 'vincularProfissionalAoServicoEndpoint',
      handler: vincularProfissionalAoServicoEndpoint,
      method: 'POST',
    },
  ];

  describe('Rejeição quando o ID token não for fornecido', () => {
    protectedEndpoints.forEach(({ name, handler, method }) => {
      it(`bloqueia ${name} com HTTP 401 se cabeçalho Authorization estiver ausente`, async () => {
        const req = createMockRequest({ method, headers: {} });
        const res = createMockResponse();

        await (handler as HttpHandler)(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body?.error).toContain('Acesso não autenticado');
      });

      it(`bloqueia ${name} com HTTP 401 se cabeçalho Authorization for inválido (não-Bearer)`, async () => {
        const req = createMockRequest({
          method,
          headers: { authorization: 'Basic dXNlcjpzZW5oYQ==' },
        });
        const res = createMockResponse();

        await (handler as HttpHandler)(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body?.error).toContain('Forneça o token Bearer');
      });
    });
  });

  describe('Tratamento de status e erros de validação do ID token pelo Firebase Auth', () => {
    it('retorna HTTP 401 com mensagem descritiva quando o token estiver expirado', async () => {
      mockVerifyIdToken.mockRejectedValueOnce({ code: 'auth/id-token-expired' });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-expirado' },
      });
      const res = createMockResponse();

      await (solicitarAgendamento as HttpHandler)(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body?.error).toBe('Token de autenticação expirado. Faça login novamente.');
    });

    it('retorna HTTP 401 com mensagem descritiva quando o token for revogado', async () => {
      mockVerifyIdToken.mockRejectedValueOnce({ code: 'auth/id-token-revoked' });

      const req = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer token-revogado' },
      });
      const res = createMockResponse();

      await (listarMeusAgendamentos as HttpHandler)(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body?.error).toBe('Token de autenticação revogado. Faça login novamente.');
    });

    it('retorna HTTP 401 quando o token for malformado ou inválido', async () => {
      mockVerifyIdToken.mockRejectedValueOnce({ code: 'auth/invalid-id-token' });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-malformado' },
      });
      const res = createMockResponse();

      await (criarPerfil as HttpHandler)(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body?.error).toBe('Token de autenticação inválido.');
    });

    it('retorna HTTP 403 se o usuário associado ao token estiver desativado', async () => {
      mockVerifyIdToken.mockRejectedValueOnce({ code: 'auth/user-disabled' });

      const req = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer token-desativado' },
      });
      const res = createMockResponse();

      await (obterPerfil as HttpHandler)(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toBe('A conta do usuário foi desativada.');
    });

    it('permite a execução e decodifica o usuário quando o ID token for válido', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'user-valido-123',
        name: 'Cliente Satisfeito',
        email: 'cliente@teste.com',
        role: 'client',
        client: true,
      });

      const req = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer token-valido' },
      });
      const res = createMockResponse();

      await (listarMinhasNotificacoes as HttpHandler)(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockVerifyIdToken).toHaveBeenCalledWith('token-valido');
    });
  });
});
