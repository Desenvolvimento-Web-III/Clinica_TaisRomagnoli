export type StatusAgendamento =
  'pendente' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'falta';

export type MetodoPagamento = 'pix' | 'cartao' | 'boleto' | 'dinheiro' | 'presencial';

export type OrigemAgendamento = 'app_cliente' | 'presencial_admin';

/**
 * Classificação do cancelamento conforme a antecedência mínima estabelecida (3 horas).
 * - 'no_prazo': Solicitado com 3 horas ou mais de antecedência. Sinal liberado para reutilização em novo agendamento. Sem estorno em dinheiro.
 * - 'tardio': Solicitado com menos de 3 horas de antecedência ou após o início. Retenção e perda integral do sinal.
 */
export type ClassificacaoCancelamento = 'no_prazo' | 'tardio';

export interface Agendamento {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  servicoId: string;
  servicoNome: string;
  duracaoMinutos: number;
  valorTotalEmCentavos: number;
  valorSinalEmCentavos: number;
  saldoRestanteEmCentavos: number;
  dataHoraInicio: string; // ISO 8601
  dataHoraFim: string; // ISO 8601
  intervaloAposMinutos: number; // Padrão da clínica (ex: 30 min)
  profissionalId: string;
  profissionalNome: string;
  status: StatusAgendamento;
  metodoPagamento: MetodoPagamento;
  origem: OrigemAgendamento;
  sinalIsento: boolean;
  observacoes?: string;
  canceladoEm?: string;
  motivoCancelamento?: string;
  sinalRetido?: boolean;
  classificacaoCancelamento?: ClassificacaoCancelamento;
  tipoCancelamento?: ClassificacaoCancelamento;
  sinalDisponivelReagendamento?: boolean;
  antecedenciaCancelamentoHoras?: number;
  createdAt: string;
  updatedAt: string;
}
