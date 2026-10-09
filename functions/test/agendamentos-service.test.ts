import { describe, it, expect, beforeEach } from 'vitest';
import {
  solicitarNovoAgendamento,
  cancelarAgendamentoExistente,
  listarAgendamentos,
  AgendamentoBusinessError,
  type UserContext,
} from '../src/modules/agendamentos/agendamentos-service.js';
import { InMemoryAgendamentosRepository } from '../src/modules/agendamentos/agendamentos-repository.js';

describe('Agendamentos Service (Functions Backend)', () => {
  let repo: InMemoryAgendamentosRepository;

  const clienteUser: UserContext = {
    uid: 'user-cliente-1',
    nome: 'Mariana Souza',
    email: 'mariana@exemplo.com',
    telefone: '(11) 98888-7777',
    isAdmin: false,
  };

  const adminUser: UserContext = {
    uid: 'admin-tais-1',
    nome: 'Tais Romagnoli',
    email: 'admin@clinicataisromagnoli.com.br',
    isAdmin: true,
  };

  beforeEach(() => {
    repo = new InMemoryAgendamentosRepository();
  });

  describe('solicitarNovoAgendamento', () => {
    it('cria agendamento com sucesso para cliente com sinal de 30% e status pendente', async () => {
      // Quinta-feira (22 de Outubro de 2026) - Dia ativo na clínica
      const input = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix' as const,
      };

      const agendamento = await solicitarNovoAgendamento(input, clienteUser, repo);

      expect(agendamento.id).toBeDefined();
      expect(agendamento.clienteId).toBe('user-cliente-1');
      expect(agendamento.clienteNome).toBe('Mariana Souza');
      expect(agendamento.valorTotalEmCentavos).toBe(17000);
      expect(agendamento.valorSinalEmCentavos).toBe(5100); // 30%
      expect(agendamento.saldoRestanteEmCentavos).toBe(11900); // 70%
      expect(agendamento.status).toBe('pendente');
      expect(agendamento.sinalIsento).toBe(false);
      expect(agendamento.origem).toBe('app_cliente');
      expect(agendamento.intervaloAposMinutos).toBe(30);
      expect(agendamento.dataHoraFim).toBe('2026-10-22T11:00:00.000Z');
    });

    it('permite que a administradora crie agendamento presencial isento de sinal e confirmado', async () => {
      const input = {
        servicoId: 'drenagem-linfatica',
        servicoNome: 'Drenagem Linfática',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 18000,
        dataHoraInicio: '2026-10-22T14:00:00.000Z',
        metodoPagamento: 'dinheiro' as const,
        isencaoSinalAdmin: true,
      };

      const agendamento = await solicitarNovoAgendamento(input, adminUser, repo);

      expect(agendamento.valorSinalEmCentavos).toBe(0);
      expect(agendamento.saldoRestanteEmCentavos).toBe(18000);
      expect(agendamento.sinalIsento).toBe(true);
      expect(agendamento.status).toBe('confirmado');
      expect(agendamento.origem).toBe('presencial_admin');
    });

    it('rejeita agendamento em dia de folga da clínica (ex: Domingo ou Terça-feira)', async () => {
      // 2026-10-25 é Domingo (dia 0 = inativo)
      const inputDomingo = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-25T10:00:00.000Z',
        metodoPagamento: 'pix' as const,
      };

      await expect(solicitarNovoAgendamento(inputDomingo, clienteUser, repo)).rejects.toThrow(
        /folga cadastrada/i,
      );
    });

    it('rejeita agendamento quando há conflito de horário incluindo o intervalo de 30min', async () => {
      // Cria primeiro agendamento: 10:00 às 11:00 (com intervalo até 11:30)
      const input1 = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix' as const,
      };
      await solicitarNovoAgendamento(input1, clienteUser, repo);

      // Tenta agendar às 11:15 (conflita com intervalo de 30 min pós-sessão)
      const input2 = {
        servicoId: 'massagem-terapeutica',
        servicoNome: 'Massagem Terapêutica',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 19000,
        dataHoraInicio: '2026-10-22T11:15:00.000Z',
        metodoPagamento: 'cartao' as const,
      };

      await expect(solicitarNovoAgendamento(input2, clienteUser, repo)).rejects.toThrow(
        /não está disponível devido a outro agendamento ou intervalo de manutenção/i,
      );
    });

    it('permite novo agendamento após o término do anterior + 30 min de intervalo', async () => {
      // Primeiro agendamento: 10:00 às 11:00 (intervalo até 11:30)
      await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T10:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Segundo agendamento às 11:30 (exatamente após os 30 min de intervalo)
      const agendamento2 = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-terapeutica',
          servicoNome: 'Massagem Terapêutica',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 19000,
          dataHoraInicio: '2026-10-22T11:30:00.000Z',
          metodoPagamento: 'cartao' as const,
        },
        clienteUser,
        repo,
      );

      expect(agendamento2.id).toBeDefined();
    });
  });

  describe('cancelarAgendamentoExistente', () => {
    it('cancela agendamento com mais de 3 horas de antecedência liberando o sinal', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Cancelamento às 09:00 (5 horas antes do horário das 14:00)
      const dataReferencia = new Date('2026-10-22T09:00:00.000Z');

      const cancelado = await cancelarAgendamentoExistente(
        { agendamentoId: agendamento.id, motivo: 'Imprevisto' },
        clienteUser,
        repo,
        dataReferencia,
      );

      expect(cancelado.status).toBe('cancelado');
      expect(cancelado.sinalRetido).toBe(false);
      expect(cancelado.motivoCancelamento).toBe('Imprevisto');
    });

    it('cancela agendamento com menos de 3 horas de antecedência retendo o sinal', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Cancelamento às 12:30 (1h30 antes do horário das 14:00)
      const dataReferencia = new Date('2026-10-22T12:30:00.000Z');

      const cancelado = await cancelarAgendamentoExistente(
        { agendamentoId: agendamento.id, motivo: 'Cancelamento tardio' },
        clienteUser,
        repo,
        dataReferencia,
      );

      expect(cancelado.status).toBe('cancelado');
      expect(cancelado.sinalRetido).toBe(true); // Retém sinal conforme regra de produto
    });

    it('impede que outro cliente cancele agendamento alheio', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      const outroCliente: UserContext = {
        uid: 'user-hacker-2',
        nome: 'Outro Usuário',
        isAdmin: false,
      };

      await expect(
        cancelarAgendamentoExistente({ agendamentoId: agendamento.id }, outroCliente, repo),
      ).rejects.toThrow(AgendamentoBusinessError);
    });
  });

  describe('listarAgendamentos', () => {
    it('retorna apenas os agendamentos do cliente solicitante', async () => {
      await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T10:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      const lista = await listarAgendamentos(clienteUser, undefined, repo);
      expect(lista).toHaveLength(1);
      expect(lista[0]?.clienteId).toBe('user-cliente-1');
    });
  });
});
