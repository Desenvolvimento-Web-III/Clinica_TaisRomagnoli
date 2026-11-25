import type { NotificacaoInterna, ClientNotification } from '@clinica/shared';
import {
  collection,
  doc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

/**
 * Converte a notificação interna do Firestore/Functions no formato padronizado de exibição da UI.
 */
export function mapNotificacaoInternaToClientNotification(
  notif: Partial<NotificacaoInterna> & { id: string },
): ClientNotification {
  return {
    id: notif.id,
    tipo: notif.tipo || 'sistema',
    titulo: notif.titulo || 'Notificação da clínica',
    mensagem: notif.mensagem || '',
    lida: Boolean(notif.lida),
    createdAt: notif.createdAt || new Date().toISOString(),
    link: notif.link,
  };
}

/**
 * Mescla notificações locais com notificações remotas vindas do backend/Firestore:
 * - Notificações remotas prevalecem sobre notificações locais com o mesmo ID (ex: status de lida atualizado pelo servidor).
 * - Notificações adicionadas localmente (ex: boas-vindas iniciais ou lembretes locais) são preservadas.
 * - O resultado final é ordenado pela data mais recente (`createdAt` decrescente).
 */
export function mesclarNotificacoes(
  locais: ClientNotification[],
  remotas: ClientNotification[],
): ClientNotification[] {
  const mapPorId = new Map<string, ClientNotification>();

  for (const item of locais) {
    mapPorId.set(item.id, item);
  }

  for (const item of remotas) {
    mapPorId.set(item.id, item);
  }

  return Array.from(mapPorId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Consulta notificações do próprio cliente diretamente na subcoleção do Firestore.
 */
export async function listarNotificacoesBackend(
  token?: string | null,
  apenasNaoLidas = false,
  limite?: number,
): Promise<{
  sucesso: boolean;
  dados: ClientNotification[];
  erro?: string;
  statusCode?: number;
}> {
  void token;
  const userUid = auth?.currentUser?.uid;
  if (!db || !userUid) {
    return { sucesso: false, dados: [], erro: 'Usuário não autenticado no Firebase.' };
  }

  try {
    const q = query(
      collection(db, 'clientes', userUid, 'notificacoes'),
      ...(apenasNaoLidas ? [where('lida', '==', false)] : []),
      orderBy('createdAt', 'desc'),
      ...(limite && limite > 0 ? [firestoreLimit(limite)] : []),
    );
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as Partial<NotificacaoInterna>),
      id: docSnap.id,
    }));
    return {
      sucesso: true,
      dados: items.map(mapNotificacaoInternaToClientNotification),
    };
  } catch (err) {
    return {
      sucesso: false,
      dados: [],
      erro: err instanceof Error ? err.message : 'Falha na comunicação com o servidor.',
    };
  }
}

/**
 * Marca como lida uma notificação da subcoleção do cliente autenticado.
 */
export async function marcarNotificacaoLidaBackend(
  notificacaoId: string,
  userUid?: string | null,
  _token?: string | null,
): Promise<{
  sucesso: boolean;
  erro?: string;
  statusCode?: number;
}> {
  void _token;
  const uidAutenticado = auth?.currentUser?.uid;
  if (db && userUid && uidAutenticado === userUid) {
    try {
      const notifRef = doc(db, 'clientes', userUid, 'notificacoes', notificacaoId);
      await updateDoc(notifRef, {
        lida: true,
        updatedAt: new Date().toISOString(),
      });
      return { sucesso: true };
    } catch {
      // Deixa a interface informar que a atualização não foi sincronizada.
    }
  }

  return { sucesso: false, erro: 'Não foi possível sincronizar a notificação com o servidor.' };
}

/**
 * Busca notificações remotas do próprio cliente diretamente no Firestore.
 */
export async function buscarNotificacoesRemotas(
  userUid: string,
  _token?: string | null,
): Promise<ClientNotification[]> {
  void _token;
  if (!userUid) return [];

  if (db && auth?.currentUser?.uid === userUid) {
    try {
      const q = query(
        collection(db, 'clientes', userUid, 'notificacoes'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(50),
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<NotificacaoInterna>;
          return mapNotificacaoInternaToClientNotification({
            ...data,
            id: docSnap.id,
          });
        });
      }
    } catch {
      // Silencioso em caso de permissão negada ou offline
    }
  }

  return [];
}

/**
 * Escuta notificações do cliente em tempo real via snapshot do Firestore, quando disponível.
 */
export function ouvirNotificacoesClienteEmTempoReal(
  userUid: string,
  onAtualizacao: (notificacoesRemotas: ClientNotification[]) => void,
): Unsubscribe | null {
  if (!db || !userUid) return null;

  try {
    const q = query(
      collection(db, 'clientes', userUid, 'notificacoes'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(50),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) return;
        const remotas = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<NotificacaoInterna>;
          return mapNotificacaoInternaToClientNotification({
            ...data,
            id: docSnap.id,
          });
        });

        onAtualizacao(remotas);
      },
      () => {
        // Ignora erro de listener silenciosamente
      },
    );
  } catch {
    return null;
  }
}
