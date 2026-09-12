export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ClinicSettings {
  /** Percentual do sinal exigido para agendamento realizado por cliente (ex: 30 para 30%) */
  percentualSinal: number;
  /** Intervalo padrão entre atendimentos em minutos (ex: 30) */
  intervaloMinutos: number;
  /** Dias da semana de folga padrão configuráveis (0 = Domingo, 2 = Terça-feira) */
  diasFolga: DayOfWeek[];
  /** Antecedência mínima para cancelamento sem perda de sinal em horas (ex: 3) */
  antecedenciaMinimaCancelamentoHoras: number;
  /** Número mínimo de atendimentos concluídos no mesmo mês para cliente ser recorrente (ex: 2) */
  criterioClienteRecorrenteAtendimentosMes: number;
  /** Data da última atualização em formato ISO */
  updatedAt: string;
}
