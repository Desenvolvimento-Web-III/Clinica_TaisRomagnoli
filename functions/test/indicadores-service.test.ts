import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAgendamentosRepository } from '../src/modules/agendamentos/agendamentos-repository.js';
import { InMemoryClientesRepository } from '../src/modules/clientes/clientes-repository.js';
import { InMemoryServicosRepository } from '../src/modules/servicos/servicos-repository.js';
import {
  calcularOitoIndicadoresPainel,
  calcularCapacidadeSlotsMes,
} from '../src/modules/indicadores/indicadores-service.js';
import type { Agendamento, UserProfile, ServicoModel } from '@clinica/shared';

describe('indicadores-service (Cálculo dos 8 indicadores do painel administrativo)', () => {
  let agendamentosRepo: InMemoryAgendamentosRepository;
  let clientesRepo: InMemoryClientesRepository;
  let servicosRepo: InMemoryServicosRepository;

  beforeEach(() => {
    agendamentosRepo = new InMemoryAgendamentosRepository();
    clientesRepo = new InMemoryClientesRepository();
    servicosRepo = new InMemoryServicosRepository();
  });

  it('calcula capacidade teórica de slots de atendimento no mês', () => {
    const slots = calcularCapacidadeSlotsMes('2026-11');
    expect(slots).toBeGreaterThan(50);
  });

  it('retorna estrutura íntegra quando não há agendamentos nem clientes', async () => {
    const resultado = await calcularOitoIndicadoresPainel(
      agendamentosRepo,
      clientesRepo,
      servicosRepo,
      { dataReferencia: '2026-11-16', mesReferencia: '2026-11' },
    );

    expect(resultado.dataReferencia).toBe('2026-11-16');
    expect(resultado.mesReferencia).toBe('2026-11');

    // 1. Agendamentos do dia
    expect(resultado.indicadores.agendamentosDoDia.total).toBe(0);
    expect(resultado.indicadores.agendamentosDoDia.concluidos).toBe(0);
    expect(resultado.indicadores.agendamentosDoDia.pendentes).toBe(0);

    // 2. Clientes cadastrados
    expect(resultado.indicadores.clientesCadastrados.total).toBe(0);
    expect(resultado.indicadores.clientesCadastrados.novosNoMes).toBe(0);

    // 3. Clientes recorrentes
    expect(resultado.indicadores.clientesRecorrentes.total).toBe(0);

    // 4. Atendimentos no mês
    expect(resultado.indicadores.atendimentosRealizadosMes.total).toBe(0);

    // 5. Cancelamentos e faltas
    expect(resultado.indicadores.cancelamentosEFaltas.totalCancelamentos).toBe(0);

    // 6. Ocupação da agenda
    expect(resultado.indicadores.ocupacaoAgenda.slotsOcupados).toBe(0);
    expect(resultado.indicadores.ocupacaoAgenda.metaSuperada).toBe(false);

    // 7. Valores
    expect(resultado.indicadores.valoresRecebidosEPrevistos.valorTotalRecebidoCentavos).toBe(0);
    expect(resultado.indicadores.valoresRecebidosEPrevistos.valorTotalPrevistoCentavos).toBe(0);

    // 8. Serviço mais agendado
    expect(resultado.indicadores.servicoMaisAgendado.servicoId).toBeNull();
    expect(resultado.indicadores.servicoMaisAgendado.totalAgendamentos).toBe(0);

    // Categorias
    expect(resultado.categorias.operacionais.agendamentosDoDia.total).toBe(0);
    expect(resultado.categorias.clientes.clientesCadastrados.total).toBe(0);
    expect(
      resultado.categorias.financeiras.valoresRecebidosEPrevistos.valorTotalRecebidoReais,
    ).toBe(0);
    expect(resultado.categorias.servicos.atendimentosRealizadosMes.total).toBe(0);
  });

  it('calcula com precisão todos os 8 indicadores em cenário completo de produção', async () => {
    // 1. Cadastra Serviços
    const s1: ServicoModel = {
      id: 'serv-relaxante',
      nome: 'Massagem Relaxante',
      descricao: 'Relaxamento profundo',
      duracaoMinutos: 60,
      precoCentavos: 14000,
      valorTotal: 140,
      sinalMinimoCentavos: 4200,
      percentualSinal: 30,
      ativo: true,
      criadoEm: '2026-11-01T10:00:00.000Z',
      atualizadoEm: '2026-11-01T10:00:00.000Z',
    };
    const s2: ServicoModel = {
      id: 'serv-reiki',
      nome: 'Reiki',
      descricao: 'Alinhamento energético',
      duracaoMinutos: 40,
      precoCentavos: 13000,
      valorTotal: 130,
      sinalMinimoCentavos: 3900,
      percentualSinal: 30,
      ativo: true,
      criadoEm: '2026-11-01T10:00:00.000Z',
      atualizadoEm: '2026-11-01T10:00:00.000Z',
    };
    await servicosRepo.salvar(s1);
    await servicosRepo.salvar(s2);

    // 2. Cadastra Clientes
    const c1: UserProfile = {
      uid: 'cli-1',
      nome: 'Ana Silva',
      email: 'ana@teste.com',
      telefone: '11999990001',
      role: 'cliente',
      status: 'ativo',
      createdAt: '2026-11-02T10:00:00.000Z', // Novo neste mês
      updatedAt: '2026-11-02T10:00:00.000Z',
    };
    const c2: UserProfile = {
      uid: 'cli-2',
      nome: 'Bruno Souza',
      email: 'bruno@teste.com',
      telefone: '11999990002',
      role: 'cliente',
      status: 'ativo',
      createdAt: '2026-10-15T10:00:00.000Z', // Mês anterior
      updatedAt: '2026-10-15T10:00:00.000Z',
    };
    const c3: UserProfile = {
      uid: 'cli-3',
      nome: 'Carla Dias',
      email: 'carla@teste.com',
      telefone: '11999990003',
      role: 'cliente',
      status: 'ativo',
      createdAt: '2026-11-10T10:00:00.000Z', // Novo neste mês
      updatedAt: '2026-11-10T10:00:00.000Z',
    };
    await clientesRepo.salvar(c1);
    await clientesRepo.salvar(c2);
    await clientesRepo.salvar(c3);

    // 3. Cadastra Agendamentos
    // a1: concluído hoje (Ana, Relaxante, R$ 140)
    const a1: Agendamento = {
      id: 'ag-1',
      clienteId: 'cli-1',
      clienteNome: 'Ana Silva',
      profissionalId: 'prof-tais',
      profissionalNome: 'Tais Romagnoli',
      servicoId: 'serv-relaxante',
      servicoNome: 'Massagem Relaxante',
      dataHoraInicio: '2026-11-16T10:00:00.000Z',
      dataHoraFim: '2026-11-16T11:00:00.000Z',
      duracaoMinutos: 60,
      intervaloAposMinutos: 30,
      valorTotalEmCentavos: 14000,
      valorSinalEmCentavos: 4200,
      saldoRestanteEmCentavos: 9800,
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      status: 'concluido',
      createdAt: '2026-11-10T10:00:00.000Z',
      updatedAt: '2026-11-16T11:00:00.000Z',
    };
    // a2: pendente/confirmado hoje (Bruno, Relaxante, R$ 140)
    const a2: Agendamento = {
      id: 'ag-2',
      clienteId: 'cli-2',
      clienteNome: 'Bruno Souza',
      profissionalId: 'prof-tais',
      profissionalNome: 'Tais Romagnoli',
      servicoId: 'serv-relaxante',
      servicoNome: 'Massagem Relaxante',
      dataHoraInicio: '2026-11-16T14:00:00.000Z',
      dataHoraFim: '2026-11-16T15:00:00.000Z',
      duracaoMinutos: 60,
      intervaloAposMinutos: 30,
      valorTotalEmCentavos: 14000,
      valorSinalEmCentavos: 4200,
      saldoRestanteEmCentavos: 9800,
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      status: 'confirmado',
      createdAt: '2026-11-12T10:00:00.000Z',
      updatedAt: '2026-11-12T10:00:00.000Z',
    };
    // a3: em andamento hoje (Carla, Reiki, R$ 130)
    const a3: Agendamento = {
      id: 'ag-3',
      clienteId: 'cli-3',
      clienteNome: 'Carla Dias',
      profissionalId: 'prof-tais',
      profissionalNome: 'Tais Romagnoli',
      servicoId: 'serv-reiki',
      servicoNome: 'Reiki',
      dataHoraInicio: '2026-11-16T16:00:00.000Z',
      dataHoraFim: '2026-11-16T16:40:00.000Z',
      duracaoMinutos: 40,
      intervaloAposMinutos: 30,
      valorTotalEmCentavos: 13000,
      valorSinalEmCentavos: 3900,
      saldoRestanteEmCentavos: 9100,
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      status: 'em_andamento',
      createdAt: '2026-11-14T10:00:00.000Z',
      updatedAt: '2026-11-16T16:00:00.000Z',
    };

    // --- Outros agendamentos em Novembro 2026 ---
    // a4: Ana já concluiu outra sessão em 05/11 -> Ana tem 2 concluídas (recorrente!)
    const a4: Agendamento = {
      id: 'ag-4',
      clienteId: 'cli-1',
      clienteNome: 'Ana Silva',
      profissionalId: 'prof-tais',
      profissionalNome: 'Tais Romagnoli',
      servicoId: 'serv-relaxante',
      servicoNome: 'Massagem Relaxante',
      dataHoraInicio: '2026-11-05T10:00:00.000Z',
      dataHoraFim: '2026-11-05T11:00:00.000Z',
      duracaoMinutos: 60,
      intervaloAposMinutos: 30,
      valorTotalEmCentavos: 14000,
      valorSinalEmCentavos: 4200,
      saldoRestanteEmCentavos: 9800,
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      status: 'concluido',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-05T11:00:00.000Z',
    };
    // a5: Cancelamento no prazo (aviso >= 3h)
    const a5: Agendamento = {
      id: 'ag-5',
      clienteId: 'cli-2',
      clienteNome: 'Bruno Souza',
      profissionalId: 'prof-tais',
      profissionalNome: 'Tais Romagnoli',
      servicoId: 'serv-reiki',
      servicoNome: 'Reiki',
      dataHoraInicio: '2026-11-08T10:00:00.000Z',
      dataHoraFim: '2026-11-08T10:40:00.000Z',
      duracaoMinutos: 40,
      intervaloAposMinutos: 30,
      valorTotalEmCentavos: 13000,
      valorSinalEmCentavos: 3900,
      saldoRestanteEmCentavos: 9100,
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      status: 'cancelado',
      classificacaoCancelamento: 'no_prazo',
      createdAt: '2026-11-03T10:00:00.000Z',
      updatedAt: '2026-11-07T10:00:00.000Z',
    };
    // a6: Cancelamento tardio (< 3h, sinal retido)
    const a6: Agendamento = {
      id: 'ag-6',
      clienteId: 'cli-3',
      clienteNome: 'Carla Dias',
      profissionalId: 'prof-tais',
      profissionalNome: 'Tais Romagnoli',
      servicoId: 'serv-relaxante',
      servicoNome: 'Massagem Relaxante',
      dataHoraInicio: '2026-11-09T14:00:00.000Z',
      dataHoraFim: '2026-11-09T15:00:00.000Z',
      duracaoMinutos: 60,
      intervaloAposMinutos: 30,
      valorTotalEmCentavos: 14000,
      valorSinalEmCentavos: 4200,
      saldoRestanteEmCentavos: 9800,
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      status: 'cancelado',
      classificacaoCancelamento: 'tardio',
      createdAt: '2026-11-05T10:00:00.000Z',
      updatedAt: '2026-11-09T13:00:00.000Z',
    };

    await agendamentosRepo.salvar(a1);
    await agendamentosRepo.salvar(a2);
    await agendamentosRepo.salvar(a3);
    await agendamentosRepo.salvar(a4);
    await agendamentosRepo.salvar(a5);
    await agendamentosRepo.salvar(a6);

    const resultado = await calcularOitoIndicadoresPainel(
      agendamentosRepo,
      clientesRepo,
      servicosRepo,
      { dataReferencia: '2026-11-16', mesReferencia: '2026-11' },
    );

    // --- 1. Agendamentos do dia (a1, a2, a3) ---
    const indDia = resultado.indicadores.agendamentosDoDia;
    expect(indDia.total).toBe(3);
    expect(indDia.concluidos).toBe(1);
    expect(indDia.pendentes).toBe(1);
    expect(indDia.emAndamento).toBe(1);
    expect(indDia.cancelados).toBe(0);

    // --- 2. Clientes Cadastrados (c1, c2, c3 = 3 total, c1 e c3 criados em 2026-11 = 2) ---
    const indClientes = resultado.indicadores.clientesCadastrados;
    expect(indClientes.total).toBe(3);
    expect(indClientes.novosNoMes).toBe(2);

    // --- 3. Clientes Recorrentes (apenas cli-1 tem 2 sessões concluídas: a1 e a4) ---
    const indRecorrentes = resultado.indicadores.clientesRecorrentes;
    expect(indRecorrentes.total).toBe(1);
    expect(indRecorrentes.criterioMinimoAtendimentosMes).toBe(2);
    expect(indRecorrentes.percentualSobreTotal).toBe(33.3);

    // --- 4. Atendimentos Realizados no Mês (a1 e a4 = 2 sessões concluídas, 60+60 = 120min) ---
    const indAtendimentos = resultado.indicadores.atendimentosRealizadosMes;
    expect(indAtendimentos.total).toBe(2);
    expect(indAtendimentos.totalMinutos).toBe(120);

    // --- 5. Cancelamentos e Faltas (a5 no prazo, a6 tardio) ---
    const indCancel = resultado.indicadores.cancelamentosEFaltas;
    expect(indCancel.totalCancelamentos).toBe(2);
    expect(indCancel.cancelamentosNoPrazo).toBe(1);
    expect(indCancel.cancelamentosTardios).toBe(1);

    // --- 6. Ocupação da Agenda ---
    const indOcupacao = resultado.indicadores.ocupacaoAgenda;
    expect(indOcupacao.slotsOcupados).toBe(4); // a1, a2, a3, a4 (a5 e a6 são cancelados)
    expect(indOcupacao.slotsDisponiveis).toBeGreaterThan(0);
    expect(indOcupacao.taxaOcupacaoPercentual).toBeGreaterThanOrEqual(0);

    // --- 7. Valores Recebidos e Previstos ---
    // Recebidos: a1 (14000) + a4 (14000) + sinal retido a6 (4200) = 32200 centavos = R$ 322,00
    // Previstos: a2 (14000) + a3 (13000) = 27000 centavos = R$ 270,00
    const indFinanceiro = resultado.indicadores.valoresRecebidosEPrevistos;
    expect(indFinanceiro.valorTotalRecebidoCentavos).toBe(32200);
    expect(indFinanceiro.valorTotalRecebidoReais).toBe(322);
    expect(indFinanceiro.valorTotalPrevistoCentavos).toBe(27000);
    expect(indFinanceiro.valorTotalPrevistoReais).toBe(270);
    expect(indFinanceiro.valorSinaisRetidosCentavos).toBe(4200);

    // --- 8. Serviço Mais Agendado ---
    // serv-relaxante tem 4 agendamentos (a1, a2, a4, a6), serv-reiki tem 2 (a3, a5)
    const indServico = resultado.indicadores.servicoMaisAgendado;
    expect(indServico.servicoId).toBe('serv-relaxante');
    expect(indServico.nome).toBe('Massagem Relaxante');
    expect(indServico.totalAgendamentos).toBe(4);
    expect(indServico.rankingTopServicos).toHaveLength(2);
    expect(indServico.rankingTopServicos[0]?.nome).toBe('Massagem Relaxante');
    expect(indServico.rankingTopServicos[1]?.nome).toBe('Reiki');

    // Validação das 4 Categorias
    expect(resultado.categorias.operacionais.agendamentosDoDia.total).toBe(3);
    expect(resultado.categorias.clientes.clientesCadastrados.total).toBe(3);
    expect(
      resultado.categorias.financeiras.valoresRecebidosEPrevistos.valorTotalRecebidoReais,
    ).toBe(322);
    expect(resultado.categorias.servicos.servicoMaisAgendado.nome).toBe('Massagem Relaxante');
  });

  it('permite parametrizar o critério mínimo de recorrência e data de referência personalizada', async () => {
    const c1: UserProfile = {
      uid: 'cli-recorrente-especial',
      nome: 'Mariana Lima',
      email: 'mariana@teste.com',
      telefone: '11988887777',
      role: 'cliente',
      status: 'ativo',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    };
    await clientesRepo.salvar(c1);

    // 2 atendimentos em Outubro
    await agendamentosRepo.salvar({
      id: 'ag-out-1',
      clienteId: 'cli-recorrente-especial',
      clienteNome: 'Mariana Lima',
      profissionalId: 'prof-tais',
      profissionalNome: 'Tais Romagnoli',
      servicoId: 'serv-1',
      servicoNome: 'Serviço 1',
      dataHoraInicio: '2026-10-10T10:00:00.000Z',
      dataHoraFim: '2026-10-10T11:00:00.000Z',
      duracaoMinutos: 60,
      intervaloAposMinutos: 30,
      valorTotalEmCentavos: 10000,
      valorSinalEmCentavos: 3000,
      saldoRestanteEmCentavos: 7000,
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      status: 'concluido',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-10T11:00:00.000Z',
    });
    await agendamentosRepo.salvar({
      id: 'ag-out-2',
      clienteId: 'cli-recorrente-especial',
      clienteNome: 'Mariana Lima',
      profissionalId: 'prof-tais',
      profissionalNome: 'Tais Romagnoli',
      servicoId: 'serv-1',
      servicoNome: 'Serviço 1',
      dataHoraInicio: '2026-10-20T10:00:00.000Z',
      dataHoraFim: '2026-10-20T11:00:00.000Z',
      duracaoMinutos: 60,
      intervaloAposMinutos: 30,
      valorTotalEmCentavos: 10000,
      valorSinalEmCentavos: 3000,
      saldoRestanteEmCentavos: 7000,
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      status: 'concluido',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-20T11:00:00.000Z',
    });

    // Com critério padrão (2), ela é recorrente em Outubro
    const resPadrao = await calcularOitoIndicadoresPainel(
      agendamentosRepo,
      clientesRepo,
      servicosRepo,
      { dataReferencia: '2026-10-25', mesReferencia: '2026-10', criterioMinimoRecorrencia: 2 },
    );
    expect(resPadrao.indicadores.clientesRecorrentes.total).toBe(1);

    // Se o critério for 3 sessões, ela não é recorrente
    const resEstrito = await calcularOitoIndicadoresPainel(
      agendamentosRepo,
      clientesRepo,
      servicosRepo,
      { dataReferencia: '2026-10-25', mesReferencia: '2026-10', criterioMinimoRecorrencia: 3 },
    );
    expect(resEstrito.indicadores.clientesRecorrentes.total).toBe(0);
    expect(resEstrito.indicadores.clientesRecorrentes.criterioMinimoAtendimentosMes).toBe(3);
  });

  it('calcula cancelamentos com falta direta e retenção de sinal financeiro', async () => {
    await agendamentosRepo.salvar({
      id: 'ag-falta-1',
      clienteId: 'cli-falta',
      clienteNome: 'Felipe Santos',
      profissionalId: 'prof-tais',
      profissionalNome: 'Tais Romagnoli',
      servicoId: 'serv-1',
      servicoNome: 'Serviço 1',
      dataHoraInicio: '2026-11-12T10:00:00.000Z',
      dataHoraFim: '2026-11-12T11:00:00.000Z',
      duracaoMinutos: 60,
      intervaloAposMinutos: 30,
      valorTotalEmCentavos: 20000,
      valorSinalEmCentavos: 6000,
      saldoRestanteEmCentavos: 14000,
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      status: 'falta',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-12T11:00:00.000Z',
    });

    const res = await calcularOitoIndicadoresPainel(agendamentosRepo, clientesRepo, servicosRepo, {
      dataReferencia: '2026-11-16',
      mesReferencia: '2026-11',
    });

    expect(res.indicadores.cancelamentosEFaltas.faltas).toBe(1);
    expect(res.indicadores.valoresRecebidosEPrevistos.valorSinaisRetidosCentavos).toBe(6000);
    expect(res.indicadores.valoresRecebidosEPrevistos.valorTotalRecebidoCentavos).toBe(6000);
  });
});
