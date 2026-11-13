import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ClientProfilePage } from './ClientProfilePage';
import { updateProfile } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';

const mockUseOptionalAuth = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useOptionalAuth: () => mockUseOptionalAuth(),
  useAuth: () => mockUseOptionalAuth(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'client-123',
      displayName: 'Maria Santos',
      email: 'maria@exemplo.com',
    },
  },
  db: {},
}));

vi.mock('firebase/auth', () => ({
  updateProfile: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('@/services/cliente-perfil-service', () => ({
  consultarRecorrenciaCliente: vi.fn().mockResolvedValue(null),
}));

describe('ClientProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redireciona para /login se o usuário não estiver autenticado', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: null,
      isAuthReady: true,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <Routes>
          <Route path="/perfil" element={<ClientProfilePage />} />
          <Route path="/login" element={<p>Página de Login</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Página de Login')).toBeInTheDocument();
  });

  it('carrega dados existentes do cliente e exibe no formulário', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: {
        uid: 'client-123',
        displayName: 'Maria Silva',
        email: 'maria@exemplo.com',
      },
      isAuthReady: true,
      logout: vi.fn(),
    });

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        nome: 'Maria da Silva',
        telefone: '11987654321',
        preferenciasContato: {
          whatsapp: true,
          email: false,
          lembretesAgendamento: true,
        },
      }),
    } as unknown as ReturnType<typeof getDoc> extends Promise<infer U> ? U : never);

    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <ClientProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Maria da Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('(11)98765-4321')).toBeInTheDocument();
    expect(screen.getByDisplayValue('maria@exemplo.com')).toBeInTheDocument();

    // Valida switches
    const whatsappSwitch = screen.getByRole('switch', { name: /notificações por whatsapp/i });
    const emailSwitch = screen.getByRole('switch', { name: /notificações por e-mail/i });

    expect(whatsappSwitch).toHaveAttribute('aria-checked', 'true');
    expect(emailSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('exibe erros ao submeter dados inválidos de nome e telefone', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: {
        uid: 'client-123',
        displayName: 'Maria',
        email: 'maria@exemplo.com',
      },
      isAuthReady: true,
      logout: vi.fn(),
    });

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as unknown as ReturnType<typeof getDoc> extends Promise<infer U> ? U : never);

    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <ClientProfilePage />
      </MemoryRouter>,
    );

    const nomeInput = await screen.findByLabelText(/nome completo/i);
    const telefoneInput = screen.getByLabelText(/telefone \/ whatsapp/i);
    const salvarButton = screen.getByRole('button', { name: /salvar alterações/i });

    fireEvent.change(nomeInput, { target: { value: 'Ab' } });
    fireEvent.change(telefoneInput, { target: { value: '12345' } });
    fireEvent.click(salvarButton);

    expect(await screen.findByText('O nome deve ter pelo menos 3 caracteres')).toBeInTheDocument();
    expect(
      screen.getByText('Formato de telefone inválido. Use (XX)XXXXX-XXXX'),
    ).toBeInTheDocument();
  });

  it('salva com sucesso as alterações de dados pessoais e preferências', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: {
        uid: 'client-123',
        displayName: 'Maria Silva',
        email: 'maria@exemplo.com',
      },
      isAuthReady: true,
      logout: vi.fn(),
    });

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        nome: 'Maria Silva',
        telefone: '11988887777',
        preferenciasContato: {
          whatsapp: true,
          email: true,
          lembretesAgendamento: true,
        },
      }),
    } as unknown as ReturnType<typeof getDoc> extends Promise<infer U> ? U : never);

    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <ClientProfilePage />
      </MemoryRouter>,
    );

    const nomeInput = await screen.findByLabelText(/nome completo/i);
    const telefoneInput = screen.getByLabelText(/telefone \/ whatsapp/i);
    const emailSwitch = screen.getByRole('switch', { name: /notificações por e-mail/i });
    const salvarButton = screen.getByRole('button', { name: /salvar alterações/i });

    fireEvent.change(nomeInput, { target: { value: 'Maria Santos Silva' } });
    fireEvent.change(telefoneInput, { target: { value: '11912345678' } });
    fireEvent.click(emailSwitch); // Desativa e-mail
    fireEvent.click(salvarButton);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ displayName: 'Maria Santos Silva' }),
      );
    });

    expect(setDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        nome: 'Maria Santos Silva',
        telefone: '(11)91234-5678',
        preferenciasContato: {
          whatsapp: true,
          email: false,
          lembretesAgendamento: true,
        },
      }),
      { merge: true },
    );

    expect(
      await screen.findByText('Perfil e preferências atualizados com sucesso!'),
    ).toBeInTheDocument();
  });

  it('exibe atalhos da conta para agendamentos, notificacoes e encerramento de sessao', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: {
        uid: 'client-123',
        displayName: 'Maria Santos',
        email: 'maria@exemplo.com',
      },
      isAuthReady: true,
      logout: vi.fn(),
    });

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as unknown as ReturnType<typeof getDoc> extends Promise<infer U> ? U : never);

    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <ClientProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Atalhos da Conta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /meus agendamentos/i })).toHaveAttribute(
      'href',
      '/agendamentos',
    );
    const notifLinks = screen.getAllByRole('link', { name: /notificações/i });
    expect(notifLinks.length).toBeGreaterThanOrEqual(1);
    expect(notifLinks[0]).toHaveAttribute('href', '/notificacoes');
    expect(screen.getAllByRole('button', { name: /sair/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('exibe badge e seção de cliente recorrente quando a condição de pelo menos duas sessões no mês é atendida', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: {
        uid: 'client-recorrente-1',
        displayName: 'Camila Pitanga',
        email: 'camila@exemplo.com',
      },
      isAuthReady: true,
      logout: vi.fn(),
    });

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        nome: 'Camila Pitanga',
        telefone: '11977778888',
        recorrente: true,
        totalAtendimentosMes: 2,
        mesReferenciaRecorrencia: '2026-11',
      }),
    } as unknown as ReturnType<typeof getDoc> extends Promise<infer U> ? U : never);

    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <ClientProfilePage />
      </MemoryRouter>,
    );

    const badgeRecorrente = await screen.findByTestId('badge-cliente-recorrente');
    expect(badgeRecorrente).toBeInTheDocument();
    expect(badgeRecorrente).toHaveTextContent('Cliente Recorrente');

    const secaoRecorrente = screen.getByTestId('secao-cliente-recorrente');
    expect(secaoRecorrente).toBeInTheDocument();
    expect(secaoRecorrente).toHaveTextContent('2 sessões concluídas no mês');
    expect(secaoRecorrente).toHaveTextContent(
      'Você atingiu o critério de recorrência mensal da clínica ao concluir pelo menos duas sessões neste mês.',
    );
  });

  it('não exibe badge nem seção de recorrência quando a condição não foi atendida', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: {
        uid: 'client-comum-1',
        displayName: 'Rodrigo Santoro',
        email: 'rodrigo@exemplo.com',
      },
      isAuthReady: true,
      logout: vi.fn(),
    });

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        nome: 'Rodrigo Santoro',
        telefone: '11966665555',
        recorrente: false,
        totalAtendimentosMes: 1,
        mesReferenciaRecorrencia: '2026-11',
      }),
    } as unknown as ReturnType<typeof getDoc> extends Promise<infer U> ? U : never);

    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <ClientProfilePage />
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Rodrigo Santoro');

    expect(screen.queryByTestId('badge-cliente-recorrente')).not.toBeInTheDocument();
    expect(screen.queryByTestId('secao-cliente-recorrente')).not.toBeInTheDocument();
  });
});
