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
  batch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
};
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
}));

import {
  gerarCobrancaSinal,
  obterCobrancaSinal,
  listarMeusPagamentos,
  confirmarPagamentoSinal,
  definirPagamentosRepositoryParaTestes,
  definirServicosRepositoryParaTestes,
  definirAuditoriaRepositoryParaTestes,
  InMemoryPagamentosRepository,
  InMemoryAuditoriaRepository,
} from '../src/index.js';
import { InMemoryServicosRepository } from '../src/modules/servicos/servicos-repository.js';
import type { ServicoDatabase } from '@clinica/shared';

type HttpHandler = (req: unknown, res: unknown) => Promise<void> | void;

interface ResponseBody {
  error?: string;
  mensagem?: string;
  sucesso?: boolean;
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

describe('Endpoints HTTP de Pagamento e Cobrança do Sinal de 30%', () => {
  let pagamentosRepo: InMemoryPagamentosRepository;
  let servicosRepo: InMemoryServicosRepository;
  let auditoriaRepo: InMemoryAuditoriaRepository;

  const mockServico: ServicoDatabase = {
    id: 'massagem-terapeutica',
    nome: 'Massagem Terapêutica',
    duracaoMinutos: 60,
    preco: 200,
    precoEmCentavos: 20000,
    sinal: 60, // 30% de 200
    sinalEmCentavos: 6000,
    sinalPercentual: 30,
    descricao: 'Alívio profundo de dores musculares',
    ativo: true,
    profissionaisHabilitados: ['prof-tais-romagnoli'],
    profissionalPadraoId: 'prof-tais-romagnoli',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    pagamentosRepo = new InMemoryPagamentosRepository();
    servicosRepo = new InMemoryServicosRepository();
    auditoriaRepo = new InMemoryAuditoriaRepository();

    await servicosRepo.salvar(mockServico);

    definirPagamentosRepositoryParaTestes(pagamentosRepo);
    definirServicosRepositoryParaTestes(servicosRepo);
    definirAuditoriaRepositoryParaTestes(auditoriaRepo);
  });

  describe('POST /gerarCobrancaSinal', () => {
    it('retorna 405 se método for diferente de POST', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await (gerarCobrancaSinal as unknown as HttpHandler)(req, res);
      expect(res.statusCode).toBe(405);
      expect(res.body?.error).toContain('Método não permitido');
    });

    it('retorna 401 se não houver autenticação no cabeçalho', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: {},
        body: { servicoId: 'massagem-terapeutica' },
      });
      const res = createMockResponse();

      await (gerarCobrancaSinal as unknown as HttpHandler)(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('gera com sucesso cobrança de sinal de 30% com base no valor do serviço cadastrado (201)', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-mariana-10',
        name: 'Mariana Silva',
        email: 'mariana@exemplo.com',
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-valido' },
        body: {
          servicoId: 'massagem-terapeutica',
          metodoPagamento: 'pix',
        },
      });
      const res = createMockResponse();

      await (gerarCobrancaSinal as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body?.sucesso).toBe(true);
      expect(res.body?.mensagem).toContain('Cobrança do sinal de 30% gerada com sucesso');

      const dados = res.body?.dados as Record<string, unknown>;
      expect(dados).toBeDefined();
      expect(dados['clienteId']).toBe('cliente-mariana-10');
      expect(dados['servicoId']).toBe('massagem-terapeutica');
      expect(dados['valorTotalEmCentavos']).toBe(20000); // R$ 200,00
      expect(dados['percentualSinal']).toBe(30);
      expect(dados['valorSinalEmCentavos']).toBe(6000); // R$ 60,00 (30%)
      expect(dados['saldoRestanteEmCentavos']).toBe(14000); // R$ 140,00
      expect(dados['metodoPagamento']).toBe('pix');
      expect(dados['status']).toBe('pendente');
    });

    it('retorna 404 se o serviço informado não for encontrado no catálogo', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-mariana-10',
        name: 'Mariana Silva',
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-valido' },
        body: {
          servicoId: 'servico-fantasma',
          metodoPagamento: 'pix',
        },
      });
      const res = createMockResponse();

      await (gerarCobrancaSinal as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body?.error).toContain('não encontrado');
    });

    it('retorna 403 se cliente comum tentar gerar cobrança para outro cliente', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-mariana-10',
        name: 'Mariana Silva',
      });

      const req = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-valido' },
        body: {
          servicoId: 'massagem-terapeutica',
          clienteId: 'cliente-outro-99',
          metodoPagamento: 'pix',
        },
      });
      const res = createMockResponse();

      await (gerarCobrancaSinal as unknown as HttpHandler)(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body?.error).toContain('Acesso negado');
    });
  });

  describe('GET /obterCobrancaSinal', () => {
    it('retorna 405 se método for diferente de GET', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      await (obterCobrancaSinal as unknown as HttpHandler)(req, res);
      expect(res.statusCode).toBe(405);
    });

    it('retorna 400 se cobrancaId não for fornecido na query', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({ uid: 'cliente-mariana-10' });

      const req = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer token-valido' },
        query: {},
      });
      const res = createMockResponse();

      await (obterCobrancaSinal as unknown as HttpHandler)(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain('cobrancaId é obrigatório');
    });

    it('retorna a cobrança com sucesso quando consultada pelo titular (200)', async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-mariana-10',
        name: 'Mariana Silva',
      });

      // Primeiro gera a cobrança
      const reqGerar = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-valido' },
        body: { servicoId: 'massagem-terapeutica', metodoPagamento: 'pix' },
      });
      const resGerar = createMockResponse();
      await (gerarCobrancaSinal as unknown as HttpHandler)(reqGerar, resGerar);

      const cobrancaCriada = resGerar.body?.dados as { id: string };

      // Consulta a cobrança gerada
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-mariana-10',
        name: 'Mariana Silva',
      });

      const reqConsulta = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer token-valido' },
        query: { cobrancaId: cobrancaCriada.id },
      });
      const resConsulta = createMockResponse();

      await (obterCobrancaSinal as unknown as HttpHandler)(reqConsulta, resConsulta);

      expect(resConsulta.statusCode).toBe(200);
      expect(resConsulta.body?.sucesso).toBe(true);
      expect((resConsulta.body?.dados as { id: string }).id).toBe(cobrancaCriada.id);
    });
  });

  describe('GET /listarMeusPagamentos', () => {
    it('retorna 200 e lista os pagamentos do cliente autenticado', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'cliente-mariana-10',
        name: 'Mariana Silva',
      });

      // Gera cobrança
      const reqGerar = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-valido' },
        body: { servicoId: 'massagem-terapeutica', metodoPagamento: 'pix' },
      });
      const resGerar = createMockResponse();
      await (gerarCobrancaSinal as unknown as HttpHandler)(reqGerar, resGerar);

      // Lista pagamentos
      const reqListar = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer token-valido' },
      });
      const resListar = createMockResponse();
      await (listarMeusPagamentos as unknown as HttpHandler)(reqListar, resListar);

      expect(resListar.statusCode).toBe(200);
      expect(resListar.body?.sucesso).toBe(true);
      expect(Array.isArray(resListar.body?.dados)).toBe(true);
      expect((resListar.body?.dados as unknown[]).length).toBe(1);
    });
  });

  describe('POST /confirmarPagamentoSinal', () => {
    it('permite que a administradora confirme o recebimento do sinal', async () => {
      // Gera cobrança como cliente
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'cliente-mariana-10',
        name: 'Mariana Silva',
      });
      const reqGerar = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer token-valido' },
        body: { servicoId: 'massagem-terapeutica', metodoPagamento: 'pix' },
      });
      const resGerar = createMockResponse();
      await (gerarCobrancaSinal as unknown as HttpHandler)(reqGerar, resGerar);
      const cobrancaId = (resGerar.body?.dados as { id: string }).id;

      // Confirma como administradora
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'admin-tais',
        name: 'Tais Romagnoli',
        role: 'admin',
      });

      const reqConfirmar = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer admin-token' },
        body: {
          cobrancaId,
          observacoes: 'Recebido via Pix conferido no extrato bancário',
        },
      });
      const resConfirmar = createMockResponse();

      await (confirmarPagamentoSinal as unknown as HttpHandler)(reqConfirmar, resConfirmar);

      expect(resConfirmar.statusCode).toBe(200);
      expect(resConfirmar.body?.sucesso).toBe(true);
      expect((resConfirmar.body?.dados as { status: string }).status).toBe('pago');
    });
  });
});
