import { fireEvent, render, screen } from '@testing-library/react';
import { getIdTokenResult, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useAuth, useOptionalAuth } from './auth-context';

const { authMock } = vi.hoisted(() => ({
  authMock: { currentUser: null },
}));

vi.mock('@/lib/firebase', () => ({ auth: authMock }));

vi.mock('firebase/auth', () => ({
  getIdTokenResult: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}));

function FullSessionProbe() {
  const { currentUser, isAuthenticated, isAuthReady, isLoading, status, isAdmin, role, logout } =
    useAuth();

  return (
    <div>
      <p data-testid="auth-ready">{isAuthReady ? 'Pronto' : 'Carregando'}</p>
      <p data-testid="is-loading">{isLoading ? 'Sim' : 'Não'}</p>
      <p data-testid="is-authenticated">{isAuthenticated ? 'Autenticado' : 'Não autenticado'}</p>
      <p data-testid="auth-status">{status}</p>
      <p data-testid="user-email">{currentUser?.email ?? 'Sem sessão'}</p>
      <p data-testid="is-admin">{isAdmin ? 'É Administrador' : 'Não é Administrador'}</p>
      <p data-testid="user-role">{role ?? 'Sem perfil'}</p>
      <button type="button" onClick={() => void logout()}>
        Sair
      </button>
    </div>
  );
}

function OptionalSessionProbe() {
  const authState = useOptionalAuth();

  return (
    <div>
      <p data-testid="has-context">{authState ? 'Com contexto' : 'Sem contexto'}</p>
      <p data-testid="opt-status">{authState?.status ?? 'indefinido'}</p>
    </div>
  );
}

describe('AuthProvider e Estado Global de Autenticação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIdTokenResult).mockResolvedValue({
      claims: { role: 'cliente' },
    } as unknown as Awaited<ReturnType<typeof getIdTokenResult>>);
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, next) => {
      if (typeof next === 'function') {
        next({ email: 'cliente@exemplo.com' } as User);
      }
      return vi.fn();
    });
  });

  it('centraliza status "authenticated", isAuthenticated = true e isLoading = false quando há usuário ativo', async () => {
    render(
      <AuthProvider>
        <FullSessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('cliente@exemplo.com')).toBeInTheDocument();
    expect(screen.getByTestId('auth-ready')).toHaveTextContent('Pronto');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('Não');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('Autenticado');
    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('Não é Administrador');
    expect(screen.getByTestId('user-role')).toHaveTextContent('cliente');
  });

  it('identifica corretamente perfil administrativo por custom claim', async () => {
    vi.mocked(getIdTokenResult).mockResolvedValueOnce({
      claims: { role: 'admin' },
    } as unknown as Awaited<ReturnType<typeof getIdTokenResult>>);

    render(
      <AuthProvider>
        <FullSessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('cliente@exemplo.com')).toBeInTheDocument();
    expect(screen.getByTestId('is-admin')).toHaveTextContent('É Administrador');
    expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
  });

  it('identifica perfil administrativo pelo e-mail oficial da administradora', async () => {
    vi.mocked(onAuthStateChanged).mockImplementationOnce((_auth, next) => {
      if (typeof next === 'function') {
        next({ email: 'admin@clinicataisromagnoli.com.br' } as User);
      }
      return vi.fn();
    });

    render(
      <AuthProvider>
        <FullSessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('admin@clinicataisromagnoli.com.br')).toBeInTheDocument();
    expect(screen.getByTestId('is-admin')).toHaveTextContent('É Administrador');
    expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
  });

  it('encerra a sessão no Firebase Auth e atualiza status para unauthenticated', async () => {
    vi.mocked(signOut).mockResolvedValueOnce();
    render(
      <AuthProvider>
        <FullSessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('cliente@exemplo.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Sem sessão')).toBeInTheDocument();
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('Não autenticado');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('Não');
    expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('Não é Administrador');
    expect(screen.getByTestId('user-role')).toHaveTextContent('Sem perfil');
    expect(signOut).toHaveBeenCalledWith(authMock);
  });

  it('fornece status unauthenticated quando o Firebase Auth inicializa sem usuário', async () => {
    vi.mocked(onAuthStateChanged).mockImplementationOnce((_auth, next) => {
      if (typeof next === 'function') {
        next(null);
      }
      return vi.fn();
    });

    render(
      <AuthProvider>
        <FullSessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('Sem sessão')).toBeInTheDocument();
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('Não autenticado');
    expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
  });

  it('useOptionalAuth retorna null quando invocado fora do AuthProvider', () => {
    render(<OptionalSessionProbe />);

    expect(screen.getByTestId('has-context')).toHaveTextContent('Sem contexto');
    expect(screen.getByTestId('opt-status')).toHaveTextContent('indefinido');
  });

  it('useAuth lança erro explicativo quando invocado fora do AuthProvider', () => {
    // Suprime erro no console do React durante o teste de boundary
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<FullSessionProbe />)).toThrow(
      'useAuth deve ser usado dentro de AuthProvider.',
    );

    consoleErrorSpy.mockRestore();
  });
});
