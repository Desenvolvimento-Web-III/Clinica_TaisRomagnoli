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

import {
  listarAuditoriaAdmin,
  definirAuditoriaRepositoryParaTestes,
  InMemoryAuditoriaRepository,
  registrarAuditoria,
} from '../src/index.js';

type HttpHandler = (req: unknown, res: unknown) => Promise<void> | void;

interface MockResponse {
  statusCode: number;
  body: unknown;
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
      this.body = data;
      return this;
    },
    send(data: unknown) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    },
    on(event: string, cb: (...args: unknown[]) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      if (listeners[event]) {
        for (const cb of listeners[event]) {
          cb(...args);
        }
      }
    },
  };
  return res;
}

function callEndpoint(handler: unknown, req: Record<string, unknown>, res: MockResponse) {
  return (handler as HttpHandler)(req, res);
}

describe('Endpoint: listarAuditoriaAdmin', () => {
  let auditoriaRepo: InMemoryAuditoriaRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    auditoriaRepo = new InMemoryAuditoriaRepository();
    definirAuditoriaRepositoryParaTestes(auditoriaRepo);
  });

  it('rejeita método HTTP diferente de GET com código 405', async () => {
    const req = {
      method: 'POST',
      headers: {},
      query: {},
    };
    const res = createMockResponse();

    await callEndpoint(listarAuditoriaAdmin, req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'Método não permitido. Use GET.' });
  });

  it('rejeita requisição sem token de autenticação com código 401', async () => {
    const req = {
      method: 'GET',
      headers: {},
      query: {},
    };
    const res = createMockResponse();

    await callEndpoint(listarAuditoriaAdmin, req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: expect.stringContaining('token Bearer') });
  });

  it('rejeita usuário cliente sem privilégio administrativo com código 403', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'cliente-123',
      email: 'cliente@exemplo.com',
      role: 'cliente',
    });

    const req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token-cliente-valido',
      },
      query: {},
    };
    const res = createMockResponse();

    await callEndpoint(listarAuditoriaAdmin, req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ error: expect.stringContaining('Acesso negado') });
  });

  it('permite consulta para administradora e retorna registros de auditoria com status 200', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'admin-tais',
      email: 'admin@clinicataisromagnoli.com.br',
      role: 'admin',
    });

    // Insere registros no repositório de teste
    await registrarAuditoria(
      {
        usuarioId: 'admin-tais',
        usuarioEmail: 'admin@clinicataisromagnoli.com.br',
        usuarioRole: 'admin',
        acao: 'servico.cadastrado',
        recurso: 'servicos',
        recursoId: 'serv-01',
        dadosAfetados: { nome: 'Massagem Desportiva' },
      },
      auditoriaRepo,
    );

    const req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token-admin-valido',
      },
      query: {},
    };
    const res = createMockResponse();

    await callEndpoint(listarAuditoriaAdmin, req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      sucesso: true,
      dados: expect.arrayContaining([
        expect.objectContaining({
          usuarioId: 'admin-tais',
          acao: 'servico.cadastrado',
          recurso: 'servicos',
          recursoId: 'serv-01',
        }),
      ]),
    });
  });

  it('aplica filtros de query como recurso e limite na consulta de auditoria', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'admin-tais',
      email: 'admin@clinicataisromagnoli.com.br',
      role: 'admin',
    });

    await registrarAuditoria(
      {
        usuarioId: 'admin-tais',
        acao: 'servico.cadastrado',
        recurso: 'servicos',
        recursoId: 'serv-1',
        dataHora: '2026-11-15T10:00:00.000Z',
        dadosAfetados: {},
      },
      auditoriaRepo,
    );

    await registrarAuditoria(
      {
        usuarioId: 'cliente-01',
        acao: 'agendamento.solicitado',
        recurso: 'agendamentos',
        recursoId: 'agend-1',
        dataHora: '2026-11-15T11:00:00.000Z',
        dadosAfetados: {},
      },
      auditoriaRepo,
    );

    const req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token-admin-valido',
      },
      query: {
        recurso: 'agendamentos',
        limite: '10',
      },
    };
    const res = createMockResponse();

    await callEndpoint(listarAuditoriaAdmin, req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as { sucesso: boolean; dados: Array<{ recurso: string }> };
    expect(body.sucesso).toBe(true);
    expect(body.dados).toHaveLength(1);
    expect(body.dados[0].recurso).toBe('agendamentos');
  });

  it('registra operação na trilha de auditoria via registrarAuditoriaOperacao', async () => {
    const { registrarAuditoriaOperacao } = await import('../src/index.js');

    await registrarAuditoriaOperacao({
      usuario: { uid: 'admin-tais', email: 'admin@clinica.com', role: 'admin' },
      acao: 'servico.editado',
      recurso: 'servicos',
      recursoId: 'serv-edit-1',
      dadosAfetados: { precoTotalEmCentavos: 18000 },
      ip: '10.0.0.1',
      userAgent: 'Mozilla/5.0 TestBrowser',
    });

    const logs = await auditoriaRepo.listar({ recurso: 'servicos' });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      usuarioId: 'admin-tais',
      usuarioEmail: 'admin@clinica.com',
      usuarioRole: 'admin',
      acao: 'servico.editado',
      recurso: 'servicos',
      recursoId: 'serv-edit-1',
      dadosAfetados: { precoTotalEmCentavos: 18000 },
      ip: '10.0.0.1',
      userAgent: 'Mozilla/5.0 TestBrowser',
    });
  });
});
