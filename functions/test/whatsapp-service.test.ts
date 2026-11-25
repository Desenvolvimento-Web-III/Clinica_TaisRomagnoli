import { describe, it, expect, beforeEach } from 'vitest';
import type { Agendamento } from '@clinica/shared';
import { InMemoryAgendamentosRepository } from '../src/modules/agendamentos/agendamentos-repository.js';
import {
  gerarMensagemAssistidaWhatsappService,
  WhatsappBusinessError,
} from '../src/modules/notificacoes/whatsapp-service.js';

describe('whatsapp-service (Backend)', () => {
  let agendamentosRepo: InMemoryAgendamentosRepository;

  const mockAgendamento: Agendamento = {
    id: 'ag-123',
    clienteId: 'cli-user-1',
    clienteNome: 'Mariana Silva',
    clienteTelefone: '(11) 98765-4321',
    servicoId: 'srv-1',
    servicoNome: 'Massagem Relaxante',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 15000,
    valorSinalEmCentavos: 4500,
    saldoRestanteEmCentavos: 10500,
    dataHoraInicio: '2026-11-25T14:30:00.000Z',
    dataHoraFim: '2026-11-25T15:30:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-tais-romagnoli',
    profissionalNome: 'Tais Romagnoli',
    status: 'confirmado',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
  };

  beforeEach(() => {
    agendamentosRepo = new InMemoryAgendamentosRepository();
  });

  it('monta texto e link wa.me com cliente, serviço, data e horário a partir de parâmetros diretos', async () => {
    const resultado = await gerarMensagemAssistidaWhatsappService({
      clienteNome: 'Mariana Silva',
      clienteTelefone: '(11) 98765-4321',
      servicoNome: 'Massagem Relaxante',
      dataHoraInicio: '2026-11-25T14:30:00.000Z',
      profissionalNome: 'Tais Romagnoli',
      tipo: 'lembrete',
    });

    expect(resultado.clienteNome).toBe('Mariana Silva');
    expect(resultado.servicoNome).toBe('Massagem Relaxante');
    expect(resultado.telefoneFormatado).toBe('5511987654321');
    expect(resultado.link).toContain('https://wa.me/5511987654321?text=');
    expect(resultado.texto).toContain('Olá, Mariana Silva!');
    expect(resultado.texto).toContain('Massagem Relaxante com Tais Romagnoli');
    expect(resultado.texto).toContain('3 horas de antecedência');
    expect(resultado.dataHoraFormatada).toBeDefined();
  });

  it('recupera automaticamente dados do agendamento a partir do agendamentoId', async () => {
    await agendamentosRepo.salvar(mockAgendamento);

    const resultado = await gerarMensagemAssistidaWhatsappService(
      {
        agendamentoId: 'ag-123',
      },
      {
        agendamentosRepo,
        requesterId: 'cli-user-1',
        requesterIsAdmin: false,
      },
    );

    expect(resultado.clienteNome).toBe('Mariana Silva');
    expect(resultado.servicoNome).toBe('Massagem Relaxante');
    expect(resultado.telefoneFormatado).toBe('5511987654321');
    expect(resultado.link).toContain('https://wa.me/5511987654321?text=');
  });

  it('bloqueia geração de mensagem de agendamento de outro cliente para usuário não admin (403)', async () => {
    await agendamentosRepo.salvar(mockAgendamento);

    await expect(
      gerarMensagemAssistidaWhatsappService(
        { agendamentoId: 'ag-123' },
        {
          agendamentosRepo,
          requesterId: 'outro-cliente',
          requesterIsAdmin: false,
        },
      ),
    ).rejects.toThrow(WhatsappBusinessError);
  });

  it('permite que administradora gere mensagem para qualquer agendamento existente', async () => {
    await agendamentosRepo.salvar(mockAgendamento);

    const resultado = await gerarMensagemAssistidaWhatsappService(
      { agendamentoId: 'ag-123' },
      {
        agendamentosRepo,
        requesterId: 'admin-uid',
        requesterIsAdmin: true,
      },
    );

    expect(resultado.clienteNome).toBe('Mariana Silva');
  });

  it('lança 404 se agendamentoId não for encontrado', async () => {
    await expect(
      gerarMensagemAssistidaWhatsappService({ agendamentoId: 'inexistente' }, { agendamentosRepo }),
    ).rejects.toThrow('Agendamento não encontrado.');
  });

  it('lança 400 se campos obrigatórios estiverem ausentes e sem agendamentoId', async () => {
    await expect(
      gerarMensagemAssistidaWhatsappService({
        clienteNome: '',
        clienteTelefone: '',
        servicoNome: '',
      }),
    ).rejects.toThrow(WhatsappBusinessError);
  });

  it('monta mensagem de confirmação de sinal quando tipo for "confirmacao"', async () => {
    const resultado = await gerarMensagemAssistidaWhatsappService({
      clienteNome: 'Carlos Eduardo',
      clienteTelefone: '11954321098',
      servicoNome: 'Liberação Miofascial',
      dataHoraInicio: '2026-11-26T10:00:00.000Z',
      tipo: 'confirmacao',
    });

    expect(resultado.texto).toContain('Confirmamos com alegria seu agendamento');
    expect(resultado.texto).toContain('sinal de reserva foi recebido');
  });

  it('monta mensagem de dúvida do cliente quando tipo for "duvida"', async () => {
    const resultado = await gerarMensagemAssistidaWhatsappService({
      clienteNome: 'Ana Carolina',
      clienteTelefone: '11976543210',
      servicoNome: 'Massagem com Pedras Quentes',
      dataHoraInicio: '2026-11-27T16:00:00.000Z',
      tipo: 'duvida',
    });

    expect(resultado.texto).toContain('Gostaria de tirar uma dúvida sobre o meu agendamento');
  });
});
