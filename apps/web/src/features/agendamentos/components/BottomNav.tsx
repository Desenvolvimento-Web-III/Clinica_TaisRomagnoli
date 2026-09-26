import { Link } from 'react-router-dom';
import { useOptionalAuth } from '@/features/auth/auth-context';
import { useClientNotifications } from '@/features/notifications/notifications-store';

interface BottomNavProps {
  activeTab?: 'inicio' | 'agendamentos' | 'notificacoes' | 'perfil';
}

export function BottomNav({ activeTab = 'agendamentos' }: BottomNavProps) {
  const currentUser = useOptionalAuth()?.currentUser ?? null;
  const { unreadCount } = useClientNotifications(currentUser?.uid);

  return (
    <nav
      aria-label="Navegação principal"
      data-testid="mobile-navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border-default)] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgb(76_61_116_/_0.08)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {/* Início / Serviços */}
        <Link
          to="/servicos"
          aria-current={activeTab === 'inicio' ? 'page' : undefined}
          className={`min-h-12 min-w-16 sm:min-w-20 rounded-xl px-2 py-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
            activeTab === 'inicio'
              ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] font-semibold'
              : 'text-[var(--color-nav-muted)] hover:text-[var(--color-brand-deep)]'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={activeTab === 'inicio' ? 2.5 : 1.8}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span>Serviços</span>
        </Link>

        {/* Agendamentos */}
        <Link
          to="/agendamentos"
          aria-current={activeTab === 'agendamentos' ? 'page' : undefined}
          className={`min-h-12 min-w-16 sm:min-w-20 rounded-xl px-2 py-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
            activeTab === 'agendamentos'
              ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] font-semibold'
              : 'text-[var(--color-nav-muted)] hover:text-[var(--color-brand-deep)]'
          }`}
        >
          <div className="relative">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={activeTab === 'agendamentos' ? 2.5 : 1.8}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {activeTab === 'agendamentos' && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--color-brand-strong)] ring-2 ring-white" />
            )}
          </div>
          <span>Agendamentos</span>
        </Link>

        {/* Notificações */}
        <Link
          to="/notificacoes"
          aria-current={activeTab === 'notificacoes' ? 'page' : undefined}
          className={`min-h-12 min-w-16 sm:min-w-20 rounded-xl px-2 py-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
            activeTab === 'notificacoes'
              ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] font-semibold'
              : 'text-[var(--color-nav-muted)] hover:text-[var(--color-brand-deep)]'
          }`}
        >
          <div className="relative">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={activeTab === 'notificacoes' ? 2.5 : 1.8}
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand-strong)] px-1 text-[10px] font-bold text-white ring-2 ring-white"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span>Notificações</span>
        </Link>

        {/* Perfil */}
        <Link
          to="/perfil"
          aria-current={activeTab === 'perfil' ? 'page' : undefined}
          className={`min-h-12 min-w-16 sm:min-w-20 rounded-xl px-2 py-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
            activeTab === 'perfil'
              ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] font-semibold'
              : 'text-[var(--color-nav-muted)] hover:text-[var(--color-brand-deep)]'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={activeTab === 'perfil' ? 2.5 : 1.8}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span>Perfil</span>
        </Link>
      </div>
    </nav>
  );
}
