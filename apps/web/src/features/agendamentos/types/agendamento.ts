export type StatusAgendamento = 'confirmado' | 'pendente' | 'concluido' | 'cancelado';

export interface Agendamento {
  id: string;
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
