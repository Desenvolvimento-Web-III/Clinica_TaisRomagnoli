export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Módulo 1: Contatos da Clínica
 * Centraliza os canais de comunicação oficiais e localização da clínica
 */
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

/**
 * Módulo 2: Políticas Operacionais
 * Centraliza as regras de cancelamento, reagendamento e tolerância a atrasos
 */
export interface ClinicPoliciesSettings {
  /** Texto oficial da política de cancelamento apresentado aos clientes */
  politicaCancelamento: string;
  /** Texto oficial da política de reagendamento */
  politicaReagendamento: string;
  /** Tolerância máxima de atraso em minutos para atendimento */
  toleranciaAtrasoMinutos: number;
}

/**
 * Módulo 3: Lembretes Automáticos
 * Centraliza os parâmetros para envio prévio de lembretes e ativação de canais
 */
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

/**
 * Módulo 4: Prazos Operacionais
 * Centraliza os prazos de agendamento, cancelamento, intervalos e critério de recorrência
 */
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

/**
 * Módulo 5: Sinal Financeiro
 * Centraliza o percentual de sinal exigido para reservas
 */
export interface ClinicSignalSettings {
  /** Percentual do sinal cobrado para confirmação de agendamento por cliente (ex: 30 para 30%) */
  percentualSinal: number;
}

/**
 * Modelo de Configurações da Clínica persistido no Cloud Firestore (`configuracoes/geral`).
 * Centraliza: Contatos, Sinal, Prazos, Lembretes e Políticas.
 */
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

  /** Módulo de Contatos centralizados */
  contatos?: ClinicContactsSettings;
  /** Módulo de Políticas centralizadas */
  politicas?: ClinicPoliciesSettings;
  /** Módulo de Lembretes centralizados */
  lembretes?: ClinicRemindersSettings;
  /** Módulo de Prazos centralizados */
  prazos?: ClinicDeadlinesSettings;
}

/**
 * Modelo de Configurações Centralizadas Completo, onde todos os 5 módulos são obrigatórios.
 */
export interface CentralizedClinicSettings extends ClinicSettings {
  contatos: ClinicContactsSettings;
  politicas: ClinicPoliciesSettings;
  lembretes: ClinicRemindersSettings;
  prazos: ClinicDeadlinesSettings;
}

/**
 * Parâmetros opcionais para factory de modelagem de configurações
 */
export interface ModelarConfiguracoesParams {
  percentualSinal?: number;
  intervaloMinutos?: number;
  diasFolga?: DayOfWeek[];
  antecedenciaMinimaCancelamentoHoras?: number;
  criterioClienteRecorrenteAtendimentosMes?: number;
  contatos?: Partial<ClinicContactsSettings>;
  politicas?: Partial<ClinicPoliciesSettings>;
  lembretes?: Partial<ClinicRemindersSettings>;
  prazos?: Partial<ClinicDeadlinesSettings>;
  updatedAt?: string;
}
