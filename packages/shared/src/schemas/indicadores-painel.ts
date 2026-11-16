import { z } from 'zod';

export const indicadorAgendamentosDoDiaSchema = z.object({
  total: z.number().int().nonnegative(),
  concluidos: z.number().int().nonnegative(),
  pendentes: z.number().int().nonnegative(),
  emAndamento: z.number().int().nonnegative(),
  cancelados: z.number().int().nonnegative(),
  detalhe: z.string(),
});

export type IndicadorAgendamentosDoDia = z.infer<typeof indicadorAgendamentosDoDiaSchema>;

export const indicadorClientesCadastradosSchema = z.object({
  total: z.number().int().nonnegative(),
  novosNoMes: z.number().int().nonnegative(),
  detalhe: z.string(),
});

export type IndicadorClientesCadastrados = z.infer<typeof indicadorClientesCadastradosSchema>;

export const indicadorClientesRecorrentesSchema = z.object({
  total: z.number().int().nonnegative(),
  criterioMinimoAtendimentosMes: z.number().int().positive(),
  percentualSobreTotal: z.number().nonnegative(),
  detalhe: z.string(),
});

export type IndicadorClientesRecorrentes = z.infer<typeof indicadorClientesRecorrentesSchema>;

export const indicadorAtendimentosRealizadosMesSchema = z.object({
  total: z.number().int().nonnegative(),
  totalMinutos: z.number().int().nonnegative(),
  detalhe: z.string(),
});

export type IndicadorAtendimentosRealizadosMes = z.infer<
  typeof indicadorAtendimentosRealizadosMesSchema
>;

export const indicadorCancelamentosEFaltasSchema = z.object({
  totalCancelamentos: z.number().int().nonnegative(),
  cancelamentosNoPrazo: z.number().int().nonnegative(),
  cancelamentosTardios: z.number().int().nonnegative(),
  faltas: z.number().int().nonnegative(),
  taxaCancelamentoPercentual: z.number().nonnegative(),
  detalhe: z.string(),
});

export type IndicadorCancelamentosEFaltas = z.infer<typeof indicadorCancelamentosEFaltasSchema>;

export const indicadorOcupacaoAgendaSchema = z.object({
  taxaOcupacaoPercentual: z.number().nonnegative(),
  slotsOcupados: z.number().int().nonnegative(),
  slotsDisponiveis: z.number().int().nonnegative(),
  metaOcupacaoPercentual: z.number().nonnegative(),
  metaSuperada: z.boolean(),
  detalhe: z.string(),
});

export type IndicadorOcupacaoAgenda = z.infer<typeof indicadorOcupacaoAgendaSchema>;

export const indicadorValoresRecebidosEPrevistosSchema = z.object({
  valorTotalRecebidoCentavos: z.number().int().nonnegative(),
  valorTotalPrevistoCentavos: z.number().int().nonnegative(),
  valorTotalRecebidoReais: z.number().nonnegative(),
  valorTotalPrevistoReais: z.number().nonnegative(),
  valorSinaisRetidosCentavos: z.number().int().nonnegative(),
  detalhe: z.string(),
});

export type IndicadorValoresRecebidosEPrevistos = z.infer<
  typeof indicadorValoresRecebidosEPrevistosSchema
>;

export const servicoRankingItemSchema = z.object({
  servicoId: z.string(),
  nome: z.string(),
  totalAgendamentos: z.number().int().nonnegative(),
  totalAtendimentosConcluidos: z.number().int().nonnegative(),
  receitaCentavos: z.number().int().nonnegative(),
});

export type ServicoRankingItem = z.infer<typeof servicoRankingItemSchema>;

export const indicadorServicoMaisAgendadoSchema = z.object({
  servicoId: z.string().nullable(),
  nome: z.string(),
  totalAgendamentos: z.number().int().nonnegative(),
  detalhe: z.string(),
  rankingTopServicos: z.array(servicoRankingItemSchema),
});

export type IndicadorServicoMaisAgendado = z.infer<typeof indicadorServicoMaisAgendadoSchema>;

export const metricasOperacionaisSchema = z.object({
  agendamentosDoDia: indicadorAgendamentosDoDiaSchema,
  cancelamentosEFaltas: indicadorCancelamentosEFaltasSchema,
  ocupacaoAgenda: indicadorOcupacaoAgendaSchema,
});

export type MetricasOperacionais = z.infer<typeof metricasOperacionaisSchema>;

export const indicadoresOperacionaisSchema = z.object({
  agendamentosDoDia: indicadorAgendamentosDoDiaSchema,
  atendimentosRealizadosMes: indicadorAtendimentosRealizadosMesSchema,
  cancelamentosEFaltas: indicadorCancelamentosEFaltasSchema,
  ocupacaoAgenda: indicadorOcupacaoAgendaSchema,
});

export type IndicadoresOperacionais = z.infer<typeof indicadoresOperacionaisSchema>;

export const metricasClientesSchema = z.object({
  clientesCadastrados: indicadorClientesCadastradosSchema,
  clientesRecorrentes: indicadorClientesRecorrentesSchema,
});

export type MetricasClientes = z.infer<typeof metricasClientesSchema>;

export const metricasFinanceirasSchema = z.object({
  valoresRecebidosEPrevistos: indicadorValoresRecebidosEPrevistosSchema,
});

export type MetricasFinanceiras = z.infer<typeof metricasFinanceirasSchema>;

export const metricasServicosSchema = z.object({
  atendimentosRealizadosMes: indicadorAtendimentosRealizadosMesSchema,
  servicoMaisAgendado: indicadorServicoMaisAgendadoSchema,
});

export type MetricasServicos = z.infer<typeof metricasServicosSchema>;

export const painelIndicadoresSchema = z.object({
  dataReferencia: z.string(),
  mesReferencia: z.string(),
  geradoEmIso: z.string(),
  indicadores: z.object({
    agendamentosDoDia: indicadorAgendamentosDoDiaSchema,
    clientesCadastrados: indicadorClientesCadastradosSchema,
    clientesRecorrentes: indicadorClientesRecorrentesSchema,
    atendimentosRealizadosMes: indicadorAtendimentosRealizadosMesSchema,
    cancelamentosEFaltas: indicadorCancelamentosEFaltasSchema,
    ocupacaoAgenda: indicadorOcupacaoAgendaSchema,
    valoresRecebidosEPrevistos: indicadorValoresRecebidosEPrevistosSchema,
    servicoMaisAgendado: indicadorServicoMaisAgendadoSchema,
  }),
  categorias: z.object({
    operacionais: metricasOperacionaisSchema,
    clientes: metricasClientesSchema,
    financeiras: metricasFinanceirasSchema,
    servicos: metricasServicosSchema,
  }),
});

export type PainelIndicadores = z.infer<typeof painelIndicadoresSchema>;
