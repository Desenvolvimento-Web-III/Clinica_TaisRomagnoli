import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/ui/AppShell';
import { useOptionalAuth } from '@/features/auth/auth-context';
import { useClientNotifications } from '@/features/notifications/notifications-store';
import type { ClientNotificationType } from '@clinica/shared';

type FilterTab = 'todas' | 'nao-lidas';

function getNotificationBadge(tipo: ClientNotificationType) {
  switch (tipo) {
    case 'agendamento':
      return {
        label: 'Agendamento',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        ),
      };
    case 'lembrete':
      return {
        label: 'Lembrete',
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        ),
      };
    case 'comunicado':
      return {
        label: 'Comunicado',
        bg: 'bg-sky-100 text-sky-800 border-sky-200',
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        ),
      };
    case 'sistema':
    default:
      return {
        label: 'Clínica',
        bg: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
          />
        ),
      };
  }
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatNotificationDate(isoString: string): string {
  try {
    return dateFormatter.format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const authContext = useOptionalAuth();
  const currentUser = authContext?.currentUser ?? null;
  const isAuthReady = authContext?.isAuthReady ?? true;

  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } =
    useClientNotifications(currentUser?.uid);

  const [activeFilter, setActiveFilter] = useState<FilterTab>('todas');

  useEffect(() => {
    if (isAuthReady && !currentUser) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, isAuthReady, navigate]);

  const filteredNotifications = notifications.filter((item) =>
    activeFilter === 'todas' ? true : !item.lida,
  );

  return (
    <AppShell
      activeTab="notificacoes"
      eyebrow="Tais Romagnoli — Massoterapia"
      title="Minhas Notificações"
      description="Fique por dentro das atualizações dos seus agendamentos, dicas e comunicados da clínica."
      headerAside={
        unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--color-brand-deep)] shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--color-brand-soft)] md:w-auto"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Marcar todas como lidas
          </button>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter('todas')}
              className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition-colors ${
                activeFilter === 'todas'
                  ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('nao-lidas')}
              className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition-colors ${
                activeFilter === 'nao-lidas'
                  ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Não lidas ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs font-semibold text-[var(--color-brand-deep)] hover:underline md:hidden"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Lista de Notificações */}
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border-default)] bg-white p-12 text-center shadow-[var(--shadow-card)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
              <svg
                aria-hidden="true"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-base font-bold text-[var(--color-text-primary)]">
              {activeFilter === 'nao-lidas'
                ? 'Nenhuma notificação não lida'
                : 'Nenhuma notificação no momento'}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-[var(--color-text-secondary)]">
              {activeFilter === 'nao-lidas'
                ? 'Você já visualizou todos os comunicados e avisos recentes.'
                : 'Quando a clínica enviar lembretes ou confirmações, você verá tudo aqui.'}
            </p>
            {activeFilter === 'nao-lidas' && (
              <button
                type="button"
                onClick={() => setActiveFilter('todas')}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] px-4 text-xs font-semibold text-[var(--color-brand-deep)] transition-colors hover:bg-[var(--color-canvas-neutral)]"
              >
                Ver todas as notificações
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3" data-testid="notifications-list">
            {filteredNotifications.map((item) => {
              const badge = getNotificationBadge(item.tipo);
              return (
                <article
                  key={item.id}
                  className={`group relative flex flex-col gap-3 rounded-2xl border p-5 shadow-[var(--shadow-card)] transition-all sm:flex-row sm:items-start sm:gap-4 ${
                    item.lida
                      ? 'border-[var(--color-border-default)] bg-white opacity-85 hover:opacity-100'
                      : 'border-[var(--color-brand-soft)] bg-[var(--color-canvas-neutral)]/50 ring-1 ring-[var(--color-brand-soft)]'
                  }`}
                >
                  {/* Ícone de Categoria */}
                  <div
                    aria-hidden="true"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${badge.bg}`}
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      {badge.icon}
                    </svg>
                  </div>

                  {/* Conteúdo */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      <time className="text-xs text-[var(--color-text-secondary)]">
                        {formatNotificationDate(item.createdAt)}
                      </time>
                      {!item.lida && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-brand-deep)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-strong)]" />
                          Nova
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1.5 text-base font-bold text-[var(--color-text-primary)]">
                      {item.titulo}
                    </h3>
                    <p className="mt-1 text-sm/6 text-[var(--color-text-secondary)]">
                      {item.mensagem}
                    </p>

                    {/* Ações da Notificação */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {item.link && (
                        <Link
                          to={item.link}
                          onClick={() => {
                            if (!item.lida) markAsRead(item.id);
                          }}
                          className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[var(--color-brand-soft)] px-3 text-xs font-semibold text-[var(--color-brand-deep)] transition-colors hover:bg-[var(--color-canvas-neutral)]"
                        >
                          Acessar atalho
                        </Link>
                      )}

                      {!item.lida && (
                        <button
                          type="button"
                          onClick={() => markAsRead(item.id)}
                          className="text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        >
                          Marcar como lida
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => clearNotification(item.id)}
                        aria-label={`Remover notificação: ${item.titulo}`}
                        className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-rose-600 sm:ml-auto"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Card informativo de Preferências */}
        <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Preferências de Comunicação
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Personalize os avisos recebidos por WhatsApp e e-mail no seu perfil.
              </p>
            </div>
            <Link
              to="/perfil"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-brand-deep)] px-4 text-sm font-semibold text-[var(--color-brand-deep)] transition-colors hover:bg-[var(--color-brand-soft)]"
            >
              Configurar no perfil
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
