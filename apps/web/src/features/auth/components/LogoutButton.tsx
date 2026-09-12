import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';

export function LogoutButton() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setError(null);

    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/servicos', { replace: true });
    } catch {
      setError('Não foi possível encerrar a sessão. Tente novamente.');
      setIsLoggingOut(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-brand-deep)] transition-colors hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-soft)] disabled:cursor-wait disabled:opacity-70 sm:px-4"
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
            d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M18 15l3-3m0 0-3-3m3 3H9"
          />
        </svg>
        {isLoggingOut ? 'Saindo…' : 'Sair'}
      </button>
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-14 z-50 w-64 rounded-xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-3 text-right text-xs/4 font-medium text-[var(--color-error-text)] shadow-[var(--shadow-card)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
