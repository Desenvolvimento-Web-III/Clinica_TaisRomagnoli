import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppShell } from './AppShell';

const mockUseOptionalAuth = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useOptionalAuth: () => mockUseOptionalAuth(),
  useAuth: () => mockUseOptionalAuth(),
}));

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o botao Entrar quando nao ha usuario autenticado', () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: null,
      isAuthReady: true,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AppShell
          activeTab="inicio"
          eyebrow="Clinica Tais Romagnoli"
          title="Servicos"
          description="Descricao de teste"
        >
          <p>Conteudo principal</p>
        </AppShell>
      </MemoryRouter>,
    );

    const loginLink = screen.getByRole('link', { name: 'Entrar' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
    expect(
      screen.queryByRole('button', { name: /menu da conta do cliente/i }),
    ).not.toBeInTheDocument();
  });

  it('renderiza a navegacao autenticada quando ha usuario logado', () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: {
        uid: 'user-789',
        displayName: 'Aline Souza',
        email: 'aline@exemplo.com',
      },
      isAuthReady: true,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AppShell
          activeTab="inicio"
          eyebrow="Clinica Tais Romagnoli"
          title="Servicos"
          description="Descricao de teste"
        >
          <p>Conteudo principal</p>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /menu da conta do cliente/i })).toBeInTheDocument();
    const notifLinks = screen.getAllByRole('link', { name: /notificações/i });
    expect(notifLinks.length).toBeGreaterThanOrEqual(1);
    expect(notifLinks[0]).toHaveAttribute('href', '/notificacoes');

    // Não deve exibir link administrativo para usuário sem perfil admin
    expect(screen.queryByRole('link', { name: /horários da clínica/i })).not.toBeInTheDocument();
  });

  it('exibe atalho de administracao na barra de navegacao superior quando o usuario e admin', () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: {
        uid: 'admin-123',
        displayName: 'Tais Romagnoli',
        email: 'tais@clinica.com',
      },
      isAdmin: true,
      role: 'admin',
      isAuthReady: true,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AppShell
          activeTab="inicio"
          eyebrow="Clinica Tais Romagnoli"
          title="Servicos"
          description="Descricao de teste"
        >
          <p>Conteudo principal</p>
        </AppShell>
      </MemoryRouter>,
    );

    const adminLink = screen.getByRole('link', { name: 'Horários da Clínica' });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute('href', '/admin/horarios');
  });
});
