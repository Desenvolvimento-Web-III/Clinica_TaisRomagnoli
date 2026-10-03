import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useOptionalAuth } from '@/features/auth/auth-context';

export type ProtectedRouteProps = Readonly<{
  children: ReactNode;
  redirectTo?: string;
  isAuthenticated?: boolean;
  isLoading?: boolean;
}>;

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  isAuthenticated,
  isLoading,
}: ProtectedRouteProps) {
  const authContext = useOptionalAuth();
  const location = useLocation();

  const isAuthReady = isLoading !== undefined ? !isLoading : (authContext?.isAuthReady ?? true);
  const user = isAuthenticated !== undefined ? isAuthenticated : Boolean(authContext?.currentUser);

  if (!isAuthReady) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--color-canvas-neutral)] px-4">
        <div className="flex flex-col items-center gap-3">
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-brand-primary)] border-t-transparent"
          />
          <p role="status" className="text-sm font-medium text-[var(--color-text-secondary)]">
            Verificando autenticação…
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return children;
}
