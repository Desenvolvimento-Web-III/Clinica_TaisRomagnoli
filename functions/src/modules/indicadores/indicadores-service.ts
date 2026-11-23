import type {
  PainelIndicadores,
  IndicadorAgendamentosDoDia,
  IndicadorClientesCadastrados,
  IndicadorClientesRecorrentes,
  IndicadorAtendimentosRealizadosMes,
  IndicadorCancelamentosEFaltas,
  IndicadorOcupacaoAgenda,
  IndicadorValoresRecebidosEPrevistos,
  IndicadorServicoMaisAgendado,
  ServicoRankingItem,
  HorariosFuncionamento,
} from '@clinica/shared';
import { CONFIGURACAO_HORARIOS_PADRAO } from '@clinica/shared';
import type { AgendamentosRepository } from '../agendamentos/agendamentos-repository.js';
import type { ClientesRepository } from '../clientes/clientes-repository.js';
import type { ServicosRepository } from '../servicos/servicos-repository.js';

export interface ParametrosCalculoIndicadores {
  dataReferencia?: string; // YYYY-MM-DD
  mesReferencia?: string; // YYYY-MM
  configuracaoHorarios?: HorariosFuncionamento;
  criterioMinimoRecorrencia?: number;
}

/**
 * Calcula a capacidade teórica de slots de atendimento da clínica em um determinado mês
 * com base na configuração de dias ativos e horários de funcionamento.
 */
export function calcularCapacidadeSlotsMes(
  mesYm: string,
  config: HorariosFuncionamento = CONFIGURACAO_HORARIOS_PADRAO,
  duracaoSlotMinutos = 90, // Média padrão: 60min sessão + 30min intervalo de organização
): number {
  const [anoStr, mesStr] = mesYm.split('-');
  const ano = parseInt(anoStr ?? '2026', 10);
  const mes = parseInt(mesStr ?? '11', 10);

  // Total de dias no mês
  const ultimoDia = new Date(ano, mes, 0).getDate();
  let totalSlotsMes = 0;

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = dataObj.getDay();

    const diaConfig = config.dias.find((d) => d.dia === diaSemana);
    if (!diaConfig || !diaConfig.ativo) {
      continue;
    }

    // Calcula tempo total de atendimento no dia
    let minutosTrabalhoDia = 0;
    const turnos = diaConfig.turnos ?? [];
    for (const faixa of turnos) {
      const [hIniStr, mIniStr] = faixa.inicio.split(':');
      const [hFimStr, mFimStr] = faixa.fim.split(':');
      const hIni = parseInt(hIniStr ?? '', 10);
      const mIni = parseInt(mIniStr ?? '', 10);
      const hFim = parseInt(hFimStr ?? '', 10);
      const mFim = parseInt(mFimStr ?? '', 10);
      if (!isNaN(hIni) && !isNaN(mIni) && !isNaN(hFim) && !isNaN(mFim)) {
        minutosTrabalhoDia += hFim * 60 + mFim - (hIni * 60 + mIni);
      }
    }

    // Subtrai intervalos de manutenção / almoço
    if (diaConfig.intervalosManutencao) {
      for (const intervalo of diaConfig.intervalosManutencao) {
        const [hIniStr, mIniStr] = intervalo.inicio.split(':');
        const [hFimStr, mFimStr] = intervalo.fim.split(':');
        const hIni = parseInt(hIniStr ?? '', 10);
        const mIni = parseInt(mIniStr ?? '', 10);
        const hFim = parseInt(hFimStr ?? '', 10);
        const mFim = parseInt(mFimStr ?? '', 10);
        if (!isNaN(hIni) && !isNaN(mIni) && !isNaN(hFim) && !isNaN(mFim)) {
          minutosTrabalhoDia -= hFim * 60 + mFim - (hIni * 60 + mIni);
        }
      }
    }

    if (minutosTrabalhoDia > 0) {
      totalSlotsMes += Math.floor(minutosTrabalhoDia / duracaoSlotMinutos);
    }
  }

  // Se por alguma razão o cálculo resultar em 0, adota um piso razoável (ex: 20 dias * 5 slots = 100)
  return totalSlotsMes > 0 ? totalSlotsMes : 100;
}

/**
 * Serviço de cálculo consolidado dos 8 indicadores administrativos do painel:
 * 1. Agendamentos do dia
 * 2. Clientes cadastrados
 * 3. Clientes recorrentes
 * 4. Atendimentos realizados no mês
 * 5. Cancelamentos e faltas
 * 6. Ocupação da agenda
 * 7. Valores recebidos e previstos
 * 8. Serviço mais agendado
 *
 * Agrupados também nas quatro categorias: operacionais, clientes, financeiras e servicos.
 */
export async function calcularOitoIndicadoresPainel(
  agendamentosRepo: AgendamentosRepository,
  clientesRepo: ClientesRepository,
  servicosRepo: ServicosRepository,
  params: ParametrosCalculoIndicadores = {},
): Promise<PainelIndicadores> {
  const agora = new Date();
  const agoraIso = agora.toISOString();

  const dataReferencia = params.dataReferencia ?? agoraIso.slice(0, 10);
  const mesReferencia = params.mesReferencia ?? dataReferencia.slice(0, 7);
  const criterioMinimoRecorrencia = params.criterioMinimoRecorrencia ?? 2;
  const configHorarios = params.configuracaoHorarios ?? CONFIGURACAO_HORARIOS_PADRAO;

  // Carrega agendamentos, clientes e serviços
  const [todosAgendamentos, todosClientes, todosServicos] = await Promise.all([
    agendamentosRepo.listarTodos(),
    clientesRepo.listarTodos(),
    servicosRepo.listar(false),
  ]);

  // Mapa de nomes de serviços
  const mapaServicosNome = new Map<string, string>();
  for (const s of todosServicos) {
    mapaServicosNome.set(s.id, s.nome);
  }

  // --- 1. AGENDAMENTOS DO DIA ---
  const agendamentosDia = todosAgendamentos.filter((a) =>
    a.dataHoraInicio.startsWith(dataReferencia),
  );
  const diaConcluidos = agendamentosDia.filter((a) => a.status === 'concluido').length;
  const diaPendentes = agendamentosDia.filter(
    (a) => a.status === 'pendente' || a.status === 'confirmado' || a.status === 'reagendado',
  ).length;
  const diaEmAndamento = agendamentosDia.filter((a) => a.status === 'em_andamento').length;
  const diaCancelados = agendamentosDia.filter(
    (a) => a.status === 'cancelado' || a.status === 'falta',
  ).length;
  const diaTotal = agendamentosDia.length;

  const detalheAgendamentosDia =
    diaTotal > 0
      ? `${diaConcluidos} concluído(s), ${diaPendentes} pendente(s)`
      : 'Nenhum agendamento para hoje';

  const agendamentosDoDia: IndicadorAgendamentosDoDia = {
    total: diaTotal,
    concluidos: diaConcluidos,
    pendentes: diaPendentes,
    emAndamento: diaEmAndamento,
    cancelados: diaCancelados,
    detalhe: detalheAgendamentosDia,
  };

  // --- 2. CLIENTES CADASTRADOS ---
  const clientes = todosClientes.filter((c) => c.role === 'cliente' || !c.role);
  const clientesTotal = clientes.length;
  const clientesNovosMes = clientes.filter(
    (c) => (c.createdAt || '').slice(0, 7) === mesReferencia,
  ).length;

  const clientesCadastrados: IndicadorClientesCadastrados = {
    total: clientesTotal,
    novosNoMes: clientesNovosMes,
    detalhe: `+${clientesNovosMes} novo(s) neste mês`,
  };

  // Agendamentos filtrados para o mês de referência
  const agendamentosMes = todosAgendamentos.filter((a) => {
    const mesInicio = (a.dataHoraInicio || '').slice(0, 7);
    const mesConclusao = (a.concluidoEm || '').slice(0, 7);
    return mesInicio === mesReferencia || mesConclusao === mesReferencia;
  });

  // --- 3. CLIENTES RECORRENTES ---
  // Conta atendimentos concluídos por cliente no mês de referência
  const concluidosMes = agendamentosMes.filter((a) => a.status === 'concluido');
  const contagemConcluidosPorCliente = new Map<string, number>();

  for (const a of concluidosMes) {
    const atual = contagemConcluidosPorCliente.get(a.clienteId) ?? 0;
    contagemConcluidosPorCliente.set(a.clienteId, atual + 1);
  }

  let totalRecorrentes = 0;
  for (const totalAtendimentos of contagemConcluidosPorCliente.values()) {
    if (totalAtendimentos >= criterioMinimoRecorrencia) {
      totalRecorrentes++;
    }
  }

  const percentualRecorrentes =
    clientesTotal > 0 ? Number(((totalRecorrentes / clientesTotal) * 100).toFixed(1)) : 0;

  const clientesRecorrentes: IndicadorClientesRecorrentes = {
    total: totalRecorrentes,
    criterioMinimoAtendimentosMes: criterioMinimoRecorrencia,
    percentualSobreTotal: percentualRecorrentes,
    detalhe: `≥ ${criterioMinimoRecorrencia} consultas concluídas no mesmo mês`,
  };

  // --- 4. ATENDIMENTOS REALIZADOS NO MÊS ---
  const totalConcluidosMes = concluidosMes.length;
  const totalMinutosConcluidos = concluidosMes.reduce(
    (acc, a) => acc + (a.duracaoMinutos || 60),
    0,
  );

  const atendimentosRealizadosMes: IndicadorAtendimentosRealizadosMes = {
    total: totalConcluidosMes,
    totalMinutos: totalMinutosConcluidos,
    detalhe: `${totalConcluidosMes} sessão(ões) concluída(s)`,
  };

  // --- 5. CANCELAMENTOS E FALTAS ---
  const cancelamentosMes = agendamentosMes.filter((a) => a.status === 'cancelado');
  const faltasMes = agendamentosMes.filter((a) => a.status === 'falta');

  let cancelamentosNoPrazo = 0;
  let cancelamentosTardios = 0;

  for (const c of cancelamentosMes) {
    if (c.classificacaoCancelamento === 'no_prazo') {
      cancelamentosNoPrazo++;
    } else {
      cancelamentosTardios++;
    }
  }

  const totalCancelamentos = cancelamentosMes.length;
  const totalFaltas = faltasMes.length;
  const totalMesTodosStatus = agendamentosMes.length;

  const taxaCancelamentoPercentual =
    totalMesTodosStatus > 0
      ? Number(((totalCancelamentos / totalMesTodosStatus) * 100).toFixed(1))
      : 0;

  const cancelamentosEFaltas: IndicadorCancelamentosEFaltas = {
    totalCancelamentos,
    cancelamentosNoPrazo,
    cancelamentosTardios,
    faltas: totalFaltas,
    taxaCancelamentoPercentual,
    detalhe: `${cancelamentosNoPrazo} com aviso ≥ 3h, ${cancelamentosTardios + totalFaltas} falta(s)/tardio(s)`,
  };

  // --- 6. OCUPAÇÃO DA AGENDA ---
  const slotsCapacidadeMes = calcularCapacidadeSlotsMes(mesReferencia, configHorarios);
  // Slots ocupados consideram agendamentos ativos ou concluídos no mês
  const slotsOcupados = agendamentosMes.filter((a) => a.status !== 'cancelado').length;
  const taxaOcupacaoPercentual =
    slotsCapacidadeMes > 0
      ? Number(Math.min(100, Math.round((slotsOcupados / slotsCapacidadeMes) * 100)))
      : 0;

  const metaOcupacaoPercentual = 80;
  const metaSuperada = taxaOcupacaoPercentual >= metaOcupacaoPercentual;

  const ocupacaoAgenda: IndicadorOcupacaoAgenda = {
    taxaOcupacaoPercentual,
    slotsOcupados,
    slotsDisponiveis: slotsCapacidadeMes,
    metaOcupacaoPercentual,
    metaSuperada,
    detalhe: metaSuperada ? 'Meta mensal de 80% superada' : 'Abaixo da meta mensal de 80%',
  };

  // --- 7. VALORES RECEBIDOS E PREVISTOS ---
  let valorTotalRecebidoCentavos = 0;
  let valorTotalPrevistoCentavos = 0;
  let valorSinaisRetidosCentavos = 0;

  for (const a of agendamentosMes) {
    const precoCentavos = a.valorTotalEmCentavos ?? 0;
    const sinalCentavos = a.valorSinalEmCentavos ?? Math.round(precoCentavos * 0.3);

    if (a.status === 'concluido') {
      valorTotalRecebidoCentavos += precoCentavos;
    } else if (a.status === 'cancelado' && a.classificacaoCancelamento === 'tardio') {
      // Sinal de 30% retido por cancelamento tardio conforme regras de produto
      valorSinaisRetidosCentavos += sinalCentavos;
      valorTotalRecebidoCentavos += sinalCentavos;
    } else if (a.status === 'falta') {
      valorSinaisRetidosCentavos += sinalCentavos;
      valorTotalRecebidoCentavos += sinalCentavos;
    } else if (
      a.status === 'pendente' ||
      a.status === 'confirmado' ||
      a.status === 'reagendado' ||
      a.status === 'em_andamento'
    ) {
      valorTotalPrevistoCentavos += precoCentavos;
    }
  }

  const valorTotalRecebidoReais = Number((valorTotalRecebidoCentavos / 100).toFixed(2));
  const valorTotalPrevistoReais = Number((valorTotalPrevistoCentavos / 100).toFixed(2));

  const valoresRecebidosEPrevistos: IndicadorValoresRecebidosEPrevistos = {
    valorTotalRecebidoCentavos,
    valorTotalPrevistoCentavos,
    valorTotalRecebidoReais,
    valorTotalPrevistoReais,
    valorSinaisRetidosCentavos,
    detalhe: `R$ ${valorTotalRecebidoReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebidos, R$ ${valorTotalPrevistoReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} previstos`,
  };

  // --- 8. SERVIÇO MAIS AGENDADO ---
  const contagemServicos = new Map<
    string,
    { total: number; concluidos: number; receitaCentavos: number; nome: string }
  >();

  for (const a of agendamentosMes) {
    const sId = a.servicoId;
    const nome = a.servicoNome || mapaServicosNome.get(sId) || 'Serviço';
    const preco = a.valorTotalEmCentavos ?? 0;

    const atual = contagemServicos.get(sId) ?? {
      total: 0,
      concluidos: 0,
      receitaCentavos: 0,
      nome,
    };

    atual.total++;
    if (a.status === 'concluido') {
      atual.concluidos++;
      atual.receitaCentavos += preco;
    }
    contagemServicos.set(sId, atual);
  }

  const rankingTopServicos: ServicoRankingItem[] = Array.from(contagemServicos.entries())
    .map(([servicoId, dados]) => ({
      servicoId,
      nome: dados.nome,
      totalAgendamentos: dados.total,
      totalAtendimentosConcluidos: dados.concluidos,
      receitaCentavos: dados.receitaCentavos,
    }))
    .sort((a, b) => b.totalAgendamentos - a.totalAgendamentos);

  const topServico = rankingTopServicos[0];

  const servicoMaisAgendado: IndicadorServicoMaisAgendado = {
    servicoId: topServico ? topServico.servicoId : null,
    nome: topServico ? topServico.nome : 'Nenhum atendimento registrado',
    totalAgendamentos: topServico ? topServico.totalAgendamentos : 0,
    detalhe: topServico
      ? `${topServico.totalAgendamentos} agendamento(s) no período`
      : 'Sem atendimentos registrados no período',
    rankingTopServicos,
  };

  // --- ESTRUTURAÇÃO FINAL COM AS 4 CATEGORIAS ---
  return {
    dataReferencia,
    mesReferencia,
    geradoEmIso: agoraIso,
    indicadores: {
      agendamentosDoDia,
      clientesCadastrados,
      clientesRecorrentes,
      atendimentosRealizadosMes,
      cancelamentosEFaltas,
      ocupacaoAgenda,
      valoresRecebidosEPrevistos,
      servicoMaisAgendado,
    },
    categorias: {
      operacionais: {
        agendamentosDoDia,
        cancelamentosEFaltas,
        ocupacaoAgenda,
      },
      clientes: {
        clientesCadastrados,
        clientesRecorrentes,
      },
      financeiras: {
        valoresRecebidosEPrevistos,
      },
      servicos: {
        atendimentosRealizadosMes,
        servicoMaisAgendado,
      },
    },
  };
}
