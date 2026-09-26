import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthenticatedUserNav } from './AuthenticatedUserNav';

const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
const mockNotifications = [
  {
    id: 'n1',
    tipo: 'agendamento' as const,
    titulo: 'Sessão Confirmada',
    mensagem: 'Mensagem de teste',
    lida: false,
    createdAt: new Date().toISOString(),
    link: '/agendamentos',
  },
];

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/features/notifications/notifications-store', () => ({
  useClientNotifications: () => ({
    notifications: mockNotifications,
    unreadCount: 1,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    clearNotification: vi.fn(),
  }),
}));

describe('AuthenticatedUserNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      currentUser: {
        uid: 'user-123',
        displayName: 'Camila Ferreira',
        email: 'camila@teste.com',
      },
      logout: mockLogout,
    });
  });

  it('renderiza o atalho de notificacoes com badge de nao lidas', () => {
    render(
      <MemoryRouter>
        <AuthenticatedUserNav />
      </MemoryRouter>,
    );

    const notifLink = screen.getByRole('link', { name: /notificações/i });
    expect(notifLink).toHaveAttribute('href', '/notificacoes');

    const badge = screen.getByTestId('notification-badge');
    expect(badge).toHaveTextContent('1');
  });

  it('exibe o botao de menu com as iniciais e nome do usuario', () => {
    render(
      <MemoryRouter>
        <AuthenticatedUserNav />
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole('button', { name: /menu da conta do cliente/i });
    expect(menuButton).toBeInTheDocument();
    expect(screen.getByText('CF')).toBeInTheDocument();
    expect(screen.getByText('Camila Ferreira')).toBeInTheDocument();
  });

  it('abre o menu suspenso ao clicar e exibe os 4 atalhos exigidos', async () => {
    render(
      <MemoryRouter>
        <AuthenticatedUserNav />
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole('button', { name: /menu da conta do cliente/i });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(menuButton);

    const menu = screen.getByRole('menu', { name: /atalhos da conta/i });
    expect(menu).toBeInTheDocument();

    // 1. Perfil
    const perfilItem = screen.getByRole('menuitem', { name: /meu perfil/i });
    expect(perfilItem).toHaveAttribute('href', '/perfil');

    // 2. Agendamentos
    const agendamentosItem = screen.getByRole('menuitem', { name: /meus agendamentos/i });
    expect(agendamentosItem).toHaveAttribute('href', '/agendamentos');

    // 3. Notificações
    const notificacoesItem = screen.getByRole('menuitem', { name: /notificações/i });
    expect(notificacoesItem).toHaveAttribute('href', '/notificacoes');

    // 4. Saída da conta
    const sairItem = screen.getByRole('menuitem', { name: /sair da conta/i });
    expect(sairItem).toBeInTheDocument();

    // Menus administrativos NÃO devem estar presentes para cliente comum
    expect(
      screen.queryByRole('menuitem', { name: /horários da clínica/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /perfil de clientes/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Administradora')).not.toBeInTheDocument();
  });

  it('exibe menus administrativos e badge de administradora quando o usuario possui perfil admin', () => {
    mockUseAuth.mockReturnValue({
      currentUser: {
        uid: 'admin-123',
        displayName: 'Tais Romagnoli',
        email: 'tais@clinica.com',
      },
      isAdmin: true,
      role: 'admin',
      logout: mockLogout,
    });

    render(
      <MemoryRouter>
        <AuthenticatedUserNav />
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole('button', { name: /menu da conta do cliente/i });
    fireEvent.click(menuButton);

    expect(screen.getAllByText('Administradora').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('menuitem', { name: /horários da clínica/i })).toHaveAttribute(
      'href',
      '/admin/horarios',
    );
    expect(screen.getByRole('menuitem', { name: /perfil de clientes/i })).toHaveAttribute(
      'href',
      '/admin/clientes/demo-client-1',
    );
  });

  it('fecha o menu ao pressionar Escape', () => {
    render(
      <MemoryRouter>
        <AuthenticatedUserNav />
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole('button', { name: /menu da conta do cliente/i });
    fireEvent.click(menuButton);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('chama logout e redireciona para /servicos ao clicar em Sair da conta', async () => {
    mockLogout.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <Routes>
          <Route path="/perfil" element={<AuthenticatedUserNav />} />
          <Route path="/servicos" element={<p>Página de Serviços</p>} />
        </Routes>
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole('button', { name: /menu da conta do cliente/i });
    fireEvent.click(menuButton);

    const sairItem = screen.getByRole('menuitem', { name: /sair da conta/i });
    fireEvent.click(sairItem);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Página de Serviços')).toBeInTheDocument();
  });
});
