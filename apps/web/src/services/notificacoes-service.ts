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
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuthToken, getFunctionsBaseUrl } from './agendamentos-service';

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
 * Consulta a lista de notificações internas do cliente autenticado via Cloud Function.
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
  const authToken = token ?? (await getAuthToken());
  if (!authToken) {
    return { sucesso: false, dados: [], erro: 'Usuário não autenticado no Firebase.' };
  }

  try {
    const params = new URLSearchParams();
    if (apenasNaoLidas) params.set('apenasNaoLidas', 'true');
    if (limite && limite > 0) params.set('limite', String(limite));
    const qs = params.toString() ? `?${params.toString()}` : '';

    const url = `${getFunctionsBaseUrl()}/listarMinhasNotificacoes${qs}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const body = await response.json();
    if (!response.ok) {
      return {
        sucesso: false,
        dados: [],
        erro: body.error || 'Erro ao consultar notificações no servidor.',
        statusCode: response.status,
      };
    }

    const items: NotificacaoInterna[] = Array.isArray(body.dados) ? body.dados : [];
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
 * Marca uma notificação como lida no servidor via Cloud Function, com fallback direto para Firestore.
 */
export async function marcarNotificacaoLidaBackend(
  notificacaoId: string,
  userUid?: string | null,
  token?: string | null,
): Promise<{
  sucesso: boolean;
  erro?: string;
  statusCode?: number;
}> {
  const authToken = token ?? (await getAuthToken());

  // 1. Tenta atualizar via Cloud Function quando há token
  if (authToken) {
    try {
      const url = `${getFunctionsBaseUrl()}/marcarNotificacaoLida`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ notificacaoId }),
      });

      if (response.ok) {
        return { sucesso: true };
      }
    } catch {
      // Falha na function segue para fallback direto no Firestore
    }
  }

  // 2. Fallback direto no Firestore (respeitando Security Rules: afetar apenas 'lida' e 'updatedAt')
  if (db && userUid) {
    try {
      const notifRef = doc(db, 'clientes', userUid, 'notificacoes', notificacaoId);
      await updateDoc(notifRef, {
        lida: true,
        updatedAt: new Date().toISOString(),
      });
      return { sucesso: true };
    } catch {
      // Ignora erro no fallback
    }
  }

  return { sucesso: false, erro: 'Não foi possível sincronizar a notificação com o servidor.' };
}

/**
 * Busca notificações remotas do cliente através de Cloud Function ou consulta direta ao Firestore.
 */
export async function buscarNotificacoesRemotas(
  userUid: string,
  token?: string | null,
): Promise<ClientNotification[]> {
  if (!userUid) return [];

  // 1. Consulta via Cloud Function
  const res = await listarNotificacoesBackend(token);
  if (res.sucesso && res.dados.length > 0) {
    return res.dados;
  }

  // 2. Fallback via Firestore direto
  if (db) {
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
