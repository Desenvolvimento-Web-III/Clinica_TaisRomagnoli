import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { getUserDisplayName, getUserInitials } from '@/features/auth/user-display';
import { useClientNotifications } from '@/features/notifications/notifications-store';
import { LogoutButton } from '@/features/auth/components/LogoutButton';

export function AuthenticatedUserNav() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { unreadCount } = useClientNotifications(currentUser?.uid);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const userName = getUserDisplayName(currentUser);
  const userInitials = getUserInitials(userName);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fecha o menu ao pressionar Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setError(null);
    setIsLoggingOut(true);

    try {
      await logout();
      setIsOpen(false);
      navigate('/servicos', { replace: true });
    } catch {
      setError('Não foi possível encerrar a sessão. Tente novamente.');
      setIsLoggingOut(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Atalho direto para Notificações */}
      <Link
        to="/notificacoes"
        aria-label={
          unreadCount > 0 ? `Notificações (${unreadCount} não lidas)` : 'Notificações da clínica'
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]"
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
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

        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-brand-strong)] px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>

      {/* Botão de Menu Autenticado do Usuário */}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          aria-label="Menu da conta do cliente"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="group flex min-w-0 items-center gap-2 rounded-xl p-1 transition-colors hover:bg-[var(--color-canvas-neutral)] sm:gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]"
        >
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-sm font-bold text-[var(--color-brand-deep)] transition-transform group-hover:scale-105"
          >
            {userInitials}
          </div>

          <div className="hidden min-w-0 text-left lg:block">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">Sessão ativa</p>
            <p
              className="max-w-40 truncate text-sm font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand-deep)]"
              title={userName}
            >
              {userName}
            </p>
          </div>

          <svg
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-[var(--color-icon-muted)] transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[var(--color-brand-deep)]' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Menu Dropdown com os 4 atalhos */}
        {isOpen && (
          <div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            aria-label="Atalhos da conta"
            className="absolute right-0 top-13 z-50 w-72 origin-top-right rounded-2xl border border-[var(--color-border-default)] bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Cabeçalho do Menu */}
            <div className="border-b border-[var(--color-border-default)] px-3 py-2.5">
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                Conectado como
              </p>
              <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">
                {userName}
              </p>
              <p className="truncate text-xs text-[var(--color-text-secondary)]">
                {currentUser.email}
              </p>
            </div>

            {/* Lista de Atalhos */}
            <div className="py-1">
              {/* 1. Perfil */}
              <Link
                to="/perfil"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-brand-deep)]"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[var(--color-icon-muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                <span>Meu Perfil</span>
              </Link>

              {/* 2. Agendamentos */}
              <Link
                to="/agendamentos"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-brand-deep)]"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-[var(--color-icon-muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
                <span>Meus Agendamentos</span>
              </Link>

              {/* 3. Notificações */}
              <Link
                to="/notificacoes"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-brand-deep)]"
              >
                <div className="flex items-center gap-3">
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 text-[var(--color-icon-muted)]"
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
                  <span>Notificações</span>
                </div>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-xs font-bold text-[var(--color-brand-deep)]">
                    {unreadCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Divisor */}
            <div className="my-1 border-t border-[var(--color-border-default)]" />

            {/* 4. Saída da conta */}
            <div className="p-1">
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5 text-rose-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 15l3-3m0 0-3-3m3 3H9"
                  />
                </svg>
                <span>{isLoggingOut ? 'Saindo da conta…' : 'Sair da conta'}</span>
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-1 rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-2 text-center text-xs font-medium text-[var(--color-error-text)]"
              >
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Botão de saída rápida da conta */}
      <LogoutButton />
    </div>
  );
}
