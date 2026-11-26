import {
  filtrarLinhasRelatorio,
  montarTabelaRelatorio,
  reportDataSchema,
  reportRequestSchema,
  serializarRelatorioCsv,
  type ReportData,
} from '@clinica/shared';
import type { RelatoriosRepository } from './relatorios-repository.js';

function combinarAgendamentos(
  porDataMarcada: Awaited<ReturnType<RelatoriosRepository['listarAgendamentosPorInicioMes']>>,
  porDataConcluida: Awaited<ReturnType<RelatoriosRepository['listarAgendamentosConcluidosNoMes']>>,
) {
  const unicos = new Map<string, (typeof porDataMarcada)[number]>();
  for (const agendamento of [...porDataMarcada, ...porDataConcluida]) {
    unicos.set(agendamento.id, agendamento);
  }
  return [...unicos.values()];
}

export async function gerarDadosRelatorioAdmin(
  input: unknown,
  repository: RelatoriosRepository,
  agora = new Date(),
): Promise<ReportData> {
  const filtros = reportRequestSchema.parse(input);
  const precisaDeClientes = filtros.categoria === 'clientes' || filtros.categoria === 'recorrencia';
  const precisaDeAtendimentosConcluidos = filtros.categoria !== 'agenda';
  const [clientes, agendamentosDoMes, atendimentosConcluidosNoMes] = await Promise.all([
    precisaDeClientes ? repository.listarClientes() : Promise.resolve([]),
    filtros.categoria === 'recorrencia'
      ? Promise.resolve([])
      : repository.listarAgendamentosPorInicioMes(filtros.mesReferencia),
    precisaDeAtendimentosConcluidos
      ? repository.listarAgendamentosConcluidosNoMes(filtros.mesReferencia)
      : Promise.resolve([]),
  ]);
  const agendamentos = combinarAgendamentos(agendamentosDoMes, atendimentosConcluidosNoMes);
  const tabela = montarTabelaRelatorio(
    filtros.categoria,
    filtros.mesReferencia,
    clientes,
    agendamentos,
  );

  return reportDataSchema.parse({
    categoria: filtros.categoria,
    mesReferencia: filtros.mesReferencia,
    geradoEmIso: agora.toISOString(),
    ...tabela,
  });
}

export async function gerarArquivoCsvRelatorioAdmin(
  input: unknown,
  repository: RelatoriosRepository,
): Promise<{ nomeArquivo: string; conteudo: string; quantidadeLinhas: number }> {
  const filtros = reportRequestSchema.parse(input);
  const relatorio = await gerarDadosRelatorioAdmin(
    { categoria: filtros.categoria, mesReferencia: filtros.mesReferencia },
    repository,
  );
  const linhas = filtrarLinhasRelatorio(relatorio.rows, filtros.busca, filtros.status);

  return {
    nomeArquivo: `relatorio-${filtros.categoria}-${filtros.mesReferencia}.csv`,
    conteudo: `\uFEFF${serializarRelatorioCsv(relatorio.headers, linhas)}`,
    quantidadeLinhas: linhas.length,
  };
}
