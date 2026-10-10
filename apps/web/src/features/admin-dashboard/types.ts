export type AdminSection = 'agenda' | 'clientes' | 'servicos' | 'relatorios' | 'configuracoes';

export interface AdminNavItem {
  id: AdminSection;
  label: string;
  badge?: string;
}
