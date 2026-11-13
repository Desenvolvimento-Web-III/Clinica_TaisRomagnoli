import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getIdTokenResult, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { AuthContext, type AuthStatus, type AuthenticatedState } from './auth-context';
import { auth, db } from '@/lib/firebase';
import { isAdministratorEmail } from '@/routes/admin-access';
import {
  getLocalActiveSessionId,
  setLocalActiveSessionId,
  clearLocalActiveSessionId,
  setSessionTerminatedReason,
  MOTIVO_OUTRO_DISPOSITIVO,
  iniciarSessaoUnicaNoBackend,
} from '@/services/sessoes-service';
import type { UserRole } from '@/types/user';

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [currentUser, setCurrentUser] = useState<User | null>(auth?.currentUser ?? null);
  const [isAuthReady, setIsAuthReady] = useState(auth === null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);

  const evaluateUserRole = useCallback(async (user: User, forceRefresh = false) => {
    const isEmailAdmin = isAdministratorEmail(user.email);
    try {
      const tokenResult = await getIdTokenResult(user, forceRefresh);
      const admin =
        tokenResult.claims.role === 'admin' || tokenResult.claims.admin === true || isEmailAdmin;
      setIsAdmin(admin);
      setRole(admin ? 'admin' : (tokenResult.claims.role as UserRole) || 'cliente');
    } catch {
      setIsAdmin(isEmailAdmin);
      setRole(isEmailAdmin ? 'admin' : 'cliente');
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

    clearLocalActiveSessionId();
    await signOut(auth);
    setCurrentUser(null);
    setIsAdmin(false);
    setRole(null);
  }, []);

  useEffect(() => {
    if (!currentUser || !db) {
      return;
    }

    const uid = currentUser.uid;

    // Assegura que este dispositivo possui um activeSessionId registrado
    const localSession = getLocalActiveSessionId();
    if (!localSession) {
      void iniciarSessaoUnicaNoBackend().then((res) => {
        if (res?.sessionId) {
          setLocalActiveSessionId(res.sessionId);
        }
      });
    }

    // Monitora em tempo real alterações na sessão única ativa do usuário
    try {
      const userDocRef = doc(db, 'usuarios', uid);
      const unsubscribe = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            return;
          }
          const remoteSessionId = snapshot.data()?.activeSessionId as string | undefined;
          const currentLocalSession = getLocalActiveSessionId();

          // Se a sessão remota foi atualizada para outro ID divergente do local:
          // Dispositivo A cai imediatamente!
          if (remoteSessionId && currentLocalSession && remoteSessionId !== currentLocalSession) {
            console.warn(
              'Política de sessão única violada: login detectado em outro dispositivo. Desconectando sessão local.',
            );
            setSessionTerminatedReason(MOTIVO_OUTRO_DISPOSITIVO);
            clearLocalActiveSessionId();
            void logout();
          }
        },
        () => {
          // Fallback silencioso para erros de leitura ou permissão
        },
      );

      return () => {
        unsubscribe();
      };
    } catch {
      // Ignora silenciosamente se o Firestore não puder anexar o listener
    }
  }, [currentUser, logout]);

  const isAuthenticated = Boolean(currentUser);
  const isLoading = !isAuthReady;
  const status: AuthStatus = !isAuthReady
    ? 'loading'
    : currentUser
      ? 'authenticated'
      : 'unauthenticated';

  const value: AuthenticatedState = useMemo(
    () => ({
      currentUser,
      isAuthenticated,
      isAuthReady,
      isLoading,
      status,
      isAdmin,
      role,
      logout,
      refreshRole,
    }),
    [
      currentUser,
      isAuthenticated,
      isAuthReady,
      isLoading,
      status,
      isAdmin,
      role,
      logout,
      refreshRole,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
