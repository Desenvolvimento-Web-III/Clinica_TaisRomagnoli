import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotificationsPage } from './NotificationsPage';
import { initializeProfileNotifications } from '@/features/notifications/notifications-store';

const mockUseOptionalAuth = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useOptionalAuth: () => mockUseOptionalAuth(),
  useAuth: () => mockUseOptionalAuth(),
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('redireciona para /login se o usuario nao estiver autenticado', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: null,
      isAuthReady: true,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/notificacoes']}>
        <Routes>
          <Route path="/notificacoes" element={<NotificationsPage />} />
          <Route path="/login" element={<p>Página de Login</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Página de Login')).toBeInTheDocument();
  });

  it('exibe para um novo perfil apenas as notificacoes iniciais de boas-vindas e ficha de anamnese', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'user-123', displayName: 'Lucas Lima', email: 'lucas@exemplo.com' },
      isAuthReady: true,
      logout: vi.fn(),
    });

    initializeProfileNotifications('user-123', 'Lucas Lima');

    render(
      <MemoryRouter initialEntries={['/notificacoes']}>
        <NotificationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Minhas Notificações' })).toBeInTheDocument();
    expect(screen.getByText('Preencha sua Ficha de Anamnese')).toBeInTheDocument();
    expect(screen.getByText('Bem-vindo(a) à Clínica!')).toBeInTheDocument();
    expect(screen.queryByText('Sessão Confirmada')).not.toBeInTheDocument();
    expect(screen.getByText('Todas (2)')).toBeInTheDocument();
    expect(screen.getByText('Não lidas (2)')).toBeInTheDocument();
  });

  it('filtra apenas notificacoes nao lidas ao selecionar a aba correspondente', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'user-123', displayName: 'Lucas Lima', email: 'lucas@exemplo.com' },
      isAuthReady: true,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/notificacoes']}>
        <NotificationsPage />
      </MemoryRouter>,
    );

    // Marca a primeira como lida
    const markReadBtns = screen.getAllByRole('button', { name: 'Marcar como lida' });
    fireEvent.click(markReadBtns[0]!);

    const tabNaoLidas = screen.getByRole('button', { name: 'Não lidas (1)' });
    fireEvent.click(tabNaoLidas);

    expect(screen.queryByText('Preencha sua Ficha de Anamnese')).not.toBeInTheDocument();
    expect(screen.getByText('Bem-vindo(a) à Clínica!')).toBeInTheDocument();
  });

  it('marca todas as notificacoes como lidas ao clicar no botao correspondente', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'user-123', displayName: 'Lucas Lima', email: 'lucas@exemplo.com' },
      isAuthReady: true,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/notificacoes']}>
        <NotificationsPage />
      </MemoryRouter>,
    );

    const [markAllBtn] = screen.getAllByRole('button', { name: /marcar todas como lidas/i });
    expect(markAllBtn).toBeDefined();
    if (markAllBtn) {
      fireEvent.click(markAllBtn);
    }

    expect(screen.getByRole('button', { name: 'Não lidas (0)' })).toBeInTheDocument();
  });

  it('permite remover as notificacoes e mantém o estado vazio', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'user-123', displayName: 'Lucas Lima', email: 'lucas@exemplo.com' },
      isAuthReady: true,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/notificacoes']}>
        <NotificationsPage />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Remover notificação: Preencha sua Ficha de Anamnese' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Remover notificação: Bem-vindo(a) à Clínica!' }),
    );

    expect(screen.getByText('Nenhuma notificação no momento')).toBeInTheDocument();
  });
});
