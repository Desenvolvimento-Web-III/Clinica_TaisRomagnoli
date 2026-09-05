import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getAuthErrorMessage } from './auth-errors';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithEmail: (email: string, password: string) => Promise<UserCredential>;
  signUpWithEmail: (email: string, password: string) => Promise<UserCredential>;
  signOutUser: () => Promise<void>;
  getErrorMessage: (error: unknown) => string;
}

const defaultAuthContextValue: AuthContextValue = {
  user: null,
  loading: false,
  isAuthenticated: false,
  signInWithEmail: async () => {
    throw new Error('Serviço de autenticação Firebase não está inicializado.');
  },
  signUpWithEmail: async () => {
    throw new Error('Serviço de autenticação Firebase não está inicializado.');
  },
  signOutUser: async () => {},
  getErrorMessage: getAuthErrorMessage,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
    if (!auth) {
      throw new Error('Serviço de autenticação Firebase não está inicializado.');
    }
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string): Promise<UserCredential> => {
    if (!auth) {
      throw new Error('Serviço de autenticação Firebase não está inicializado.');
    }
    return await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOutUser = async (): Promise<void> => {
    if (!auth) {
      setUser(null);
      return;
    }
    await signOut(auth);
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: !!user,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
    getErrorMessage: getAuthErrorMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  return context ?? defaultAuthContextValue;
}
