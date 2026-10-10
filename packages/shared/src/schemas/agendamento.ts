import { z } from 'zod';
import type { ClassificacaoCancelamento } from '../types/agendamento.js';

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

export type SolicitarAgendamentoInput = z.infer<typeof solicitarAgendamentoInputSchema>;

export const cancelarAgendamentoInputSchema = z.object({
  agendamentoId: z.string().min(1, 'ID do agendamento é obrigatório.'),
  motivo: z.string().max(300, 'Motivo não pode exceder 300 caracteres.').optional(),
});

export type CancelarAgendamentoInput = z.infer<typeof cancelarAgendamentoInputSchema>;

export const agendamentoSchema = z.object({
  id: z.string().min(1),
  clienteId: z.string().min(1),
  clienteNome: z.string().min(1),
  clienteEmail: z.string().email().optional(),
  clienteTelefone: z.string().optional(),
  servicoId: z.string().min(1),
  servicoNome: z.string().min(1),
  duracaoMinutos: z.number().int().positive(),
  valorTotalEmCentavos: z.number().int().positive(),
  valorSinalEmCentavos: z.number().int().nonnegative(),
  saldoRestanteEmCentavos: z.number().int().nonnegative(),
  dataHoraInicio: z.string(),
  dataHoraFim: z.string(),
  intervaloAposMinutos: z.number().int().nonnegative(),
  profissionalId: z.string().min(1),
  profissionalNome: z.string().min(1),
  status: statusAgendamentoSchema,
  metodoPagamento: metodoPagamentoSchema,
  origem: origemAgendamentoSchema,
  sinalIsento: z.boolean(),
  observacoes: z.string().optional(),
  canceladoEm: z.string().optional(),
  motivoCancelamento: z.string().optional(),
  sinalRetido: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

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
