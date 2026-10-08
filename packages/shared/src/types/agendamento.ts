export type StatusAgendamento =
  'pendente' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'falta';

export type MetodoPagamento = 'pix' | 'cartao' | 'boleto' | 'dinheiro' | 'presencial';

export type OrigemAgendamento = 'app_cliente' | 'presencial_admin';

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
  createdAt: string;
  updatedAt: string;
}
