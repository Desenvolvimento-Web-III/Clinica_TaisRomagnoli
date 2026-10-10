import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { UserRole } from '@/types/user';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthContextValue = Readonly<{
  currentUser: User | null;
  isAuthenticated?: boolean;
  isAuthReady: boolean;
  isLoading?: boolean;
  status?: AuthStatus;
  isAdmin: boolean;
  role: UserRole | null;
  logout: () => Promise<void>;
  refreshRole?: () => Promise<void>;
}>;

export type AuthenticatedState = Readonly<{
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  isLoading: boolean;
  status: AuthStatus;
  isAdmin: boolean;
  role: UserRole | null;
  logout: () => Promise<void>;
  refreshRole?: () => Promise<void>;
}>;

export const AuthContext = createContext<AuthContextValue | null>(null);

function resolveAuthState(context: AuthContextValue): AuthenticatedState {
  const isAuthReady = context.isAuthReady;
  const currentUser = context.currentUser;
  const isAuthenticated = context.isAuthenticated ?? Boolean(currentUser);
  const isLoading = context.isLoading ?? !isAuthReady;
  const status: AuthStatus =
    context.status ??
    (!isAuthReady ? 'loading' : currentUser ? 'authenticated' : 'unauthenticated');

  return {
    ...context,
    isAuthenticated,
    isLoading,
    status,
  };
}

export function useAuth(): AuthenticatedState {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return resolveAuthState(context);
}

export function useOptionalAuth(): AuthenticatedState | null {
  const context = useContext(AuthContext);
  if (!context) return null;

  return resolveAuthState(context);
}
