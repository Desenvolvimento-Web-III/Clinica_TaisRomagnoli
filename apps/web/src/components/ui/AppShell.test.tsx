import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppShell } from './AppShell';

const mockUseOptionalAuth = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useOptionalAuth: () => mockUseOptionalAuth(),
  useAuth: () => mockUseOptionalAuth(),
}));

describe('AppShell - Estrutura Global Mobile First', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza os links de acesso público (Entrar, Cadastre-se) quando não há usuário autenticado', () => {
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

    const loginLinks = screen.getAllByRole('link', { name: 'Entrar' });
    expect(loginLinks.length).toBeGreaterThanOrEqual(1);
    expect(loginLinks[0]).toHaveAttribute('href', '/login');

    const registerLinks = screen.getAllByRole('link', { name: /cadastre-se|cadastro/i });
    expect(registerLinks.length).toBeGreaterThanOrEqual(1);
    expect(registerLinks[0]).toHaveAttribute('href', '/cadastro');

    expect(screen.queryByRole('link', { name: 'Agendar' })).not.toBeInTheDocument();
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

  it('renderiza o link de acessibilidade (skip link) direcionando para #main-content', () => {
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

    const skipLink = screen.getByRole('link', { name: 'Pular para o conteúdo principal' });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renderiza o landmark main com id="main-content" contendo os elementos filhos', () => {
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
          <p>Conteúdo da página de testes</p>
        </AppShell>
      </MemoryRouter>,
    );

    const mainElement = screen.getByRole('main');
    expect(mainElement).toHaveAttribute('id', 'main-content');
    expect(screen.getByText('Conteúdo da página de testes')).toBeInTheDocument();
  });

  it('renderiza o rodape institucional com dados da marca e direitos autorais por padrao', () => {
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

    const footer = screen.getByRole('contentinfo', { name: 'Rodapé institucional' });
    expect(footer).toBeInTheDocument();
    expect(screen.getByText('Tais Romagnoli — Massoterapia')).toBeInTheDocument();
    expect(screen.getByText('Cuidado e organização desde o primeiro contato.')).toBeInTheDocument();
    expect(
      screen.getByText(/Clínica Tais Romagnoli\. Todos os direitos reservados\./),
    ).toBeInTheDocument();
  });

  it('permite ocultar o rodape institucional via hideFooter', () => {
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
          hideFooter
        >
          <p>Conteudo principal</p>
        </AppShell>
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole('contentinfo', { name: 'Rodapé institucional' }),
    ).not.toBeInTheDocument();
  });

  it('permite fornecer um rodape customizado via prop footer', () => {
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
          footer={<footer data-testid="custom-footer">Rodapé Especial</footer>}
        >
          <p>Conteudo principal</p>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('custom-footer')).toHaveTextContent('Rodapé Especial');
  });

  it('permite ocultar a secao hero quando hideHero e true', () => {
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
          title="Servicos Sem Hero"
          description="Descricao de teste"
          hideHero
        >
          <p>Conteudo principal</p>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('heading', { name: 'Servicos Sem Hero' })).not.toBeInTheDocument();
  });

  it('sempre renderiza a barra de navegacao inferior fixa mobile (BottomNav)', () => {
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

    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
  });
});
