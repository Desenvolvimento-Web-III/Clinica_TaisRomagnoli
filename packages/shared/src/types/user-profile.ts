export type UserRole = 'admin' | 'client' | 'professional' | 'cliente';
export type UserStatus = 'ativo' | 'inativo' | 'pendente';

export interface ContactPreferences {
  /** Deseja receber confirmações e mensagens via WhatsApp */
  whatsapp: boolean;
  /** Deseja receber notificações e comprovantes por e-mail */
  email: boolean;
  /** Deseja receber lembretes automáticos antes de cada sessão */
  lembretesAgendamento: boolean;
}

export interface UserProfile {
  /** Identificador único do usuário no Firebase Auth */
  uid: string;
  /** Nome completo do usuário */
  nome: string;
  /** E-mail para contato e login */
  email: string;
  /** Telefone com DDD */
  telefone: string;
  /** Papel do usuário no sistema */
  role: UserRole;
  /** Status do cadastro */
  status: UserStatus;
  /** Data de cadastro em formato ISO */
  createdAt: string;
  /** Data de atualização opcional */
  updatedAt?: string;
  /** Preferências de contato e notificações do cliente */
  preferenciasContato?: ContactPreferences;
  /** Indica se o cliente é recorrente no mês (mínimo de 2 sessões concluídas no mês) */
  recorrente?: boolean;
  /** Total de atendimentos concluídos no mês de referência */
  totalAtendimentosMes?: number;
  /** Mês de referência no formato YYYY-MM para o cálculo de recorrência */
  mesReferenciaRecorrencia?: string;
  /** Data/hora do último atendimento concluído */
  ultimoAtendimento?: string;
  /** Total histórico de atendimentos concluídos */
  totalAtendimentosConcluidos?: number;
  /** Identificador da sessão única ativa atual */
  activeSessionId?: string;
  /** Timestamp ISO de quando a sessão única ativa foi criada */
  activeSessionCreatedAt?: string;
}

export interface RecorrenciaClienteOutput {
  clienteId: string;
  recorrente: boolean;
  totalAtendimentosMes: number;
  totalAtendimentosConcluidos: number;
  mesReferencia: string;
  criterioMinimo: number;
  ultimoAtendimento?: string;
}
