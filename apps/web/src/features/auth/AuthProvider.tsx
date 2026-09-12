import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { AuthContext } from './auth-context';
import { auth } from '@/lib/firebase';

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [currentUser, setCurrentUser] = useState<User | null>(auth?.currentUser ?? null);
  const [isAuthReady, setIsAuthReady] = useState(auth === null);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
        setIsAuthReady(true);
      },
      () => {
        setCurrentUser(null);
        setIsAuthReady(true);
      },
    );
  }, []);

  const logout = useCallback(async () => {
    if (!auth) {
      throw new Error('Firebase Auth não está configurado.');
    }

    await signOut(auth);
    setCurrentUser(null);
  }, []);

  const value = useMemo(
    () => ({ currentUser, isAuthReady, logout }),
    [currentUser, isAuthReady, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
