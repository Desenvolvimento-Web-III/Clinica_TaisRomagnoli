import { useCallback, useEffect, useState } from 'react';
import type { ClientNotification, ClientNotificationType } from '@clinica/shared';
import { obterFichaAnamneseApi } from '@/services/anamnese-service';
import { fichaAnamneseSchema } from '@/features/anamnese/schemas/anamnese-schema';
import {
  buscarNotificacoesRemotas,
  marcarNotificacaoLidaBackend,
  ouvirNotificacoesClienteEmTempoReal,
} from '@/services/notificacoes-service';

export const WELCOME_NOTIFICATION_ID = 'notif-boas-vindas';
export const ANAMNESE_NOTIFICATION_ID = 'notif-ficha-anamnese';
export const DEFAULT_NOTIFICATIONS: ReadonlyArray<ClientNotification> = [];

export function createInitialProfileNotifications(_displayName?: string | null): ClientNotification[] {
  void _displayName;
  return [];
}
export function getNotificationsStorageKey(_userUid?: string | null): string | null {
  void _userUid;
  return null;
}
export function saveClientNotifications(
  _userUid: string | null | undefined,
  _notifications: ClientNotification[],
): void {
  void _userUid;
  void _notifications;
}
export function initializeProfileNotifications(
  _userUid?: string | null,
  _displayName?: string | null,
): ClientNotification[] {
  void _userUid;
  void _displayName;
  return [];
}
export function loadClientNotifications(_userUid?: string | null): ClientNotification[] {
  void _userUid;
  return [];
}

export interface CreateClientNotificationInput {
  id?: string;
  tipo: ClientNotificationType;
  titulo: string;
  mensagem: string;
  link?: string;
  lida?: boolean;
  createdAt?: string;
}
export function addClientNotification(
  _userUid: string | null | undefined,
  _input: CreateClientNotificationInput,
): ClientNotification | null {
  void _userUid;
  void _input;
  return null;
}
export function markClientNotificationAsRead(
  userUid: string | null | undefined,
  notificationId: string,
): void {
  if (userUid) void marcarNotificacaoLidaBackend(notificationId, userUid);
}

export function useClientNotifications(userUid?: string | null) {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [anamnesePendente, setAnamnesePendente] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!userUid) {
      setNotifications([]);
      setAnamnesePendente(false);
      return;
    }
    setIsSyncing(true);
    try {
      setNotifications(await buscarNotificacoesRemotas(userUid));
      const ficha = await obterFichaAnamneseApi(userUid);
      setAnamnesePendente(
        !(ficha.sucesso && ficha.dados && fichaAnamneseSchema.safeParse(ficha.dados).success),
      );
    } finally {
      setIsSyncing(false);
    }
  }, [userUid]);

  useEffect(() => {
    let ativo = true;
    Promise.resolve().then(() => {
      if (ativo) {
        setNotifications([]);
        setAnamnesePendente(false);
      }
    });
    if (!userUid) return () => { ativo = false; };

    void obterFichaAnamneseApi(userUid).then((res) => {
      if (!ativo) return;
      setAnamnesePendente(
        !(res.sucesso && res.dados && fichaAnamneseSchema.safeParse(res.dados).success),
      );
    }).catch(() => {
      if (ativo) setAnamnesePendente(true);
    });

    void buscarNotificacoesRemotas(userUid).then((items) => {
      if (ativo) setNotifications(items);
    });
    const unsubscribe = ouvirNotificacoesClienteEmTempoReal(userUid, (items) => {
      if (ativo) setNotifications(items);
    });
    return () => {
      ativo = false;
      unsubscribe?.();
    };
  }, [userUid]);

  useEffect(() => {
    const atualizarFicha = () => {
      if (!userUid) return;
      void obterFichaAnamneseApi(userUid).then((res) => {
        setAnamnesePendente(
          !(res.sucesso && res.dados && fichaAnamneseSchema.safeParse(res.dados).success),
        );
      }).catch(() => setAnamnesePendente(true));
    };
    window.addEventListener('anamnese:atualizada', atualizarFicha);
    return () => window.removeEventListener('anamnese:atualizada', atualizarFicha);
  }, [userUid]);

  const fixedAnamneseNotification: ClientNotification = {
    id: ANAMNESE_NOTIFICATION_ID,
    tipo: 'sistema',
    titulo: 'Ficha de anamnese não preenchida',
    mensagem: 'Preencha sua ficha antes de reservar qualquer serviço.',
    link: '/anamnese',
    lida: false,
    createdAt: new Date().toISOString(),
  };
  const visibleNotifications = anamnesePendente
    ? [
        fixedAnamneseNotification,
        ...notifications.filter((item) => item.id !== ANAMNESE_NOTIFICATION_ID),
      ]
    : notifications;

  const markAsRead = (notificationId: string) => {
    if (notificationId === ANAMNESE_NOTIFICATION_ID) return;
    if (userUid) void marcarNotificacaoLidaBackend(notificationId, userUid).then(() => sync());
  };
  const markAllAsRead = () => {
    if (userUid) {
      void Promise.all(
        notifications
          .filter((item) => !item.lida && item.id !== ANAMNESE_NOTIFICATION_ID)
          .map((item) => marcarNotificacaoLidaBackend(item.id, userUid)),
      ).then(() => sync());
    }
  };
  const clearNotification = (notificationId: string) => {
    if (notificationId === ANAMNESE_NOTIFICATION_ID) return;
    setNotifications((current) => current.filter((item) => item.id !== notificationId));
  };

  return {
    notifications: visibleNotifications,
    unreadCount: visibleNotifications.filter((item) => !item.lida).length,
    markAsRead,
    markAllAsRead,
    clearNotification,
    isSyncing,
    sync,
  };
}
