export type AdminSection = 'agenda' | 'clientes' | 'servicos' | 'relatorios' | 'configuracoes';

export interface AdminNavItem {
  id: AdminSection;
  label: string;
  badge?: string;
}

export interface AdminClientListItem {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  status?: 'ativo' | 'inativo' | 'pendente';
  totalAtendimentosMes: number;
  totalAtendimentosHistorico?: number;
  ultimoAtendimento?: string;
  createdAt?: string;
}
