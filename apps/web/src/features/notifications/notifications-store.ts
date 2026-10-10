import { useEffect, useState } from 'react';
import type { ClientNotification, ClientNotificationType } from '@clinica/shared';

const STORAGE_PREFIX = 'clinica:notificacoes:v2:';

export const WELCOME_NOTIFICATION_ID = 'notif-boas-vindas';
export const ANAMNESE_NOTIFICATION_ID = 'notif-ficha-anamnese';

function normalizeUserUid(userUid?: string | null): string | null {
  const trimmed = userUid?.trim();
  return trimmed ? trimmed : null;
}

export function createInitialProfileNotifications(
  displayName?: string | null,
): ClientNotification[] {
  const now = Date.now();
  const cleanName = displayName?.trim();
  const saudacao = cleanName
    ? `Olá, ${cleanName}! Seja muito bem-vindo(a) à Clínica Tais Romagnoli.`
    : 'Seja muito bem-vindo(a) à Clínica Tais Romagnoli!';

  return [
    {
      id: ANAMNESE_NOTIFICATION_ID,
      tipo: 'lembrete',
      titulo: 'Preencha sua Ficha de Anamnese',
      mensagem:
        'Antes do seu primeiro atendimento, preencha sua ficha de avaliação e histórico de saúde para que a terapeuta personalize sua sessão com total segurança.',
      lida: false,
      createdAt: new Date(now - 1000 * 60).toISOString(),
      link: '/anamnese',
    },
    {
      id: WELCOME_NOTIFICATION_ID,
      tipo: 'sistema',
      titulo: 'Bem-vindo(a) à Clínica!',
      mensagem: `${saudacao} Conheça todas as terapias corporais disponíveis e aproveite seu momento de bem-estar.`,
      lida: false,
      createdAt: new Date(now - 1000 * 60 * 2).toISOString(),
      link: '/servicos',
    },
  ];
}

export const DEFAULT_NOTIFICATIONS: ReadonlyArray<ClientNotification> =
  createInitialProfileNotifications();

export function getNotificationsStorageKey(userUid?: string | null): string | null {
  const normalized = normalizeUserUid(userUid);
  if (!normalized) {
    return null;
  }
  return `${STORAGE_PREFIX}${normalized}`;
}

export function saveClientNotifications(
  userUid: string | null | undefined,
  notifications: ClientNotification[],
): void {
  const storageKey = getNotificationsStorageKey(userUid);
  if (!storageKey || typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('clinica:notifications-updated'));
  } catch {
    // Falha silenciosa no armazenamento local
  }
}

export function initializeProfileNotifications(
  userUid?: string | null,
  displayName?: string | null,
): ClientNotification[] {
  const normalized = normalizeUserUid(userUid);
  if (!normalized) {
    return [];
  }
  const initial = createInitialProfileNotifications(displayName);
  saveClientNotifications(normalized, initial);
  return initial;
}

export function loadClientNotifications(userUid?: string | null): ClientNotification[] {
  const normalized = normalizeUserUid(userUid);
  const storageKey = getNotificationsStorageKey(normalized);

  if (!normalized || !storageKey) {
    return [];
  }

  if (typeof window === 'undefined') {
    return createInitialProfileNotifications();
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) {
      const initial = createInitialProfileNotifications();
      localStorage.setItem(storageKey, JSON.stringify(initial));
      return initial;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as ClientNotification[])
      : createInitialProfileNotifications();
  } catch {
    return createInitialProfileNotifications();
  }
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
  userUid: string | null | undefined,
  input: CreateClientNotificationInput,
): ClientNotification | null {
  const normalized = normalizeUserUid(userUid);
  if (!normalized) {
    return null;
  }

  const current = loadClientNotifications(normalized);
  const created: ClientNotification = {
    id: input.id ?? `notif-${Date.now()}`,
    tipo: input.tipo,
    titulo: input.titulo,
    mensagem: input.mensagem,
    lida: input.lida ?? false,
    createdAt: input.createdAt ?? new Date().toISOString(),
    link: input.link,
  };

  const updated = [created, ...current.filter((item) => item.id !== created.id)];
  saveClientNotifications(normalized, updated);
  return created;
}

export function markClientNotificationAsRead(
  userUid: string | null | undefined,
  notificationId: string,
): void {
  const normalized = normalizeUserUid(userUid);
  if (!normalized) return;

  const current = loadClientNotifications(normalized);
  const hasUnreadTarget = current.some((item) => item.id === notificationId && !item.lida);
  if (!hasUnreadTarget) return;

  const updated = current.map((item) =>
    item.id === notificationId ? { ...item, lida: true } : item,
  );
  saveClientNotifications(normalized, updated);
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
