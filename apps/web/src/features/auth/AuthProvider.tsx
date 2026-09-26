import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getIdTokenResult, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { AuthContext } from './auth-context';
import { auth } from '@/lib/firebase';
import type { UserRole } from '@/types/user';

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [currentUser, setCurrentUser] = useState<User | null>(auth?.currentUser ?? null);
  const [isAuthReady, setIsAuthReady] = useState(auth === null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);

  const evaluateUserRole = useCallback(async (user: User, forceRefresh = false) => {
    try {
      const tokenResult = await getIdTokenResult(user, forceRefresh);
      const admin = tokenResult.claims.role === 'admin' || tokenResult.claims.admin === true;
      setIsAdmin(admin);
      setRole(admin ? 'admin' : (tokenResult.claims.role as UserRole) || 'cliente');
    } catch {
      setIsAdmin(false);
      setRole('cliente');
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          setCurrentUser(user);
          await evaluateUserRole(user);
        } else {
          setCurrentUser(null);
          setIsAdmin(false);
          setRole(null);
        }
        setIsAuthReady(true);
      },
      () => {
        setCurrentUser(null);
        setIsAdmin(false);
        setRole(null);
        setIsAuthReady(true);
      },
    );
  }, [evaluateUserRole]);

  const refreshRole = useCallback(async () => {
    if (currentUser) {
      await evaluateUserRole(currentUser, true);
    }
  }, [currentUser, evaluateUserRole]);

  const logout = useCallback(async () => {
    if (!auth) {
      throw new Error('Firebase Auth não está configurado.');
    }

    await signOut(auth);
    setCurrentUser(null);
    setIsAdmin(false);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({ currentUser, isAuthReady, isAdmin, role, logout, refreshRole }),
    [currentUser, isAuthReady, isAdmin, role, logout, refreshRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
