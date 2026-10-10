import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
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

function LocationTracker() {
  const location = useLocation();
  const state = location.state as { from?: { pathname?: string } } | undefined;
  return (
    <div>
      <p data-testid="current-path">{location.pathname}</p>
      <p data-testid="from-path">{state?.from?.pathname ?? 'none'}</p>
    </div>
  );
}

describe('Proteção das rotas do painel administrativo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Quando o usuário não está autenticado (acesso direto por URL)', () => {
    it('impede acesso direto por URL a /admin e redireciona para o login', async () => {
      const authValue = createMockAuthContext({
        currentUser: null,
        isAuthReady: true,
      });

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminRoute resolveAccess={() => Promise.resolve('unauthenticated')}>
                      <p>Painel Administrativo Secreto</p>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <div>
                    <h1>Tela de Login</h1>
                    <LocationTracker />
                  </div>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(await screen.findByRole('heading', { name: 'Tela de Login' })).toBeInTheDocument();
      expect(screen.queryByText('Painel Administrativo Secreto')).not.toBeInTheDocument();
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
      expect(screen.getByTestId('from-path')).toHaveTextContent('/admin');
    });

    it('impede acesso direto por URL a /admin/horarios e preserva a rota de origem', async () => {
      const authValue = createMockAuthContext({
        currentUser: null,
        isAuthReady: true,
      });

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/admin/horarios']}>
            <Routes>
              <Route
                path="/admin/horarios"
                element={
                  <ProtectedRoute>
                    <AdminRoute resolveAccess={() => Promise.resolve('unauthenticated')}>
                      <p>Gestão de Horários Secreta</p>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <div>
                    <h1>Tela de Login</h1>
                    <LocationTracker />
                  </div>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(await screen.findByRole('heading', { name: 'Tela de Login' })).toBeInTheDocument();
      expect(screen.queryByText('Gestão de Horários Secreta')).not.toBeInTheDocument();
      expect(screen.getByTestId('from-path')).toHaveTextContent('/admin/horarios');
    });

    it('impede acesso direto por URL a /admin/clientes/:clientId', async () => {
      const authValue = createMockAuthContext({
        currentUser: null,
        isAuthReady: true,
      });

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/admin/clientes/cliente-123']}>
            <Routes>
              <Route
                path="/admin/clientes/:clientId"
                element={
                  <ProtectedRoute>
                    <AdminRoute resolveAccess={() => Promise.resolve('unauthenticated')}>
                      <p>Ficha de Cliente Administrativa</p>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <div>
                    <h1>Tela de Login</h1>
                    <LocationTracker />
                  </div>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(await screen.findByRole('heading', { name: 'Tela de Login' })).toBeInTheDocument();
      expect(screen.queryByText('Ficha de Cliente Administrativa')).not.toBeInTheDocument();
      expect(screen.getByTestId('from-path')).toHaveTextContent('/admin/clientes/cliente-123');
    });
  });

  describe('Quando o usuário está autenticado mas não é administradora (perfil cliente)', () => {
    it('permite a passagem pelo ProtectedRoute mas é bloqueado pelo AdminRoute com "Acesso não autorizado"', async () => {
      const mockClientUser = {
        uid: 'client-999',
        email: 'cliente@exemplo.com',
        displayName: 'Cliente Comum',
      } as User;

      const authValue = createMockAuthContext({
        currentUser: mockClientUser,
        isAuthReady: true,
        isAdmin: false,
        role: 'cliente',
      });

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminRoute resolveAccess={() => Promise.resolve('unauthorized')}>
                      <p>Painel Administrativo Secreto</p>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<h1>Tela de Login</h1>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      // Não deve redirecionar para a tela de login
      expect(screen.queryByRole('heading', { name: 'Tela de Login' })).not.toBeInTheDocument();

      // Deve exibir a mensagem de acesso não autorizado do AdminRoute
      expect(
        await screen.findByRole('heading', { name: 'Acesso não autorizado' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Você não tem permissão para acessar esta área administrativa/),
      ).toBeInTheDocument();
      expect(screen.queryByText('Painel Administrativo Secreto')).not.toBeInTheDocument();
    });
  });

  describe('Quando a administradora está autenticada', () => {
    it('concede acesso total às páginas administrativas', async () => {
      const mockAdminUser = {
        uid: 'admin-001',
        email: 'admin@clinicataisromagnoli.com.br',
        displayName: 'Tais Romagnoli',
      } as User;

      const authValue = createMockAuthContext({
        currentUser: mockAdminUser,
        isAuthReady: true,
        isAdmin: true,
        role: 'admin',
      });

      render(
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminRoute resolveAccess={() => Promise.resolve('allowed')}>
                      <p>Painel Administrativo Liberado</p>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );

      expect(await screen.findByText('Painel Administrativo Liberado')).toBeInTheDocument();
    });
  });
});
