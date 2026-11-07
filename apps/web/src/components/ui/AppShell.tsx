import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { BottomNav } from '@/features/agendamentos/components/BottomNav';
import { AuthenticatedUserNav } from '@/features/auth/components/AuthenticatedUserNav';
import { useOptionalAuth } from '@/features/auth/auth-context';

export type ActiveTab = 'inicio' | 'agendamentos' | 'notificacoes' | 'perfil' | 'admin_horarios';

export type AppShellProps = Readonly<{
  activeTab: ActiveTab;
  eyebrow?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  headerAside?: ReactNode;
  footer?: ReactNode;
  hideFooter?: boolean;
  hideHero?: boolean;
  className?: string;
}>;

type NavigationItem = Readonly<{ label: string; to: string; tab: ActiveTab }>;

const baseNavigationItems: ReadonlyArray<NavigationItem> = [
  { label: 'Serviços', to: '/servicos', tab: 'inicio' },
  { label: 'Agendamentos', to: '/agendamentos', tab: 'agendamentos' },
];

const adminNavigationItem: NavigationItem = {
  label: 'Horários da Clínica',
  to: '/admin/horarios',
  tab: 'admin_horarios',
};

export function AppShell({
  activeTab,
  eyebrow,
  title,
  description,
  children,
  headerAside,
  footer,
  hideFooter = false,
  hideHero = false,
  className,
}: AppShellProps) {
  const authContext = useOptionalAuth();
  const currentUser = authContext?.currentUser ?? null;
  const isAdmin = authContext?.isAdmin ?? false;

  const navigationItems = isAdmin
    ? [...baseNavigationItems, adminNavigationItem]
    : baseNavigationItems;

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-canvas-neutral)] pb-[calc(5rem+env(safe-area-inset-bottom,0px))] text-[var(--color-text-primary)] md:pb-0">
      {/* Skip Link para acessibilidade (WCAG AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[var(--color-brand-strong)] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
      >
        Pular para o conteúdo principal
      </a>

      {/* Cabeçalho Fixo / Sticky com Navegação Adaptativa */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border-default)] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Link to="/servicos" aria-label="Ir para serviços" className="shrink-0 rounded-lg">
            <BrandLogo className="w-[116px] sm:w-[132px]" />
          </Link>

          {/* Navegação Desktop */}
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

          {/* Ações de Usuário (Login ou Menu Autenticado) */}
          {currentUser ? (
            <AuthenticatedUserNav />
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

      {/* Hero Header Institucional (quando não oculto) */}
      {!hideHero && (title || eyebrow || description) && (
        <div className="bg-[var(--color-brand-strong)] text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10 md:flex-row md:items-end md:justify-between lg:px-8 lg:py-12">
            <div className="max-w-3xl">
              {eyebrow && <p className="text-sm font-semibold text-white/85">{eyebrow}</p>}
              {title && (
                <h1 className="mt-2 text-2xl/8 font-bold tracking-tight sm:text-3xl/10">{title}</h1>
              )}
              {description && (
                <p className="mt-3 max-w-2xl text-sm/6 text-white/90 sm:text-base/7">
                  {description}
                </p>
              )}
            </div>
            {headerAside}
          </div>
        </div>
      )}

      {/* Área de Conteúdo Principal Flexível e Responsiva */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`mx-auto w-full max-w-7xl flex-1 px-4 py-7 focus:outline-none sm:px-6 sm:py-10 lg:px-8 ${className ?? ''}`}
      >
        {children}
      </main>

      {/* Rodapé Global Institucional */}
      {!hideFooter &&
        (footer ?? (
          <footer
            aria-label="Rodapé institucional"
            className="border-t border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)]"
          >
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
                <div>
                  <p className="text-sm font-bold text-[var(--color-brand-deep)]">
                    Tais Romagnoli — Massoterapia
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    Cuidado e organização desde o primeiro contato.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1 sm:items-end text-xs text-[var(--color-text-secondary)]">
                  <p>Atendimento de Segunda a Sábado • Hora marcada</p>
                  <p>© {currentYear} Clínica Tais Romagnoli. Todos os direitos reservados.</p>
                </div>
              </div>
            </div>
          </footer>
        ))}

      {/* Navegação Inferior Fixa Mobile */}
      <BottomNav activeTab={activeTab} />
    </div>
  );
}
