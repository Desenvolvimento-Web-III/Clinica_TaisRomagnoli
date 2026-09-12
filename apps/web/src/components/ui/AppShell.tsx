import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { BottomNav } from '@/features/agendamentos/components/BottomNav';
import { LogoutButton } from '@/features/auth/components/LogoutButton';
import { useOptionalAuth } from '@/features/auth/auth-context';
import { getUserDisplayName, getUserInitials } from '@/features/auth/user-display';

type ActiveTab = 'inicio' | 'agendamentos' | 'perfil';

type AppShellProps = Readonly<{
  activeTab: ActiveTab;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  headerAside?: ReactNode;
}>;

const navigationItems: ReadonlyArray<{ label: string; to: string; tab: ActiveTab }> = [
  { label: 'Serviços', to: '/servicos', tab: 'inicio' },
  { label: 'Agendamentos', to: '/agendamentos', tab: 'agendamentos' },
];

export function AppShell({
  activeTab,
  eyebrow,
  title,
  description,
  children,
  headerAside,
}: AppShellProps) {
  const currentUser = useOptionalAuth()?.currentUser ?? null;
  const userName = getUserDisplayName(currentUser);

  return (
    <div className="min-h-dvh bg-[var(--color-canvas-neutral)] pb-20 text-[var(--color-text-primary)] md:pb-0">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border-default)] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Link to="/servicos" aria-label="Ir para serviços" className="shrink-0 rounded-lg">
            <BrandLogo className="w-[116px] sm:w-[132px]" />
          </Link>

          <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
            {navigationItems.map((item) => {
              const active = item.tab === activeTab;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-brand-deep)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {currentUser ? (
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Link
                to="/perfil"
                aria-label="Acessar meu perfil"
                className="group flex min-w-0 items-center gap-2 rounded-xl p-1 transition-colors hover:bg-[var(--color-canvas-neutral)] sm:gap-3"
              >
                <div
                  aria-hidden="true"
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-sm font-bold text-[var(--color-brand-deep)] transition-transform group-hover:scale-105 sm:flex"
                >
                  {getUserInitials(userName)}
                </div>
                <div className="hidden min-w-0 text-left lg:block">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Sessão ativa
                  </p>
                  <p
                    className="max-w-44 truncate text-sm font-semibold transition-colors group-hover:text-[var(--color-brand-deep)]"
                    title={userName}
                  >
                    {userName}
                  </p>
                </div>
                <span
                  className="max-w-28 truncate text-sm font-semibold transition-colors group-hover:text-[var(--color-brand-deep)] sm:max-w-40 lg:hidden"
                  title={userName}
                >
                  {userName}
                </span>
              </Link>
              <LogoutButton />
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-brand-deep)] px-4 text-sm font-semibold text-[var(--color-brand-deep)] transition-colors hover:bg-[var(--color-brand-soft)]"
            >
              Entrar
            </Link>
          )}
        </div>
      </header>

      <div className="bg-[var(--color-brand-strong)] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10 md:flex-row md:items-end md:justify-between lg:px-8 lg:py-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-white/85">{eyebrow}</p>
            <h1 className="mt-2 text-2xl/8 font-bold tracking-tight sm:text-3xl/10">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm/6 text-white/90 sm:text-base/7">{description}</p>
          </div>
          {headerAside}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">{children}</main>
      <BottomNav activeTab={activeTab} />
    </div>
  );
}
