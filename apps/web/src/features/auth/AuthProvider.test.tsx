import { fireEvent, render, screen } from '@testing-library/react';
import { getIdTokenResult, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './auth-context';

const { authMock } = vi.hoisted(() => ({
  authMock: { currentUser: null },
}));

vi.mock('@/lib/firebase', () => ({ auth: authMock }));

vi.mock('firebase/auth', () => ({
  getIdTokenResult: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}));

function SessionProbe() {
  const { currentUser, isAuthReady, isAdmin, role, logout } = useAuth();

  return (
    <div>
      <p>{isAuthReady ? 'Autenticação pronta' : 'Carregando autenticação'}</p>
      <p>{currentUser?.email ?? 'Sem sessão'}</p>
      <p data-testid="is-admin">{isAdmin ? 'É Administrador' : 'Não é Administrador'}</p>
      <p data-testid="user-role">{role ?? 'Sem perfil'}</p>
      <button type="button" onClick={() => void logout()}>
        Sair
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
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

  it('acompanha a sessão do Firebase Auth com perfil cliente comum', async () => {
    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('cliente@exemplo.com')).toBeInTheDocument();
    expect(screen.getByText('Autenticação pronta')).toBeInTheDocument();
    expect(screen.getByTestId('is-admin')).toHaveTextContent('Não é Administrador');
    expect(screen.getByTestId('user-role')).toHaveTextContent('cliente');
  });

  it('identifica corretamente perfil administrativo por custom claim', async () => {
    vi.mocked(getIdTokenResult).mockResolvedValueOnce({
      claims: { role: 'admin' },
    } as unknown as Awaited<ReturnType<typeof getIdTokenResult>>);

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('cliente@exemplo.com')).toBeInTheDocument();
    expect(screen.getByTestId('is-admin')).toHaveTextContent('É Administrador');
    expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
  });

  it('encerra a sessão no Firebase Auth e limpa o usuário autenticado', async () => {
    vi.mocked(signOut).mockResolvedValueOnce();
    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('cliente@exemplo.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Sem sessão')).toBeInTheDocument();
    expect(screen.getByTestId('is-admin')).toHaveTextContent('Não é Administrador');
    expect(screen.getByTestId('user-role')).toHaveTextContent('Sem perfil');
    expect(signOut).toHaveBeenCalledWith(authMock);
  });
});
