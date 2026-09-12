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
}
