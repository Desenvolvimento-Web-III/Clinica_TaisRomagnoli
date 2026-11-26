import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type { Agendamento } from '@/features/agendamentos/types/agendamento';
import * as agendamentosService from '@/services/agendamentos-service';
import { AgendamentosPage } from './AgendamentosPage';

const mockUseOptionalAuth = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => mockUseOptionalAuth(),
  useOptionalAuth: () => mockUseOptionalAuth(),
}));

const agendamentosTeste: Agendamento[] = [
  {
    id: 'ag-101',
    clienteId: 'user-1',
    servicoId: 'serv-1',
    servicoNome: 'Massagem Relaxante com Óleos',
    servicoCategoria: 'Relaxamento',
    duracaoMinutos: 60,
    profissionalId: 'prof-1',
    profissionalNome: 'Tais Romagnoli',
    dataHoraIso: '2026-10-15T14:00:00.000Z',
    dataFormatada: 'Qui, 15 de Outubro',
    horarioFormatado: '14:00 - 15:00',
    valorTotal: 150,
    sinalPago: 45,
    status: 'confirmado',
  },
  {
    id: 'ag-102',
    clienteId: 'user-1',
    servicoId: 'serv-2',
    servicoNome: 'Drenagem Linfática Corporal',
    servicoCategoria: 'Corporal',
    duracaoMinutos: 60,
    profissionalId: 'prof-1',
    profissionalNome: 'Tais Romagnoli',
    dataHoraIso: '2026-10-16T10:00:00.000Z',
    dataFormatada: 'Sex, 16 de Outubro',
    horarioFormatado: '10:00 - 11:00',
    valorTotal: 160,
    sinalPago: 48,
    status: 'pendente',
  },
];

describe('AgendamentosPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'user-1', displayName: 'Maria Silva' },
      isAuthReady: true,
      logout: vi.fn(),
    });
    vi.spyOn(agendamentosService, 'carregarAgendamentos').mockResolvedValue({
      agendamentos: [],
      sincronizadoComBackend: true,
    });
    vi.spyOn(agendamentosService, 'cancelarAgendamentoBackend').mockResolvedValue({
      sucesso: true,
      dados: {
        id: 'ag-101',
        clienteId: 'user-1',
        clienteNome: 'Maria Silva',
        servicoId: 'serv-1',
        servicoNome: 'Massagem Relaxante com Óleos',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: '2026-10-15T14:00:00.000Z',
        dataHoraFim: '2026-10-15T15:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-1',
        profissionalNome: 'Tais Romagnoli',
        status: 'cancelado',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
    });
  });

  const renderPage = async () => {
    render(<AgendamentosPage />, { wrapper: MemoryRouter });
    await screen.findByRole('heading', { name: 'Meus Agendamentos' });
  };

  it('exibe estado vazio e botão de login quando não há usuário autenticado', async () => {
    mockUseOptionalAuth.mockReturnValue({ currentUser: null, isAuthReady: true, logout: vi.fn() });
    await renderPage();

    expect(screen.getByTestId('empty-agendamentos-state')).toBeInTheDocument();
    expect(screen.queryByTestId('agendamentos-list')).not.toBeInTheDocument();
    expect(
      screen.getByText('Entre na sua conta para visualizar e acompanhar os seus agendamentos.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('empty-login-cta')).toBeInTheDocument();
    expect(agendamentosService.carregarAgendamentos).toHaveBeenCalledWith(null);
  });

  it('exibe estado vazio para usuário sem agendamentos retornados pelo backend', async () => {
    await renderPage();

    expect(screen.getByTestId('empty-agendamentos-state')).toBeInTheDocument();
    expect(screen.queryByTestId('agendamentos-list')).not.toBeInTheDocument();
    expect(
      screen.getByText('Não existem atendimentos nesta categoria no momento.'),
    ).toBeInTheDocument();
    expect(agendamentosService.carregarAgendamentos).toHaveBeenCalledWith('user-1');
  });

  it('renderiza e filtra os agendamentos recebidos do backend', async () => {
    vi.mocked(agendamentosService.carregarAgendamentos).mockResolvedValue({
      agendamentos: agendamentosTeste,
      sincronizadoComBackend: true,
    });
    await renderPage();

    expect(screen.getByTestId('agendamentos-list')).toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante com Óleos')).toBeInTheDocument();
    expect(screen.getByText('Drenagem Linfática Corporal')).toBeInTheDocument();
    expect(screen.getAllByText('Maria Silva')).not.toHaveLength(0);

    fireEvent.click(screen.getByTestId('tab-confirmado'));
    expect(screen.getByText('Massagem Relaxante com Óleos')).toBeInTheDocument();
    expect(screen.queryByText('Drenagem Linfática Corporal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-pendente'));
    expect(screen.getByText('Drenagem Linfática Corporal')).toBeInTheDocument();
    expect(screen.queryByText('Massagem Relaxante com Óleos')).not.toBeInTheDocument();
  });

  it('abre cancelamento e envia a solicitação ao backend', async () => {
    vi.mocked(agendamentosService.carregarAgendamentos).mockResolvedValue({
      agendamentos: agendamentosTeste,
      sincronizadoComBackend: true,
    });
    await renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]!);
    expect(screen.getByTestId('cancel-modal')).toBeInTheDocument();
    expect(screen.getByText('Atenção às regras de cancelamento:')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-cancel-button'));
    expect(await screen.findByTestId('toast-feedback')).toHaveTextContent(
      'Agendamento cancelado com sucesso.',
    );
    expect(agendamentosService.cancelarAgendamentoBackend).toHaveBeenCalledWith(
      expect.objectContaining({ agendamentoId: 'ag-101' }),
    );
  });

  it('leva ao catálogo ao clicar no botão de novo agendamento', async () => {
    render(
      <MemoryRouter initialEntries={['/agendamentos']}>
        <Routes>
          <Route path="/agendamentos" element={<AgendamentosPage />} />
          <Route path="/servicos" element={<p>Catálogo de serviços</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Meus Agendamentos' });
    fireEvent.click(screen.getByTestId('novo-agendamento-fab'));
    expect(await screen.findByText('Catálogo de serviços')).toBeInTheDocument();
  });

  it('exibe detalhes do agendamento selecionado', async () => {
    vi.mocked(agendamentosService.carregarAgendamentos).mockResolvedValue({
      agendamentos: agendamentosTeste,
      sincronizadoComBackend: true,
    });
    await renderPage();

    fireEvent.click(screen.getByTestId('detalhes-button-ag-101'));
    const modal = screen.getByTestId('detalhes-agendamento-modal');
    const modalScope = within(modal);
    expect(modalScope.getByRole('heading', { name: 'Massagem Relaxante com Óleos' })).toBeInTheDocument();
    expect(modalScope.getByText('Tais Romagnoli')).toBeInTheDocument();
    expect(modalScope.getByText('Qui, 15 de Outubro')).toBeInTheDocument();
    expect(modalScope.getByText('14:00 - 15:00')).toBeInTheDocument();
    expect(modalScope.getByText(/R\$ 45,00/)).toBeInTheDocument();
    expect(modalScope.getByText(/R\$ 105,00/)).toBeInTheDocument();
    expect(modalScope.getByTestId('modal-status-badge-ag-101')).toHaveTextContent('Confirmado');

    fireEvent.click(modalScope.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByTestId('detalhes-agendamento-modal')).not.toBeInTheDocument();
  });
});
