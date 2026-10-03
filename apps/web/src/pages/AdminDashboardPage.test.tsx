import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { User } from 'firebase/auth';
import { AdminDashboardPage } from './AdminDashboardPage';
import { useAuth } from '@/features/auth/auth-context';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

describe('AdminDashboardPage', () => {
  const mockLogout = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        uid: 'admin-1',
        displayName: 'Tais Romagnoli',
        email: 'admin@clinicataisromagnoli.com.br',
      } as unknown as User,
      isAuthReady: true,
      isAdmin: true,
      role: 'admin',
      refreshRole: vi.fn(),
      logout: mockLogout,
    });
  });

  const renderDashboard = (initialEntry = '/admin') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/:section" element={<AdminDashboardPage />} />
          <Route path="/servicos" element={<div>Catálogo de Serviços</div>} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('renderiza o cabeçalho administrativo com badge e identificação da administradora', () => {
    renderDashboard();

    expect(screen.getByText('Painel da Administradora')).toBeInTheDocument();
    expect(screen.getByText('Tais Romagnoli')).toBeInTheDocument();
    expect(screen.getByText('Administradora')).toBeInTheDocument();
  });

  it('exibe as 5 seções de navegação exclusiva (Agenda, Clientes, Serviços, Relatórios, Configurações)', () => {
    renderDashboard();

    expect(screen.getByRole('tab', { name: /agenda/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /clientes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /serviços/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /relatórios/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /configurações/i })).toBeInTheDocument();
  });

  it('inicia na aba Agenda exibindo atendimentos do dia e regra de agendamento presencial', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: /agenda de atendimentos/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /agendamentos presenciais cadastrados pela administradora não exigem sinal/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante • 60 min')).toBeInTheDocument();
  });

  it('permite alternar para a aba Clientes e buscar cliente', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: /clientes/i }));

    expect(screen.getByRole('heading', { name: /gestão de clientes/i })).toBeInTheDocument();
    expect(screen.getAllByText(/cliente recorrente/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ver ficha completa/i).length).toBeGreaterThan(0);

    const inputBusca = screen.getByPlaceholderText(/buscar por nome ou telefone/i);
    fireEvent.change(inputBusca, { target: { value: 'Juliana' } });

    expect(screen.getByText('Juliana Lima')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Eduardo')).not.toBeInTheDocument();
  });

  it('permite alternar para a aba Serviços e visualizar catálogo administrativo', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: /serviços/i }));

    expect(screen.getByRole('heading', { name: /serviços e procedimentos/i })).toBeInTheDocument();
    expect(screen.getByText('Massagem com Pedras Quentes')).toBeInTheDocument();
    expect(screen.getAllByText(/ativo/i).length).toBeGreaterThan(0);
  });

  it('permite alternar para a aba Relatórios e exibe os 8 indicadores previstos', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: /relatórios/i }));

    expect(
      screen.getByRole('heading', { name: /relatórios e indicadores administrativos/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1\. Agendamentos do Dia/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Clientes Cadastrados/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Clientes Recorrentes/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Atendimentos no Mês/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Cancelamentos e Faltas/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Ocupação da Agenda/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Valores Recebidos e Previstos/i)).toBeInTheDocument();
    expect(screen.getByText(/8\. Serviço Mais Agendado/i)).toBeInTheDocument();
  });

  it('permite alternar para a aba Configurações e exibe link para gestor de horários', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: /configurações/i }));

    expect(screen.getByRole('heading', { name: /configurações da clínica/i })).toBeInTheDocument();
    const linkHorarios = screen.getByRole('link', { name: /abrir gestor de horários/i });
    expect(linkHorarios).toBeInTheDocument();
    expect(linkHorarios).toHaveAttribute('href', '/admin/horarios');
    expect(screen.getByText(/sinal obrigatório para cliente/i)).toBeInTheDocument();
    expect(screen.getByText(/30%/i)).toBeInTheDocument();
  });

  it('abre e fecha o modal de novo agendamento presencial', () => {
    renderDashboard();

    const botaoNovo = screen.getByRole('button', { name: /novo agendamento presencial/i });
    fireEvent.click(botaoNovo);

    expect(
      screen.getByRole('heading', { name: /novo agendamento presencial/i }),
    ).toBeInTheDocument();

    const botaoCancelar = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(botaoCancelar);

    expect(
      screen.queryByRole('heading', { name: /novo agendamento presencial/i }),
    ).not.toBeInTheDocument();
  });

  it('chama logout ao clicar no botão Sair', async () => {
    renderDashboard();

    const botaoSair = screen.getByRole('button', { name: /sair/i });
    await act(async () => {
      fireEvent.click(botaoSair);
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
