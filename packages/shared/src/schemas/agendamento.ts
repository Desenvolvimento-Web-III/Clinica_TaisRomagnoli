import { z } from 'zod';

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
 * Valida se o cancelamento atende a antecedência mínima (padrão de 3 horas)
 */
export function verificarAntecedenciaCancelamento(
  dataHoraInicioIso: string,
  antecedenciaMinimaHoras = 3,
  dataReferencia = new Date(),
): {
  permitido: boolean;
  horasRestantes: number;
  sinalRetido: boolean;
} {
  const inicioMs = new Date(dataHoraInicioIso).getTime();
  const agoraMs = dataReferencia.getTime();
  const diferencaMs = inicioMs - agoraMs;
  const horasRestantes = Math.floor(diferencaMs / (1000 * 60 * 60));

  const permitido = horasRestantes >= antecedenciaMinimaHoras;

  return {
    permitido,
    horasRestantes,
    sinalRetido: !permitido, // Se for cancelado com menos de 3h, perde o sinal
  };
}
