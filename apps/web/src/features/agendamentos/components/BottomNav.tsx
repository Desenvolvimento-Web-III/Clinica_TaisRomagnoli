import { Link } from 'react-router-dom';

interface BottomNavProps {
  activeTab?: 'inicio' | 'agendamentos' | 'perfil';
}

export function BottomNav({ activeTab = 'agendamentos' }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      data-testid="mobile-navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border-default)] bg-white/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgb(76_61_116_/_0.08)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {/* Início / Serviços */}
        <Link
          to="/servicos"
          aria-current={activeTab === 'inicio' ? 'page' : undefined}
          className={`min-h-12 min-w-20 rounded-xl px-2 py-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
            activeTab === 'inicio'
              ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]'
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
          className={`min-h-12 min-w-20 rounded-xl px-2 py-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
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

        {/* Perfil */}
        <Link
          to="/perfil"
          aria-current={activeTab === 'perfil' ? 'page' : undefined}
          className={`min-h-12 min-w-20 rounded-xl px-2 py-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
            activeTab === 'perfil'
              ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]'
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
