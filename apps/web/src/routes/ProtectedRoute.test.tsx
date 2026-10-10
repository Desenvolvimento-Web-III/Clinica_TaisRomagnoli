import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context';
import type { User } from 'firebase/auth';

const mockLogout = vi.fn();

function createMockAuthContext(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    currentUser: null,
    isAuthReady: true,
    isAdmin: false,
    role: null,
    logout: mockLogout,
    ...overrides,
  };
}

function LocationDisplay() {
  const location = useLocation();
  const state = location.state as { from?: { pathname?: string } } | undefined;
  return (
    <div>
      <p data-testid="current-pathname">{location.pathname}</p>
      <p data-testid="from-pathname">{state?.from?.pathname ?? 'none'}</p>
    </div>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe indicador de carregamento acessível enquanto a autenticação estiver carregando', () => {
    const authValue = createMockAuthContext({
      currentUser: null,
      isAuthReady: false,
    });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/privado']}>
          <ProtectedRoute>
            <p>Conteúdo Privado</p>
          </ProtectedRoute>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Verificando autenticação…');
    expect(screen.queryByText('Conteúdo Privado')).not.toBeInTheDocument();
  });

  it('redireciona para /login com replace e preservando a rota de origem quando o usuário não estiver autenticado', async () => {
    const authValue = createMockAuthContext({
      currentUser: null,
      isAuthReady: true,
    });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/perfil']}>
          <Routes>
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <p>Conteúdo do Perfil</p>
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <div>
                  <p>Tela de Login</p>
                  <LocationDisplay />
                </div>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(await screen.findByText('Tela de Login')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo do Perfil')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-pathname')).toHaveTextContent('/login');
    expect(screen.getByTestId('from-pathname')).toHaveTextContent('/perfil');
  });

  it('renderiza o conteúdo protegido quando o usuário estiver autenticado', async () => {
    const mockUser = {
      uid: 'user-123',
      email: 'cliente@exemplo.com',
      displayName: 'Cliente Teste',
    } as User;

    const authValue = createMockAuthContext({
      currentUser: mockUser,
      isAuthReady: true,
      role: 'cliente',
    });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/perfil']}>
          <Routes>
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <p>Conteúdo do Perfil</p>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(await screen.findByText('Conteúdo do Perfil')).toBeInTheDocument();
  });

  it('permite customizar a rota de redirecionamento via prop redirectTo', async () => {
    render(
      <MemoryRouter initialEntries={['/area-restrita']}>
        <Routes>
          <Route
            path="/area-restrita"
            element={
              <ProtectedRoute isAuthenticated={false} redirectTo="/entrar">
                <p>Conteúdo Secreto</p>
              </ProtectedRoute>
            }
          />
          <Route
            path="/entrar"
            element={
              <div>
                <p>Página Entrar Customizada</p>
                <LocationDisplay />
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Página Entrar Customizada')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Secreto')).not.toBeInTheDocument();
    expect(screen.getByTestId('from-pathname')).toHaveTextContent('/area-restrita');
  });

  it('respeita as props explícitas de isLoading e isAuthenticated', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/dados']}>
        <ProtectedRoute isLoading={true}>
          <p>Conteúdo de Dados</p>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Verificando autenticação…');
    expect(screen.queryByText('Conteúdo de Dados')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/dados']}>
        <ProtectedRoute isLoading={false} isAuthenticated={true}>
          <p>Conteúdo de Dados</p>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Conteúdo de Dados')).toBeInTheDocument();
  });

  it('redireciona com segurança para /login quando renderizado fora do AuthProvider sem autenticação', async () => {
    render(
      <MemoryRouter initialEntries={['/notificacoes']}>
        <Routes>
          <Route
            path="/notificacoes"
            element={
              <ProtectedRoute>
                <p>Notificações Privadas</p>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<p>Tela de Login</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tela de Login')).toBeInTheDocument();
    expect(screen.queryByText('Notificações Privadas')).not.toBeInTheDocument();
  });
});
