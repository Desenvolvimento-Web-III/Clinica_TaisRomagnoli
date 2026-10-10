export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ClinicContactsSettings {
  /** Telefone principal para contato da clínica */
  telefone: string;
  /** Número do WhatsApp comercial para suporte e confirmações */
  whatsapp: string;
  /** E-mail oficial da clínica */
  email: string;
  /** Endereço físico da clínica */
  endereco: string;
}

export interface ClinicPoliciesSettings {
  /** Texto oficial da política de cancelamento apresentado aos clientes */
  politicaCancelamento: string;
  /** Texto oficial da política de reagendamento */
  politicaReagendamento: string;
  /** Tolerância máxima de atraso em minutos para atendimento */
  toleranciaAtrasoMinutos: number;
}

export interface ClinicRemindersSettings {
  /** Ativa ou desativa o envio automático de lembretes antes das sessões */
  lembreteAtivo: boolean;
  /** Horas de antecedência para disparo do lembrete (ex: 24 horas) */
  antecedenciaHoras: number;
  /** Canais habilitados para notificação */
  canais: {
    whatsapp: boolean;
    email: boolean;
    notificacaoApp: boolean;
  };
}

export interface ClinicDeadlinesSettings {
  /** Antecedência mínima para realização de agendamento em horas */
  antecedenciaMinimaAgendamentoHoras: number;
  /** Antecedência mínima para cancelamento sem perda de sinal em horas */
  antecedenciaMinimaCancelamentoHoras: number;
  /** Intervalo padrão entre atendimentos em minutos */
  intervaloMinutos: number;
  /** Número mínimo de atendimentos no mês para classificação de cliente recorrente */
  criterioClienteRecorrenteAtendimentosMes: number;
}

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

  /** Configurações de contato da clínica */
  contatos?: ClinicContactsSettings;
  /** Políticas de cancelamento, reagendamento e atrasos */
  politicas?: ClinicPoliciesSettings;
  /** Configuração de lembretes automáticos */
  lembretes?: ClinicRemindersSettings;
  /** Prazos operacionais da clínica */
  prazos?: ClinicDeadlinesSettings;
}
