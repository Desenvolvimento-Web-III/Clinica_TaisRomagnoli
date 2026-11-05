import { z } from 'zod';
import type {
  Agendamento,
  ClassificacaoCancelamento,
  CriarModeloAgendamentoParams,
} from '../types/agendamento.js';

export const statusAgendamentoSchema = z.enum([
  'pendente',
  'confirmado',
  'em_andamento',
  'concluido',
  'cancelado',
  'falta',
]);

export const metodoPagamentoSchema = z.enum(['pix', 'cartao', 'boleto', 'dinheiro', 'presencial']);

export const origemAgendamentoSchema = z.enum(['app_cliente', 'presencial_admin']);

export const classificacaoCancelamentoSchema = z.enum(['no_prazo', 'tardio']);

/**
 * Dimensão Cliente: Validação dos dados do cliente vinculados ao agendamento
 */
export const agendamentoClienteSchema = z.object({
  clienteId: z.string().min(1, 'ID do cliente é obrigatório.'),
  clienteNome: z.string().min(1, 'Nome do cliente é obrigatório.'),
  clienteEmail: z.string().email('E-mail do cliente inválido.').optional(),
  clienteTelefone: z.string().optional(),
});

/**
 * Dimensão Profissional: Validação do profissional responsável
 */
export const agendamentoProfissionalSchema = z.object({
  profissionalId: z.string().min(1, 'ID do profissional é obrigatório.'),
  profissionalNome: z.string().min(1, 'Nome do profissional é obrigatório.'),
});

/**
 * Dimensão Serviço: Validação do procedimento contratado
 */
export const agendamentoServicoSchema = z.object({
  servicoId: z.string().min(1, 'ID do serviço é obrigatório.'),
  servicoNome: z.string().min(1, 'Nome do serviço é obrigatório.'),
  duracaoMinutos: z.number().int().positive('Duração do serviço deve ser positiva.'),
});

/**
 * Dimensão Horário: Validação da data/hora de início, fim e intervalo pós-atendimento
 */
export const agendamentoHorarioSchema = z.object({
  dataHoraInicio: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data e hora de início devem ser uma string ISO 8601 válida.',
  }),
  dataHoraFim: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data e hora de término devem ser uma string ISO 8601 válida.',
  }),
  intervaloAposMinutos: z
    .number()
    .int()
    .nonnegative('Intervalo pós-atendimento não pode ser negativo.'),
});

/**
 * Dimensão Valores: Validação dos valores financeiros do agendamento (total, sinal e saldo restante)
 */
export const agendamentoValoresSchema = z.object({
  valorTotalEmCentavos: z.number().int().positive('Valor total deve ser positivo.'),
  valorSinalEmCentavos: z.number().int().nonnegative('Valor do sinal não pode ser negativo.'),
  saldoRestanteEmCentavos: z.number().int().nonnegative('Saldo restante não pode ser negativo.'),
  sinalIsento: z.boolean(),
  metodoPagamento: metodoPagamentoSchema,
});

export const solicitarAgendamentoInputSchema = z.object({
  servicoId: z.string().min(1, 'ID do serviço é obrigatório.'),
  servicoNome: z.string().min(1, 'Nome do serviço é obrigatório.'),
  duracaoMinutos: z
    .number()
    .int()
    .min(15, 'Duração mínima é de 15 minutos.')
    .max(360, 'Duração máxima é de 360 minutos.'),
  valorTotalEmCentavos: z.number().int().min(100, 'Valor total deve ser de pelo menos R$ 1,00.'),
  dataHoraInicio: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data e hora de início devem ser uma string ISO 8601 válida.',
  }),
  metodoPagamento: metodoPagamentoSchema,
  profissionalId: z.string().optional().default('prof-tais-romagnoli'),
  profissionalNome: z.string().optional().default('Tais Romagnoli'),
  observacoes: z.string().max(500, 'Observações não podem exceder 500 caracteres.').optional(),
  // Campo exclusivo para criação presencial por administradora
  isencaoSinalAdmin: z.boolean().optional().default(false),
});

export type SolicitarAgendamentoInput = z.input<typeof solicitarAgendamentoInputSchema>;
export type SolicitarAgendamentoParsed = z.output<typeof solicitarAgendamentoInputSchema>;

export const cancelarAgendamentoInputSchema = z.object({
  agendamentoId: z.string().min(1, 'ID do agendamento é obrigatório.'),
  motivo: z.string().max(300, 'Motivo não pode exceder 300 caracteres.').optional(),
});

export type CancelarAgendamentoInput = z.infer<typeof cancelarAgendamentoInputSchema>;

/**
 * Schema principal do documento de Agendamento no Firestore da Clínica Tais Romagnoli.
 * Valida integralmente as seis dimensões essenciais:
 * 1. Cliente (clienteId, clienteNome, clienteEmail, clienteTelefone)
 * 2. Profissional (profissionalId, profissionalNome)
 * 3. Serviço (servicoId, servicoNome, duracaoMinutos)
 * 4. Horário (dataHoraInicio, dataHoraFim, intervaloAposMinutos)
 * 5. Status (status)
 * 6. Valores (valorTotalEmCentavos, valorSinalEmCentavos, saldoRestanteEmCentavos, metodoPagamento, sinalIsento)
 */
export const agendamentoSchema = z.object({
  id: z.string().min(1, 'ID do agendamento é obrigatório.'),
  // Dimensão: Cliente
  clienteId: z.string().min(1, 'ID do cliente é obrigatório.'),
  clienteNome: z.string().min(1, 'Nome do cliente é obrigatório.'),
  clienteEmail: z.string().email('E-mail do cliente inválido.').optional(),
  clienteTelefone: z.string().optional(),
  // Dimensão: Serviço
  servicoId: z.string().min(1, 'ID do serviço é obrigatório.'),
  servicoNome: z.string().min(1, 'Nome do serviço é obrigatório.'),
  duracaoMinutos: z.number().int().positive('Duração do serviço deve ser positiva.'),
  // Dimensão: Valores
  valorTotalEmCentavos: z.number().int().positive('Valor total deve ser positivo.'),
  valorSinalEmCentavos: z.number().int().nonnegative('Valor do sinal não pode ser negativo.'),
  saldoRestanteEmCentavos: z.number().int().nonnegative('Saldo restante não pode ser negativo.'),
  metodoPagamento: metodoPagamentoSchema,
  sinalIsento: z.boolean(),
  // Dimensão: Horário
  dataHoraInicio: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data e hora de início devem ser uma string ISO 8601 válida.',
  }),
  dataHoraFim: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data e hora de término devem ser uma string ISO 8601 válida.',
  }),
  intervaloAposMinutos: z
    .number()
    .int()
    .nonnegative('Intervalo pós-atendimento não pode ser negativo.'),
  // Dimensão: Profissional
  profissionalId: z.string().min(1, 'ID do profissional é obrigatório.'),
  profissionalNome: z.string().min(1, 'Nome do profissional é obrigatório.'),
  // Dimensão: Status
  status: statusAgendamentoSchema,
  // Metadados
  origem: origemAgendamentoSchema,
  observacoes: z.string().optional(),
  canceladoEm: z.string().optional(),
  motivoCancelamento: z.string().optional(),
  sinalRetido: z.boolean().optional(),
  classificacaoCancelamento: classificacaoCancelamentoSchema.optional(),
  tipoCancelamento: classificacaoCancelamentoSchema.optional(),
  sinalDisponivelReagendamento: z.boolean().optional(),
  antecedenciaCancelamentoHoras: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Validador Type-Guard para instâncias de Agendamento persistidas no Firestore
 */
export function validateAgendamento(data: unknown): data is Agendamento {
  if (!data || typeof data !== 'object') return false;
  const result = agendamentoSchema.safeParse(data);
  return result.success;
}

/**
 * Factory padronizada para modelar uma entidade de Agendamento válida para o Firestore,
 * calculando automaticamente término de horário, sinal financeiro e metadados de criação.
 */
export function modelarAgendamento(params: CriarModeloAgendamentoParams): Agendamento {
  const duracao = params.servico.duracaoMinutos;
  const dataHoraFim = calcularDataHoraFim(params.dataHoraInicio, duracao);
  const valores = calcularValoresAgendamento(
    params.valorTotalEmCentavos,
    params.percentualSinal ?? 30,
    params.sinalIsento ?? false,
  );

  const agoraIso = new Date().toISOString();

  const agendamento: Agendamento = {
    id: params.id ?? `ag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    clienteId: params.cliente.clienteId,
    clienteNome: params.cliente.clienteNome,
    clienteEmail: params.cliente.clienteEmail,
    clienteTelefone: params.cliente.clienteTelefone,
    servicoId: params.servico.servicoId,
    servicoNome: params.servico.servicoNome,
    duracaoMinutos: duracao,
    valorTotalEmCentavos: valores.valorTotalEmCentavos,
    valorSinalEmCentavos: valores.valorSinalEmCentavos,
    saldoRestanteEmCentavos: valores.saldoRestanteEmCentavos,
    dataHoraInicio: params.dataHoraInicio,
    dataHoraFim,
    intervaloAposMinutos: params.intervaloAposMinutos ?? 30,
    profissionalId: params.profissional?.profissionalId ?? 'prof-tais-romagnoli',
    profissionalNome: params.profissional?.profissionalNome ?? 'Tais Romagnoli',
    status: params.status ?? (valores.sinalIsento ? 'confirmado' : 'pendente'),
    metodoPagamento: params.metodoPagamento,
    origem: params.origem ?? (params.sinalIsento ? 'presencial_admin' : 'app_cliente'),
    sinalIsento: valores.sinalIsento,
    observacoes: params.observacoes,
    createdAt: params.createdAt ?? agoraIso,
    updatedAt: params.updatedAt ?? agoraIso,
  };

  return agendamentoSchema.parse(agendamento);
}

/**
 * Calcula os valores financeiros do agendamento (sinal de 30% e saldo restante)
 */
export function calcularValoresAgendamento(
  valorTotalEmCentavos: number,
  percentualSinal = 30,
  sinalIsento = false,
): {
  valorTotalEmCentavos: number;
  valorSinalEmCentavos: number;
  saldoRestanteEmCentavos: number;
  sinalIsento: boolean;
} {
  if (sinalIsento || percentualSinal <= 0) {
    return {
      valorTotalEmCentavos,
      valorSinalEmCentavos: 0,
      saldoRestanteEmCentavos: valorTotalEmCentavos,
      sinalIsento: true,
    };
  }

  const valorSinalEmCentavos = Math.round(valorTotalEmCentavos * (percentualSinal / 100));
  const saldoRestanteEmCentavos = valorTotalEmCentavos - valorSinalEmCentavos;

  return {
    valorTotalEmCentavos,
    valorSinalEmCentavos,
    saldoRestanteEmCentavos,
    sinalIsento: false,
  };
}

/**
 * Calcula a data e hora de término do agendamento somando a duração em minutos
 */
export function calcularDataHoraFim(dataHoraInicioIso: string, duracaoMinutos: number): string {
  const inicioDate = new Date(dataHoraInicioIso);
  const fimDate = new Date(inicioDate.getTime() + duracaoMinutos * 60 * 1000);
  return fimDate.toISOString();
}

/**
 * Verifica se dois agendamentos colidem no tempo considerando o intervalo obrigatório pós-atendimento
 */
export function verificarConflitoHorarios(
  novo: { inicioIso: string; fimIso: string; intervaloMinutos?: number },
  existente: { inicioIso: string; fimIso: string; intervaloMinutos?: number },
): boolean {
  const intervaloNovoMs = (novo.intervaloMinutos ?? 30) * 60 * 1000;
  const intervaloExistenteMs = (existente.intervaloMinutos ?? 30) * 60 * 1000;

  const novoInicio = new Date(novo.inicioIso).getTime();
  const novoFimComIntervalo = new Date(novo.fimIso).getTime() + intervaloNovoMs;

  const existenteInicio = new Date(existente.inicioIso).getTime();
  const existenteFimComIntervalo = new Date(existente.fimIso).getTime() + intervaloExistenteMs;

  // Há sobreposição se o novo começa antes do existente terminar (com intervalo) E termina após o início do existente
  return novoInicio < existenteFimComIntervalo && novoFimComIntervalo > existenteInicio;
}

/**
 * Antecedência mínima para cancelamento com aproveitamento do sinal (3 horas),
 * conforme docs/PRODUCT_RULES.md e docs/BRANDBOOK.md.
 */
export const ANTECEDENCIA_MINIMA_CANCELAMENTO_HORAS = 3;

/**
 * Mensagens padronizadas do Brandbook (Seção 12.4 de docs/BRANDBOOK.md)
 */
export const MENSAGENS_CANCELAMENTO_BRANDBOOK = {
  NO_PRAZO: 'Você pode usar o valor do sinal em um novo agendamento.',
  TARDIO:
    'Como faltam menos de três horas para a sessão, o valor do sinal não poderá ser reutilizado.',
} as const;

export interface ResultadoAntecedenciaCancelamento {
  permitido: boolean;
  horasRestantes: number;
  minutosRestantes: number;
  sinalRetido: boolean;
  sinalDisponivelReagendamento: boolean;
  classificacao: ClassificacaoCancelamento;
  mensagemBrandbook: string;
}

/**
 * Valida e classifica o cancelamento conforme a antecedência mínima estabelecida (padrão de 3 horas).
 *
 * Regras de Produto:
 * - Cancelamento com pelo menos 3 horas de antecedência:
 *   - Classificação: 'no_prazo'
 *   - sinalRetido: false
 *   - sinalDisponivelReagendamento: true (o sinal pode ser reaproveitado em novo agendamento, sem estorno em dinheiro)
 *   - Mensagem: "Você pode usar o valor do sinal em um novo agendamento."
 *
 * - Cancelamento com menos de 3 horas de antecedência ou a posteriori:
 *   - Classificação: 'tardio'
 *   - sinalRetido: true (perda integral do sinal pago)
 *   - sinalDisponivelReagendamento: false
 *   - Mensagem: "Como faltam menos de três horas para a sessão, o valor do sinal não poderá ser reutilizado."
 */
export function verificarAntecedenciaCancelamento(
  dataHoraInicioIso: string,
  antecedenciaMinimaHoras = ANTECEDENCIA_MINIMA_CANCELAMENTO_HORAS,
  dataReferencia = new Date(),
): ResultadoAntecedenciaCancelamento {
  const inicioMs = new Date(dataHoraInicioIso).getTime();
  const agoraMs = dataReferencia.getTime();
  const diferencaMs = inicioMs - agoraMs;
  const horasRestantes = Math.floor(diferencaMs / (1000 * 60 * 60));
  const minutosRestantes = Math.floor(diferencaMs / (1000 * 60));

  const antecedenciaExigidaMs = antecedenciaMinimaHoras * 60 * 60 * 1000;
  // Considera no prazo quando a antecedência for maior ou igual ao limite em milissegundos
  const noPrazo = diferencaMs >= antecedenciaExigidaMs;

  const classificacao: ClassificacaoCancelamento = noPrazo ? 'no_prazo' : 'tardio';
  const sinalRetido = !noPrazo;
  const sinalDisponivelReagendamento = noPrazo;
  const mensagemBrandbook = noPrazo
    ? MENSAGENS_CANCELAMENTO_BRANDBOOK.NO_PRAZO
    : MENSAGENS_CANCELAMENTO_BRANDBOOK.TARDIO;

  return {
    permitido: noPrazo,
    horasRestantes,
    minutosRestantes,
    sinalRetido,
    sinalDisponivelReagendamento,
    classificacao,
    mensagemBrandbook,
  };
}

/**
 * Alias semântico para classificar um cancelamento conforme a antecedência mínima
 */
export const classificarCancelamento = verificarAntecedenciaCancelamento;
