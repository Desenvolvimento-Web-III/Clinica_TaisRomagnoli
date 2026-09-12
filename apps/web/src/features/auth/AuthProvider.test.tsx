import { fireEvent, render, screen } from '@testing-library/react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './auth-context';

const { authMock } = vi.hoisted(() => ({
  authMock: { currentUser: null },
}));

vi.mock('@/lib/firebase', () => ({ auth: authMock }));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}));

function SessionProbe() {
  const { currentUser, isAuthReady, logout } = useAuth();

  return (
    <div>
      <p>{isAuthReady ? 'Autenticação pronta' : 'Carregando autenticação'}</p>
      <p>{currentUser?.email ?? 'Sem sessão'}</p>
      <button type="button" onClick={() => void logout()}>
        Sair
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, next) => {
      if (typeof next === 'function') {
        next({ email: 'cliente@exemplo.com' } as User);
      }
      return vi.fn();
    });
  });

  it('acompanha a sessão do Firebase Auth', async () => {
    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('cliente@exemplo.com')).toBeInTheDocument();
    expect(screen.getByText('Autenticação pronta')).toBeInTheDocument();
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
    expect(signOut).toHaveBeenCalledWith(authMock);
  });
});
