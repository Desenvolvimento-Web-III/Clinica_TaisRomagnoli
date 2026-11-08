export type StatusAgendamento =
  'confirmado' | 'pendente' | 'concluido' | 'cancelado' | 'em_andamento' | 'reagendado' | 'falta';

export interface Agendamento {
  id: string;
  clienteId?: string;
  servicoNome: string;
  servicoCategoria: string;
  duracaoMinutos: number;
  profissionalNome: string;
  dataHoraIso: string;
  dataFormatada: string;
  horarioFormatado: string;
  valorTotal: number;
  sinalPago: number;
  status: StatusAgendamento;
  imagemUrl?: string;
  observacao?: string;
}
