import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mapBackendAgendamentoToUi,
  getFunctionsBaseUrl,
  solicitarAgendamentoBackend,
  atualizarStatusAgendamentoBackend,
  cancelarAgendamentoBackend,
  alterarAgendamentoBackend,
  listarAgendamentosBackend,
  criarAgendamento,
  carregarAgendamentos,
} from './agendamentos-service';
import type { Agendamento as SharedAgendamento } from '@clinica/shared';

describe('agendamentos-service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const agendamentoMock: SharedAgendamento = {
    id: 'ag-123',
    clienteId: 'user-456',
    clienteNome: 'Mariana Silva',
    servicoId: 'massagem-relaxante',
    servicoNome: 'Massagem Relaxante',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 17000,
    valorSinalEmCentavos: 5100,
    saldoRestanteEmCentavos: 11900,
    dataHoraInicio: '2026-10-22T10:00:00.000Z',
    dataHoraFim: '2026-10-22T11:00:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-tais-romagnoli',
    profissionalNome: 'Tais Romagnoli',
    status: 'confirmado',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    observacoes: 'Preferência por óleo neutro',
    createdAt: '2026-10-17T12:00:00.000Z',
    updatedAt: '2026-10-17T12:00:00.000Z',
  };

  it('mapBackendAgendamentoToUi converte corretamente para a estrutura esperada pela UI', () => {
    const ui = mapBackendAgendamentoToUi(agendamentoMock);

    expect(ui.id).toBe('ag-123');
    expect(ui.clienteId).toBe('user-456');
    expect(ui.servicoNome).toBe('Massagem Relaxante');
    expect(ui.valorTotal).toBe(170);
    expect(ui.sinalPago).toBe(51);
    expect(ui.status).toBe('confirmado');
    expect(ui.duracaoMinutos).toBe(60);
    expect(ui.observacao).toBe('Preferência por óleo neutro');
  });

  it('getFunctionsBaseUrl retorna a URL dos emuladores em ambiente de desenvolvimento', () => {
    const url = getFunctionsBaseUrl();
    expect(url).toContain('5001');
    expect(url).toContain('us-central1');
  });

  it('solicitarAgendamentoBackend executa requisição POST com sucesso', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dados: agendamentoMock }),
    } as Response);

    const resultado = await solicitarAgendamentoBackend(
      {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix',
      },
      'fake-jwt-token',
    );

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados?.id).toBe('ag-123');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/solicitarAgendamento'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
      }),
    );
  });

  it('solicitarAgendamentoBackend repassa mensagem de erro quando backend retorna falha', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Horário indisponível por conflito.' }),
    } as Response);

    const resultado = await solicitarAgendamentoBackend(
      {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix',
      },
      'fake-jwt-token',
    );

    expect(resultado.sucesso).toBe(false);
    expect(resultado.erro).toBe('Horário indisponível por conflito.');
  });

  it('cancelarAgendamentoBackend executa POST com cancelamento', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dados: { ...agendamentoMock, status: 'cancelado' } }),
    } as Response);

    const resultado = await cancelarAgendamentoBackend(
      { agendamentoId: 'ag-123', motivo: 'Imprevisto de trabalho' },
      'fake-jwt-token',
    );

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados?.status).toBe('cancelado');
  });

  it('alterarAgendamentoBackend executa POST com reagendamento', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        dados: { ...agendamentoMock, dataHoraInicio: '2026-10-23T14:00:00.000Z' },
      }),
    } as Response);

    const resultado = await alterarAgendamentoBackend(
      { agendamentoId: 'ag-123', novaDataHoraInicio: '2026-10-23T14:00:00.000Z' },
      'fake-jwt-token',
    );

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados?.dataHoraInicio).toBe('2026-10-23T14:00:00.000Z');
  });

  it('listarAgendamentosBackend retorna lista de agendamentos do backend', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dados: [agendamentoMock] }),
    } as Response);

    const resultado = await listarAgendamentosBackend('fake-jwt-token');

    expect(resultado.sucesso).toBe(true);
    expect(resultado.dados).toHaveLength(1);
    expect(resultado.dados[0]?.id).toBe('ag-123');
  });

  it('criarAgendamento cria localmente em modo fallback caso não haja token', async () => {
    const resultado = await criarAgendamento(
      {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix',
      },
      null,
    );

    expect(resultado.sucesso).toBe(true);
    expect(resultado.agendamento?.servicoNome).toBe('Massagem Relaxante');
    expect(resultado.agendamento?.valorTotal).toBe(170);
  });

  it('carregarAgendamentos busca do localStorage se offline ou sem usuário', async () => {
    const carregados = await carregarAgendamentos('user-inexistente');
    expect(carregados.agendamentos).toEqual([]);
    expect(carregados.sincronizadoComBackend).toBe(false);
  });

  it('solicitarAgendamentoBackend repassa statusCode 422 e marca networkError apenas em falha de rede', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Liberação médica obrigatória.' }),
    } as Response);

    const res422 = await solicitarAgendamentoBackend(
      {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'presencial',
        isencaoSinalAdmin: true,
      },
      'fake-jwt-token',
    );

    expect(res422.sucesso).toBe(false);
    expect(res422.statusCode).toBe(422);
    expect(res422.networkError).toBeUndefined();

    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
    const resNetwork = await solicitarAgendamentoBackend(
      {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix',
      },
      'fake-jwt-token',
    );

    expect(resNetwork.sucesso).toBe(false);
    expect(resNetwork.networkError).toBe(true);
  });

  it('atualizarStatusAgendamentoBackend envia POST e repassa erro 422 de contraindicação', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: 'Não é possível confirmar o agendamento sem liberação médica.',
      }),
    } as Response);

    const resultadoBloqueio = await atualizarStatusAgendamentoBackend(
      { agendamentoId: 'ag-123', novoStatus: 'confirmado' },
      'admin-jwt',
    );

    expect(resultadoBloqueio.sucesso).toBe(false);
    expect(resultadoBloqueio.statusCode).toBe(422);
    expect(resultadoBloqueio.erro).toContain('liberação médica');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/atualizarStatusAgendamento'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('listarAgendamentosBackend inclui clienteId na querystring quando informado', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dados: [agendamentoMock] }),
    } as Response);

    await listarAgendamentosBackend('admin-jwt', 'user-456');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/listarMeusAgendamentos?clienteId=user-456'),
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
