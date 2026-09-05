import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';

export function LogoutButton() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setError(null);

    if (!auth) {
      setError('Não foi possível encerrar a sessão neste ambiente.');
      return;
    }

    setIsLoggingOut(true);

    try {
      await signOut(auth);
      navigate('/servicos', { replace: true });
    } catch {
      setError('Não foi possível encerrar a sessão. Tente novamente.');
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/70 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-brand-deep)] transition-colors hover:bg-[var(--color-brand-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-70"
      >
        {isLoggingOut ? 'Saindo…' : 'Sair'}
      </button>
      {error && (
        <p role="alert" className="max-w-64 text-right text-xs/4 font-medium text-white">
          {error}
        </p>
      )}
    </div>
  );
}
