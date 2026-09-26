import { useEffect, useState } from 'react';
import type { ClientNotification } from '@clinica/shared';

const STORAGE_PREFIX = 'clinica:notificacoes:';

export const DEFAULT_NOTIFICATIONS: ReadonlyArray<ClientNotification> = [
  {
    id: 'notif-1',
    tipo: 'agendamento',
    titulo: 'Sessão Confirmada',
    mensagem:
      'Seu agendamento de Massagem Relaxante foi confirmado com sucesso. Estamos ansiosos para recebê-lo!',
    lida: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min atrás
    link: '/agendamentos',
  },
  {
    id: 'notif-2',
    tipo: 'lembrete',
    titulo: 'Lembrete de Cuidado',
    mensagem:
      'Beba bastante água antes e depois da massagem para otimizar os benefícios da liberação muscular.',
    lida: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 horas atrás
    link: '/servicos',
  },
  {
    id: 'notif-3',
    tipo: 'comunicado',
    titulo: 'Canais de Contato',
    mensagem:
      'Você pode escolher se prefere receber avisos por WhatsApp, E-mail ou Lembretes no seu perfil.',
    lida: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
    link: '/perfil',
  },
  {
    id: 'notif-4',
    tipo: 'sistema',
    titulo: 'Bem-vindo à Clínica!',
    mensagem:
      'Conheça todas as terapias corporais disponíveis e aproveite seu momento de bem-estar.',
    lida: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 dias atrás
    link: '/servicos',
  },
];

function getStorageKey(userUid?: string | null): string {
  return `${STORAGE_PREFIX}${userUid ?? 'anon'}`;
}

export function loadClientNotifications(userUid?: string | null): ClientNotification[] {
  if (typeof window === 'undefined') return [...DEFAULT_NOTIFICATIONS];
  try {
    const raw = localStorage.getItem(getStorageKey(userUid));
    if (!raw) return [...DEFAULT_NOTIFICATIONS];
    const parsed = JSON.parse(raw) as ClientNotification[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_NOTIFICATIONS];
  } catch {
    return [...DEFAULT_NOTIFICATIONS];
  }
}

export function saveClientNotifications(
  userUid: string | null | undefined,
  notifications: ClientNotification[],
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(userUid), JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('clinica:notifications-updated'));
  } catch {
    // Falha silenciosa no armazenamento local
  }
}

export function useClientNotifications(userUid?: string | null) {
  const [prevUid, setPrevUid] = useState(userUid);
  const [notifications, setNotifications] = useState<ClientNotification[]>(() =>
    loadClientNotifications(userUid),
  );

  if (userUid !== prevUid) {
    setPrevUid(userUid);
    setNotifications(loadClientNotifications(userUid));
  }

  useEffect(() => {
    const handleSync = () => {
      setNotifications(loadClientNotifications(userUid));
    };

    window.addEventListener('clinica:notifications-updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('clinica:notifications-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [userUid]);

  const unreadCount = notifications.filter((item) => !item.lida).length;

  const markAsRead = (notificationId: string) => {
    const updated = notifications.map((item) =>
      item.id === notificationId ? { ...item, lida: true } : item,
    );
    setNotifications(updated);
    saveClientNotifications(userUid, updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((item) => ({ ...item, lida: true }));
    setNotifications(updated);
    saveClientNotifications(userUid, updated);
  };

  const clearNotification = (notificationId: string) => {
    const updated = notifications.filter((item) => item.id !== notificationId);
    setNotifications(updated);
    saveClientNotifications(userUid, updated);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
  };
}
