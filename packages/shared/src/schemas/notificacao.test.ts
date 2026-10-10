import { describe, it, expect } from 'vitest';
import {
  notificacaoInternaSchema,
  alterarAgendamentoInputSchema,
  gerarConteudoAvisoConfirmacao,
  gerarConteudoAvisoAlteracao,
  gerarConteudoAvisoCancelamento,
  gerarConteudoAvisoLembrete,
  formatarDataHoraNotificacao,
} from './notificacao.js';

describe('Schemas e Utilitários de Notificações Internas', () => {
  it('valida uma notificação interna bem estruturada com Zod', () => {
    const validNotif = {
      id: 'notif-123',
      destinatarioId: 'user-456',
      destinatarioTipo: 'cliente',
      agendamentoId: 'ag-789',
      evento: 'confirmacao',
      tipo: 'agendamento',
      titulo: 'Sessão Confirmada',
      mensagem: 'Seu agendamento foi confirmado para amanhã.',
      lida: false,
      createdAt: '2026-10-15T14:00:00.000Z',
    };

    const parsed = notificacaoInternaSchema.parse(validNotif);
    expect(parsed.id).toBe('notif-123');
    expect(parsed.evento).toBe('confirmacao');
    expect(parsed.lida).toBe(false);
  });

  it('rejeita notificação com evento inválido', () => {
    const invalid = {
      id: 'notif-123',
      destinatarioId: 'user-456',
      destinatarioTipo: 'cliente',
      evento: 'desconhecido',
      tipo: 'agendamento',
      titulo: 'Invalido',
      mensagem: 'Mensagem',
      createdAt: '2026-10-15T14:00:00.000Z',
    };

    expect(() => notificacaoInternaSchema.parse(invalid)).toThrow();
  });

  it('valida entrada de alteração de agendamento', () => {
    const input = {
      agendamentoId: 'ag-100',
      novaDataHoraInicio: '2026-10-20T15:30:00.000Z',
      motivo: 'Imprevisto no trabalho',
    };

    const parsed = alterarAgendamentoInputSchema.parse(input);
    expect(parsed.agendamentoId).toBe('ag-100');
    expect(parsed.novaDataHoraInicio).toBe('2026-10-20T15:30:00.000Z');
  });

  it('formata data e hora no padrão amigável', () => {
    // 2026-10-15T14:00:00 (em horário local ou ISO)
    const formatada = formatarDataHoraNotificacao('2026-10-15T14:00:00.000Z');
    expect(formatada).toContain('/10/2026');
    expect(formatada).toContain('às');
  });

  it('gera aviso de confirmação com orientações acolhedoras', () => {
    const aviso = gerarConteudoAvisoConfirmacao({
      clienteNome: 'Mariana',
      servicoNome: 'Massagem Relaxante',
      dataHoraInicio: '2026-10-15T14:00:00.000Z',
      profissionalNome: 'Tais Romagnoli',
    });

    expect(aviso.titulo).toBe('Sessão Confirmada: Massagem Relaxante');
    expect(aviso.mensagem).toContain('Mariana');
    expect(aviso.mensagem).toContain('Massagem Relaxante com Tais Romagnoli');
    expect(aviso.mensagem).toContain('10 minutos de antecedência');
    expect(aviso.tipo).toBe('agendamento');
  });

  it('gera aviso de alteração contendo horários novos e anteriores', () => {
    const aviso = gerarConteudoAvisoAlteracao({
      clienteNome: 'Mariana',
      servicoNome: 'Drenagem Linfática',
      novaDataHoraInicio: '2026-10-16T16:00:00.000Z',
      dataHoraAnterior: '2026-10-15T14:00:00.000Z',
      profissionalNome: 'Tais Romagnoli',
    });

    expect(aviso.titulo).toBe('Agendamento Alterado: Drenagem Linfática');
    expect(aviso.mensagem).toContain('Drenagem Linfática com Tais Romagnoli');
    expect(aviso.mensagem).toContain('anteriormente em');
    expect(aviso.mensagem).toContain('sinal de reserva');
  });

  it('gera aviso de cancelamento informando que o sinal foi mantido como crédito quando antecedência >= 3h', () => {
    const aviso = gerarConteudoAvisoCancelamento({
      clienteNome: 'Lucas',
      servicoNome: 'Shiatsu',
      dataHoraInicio: '2026-10-18T10:00:00.000Z',
      sinalRetido: false,
      motivo: 'Viagem de emergência',
    });

    expect(aviso.titulo).toBe('Agendamento Cancelado: Shiatsu');
    expect(aviso.mensagem).toContain('Viagem de emergência');
    expect(aviso.mensagem).toContain('antecedência mínima de 3 horas foi respeitada');
    expect(aviso.mensagem).toContain('crédito para reagendamento futuro');
  });

  it('gera aviso de cancelamento informando que o sinal foi retido quando antecedência < 3h', () => {
    const aviso = gerarConteudoAvisoCancelamento({
      clienteNome: 'Lucas',
      servicoNome: 'Shiatsu',
      dataHoraInicio: '2026-10-18T10:00:00.000Z',
      sinalRetido: true,
    });

    expect(aviso.titulo).toBe('Agendamento Cancelado: Shiatsu');
    expect(aviso.mensagem).toContain('menos de 3 horas de antecedência');
    expect(aviso.mensagem).toContain('sinal de 30% foi retido');
  });

  it('gera aviso de lembrete com dicas de bem-estar', () => {
    const aviso = gerarConteudoAvisoLembrete({
      clienteNome: 'Camila',
      servicoNome: 'Ventosaterapia',
      dataHoraInicio: '2026-10-19T09:00:00.000Z',
      profissionalNome: 'Tais Romagnoli',
    });

    expect(aviso.titulo).toBe('Lembrete de Sessão: Ventosaterapia');
    expect(aviso.mensagem).toContain('Camila');
    expect(aviso.mensagem).toContain('roupas confortáveis');
    expect(aviso.tipo).toBe('lembrete');
  });
});
