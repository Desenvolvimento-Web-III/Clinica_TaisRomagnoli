import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AdminClientListItem } from '@/features/admin-dashboard/types';

export const CLIENTES_DEMO_INICIAIS: AdminClientListItem[] = [
  {
    id: 'demo-client-1',
    nome: 'Mariana Silva',
    email: 'mariana.silva@exemplo.com',
    telefone: '(11) 98765-4321',
    status: 'ativo',
    totalAtendimentosMes: 3,
    ultimoAtendimento: '26/09/2026',
  },
  {
    id: 'demo-client-2',
    nome: 'Ana Carolina Santos',
    email: 'ana.santos@exemplo.com',
    telefone: '(11) 97654-3210',
    status: 'ativo',
    totalAtendimentosMes: 2,
    ultimoAtendimento: '25/09/2026',
  },
  {
    id: 'demo-client-3',
    nome: 'Juliana Lima',
    email: 'juliana.lima@exemplo.com',
    telefone: '(11) 96543-2109',
    status: 'ativo',
    totalAtendimentosMes: 1,
    ultimoAtendimento: '20/09/2026',
  },
  {
    id: 'demo-client-4',
    nome: 'Carlos Eduardo',
    email: 'carlos.eduardo@exemplo.com',
    telefone: '(11) 95432-1098',
    status: 'inativo',
    totalAtendimentosMes: 0,
    ultimoAtendimento: '22/09/2026',
  },
];

/**
 * Consulta a lista de clientes para a visão administrativa.
 * Consulta o Firestore com autorização administrativa (Security Rules: allow list: if isAdmin()).
 * Caso ocorra falha de rede ou em modo demonstrativo, retorna os clientes iniciais de fallback.
 */
export async function buscarClientesAdmin(): Promise<AdminClientListItem[]> {
  if (db) {
    try {
      const q = query(collection(db, 'clientes'), orderBy('nome', 'asc'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        return snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            nome: data.nome || 'Cliente sem nome',
            email: data.email || '',
            telefone: data.telefone || '',
            status: data.status === 'inativo' ? 'inativo' : 'ativo',
            totalAtendimentosMes:
              typeof data.totalAtendimentosMes === 'number' ? data.totalAtendimentosMes : 0,
            ultimoAtendimento: data.ultimoAtendimento || undefined,
            createdAt: data.createdAt || undefined,
          };
        });
      }
    } catch (err) {
      console.warn('Aviso: Consulta direta ao Firestore /clientes falhou ou sem permissão:', err);
    }
  }

  return CLIENTES_DEMO_INICIAIS;
}
