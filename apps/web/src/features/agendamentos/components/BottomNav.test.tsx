import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BottomNav } from './BottomNav';

const mockUseOptionalAuth = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useOptionalAuth: () => mockUseOptionalAuth(),
}));

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('conecta os 4 destinos disponíveis em modo autenticado e identifica a página ativa', () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'user-123', email: 'cliente@teste.com' },
      isAuthReady: true,
    });

    render(<BottomNav activeTab="notificacoes" />, { wrapper: MemoryRouter });

    expect(screen.getByRole('link', { name: 'Serviços' })).toHaveAttribute('href', '/servicos');
    expect(screen.getByRole('link', { name: 'Agendamentos' })).toHaveAttribute(
      'href',
      '/agendamentos',
    );
    expect(screen.getByRole('link', { name: 'Notificações' })).toHaveAttribute(
      'href',
      '/notificacoes',
    );
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/perfil');

    expect(screen.getByRole('link', { name: 'Notificações' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('conecta a navegação pública (Serviços, Agendar, Agendamentos, Entrar) quando não há usuário logado', () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: null,
      isAuthReady: true,
    });

    render(<BottomNav activeTab="agendar" />, { wrapper: MemoryRouter });

    expect(screen.getByRole('link', { name: 'Serviços' })).toHaveAttribute('href', '/servicos');
    expect(screen.getByRole('link', { name: 'Agendar' })).toHaveAttribute('href', '/agendar');
    expect(screen.getByRole('link', { name: 'Agendamentos' })).toHaveAttribute(
      'href',
      '/agendamentos',
    );
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');

    expect(screen.getByRole('link', { name: 'Agendar' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Notificações' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Perfil' })).not.toBeInTheDocument();
  });
});
