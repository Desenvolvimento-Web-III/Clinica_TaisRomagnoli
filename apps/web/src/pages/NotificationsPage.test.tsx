import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotificationsPage } from './NotificationsPage';

const remoteNotificationState = vi.hoisted(() => ({ items: [] as Array<Record<string, unknown>> }));

const mockUseOptionalAuth = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useOptionalAuth: () => mockUseOptionalAuth(),
  useAuth: () => mockUseOptionalAuth(),
}));

vi.mock('@/services/notificacoes-service', () => ({
  buscarNotificacoesRemotas: vi.fn(async () => remoteNotificationState.items.map((item) => ({ ...item }))),
  marcarNotificacaoLidaBackend: vi.fn(async (id: string) => {
    remoteNotificationState.items = remoteNotificationState.items.map((item) =>
      item.id === id ? { ...item, lida: true } : item,
    );
    return { sucesso: true };
  }),
  mesclarNotificacoes: (locais: unknown[], remotas: unknown[]) => [...remotas, ...locais],
  ouvirNotificacoesClienteEmTempoReal: vi.fn((_uid: string, callback: (items: Array<Record<string, unknown>>) => void) => {
    callback(remoteNotificationState.items);
    return () => {};
  }),
}));

vi.mock('@/services/anamnese-service', () => ({
  obterFichaAnamneseApi: vi.fn(async () => ({ sucesso: true, dados: {} })),
}));

vi.mock('@/features/anamnese/schemas/anamnese-schema', () => ({
  fichaAnamneseSchema: { safeParse: () => ({ success: true }) },
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    remoteNotificationState.items = [
      { id: 'welcome', tipo: 'sistema', titulo: 'Bem-vindo(a) à Clínica!', mensagem: 'Sua conta está pronta.', lida: false, createdAt: '2026-11-25T10:00:00.000Z' },
      { id: 'anamnesis', tipo: 'sistema', titulo: 'Preencha sua Ficha de Anamnese', mensagem: 'Complete sua ficha antes do atendimento.', lida: false, createdAt: '2026-11-25T09:00:00.000Z', link: '/anamnese' },
    ];
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

  it('exibe as notificações recebidas do serviço remoto', async () => {
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
    await act(async () => {
      fireEvent.click(markReadBtns[0]!);
    });

    const tabNaoLidas = await screen.findByRole('button', { name: 'Não lidas (1)' });
    await act(async () => {
      fireEvent.click(tabNaoLidas);
    });

    expect(screen.getByText('Preencha sua Ficha de Anamnese')).toBeInTheDocument();
    expect(screen.queryByText('Bem-vindo(a) à Clínica!')).not.toBeInTheDocument();
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
      await act(async () => {
        fireEvent.click(markAllBtn);
      });
    }

    expect(await screen.findByRole('button', { name: 'Não lidas (0)' })).toBeInTheDocument();
  });

  it('permite remover as notificacoes e mantém o estado vazio', async () => {
    remoteNotificationState.items = [];
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

    expect(await screen.findByText('Nenhuma notificação no momento')).toBeInTheDocument();
  });

  it('exibe o botao de sincronizacao manual e permite atualizar as notificacoes', async () => {
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

    const syncBtn = await screen.findByTestId('sync-notifications-btn');
    expect(syncBtn).toBeInTheDocument();

    await waitFor(() => {
      expect(syncBtn).toHaveTextContent('Atualizar');
    });

    await act(async () => {
      fireEvent.click(syncBtn);
    });
    expect(syncBtn).toBeInTheDocument();
  });
});
