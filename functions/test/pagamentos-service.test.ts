import { describe, it, expect, beforeEach } from 'vitest';
import {
  gerarCobrancaSinalService,
  obterCobrancaSinalService,
  listarPagamentosClienteService,
  confirmarPagamentoSinalService,
  PagamentoBusinessError,
} from '../src/modules/pagamentos/pagamentos-service.js';
import { InMemoryPagamentosRepository } from '../src/modules/pagamentos/pagamentos-repository.js';
import { InMemoryServicosRepository } from '../src/modules/servicos/servicos-repository.js';
import { InMemoryAgendamentosRepository } from '../src/modules/agendamentos/agendamentos-repository.js';
import { InMemoryAuditoriaRepository } from '../src/modules/auditoria/auditoria-repository.js';
import type { ServicoDatabase, Agendamento } from '@clinica/shared';

describe('Serviço de Pagamento do Sinal de 30% (pagamentos-service)', () => {
  let pagamentosRepo: InMemoryPagamentosRepository;
  let servicosRepo: InMemoryServicosRepository;
  let agendamentosRepo: InMemoryAgendamentosRepository;
  let auditoriaRepo: InMemoryAuditoriaRepository;

  const mockClienteUser = {
    uid: 'cliente-mariana-1',
    nome: 'Mariana Souza',
    email: 'mariana@exemplo.com',
    telefone: '(11) 98765-4321',
    isAdmin: false,
  };

  const mockAdminUser = {
    uid: 'admin-tais-1',
    nome: 'Tais Romagnoli',
    email: 'admin@clinicataisromagnoli.com.br',
    isAdmin: true,
  };

  const servicoRelaxante: ServicoDatabase = {
    id: 'massagem-relaxante',
    nome: 'Massagem Relaxante',
    duracaoMinutos: 60,
    preco: 180,
    precoEmCentavos: 18000,
    sinal: 54, // 30% de 180
    sinalEmCentavos: 5400,
    sinalPercentual: 30,
    descricao: 'Massagem relaxante com óleos essenciais',
    ativo: true,
    profissionaisHabilitados: ['prof-tais-romagnoli'],
    profissionalPadraoId: 'prof-tais-romagnoli',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    pagamentosRepo = new InMemoryPagamentosRepository();
    servicosRepo = new InMemoryServicosRepository();
    agendamentosRepo = new InMemoryAgendamentosRepository();
    auditoriaRepo = new InMemoryAuditoriaRepository();

    await servicosRepo.salvar(servicoRelaxante);
  });

  describe('gerarCobrancaSinalService', () => {
    it('gera cobrança do sinal de exatamente 30% com base no valor do serviço cadastrado', async () => {
      const input = {
        servicoId: 'massagem-relaxante',
        metodoPagamento: 'pix' as const,
      };

      const cobranca = await gerarCobrancaSinalService(
        input,
        mockClienteUser,
        pagamentosRepo,
        servicosRepo,
        agendamentosRepo,
        auditoriaRepo,
      );

      expect(cobranca.id).toBeDefined();
      expect(cobranca.clienteId).toBe('cliente-mariana-1');
      expect(cobranca.clienteNome).toBe('Mariana Souza');
      expect(cobranca.servicoId).toBe('massagem-relaxante');
      expect(cobranca.servicoNome).toBe('Massagem Relaxante');
      expect(cobranca.valorTotalEmCentavos).toBe(18000); // R$ 180,00
      expect(cobranca.percentualSinal).toBe(30);
      expect(cobranca.valorSinalEmCentavos).toBe(5400); // 30% = R$ 54,00
      expect(cobranca.saldoRestanteEmCentavos).toBe(12600); // 70% = R$ 126,00
      expect(cobranca.metodoPagamento).toBe('pix');
      expect(cobranca.status).toBe('pendente');
      expect(cobranca.dadosCobranca.metodo).toBe('pix');
      expect(cobranca.dadosCobranca.chavePix).toBe('financeiro@clinicataisromagnoli.com.br');
      expect(cobranca.dadosCobranca.codigoPixCopiaECola).toContain('BR.GOV.BCB.PIX');

      // Verifica persistência no repositório
      const salvo = await pagamentosRepo.buscarPorId(cobranca.id);
      expect(salvo).toEqual(cobranca);

      // Verifica auditoria
      const logs = await auditoriaRepo.listar({ acao: 'pagamento.cobranca_gerada' });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.recursoId).toBe(cobranca.id);
      expect(logs[0]?.dadosAfetados?.['valorSinalEmCentavos']).toBe(5400);
    });

    it('gera cobrança para boleto bancário com linha digitável e instruções', async () => {
      const input = {
        servicoId: 'massagem-relaxante',
        metodoPagamento: 'boleto' as const,
      };

      const cobranca = await gerarCobrancaSinalService(
        input,
        mockClienteUser,
        pagamentosRepo,
        servicosRepo,
      );

      expect(cobranca.metodoPagamento).toBe('boleto');
      expect(cobranca.status).toBe('pendente');
      expect(cobranca.dadosCobranca.linhaDigitavelBoleto).toBeDefined();
      expect(cobranca.dadosCobranca.instrucoes).toContain('R$ 54,00');
    });

    it('gera cobrança autorizada para cartão de crédito com status pago', async () => {
      const input = {
        servicoId: 'massagem-relaxante',
        metodoPagamento: 'cartao' as const,
      };

      const cobranca = await gerarCobrancaSinalService(
        input,
        mockClienteUser,
        pagamentosRepo,
        servicosRepo,
      );

      expect(cobranca.metodoPagamento).toBe('cartao');
      expect(cobranca.status).toBe('pago');
      expect(cobranca.pagoEm).toBeDefined();
    });

    it('permite que a administradora gere cobrança para outro cliente', async () => {
      const input = {
        servicoId: 'massagem-relaxante',
        clienteId: 'cliente-joao-2',
        clienteNome: 'João Pedro',
        clienteEmail: 'joao@exemplo.com',
        metodoPagamento: 'pix' as const,
      };

      const cobranca = await gerarCobrancaSinalService(
        input,
        mockAdminUser,
        pagamentosRepo,
        servicosRepo,
      );

      expect(cobranca.clienteId).toBe('cliente-joao-2');
      expect(cobranca.clienteNome).toBe('João Pedro');
    });

    it('impede que cliente comum gere cobrança para outro cliente (HTTP 403)', async () => {
      const input = {
        servicoId: 'massagem-relaxante',
        clienteId: 'cliente-outro-3',
        metodoPagamento: 'pix' as const,
      };

      await expect(
        gerarCobrancaSinalService(input, mockClienteUser, pagamentosRepo, servicosRepo),
      ).rejects.toThrow(PagamentoBusinessError);

      try {
        await gerarCobrancaSinalService(input, mockClienteUser, pagamentosRepo, servicosRepo);
      } catch (err) {
        expect((err as PagamentoBusinessError).statusCode).toBe(403);
      }
    });

    it('bloqueia cobrança se o serviço não existir no catálogo (HTTP 404)', async () => {
      const input = {
        servicoId: 'servico-inexistente',
        metodoPagamento: 'pix' as const,
      };

      await expect(
        gerarCobrancaSinalService(input, mockClienteUser, pagamentosRepo, servicosRepo),
      ).rejects.toThrow(PagamentoBusinessError);
    });

    it('bloqueia cobrança se o serviço estiver desativado (HTTP 422)', async () => {
      await servicosRepo.salvar({
        ...servicoRelaxante,
        id: 'servico-desativado',
        ativo: false,
      });

      const input = {
        servicoId: 'servico-desativado',
        metodoPagamento: 'pix' as const,
      };

      await expect(
        gerarCobrancaSinalService(input, mockClienteUser, pagamentosRepo, servicosRepo),
      ).rejects.toThrow(PagamentoBusinessError);
    });
  });

  describe('obterCobrancaSinalService', () => {
    it('permite que o cliente titular consulte sua própria cobrança', async () => {
      const cobranca = await gerarCobrancaSinalService(
        { servicoId: 'massagem-relaxante', metodoPagamento: 'pix' as const },
        mockClienteUser,
        pagamentosRepo,
        servicosRepo,
      );

      const consultada = await obterCobrancaSinalService(
        cobranca.id,
        mockClienteUser,
        pagamentosRepo,
      );
      expect(consultada.id).toBe(cobranca.id);
    });

    it('permite que a administradora consulte qualquer cobrança', async () => {
      const cobranca = await gerarCobrancaSinalService(
        { servicoId: 'massagem-relaxante', metodoPagamento: 'pix' as const },
        mockClienteUser,
        pagamentosRepo,
        servicosRepo,
      );

      const consultada = await obterCobrancaSinalService(
        cobranca.id,
        mockAdminUser,
        pagamentosRepo,
      );
      expect(consultada.id).toBe(cobranca.id);
    });

    it('bloqueia acesso quando outro cliente tenta consultar cobrança alheia (HTTP 403)', async () => {
      const cobranca = await gerarCobrancaSinalService(
        { servicoId: 'massagem-relaxante', metodoPagamento: 'pix' as const },
        mockClienteUser,
        pagamentosRepo,
        servicosRepo,
      );

      const outroCliente = {
        uid: 'cliente-estranho-99',
        nome: 'Estranho',
        isAdmin: false,
      };

      await expect(
        obterCobrancaSinalService(cobranca.id, outroCliente, pagamentosRepo),
      ).rejects.toThrow(PagamentoBusinessError);
    });
  });

  describe('listarPagamentosClienteService', () => {
    it('lista todos os pagamentos e cobranças de um cliente', async () => {
      await gerarCobrancaSinalService(
        { servicoId: 'massagem-relaxante', metodoPagamento: 'pix' as const },
        mockClienteUser,
        pagamentosRepo,
        servicosRepo,
      );

      const lista = await listarPagamentosClienteService(
        mockClienteUser.uid,
        mockClienteUser,
        pagamentosRepo,
      );

      expect(lista).toHaveLength(1);
      expect(lista[0]?.clienteId).toBe(mockClienteUser.uid);
    });
  });

  describe('confirmarPagamentoSinalService', () => {
    it('confirma pagamento do sinal e atualiza status do agendamento vinculado para confirmado', async () => {
      // Cria agendamento pendente
      const agendamentoMock: Agendamento = {
        id: 'ag-teste-1',
        clienteId: mockClienteUser.uid,
        clienteNome: mockClienteUser.nome,
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 18000,
        valorSinalEmCentavos: 5400,
        saldoRestanteEmCentavos: 12600,
        dataHoraInicio: '2026-12-01T10:00:00.000Z',
        dataHoraFim: '2026-12-01T11:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-tais-romagnoli',
        profissionalNome: 'Tais Romagnoli',
        status: 'pendente',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await agendamentosRepo.salvar(agendamentoMock);

      // Cria cobrança vinculada
      const cobranca = await gerarCobrancaSinalService(
        {
          servicoId: 'massagem-relaxante',
          agendamentoId: 'ag-teste-1',
          metodoPagamento: 'pix' as const,
        },
        mockClienteUser,
        pagamentosRepo,
        servicosRepo,
        agendamentosRepo,
      );

      expect(cobranca.status).toBe('pendente');

      // Confirma pagamento
      const confirmada = await confirmarPagamentoSinalService(
        {
          cobrancaId: cobranca.id,
          observacoes: 'Comprovante Pix recebido e conferido.',
        },
        mockAdminUser,
        pagamentosRepo,
        agendamentosRepo,
        auditoriaRepo,
      );

      expect(confirmada.status).toBe('pago');
      expect(confirmada.pagoEm).toBeDefined();

      // Verifica se o agendamento vinculado agora está 'confirmado'
      const agendamentoAtualizado = await agendamentosRepo.buscarPorId('ag-teste-1');
      expect(agendamentoAtualizado?.status).toBe('confirmado');
      expect(agendamentoAtualizado?.reservaExpiraEm).toBeUndefined();
      expect(agendamentoAtualizado?.cobrancaSinalId).toBe(cobranca.id);

      // Verifica auditoria
      const logs = await auditoriaRepo.listar({ acao: 'pagamento.sinal_confirmado' });
      expect(logs).toHaveLength(1);
    });

    it('impede gerar cobrança vinculada quando a reserva temporária do agendamento já expirou', async () => {
      const agendamentoExpirado: Agendamento = {
        id: 'ag-expirado-1',
        clienteId: 'cliente-mariana-1',
        clienteNome: 'Mariana Souza',
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        valorSinalEmCentavos: 5100,
        saldoRestanteEmCentavos: 11900,
        dataHoraInicio: '2026-11-25T14:00:00.000Z',
        dataHoraFim: '2026-11-25T15:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-tais-romagnoli',
        profissionalNome: 'Tais Romagnoli',
        status: 'pendente',
        reservaExpiraEm: '2026-11-20T10:00:00.000Z', // no passado
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-11-20T09:45:00.000Z',
        updatedAt: '2026-11-20T09:45:00.000Z',
      };
      await agendamentosRepo.salvar(agendamentoExpirado);

      await expect(
        gerarCobrancaSinalService(
          {
            servicoId: 'massagem-relaxante',
            agendamentoId: 'ag-expirado-1',
            metodoPagamento: 'pix' as const,
          },
          mockClienteUser,
          pagamentosRepo,
          servicosRepo,
          agendamentosRepo,
        ),
      ).rejects.toThrow('A reserva temporária deste agendamento já expirou');
    });

    it('impede confirmar pagamento quando a reserva temporária vinculada ao agendamento já expirou', async () => {
      const agendamentoMock: Agendamento = {
        id: 'ag-expira-teste',
        clienteId: 'cliente-mariana-1',
        clienteNome: 'Mariana Souza',
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        valorSinalEmCentavos: 5100,
        saldoRestanteEmCentavos: 11900,
        dataHoraInicio: '2026-11-25T14:00:00.000Z',
        dataHoraFim: '2026-11-25T15:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-tais-romagnoli',
        profissionalNome: 'Tais Romagnoli',
        status: 'pendente',
        reservaExpiraEm: '2026-11-25T13:30:00.000Z',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-11-25T13:15:00.000Z',
        updatedAt: '2026-11-25T13:15:00.000Z',
      };
      await agendamentosRepo.salvar(agendamentoMock);

      const cobranca = await pagamentosRepo.salvar({
        id: 'cob-expira-1',
        clienteId: 'cliente-mariana-1',
        clienteNome: 'Mariana Souza',
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        agendamentoId: 'ag-expira-teste',
        valorTotalEmCentavos: 17000,
        percentualSinal: 30,
        valorSinalEmCentavos: 5100,
        saldoRestanteEmCentavos: 11900,
        metodoPagamento: 'pix',
        status: 'pendente',
        dadosCobranca: {
          metodo: 'pix',
          instrucoes: 'Pagar Pix',
        },
        expiraEmIso: '2026-11-26T14:00:00.000Z',
        createdAt: '2026-11-25T13:15:00.000Z',
        updatedAt: '2026-11-25T13:15:00.000Z',
      });

      const agoraDepois = new Date('2026-11-25T13:40:00.000Z');

      await expect(
        confirmarPagamentoSinalService(
          { cobrancaId: cobranca.id },
          mockAdminUser,
          pagamentosRepo,
          agendamentosRepo,
          auditoriaRepo,
          agoraDepois,
        ),
      ).rejects.toThrow('O tempo limite para pagamento do sinal desta reserva expirou');
    });
  });
});
