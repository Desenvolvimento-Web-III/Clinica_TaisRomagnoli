import type { DayOfWeek } from './clinic-settings.js';

export interface Professional {
  /** Identificador único do profissional (ex: prof-tais-romagnoli) */
  id: string;
  /** Nome completo do profissional */
  nome: string;
  /** Título profissional ou especialidade */
  especialidade: string;
  /** Indica se o profissional está ativo para agendamentos */
  ativo: boolean;
  /** Dias de folga configurados para este profissional */
  diasFolga: DayOfWeek[];
  /** Intervalo padrão entre atendimentos deste profissional em minutos */
  intervaloMinutos: number;
  /** Data de cadastro em formato ISO */
  createdAt: string;
  /** Data de atualização opcional */
  updatedAt?: string;
}
