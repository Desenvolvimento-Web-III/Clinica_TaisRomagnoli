import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotificationsPage } from './NotificationsPage';
import type { ClientNotification } from '@clinica/shared';

const mockUseOptionalAuth = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockClearNotification = vi.fn();

const sampleNotifications: ClientNotification[] = [
  {
    id: 'notif-1',
    tipo: 'agendamento',
    titulo: 'Sessão Confirmada',
    mensagem: 'Sua massagem está confirmada para sábado.',
    lida: false,
    createdAt: '2026-09-26T10:00:00.000Z',
    link: '/agendamentos',
  },
  {
    id: 'notif-2',
    tipo: 'lembrete',
    titulo: 'Beba Água',
    mensagem: 'Lembrete de hidratação após a sessão.',
    lida: true,
    createdAt: '2026-09-25T10:00:00.000Z',
    link: '/servicos',
  },
];

vi.mock('@/features/auth/auth-context', () => ({
  useOptionalAuth: () => mockUseOptionalAuth(),
  useAuth: () => mockUseOptionalAuth(),
}));

vi.mock('@/features/notifications/notifications-store', () => ({
  useClientNotifications: () => ({
    notifications: sampleNotifications,
    unreadCount: 1,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    clearNotification: mockClearNotification,
  }),
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
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

  it('exibe titulo, filtros e a lista de notificacoes quando autenticado', async () => {
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

    expect(await screen.findByRole('heading', { name: 'Minhas Notificações' })).toBeInTheDocument();
    expect(screen.getByText('Sessão Confirmada')).toBeInTheDocument();
    expect(screen.getByText('Beba Água')).toBeInTheDocument();
    expect(screen.getByText('Todas (2)')).toBeInTheDocument();
    expect(screen.getByText('Não lidas (1)')).toBeInTheDocument();
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

    const tabNaoLidas = screen.getByRole('button', { name: 'Não lidas (1)' });
    fireEvent.click(tabNaoLidas);

    expect(screen.getByText('Sessão Confirmada')).toBeInTheDocument();
    expect(screen.queryByText('Beba Água')).not.toBeInTheDocument();
  });

  it('chama markAsRead ao clicar em Marcar como lida', async () => {
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

    const markReadBtn = screen.getByRole('button', { name: 'Marcar como lida' });
    fireEvent.click(markReadBtn);

    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1');
  });

  it('chama markAllAsRead ao clicar no botao de marcar todas', async () => {
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

    expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
  });
});
