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
import { cancelarAgendamento } from '../src/index.js';

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
    method: 'POST',
    headers: {},
    query: {},
    body: {},
    ...overrides,
  };
}

describe('cancelarAgendamento endpoint HTTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 405 se método for diferente de POST', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await (cancelarAgendamento as unknown as HttpHandler)(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body?.error).toContain('Método não permitido');
  });

  it('retorna 401 se cabeçalho Authorization for ausente', async () => {
    const req = createMockRequest({ method: 'POST', body: { agendamentoId: 'ag-1' } });
    const res = createMockResponse();

    await (cancelarAgendamento as unknown as HttpHandler)(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body?.error).toContain('Acesso não autenticado');
  });

  it('retorna 400 se agendamentoId não for fornecido', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'user-cliente',
      role: 'cliente',
    });

    const req = createMockRequest({
      method: 'POST',
      headers: { authorization: 'Bearer token-cliente' },
      body: {},
    });
    const res = createMockResponse();

    await (cancelarAgendamento as unknown as HttpHandler)(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body?.error).toContain('Dados da requisição inválidos');
  });

  it('retorna 404 se agendamento não existir', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'user-cliente',
      role: 'cliente',
    });

    mockFirestore.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValueOnce({ exists: false }),
      }),
    });

    const req = createMockRequest({
      method: 'POST',
      headers: { authorization: 'Bearer token-cliente' },
      body: { agendamentoId: 'ag-inexistente' },
    });
    const res = createMockResponse();

    await (cancelarAgendamento as unknown as HttpHandler)(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body?.error).toContain('Agendamento não encontrado');
  });

  it('retorna 403 se usuário tentar cancelar agendamento de outro cliente', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'user-outro-cliente',
      role: 'cliente',
    });

    mockFirestore.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValueOnce({
          exists: true,
          id: 'ag-1',
          data: () => ({
            clienteId: 'cliente-titular',
            status: 'confirmado',
            dataHoraInicio: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          }),
        }),
      }),
    });

    const req = createMockRequest({
      method: 'POST',
      headers: { authorization: 'Bearer token-outro' },
      body: { agendamentoId: 'ag-1' },
    });
    const res = createMockResponse();

    await (cancelarAgendamento as unknown as HttpHandler)(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body?.error).toContain('Acesso negado');
  });

  it('cancela com sucesso com antecedência >= 3h classificando como no_prazo e liberando sinal', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'cliente-titular',
      role: 'cliente',
    });

    // Agendamento marcado para 5 horas no futuro
    const dataFutura = new Date(Date.now() + 5 * 3600 * 1000).toISOString();

    const mockDocSet = vi.fn().mockResolvedValue(undefined);
    const mockDocUpdate = vi.fn().mockResolvedValue(undefined);
    const mockDocRef: Record<string, unknown> = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        id: 'ag-1',
        data: () => ({
          clienteId: 'cliente-titular',
          clienteNome: 'Mariana Souza',
          servicoNome: 'Massagem Relaxante',
          status: 'confirmado',
          dataHoraInicio: dataFutura,
          valorSinalEmCentavos: 5100,
        }),
      }),
      set: mockDocSet,
      update: mockDocUpdate,
    };
    mockDocRef['collection'] = vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDocRef),
    });

    mockFirestore.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDocRef),
    });

    const req = createMockRequest({
      method: 'POST',
      headers: { authorization: 'Bearer token-mariana' },
      body: { agendamentoId: 'ag-1', motivo: 'Mudança de planos' },
    });
    const res = createMockResponse();

    await (cancelarAgendamento as unknown as HttpHandler)(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.mensagem).toBe('Agendamento cancelado com sucesso.');
    const dados = res.body?.dados as Record<string, unknown>;
    expect(dados.status).toBe('cancelado');
    expect(dados.classificacaoCancelamento).toBe('no_prazo');
    expect(dados.sinalRetido).toBe(false);
    expect(dados.sinalDisponivelReagendamento).toBe(true);
  });

  it('cancela com sucesso com antecedência < 3h classificando como tardio e retendo sinal', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      uid: 'cliente-titular',
      role: 'cliente',
    });

    // Agendamento marcado para apenas 1 hora no futuro (tardio)
    const dataFutura = new Date(Date.now() + 1 * 3600 * 1000).toISOString();

    const mockDocSet = vi.fn().mockResolvedValue(undefined);
    const mockDocUpdate = vi.fn().mockResolvedValue(undefined);
    const mockDocRef: Record<string, unknown> = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        id: 'ag-1',
        data: () => ({
          clienteId: 'cliente-titular',
          clienteNome: 'Mariana Souza',
          servicoNome: 'Massagem Relaxante',
          status: 'confirmado',
          dataHoraInicio: dataFutura,
          valorSinalEmCentavos: 5100,
        }),
      }),
      set: mockDocSet,
      update: mockDocUpdate,
    };
    mockDocRef['collection'] = vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDocRef),
    });

    mockFirestore.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDocRef),
    });

    const req = createMockRequest({
      method: 'POST',
      headers: { authorization: 'Bearer token-mariana' },
      body: { agendamentoId: 'ag-1', motivo: 'Imprevisto de última hora' },
    });
    const res = createMockResponse();

    await (cancelarAgendamento as unknown as HttpHandler)(req, res);

    expect(res.statusCode).toBe(200);
    const dados = res.body?.dados as Record<string, unknown>;
    expect(dados.status).toBe('cancelado');
    expect(dados.classificacaoCancelamento).toBe('tardio');
    expect(dados.sinalRetido).toBe(true);
    expect(dados.sinalDisponivelReagendamento).toBe(false);
  });
});
