export type UserRole = 'cliente' | 'admin';
export type UserStatus = 'ativo' | 'pendente' | 'inativo';

export interface UserProfile {
  uid: string;
  nome: string;
  email: string;
  telefone: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
}
