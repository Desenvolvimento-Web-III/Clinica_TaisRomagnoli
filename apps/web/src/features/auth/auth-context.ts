import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { UserRole } from '@/types/user';

export type AuthContextValue = Readonly<{
  currentUser: User | null;
  isAuthReady: boolean;
  isAdmin: boolean;
  role: UserRole | null;
  logout: () => Promise<void>;
  refreshRole?: () => Promise<void>;
}>;

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}
