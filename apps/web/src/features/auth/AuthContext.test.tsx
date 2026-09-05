import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { AUTH_ERROR_MESSAGES, getAuthErrorMessage } from './auth-errors';

// Mocks do Firebase
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  onAuthStateChanged: (_auth: unknown, callback: (user: unknown) => void) => {
    mockOnAuthStateChanged(callback);
    callback({ uid: 'test-user-123', email: 'cliente@exemplo.com' });
    return vi.fn(); // Unsubscribe mock
  },
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
}));

describe('AuthContext e useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna fallback seguro com usuário deslogado se useAuth for chamado fora do AuthProvider', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('inicializa o estado e escuta alterações de sessão do Firebase Auth', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(mockOnAuthStateChanged).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(
      expect.objectContaining({ uid: 'test-user-123', email: 'cliente@exemplo.com' })
    );
  });

  it('permite autenticar por e-mail e senha através do signInWithEmail', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: 'user-logged', email: 'teste@exemplo.com' },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    let credential;
    await act(async () => {
      credential = await result.current.signInWithEmail('teste@exemplo.com', '123456');
    });

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'teste@exemplo.com',
      '123456'
    );
    expect(credential).toBeDefined();
  });

  it('permite cadastrar por e-mail e senha através do signUpWithEmail', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: 'user-new', email: 'novo@exemplo.com' },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    let credential;
    await act(async () => {
      credential = await result.current.signUpWithEmail('novo@exemplo.com', '123456');
    });

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'novo@exemplo.com',
      '123456'
    );
    expect(credential).toBeDefined();
  });

  it('desconecta o usuário via signOutUser', async () => {
    mockSignOut.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signOutUser();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('valida mensagens explicativas para erros do provedor de e-mail e senha', () => {
    // Provedor desabilitado no Firebase
    expect(getAuthErrorMessage({ code: 'auth/operation-not-allowed' })).toBe(
      AUTH_ERROR_MESSAGES['auth/operation-not-allowed']
    );

    // Credencial inválida
    expect(getAuthErrorMessage({ code: 'auth/invalid-credential' })).toBe(
      AUTH_ERROR_MESSAGES['auth/invalid-credential']
    );

    // Senha fraca
    expect(getAuthErrorMessage({ code: 'auth/weak-password' })).toBe(
      AUTH_ERROR_MESSAGES['auth/weak-password']
    );

    // E-mail em uso
    expect(getAuthErrorMessage({ code: 'auth/email-already-in-use' })).toBe(
      AUTH_ERROR_MESSAGES['auth/email-already-in-use']
    );
  });
});
