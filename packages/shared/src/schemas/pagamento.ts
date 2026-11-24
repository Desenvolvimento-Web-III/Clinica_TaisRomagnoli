import { z } from 'zod';
import { metodoPagamentoSchema } from './agendamento.js';
import type { MetodoPagamento } from '../types/agendamento.js';

export const statusPagamentoSchema = z.enum([
  'pendente',
  'pago',
  'cancelado',
  'estornado',
  'expirado',
]);

export type StatusPagamento = z.infer<typeof statusPagamentoSchema>;

export const PERCENTUAL_SINAL_REGRA = 30;

/**
 * Calcula a cobrança do sinal de 30% com base no valor total do serviço em centavos.
 */
export function calcularCobrancaSinal(
  valorTotalEmCentavos: number,
  percentualSinal: number = PERCENTUAL_SINAL_REGRA,
): {
  valorTotalEmCentavos: number;
  valorSinalEmCentavos: number;
  saldoRestanteEmCentavos: number;
  percentualSinal: number;
} {
  if (valorTotalEmCentavos <= 0) {
    return {
      valorTotalEmCentavos: 0,
      valorSinalEmCentavos: 0,
      saldoRestanteEmCentavos: 0,
      percentualSinal,
    };
  }

  const percentualNormalizado = Math.max(0, Math.min(100, percentualSinal));
  const valorSinalEmCentavos = Math.round(valorTotalEmCentavos * (percentualNormalizado / 100));
  const saldoRestanteEmCentavos = valorTotalEmCentavos - valorSinalEmCentavos;

  return {
    valorTotalEmCentavos,
    valorSinalEmCentavos,
    saldoRestanteEmCentavos,
    percentualSinal: percentualNormalizado,
  };
}

export const dadosCobrancaSchema = z.object({
  metodo: metodoPagamentoSchema,
  chavePix: z.string().optional(),
  codigoPixCopiaECola: z.string().optional(),
  linhaDigitavelBoleto: z.string().optional(),
  codigoBarrasBoleto: z.string().optional(),
  instrucoes: z.string(),
  mensagemSucesso: z.string().optional(),
});

export type DadosCobranca = z.infer<typeof dadosCobrancaSchema>;

/**
 * Gera dados simulados de cobrança (Pix copia e cola, boleto ou cartão)
 * sem necessidade de integração bancária real externa, respeitando as regras do projeto.
 */
export function gerarDadosCobrancaSinal(params: {
  cobrancaId: string;
  metodoPagamento: MetodoPagamento;
  valorSinalEmCentavos: number;
  servicoNome: string;
}): DadosCobranca {
  const valorReais = (params.valorSinalEmCentavos / 100).toFixed(2);

  if (params.metodoPagamento === 'pix') {
    const chavePix = 'financeiro@clinicataisromagnoli.com.br';
    const codigoPixCopiaECola = `00020126580014BR.GOV.BCB.PIX0136${chavePix}520400005303986540${valorReais.replace('.', '')}5802BR5922Clinica Tais Romagnoli6009Sao Paulo62200516${params.cobrancaId.substring(0, 16)}6304`;

    return {
      metodo: 'pix',
      chavePix,
      codigoPixCopiaECola,
      instrucoes: `Efetue o pagamento do sinal de 30% (R$ ${valorReais.replace('.', ',')}) via Pix para confirmar a reserva de ${params.servicoNome}.`,
    };
  }

  if (params.metodoPagamento === 'boleto') {
    return {
      metodo: 'boleto',
      linhaDigitavelBoleto:
        '34191.79001 01043.510047 91020.150008 1 95000000' +
        String(params.valorSinalEmCentavos).padStart(6, '0'),
      codigoBarrasBoleto:
        '3419195000000' +
        String(params.valorSinalEmCentavos).padStart(8, '0') +
        '104351004910201500',
      instrucoes: `Pague o boleto do sinal de 30% (R$ ${valorReais.replace('.', ',')}) no aplicativo do seu banco ou casa lotérica até o vencimento.`,
    };
  }

  if (params.metodoPagamento === 'cartao') {
    return {
      metodo: 'cartao',
      instrucoes: `Cobrança de sinal de 30% (R$ ${valorReais.replace('.', ',')}) no cartão para reserva de ${params.servicoNome}.`,
      mensagemSucesso: 'Sinal autorizado com sucesso via cartão de crédito.',
    };
  }

  return {
    metodo: params.metodoPagamento,
    instrucoes: `Pagamento do sinal de 30% (R$ ${valorReais.replace('.', ',')}) em atendimento presencial na clínica.`,
  };
}

export const solicitarCobrancaSinalInputSchema = z.object({
  servicoId: z.string().min(1, 'ID do serviço é obrigatório.'),
  servicoNome: z.string().min(1, 'Nome do serviço é obrigatório.').optional(),
  valorTotalEmCentavos: z
    .number()
    .int('O valor total deve ser um número inteiro de centavos.')
    .min(100, 'O valor total mínimo do serviço é de R$ 1,00.')
    .optional(),
  metodoPagamento: metodoPagamentoSchema.default('pix'),
  agendamentoId: z.string().optional(),
  clienteId: z.string().optional(),
  clienteNome: z.string().optional(),
  clienteEmail: z.string().email('E-mail do cliente inválido.').optional(),
  observacoes: z.string().max(500, 'Observações não podem exceder 500 caracteres.').optional(),
});

export type SolicitarCobrancaSinalInput = z.infer<typeof solicitarCobrancaSinalInputSchema>;

export const cobrancaSinalSchema = z.object({
  id: z.string().min(1),
  clienteId: z.string().min(1),
  clienteNome: z.string().min(1),
  clienteEmail: z.string().email().optional(),
  servicoId: z.string().min(1),
  servicoNome: z.string().min(1),
  agendamentoId: z.string().optional(),
  valorTotalEmCentavos: z.number().int().positive(),
  percentualSinal: z.number().min(0).max(100),
  valorSinalEmCentavos: z.number().int().nonnegative(),
  saldoRestanteEmCentavos: z.number().int().nonnegative(),
  metodoPagamento: metodoPagamentoSchema,
  status: statusPagamentoSchema,
  dadosCobranca: dadosCobrancaSchema,
  expiraEmIso: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pagoEm: z.string().optional(),
  observacoes: z.string().optional(),
});

export type CobrancaSinal = z.infer<typeof cobrancaSinalSchema>;

export const confirmarPagamentoSinalInputSchema = z.object({
  cobrancaId: z.string().min(1, 'ID da cobrança é obrigatório.'),
  transacaoId: z.string().optional(),
  observacoes: z.string().max(500).optional(),
});

export type ConfirmarPagamentoSinalInput = z.infer<typeof confirmarPagamentoSinalInputSchema>;
