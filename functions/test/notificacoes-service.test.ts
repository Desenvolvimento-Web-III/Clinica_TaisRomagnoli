import { describe, it, expect, beforeEach } from 'vitest';
import type { Agendamento } from '@clinica/shared';
import { InMemoryNotificacoesRepository } from '../src/modules/notificacoes/notificacoes-repository.js';
import {
  criarNotificacaoConfirmacao,
  criarNotificacaoAlteracao,
  criarNotificacaoCancelamento,
  criarNotificacaoLembrete,
  processarLembretesAgendamentos,
  listarNotificacoesDoCliente,
  marcarNotificacaoComoLida,
  NotificacaoBusinessError,
} from '../src/modules/notificacoes/notificacoes-service.js';

describe('Serviço de Notificações Internas (Backend)', () => {
  let repo: InMemoryNotificacoesRepository;

  const mockAgendamento: Agendamento = {
    id: 'ag-test-1',
    clienteId: 'cliente-123',
    clienteNome: 'Fernanda Lima',
    clienteEmail: 'fernanda@exemplo.com',
    clienteTelefone: '11988887777',
    servicoId: 'serv-relaxante',
    servicoNome: 'Massagem Relaxante',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 18000,
    valorSinalEmCentavos: 5400,
    saldoRestanteEmCentavos: 12600,
    dataHoraInicio: '2026-10-25T14:00:00.000Z',
    dataHoraFim: '2026-10-25T15:00:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-tais',
    profissionalNome: 'Tais Romagnoli',
    status: 'confirmado',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
  };

  beforeEach(() => {
    repo = new InMemoryNotificacoesRepository();
  });

  describe('1. Confirmação', () => {
    it('cria notificação interna de confirmação de agendamento', async () => {
      const notif = await criarNotificacaoConfirmacao(mockAgendamento, repo);

      expect(notif.id).toContain('notif-conf-ag-test-1');
      expect(notif.destinatarioId).toBe('cliente-123');
      expect(notif.destinatarioTipo).toBe('cliente');
      expect(notif.evento).toBe('confirmacao');
      expect(notif.titulo).toContain('Sessão Confirmada: Massagem Relaxante');
      expect(notif.mensagem).toContain('Fernanda Lima');
      expect(notif.mensagem).toContain('10 minutos de antecedência');
      expect(notif.lida).toBe(false);

      const salvas = await repo.listarPorDestinatario('cliente-123');
      expect(salvas).toHaveLength(1);
      expect(salvas[0].id).toBe(notif.id);
    });
  });

  describe('2. Alteração', () => {
    it('cria notificação interna de alteração de horário informando datas nova e anterior', async () => {
      const agendamentoAlterado: Agendamento = {
        ...mockAgendamento,
        dataHoraInicio: '2026-10-26T16:00:00.000Z',
        dataHoraFim: '2026-10-26T17:00:00.000Z',
      };

      const notif = await criarNotificacaoAlteracao(
        agendamentoAlterado,
        '2026-10-25T14:00:00.000Z',
        repo,
        'Reagendamento solicitado pela cliente',
      );

      expect(notif.evento).toBe('alteracao');
      expect(notif.titulo).toContain('Agendamento Alterado');
      expect(notif.mensagem).toContain('anteriormente em');
      expect(notif.metadados?.['novaDataHoraInicio']).toBe('2026-10-26T16:00:00.000Z');
      expect(notif.metadados?.['motivo']).toBe('Reagendamento solicitado pela cliente');
    });
  });

  describe('3. Cancelamento', () => {
    it('cria notificação de cancelamento com aviso de sinal retido quando cancelado tardiamente (<3h)', async () => {
      const notif = await criarNotificacaoCancelamento(mockAgendamento, true, repo, 'Imprevisto');

      expect(notif.evento).toBe('cancelamento');
      expect(notif.titulo).toContain('Agendamento Cancelado: Massagem Relaxante');
      expect(notif.mensagem).toContain('menos de 3 horas de antecedência');
      expect(notif.mensagem).toContain('sinal de 30% foi retido');
      expect(notif.mensagem).toContain('o valor do sinal não poderá ser reutilizado');
      expect(notif.metadados?.['sinalRetido']).toBe(true);
      expect(notif.metadados?.['classificacaoCancelamento']).toBe('tardio');
      expect(notif.metadados?.['sinalDisponivelReagendamento']).toBe(false);
    });

    it('cria notificação de cancelamento com aviso de sinal mantido quando cancelado com antecedência (>=3h)', async () => {
      const notif = await criarNotificacaoCancelamento(
        mockAgendamento,
        false,
        repo,
        'Mudança de planos',
      );

      expect(notif.evento).toBe('cancelamento');
      expect(notif.mensagem).toContain('antecedência mínima de 3 horas foi respeitada');
      expect(notif.mensagem).toContain('crédito para reagendamento futuro');
      expect(notif.mensagem).toContain('Você pode usar o valor do sinal em um novo agendamento.');
      expect(notif.metadados?.['sinalRetido']).toBe(false);
      expect(notif.metadados?.['classificacaoCancelamento']).toBe('no_prazo');
      expect(notif.metadados?.['sinalDisponivelReagendamento']).toBe(true);
    });
  });

  describe('4. Lembrete', () => {
    it('cria notificação de lembrete com orientações de preparo', async () => {
      const notif = await criarNotificacaoLembrete(mockAgendamento, repo);

      expect(notif.evento).toBe('lembrete');
      expect(notif.tipo).toBe('lembrete');
      expect(notif.titulo).toContain('Lembrete de Sessão: Massagem Relaxante');
      expect(notif.mensagem).toContain('roupas confortáveis');
    });

    it('processa agendamentos próximos em lote e não envia lembrete duplicado', async () => {
      const agora = new Date('2026-10-24T10:00:00.000Z');
      // Agendamento ocorre 28 horas depois (fora da janela de 24h)
      const agendamentoLonge: Agendamento = {
        ...mockAgendamento,
        id: 'ag-longe',
        dataHoraInicio: '2026-10-25T18:00:00.000Z',
      };
      // Agendamento ocorre 4 horas depois (dentro da janela de 24h)
      const agendamentoPerto: Agendamento = {
        ...mockAgendamento,
        id: 'ag-perto',
        dataHoraInicio: '2026-10-24T14:00:00.000Z',
      };
      // Agendamento já cancelado dentro da janela (não deve receber lembrete)
      const agendamentoCancelado: Agendamento = {
        ...mockAgendamento,
        id: 'ag-canc',
        status: 'cancelado',
        dataHoraInicio: '2026-10-24T15:00:00.000Z',
      };

      const primeiraExecucao = await processarLembretesAgendamentos(
        [agendamentoLonge, agendamentoPerto, agendamentoCancelado],
        repo,
        24,
        agora,
      );

      expect(primeiraExecucao).toHaveLength(1);
      expect(primeiraExecucao[0].agendamentoId).toBe('ag-perto');

      // Segunda execução não deve gerar duplicata para o agendamento já lembrado
      const segundaExecucao = await processarLembretesAgendamentos(
        [agendamentoLonge, agendamentoPerto, agendamentoCancelado],
        repo,
        24,
        agora,
      );

      expect(segundaExecucao).toHaveLength(0);
    });
  });

  describe('5. Consulta e Marcação de Leitura', () => {
    it('lista notificações do cliente respeitando ordenação decrescente e filtro de lidas', async () => {
      await criarNotificacaoConfirmacao(mockAgendamento, repo);
      await criarNotificacaoLembrete(mockAgendamento, repo);

      const todas = await listarNotificacoesDoCliente('cliente-123', {}, repo);
      expect(todas).toHaveLength(2);

      // Marca a primeira como lida
      await marcarNotificacaoComoLida(todas[0].id, 'cliente-123', repo);

      const naoLidas = await listarNotificacoesDoCliente(
        'cliente-123',
        { apenasNaoLidas: true },
        repo,
      );
      expect(naoLidas).toHaveLength(1);
      expect(naoLidas[0].id).toBe(todas[1].id);
    });

    it('rejeita tentativa de marcar notificação inexistente ou de outro cliente', async () => {
      await expect(marcarNotificacaoComoLida('inexistente', 'cliente-123', repo)).rejects.toThrow(
        NotificacaoBusinessError,
      );
    });
  });
});
