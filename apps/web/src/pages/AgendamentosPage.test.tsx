import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MOCK_AGENDAMENTOS } from '@/features/agendamentos/data/mockAgendamentos';
import { saveAgendamentosStorage } from '@/features/agendamentos/data/agendamentos-storage';
import { AgendamentosPage } from './AgendamentosPage';

const mockUseOptionalAuth = vi.fn();

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => mockUseOptionalAuth(),
  useOptionalAuth: () => mockUseOptionalAuth(),
}));

describe('AgendamentosPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'user-1', displayName: 'Maria Silva' },
      isAuthReady: true,
      logout: vi.fn(),
    });
  });

  const renderPage = () => render(<AgendamentosPage />, { wrapper: MemoryRouter });

  it('exibe lista vazia e botão de login quando não há usuário autenticado', () => {
    // Mesmo que existam agendamentos salvos de um usuário no navegador
    saveAgendamentosStorage(MOCK_AGENDAMENTOS, 'user-1');

    mockUseOptionalAuth.mockReturnValue({
      currentUser: null,
      isAuthReady: true,
      logout: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole('heading', { name: 'Meus Agendamentos' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-agendamentos-state')).toBeInTheDocument();
    expect(screen.queryByTestId('agendamentos-list')).not.toBeInTheDocument();
    expect(screen.queryByText('Massagem Relaxante com Óleos')).not.toBeInTheDocument();
    expect(
      screen.getByText('Entre na sua conta para visualizar e acompanhar os seus agendamentos.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('empty-login-cta')).toBeInTheDocument();
  });

  it('exibe lista vazia para usuário autenticado que ainda não possui agendamentos', () => {
    renderPage();

    expect(screen.getByTestId('empty-agendamentos-state')).toBeInTheDocument();
    expect(screen.queryByTestId('agendamentos-list')).not.toBeInTheDocument();
    expect(
      screen.getByText('Não existem atendimentos nesta categoria no momento.'),
    ).toBeInTheDocument();
  });

  it('não exibe agendamentos pertencentes a outro usuário', () => {
    saveAgendamentosStorage(MOCK_AGENDAMENTOS, 'outro-usuario');

    renderPage();

    expect(screen.getByTestId('empty-agendamentos-state')).toBeInTheDocument();
    expect(screen.queryByText('Massagem Relaxante com Óleos')).not.toBeInTheDocument();
  });

  it('renderiza o título da página e a lista de agendamentos do cliente autenticado', () => {
    saveAgendamentosStorage(MOCK_AGENDAMENTOS, 'user-1');
    renderPage();

    expect(screen.getByRole('heading', { name: 'Meus Agendamentos' })).toBeInTheDocument();
    expect(screen.getByTestId('agendamentos-list')).toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante com Óleos')).toBeInTheDocument();
    expect(screen.getByText('Drenagem Linfática Corporal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.getAllByText('Maria Silva')).not.toHaveLength(0);
  });

  it('filtra agendamentos ao selecionar a aba de status', () => {
    saveAgendamentosStorage(MOCK_AGENDAMENTOS, 'user-1');
    renderPage();

    // Clica na aba 'Confirmados'
    const tabConfirmados = screen.getByTestId('tab-confirmado');
    fireEvent.click(tabConfirmados);

    expect(screen.getByText('Massagem Relaxante com Óleos')).toBeInTheDocument();
    expect(screen.queryByText('Drenagem Linfática Corporal')).not.toBeInTheDocument();

    // Clica na aba 'Pendentes'
    const tabPendentes = screen.getByTestId('tab-pendente');
    fireEvent.click(tabPendentes);

    expect(screen.getByText('Drenagem Linfática Corporal')).toBeInTheDocument();
    expect(screen.queryByText('Massagem Relaxante com Óleos')).not.toBeInTheDocument();
  });

  it('abre o modal de cancelamento e altera o status após confirmação', () => {
    saveAgendamentosStorage(MOCK_AGENDAMENTOS, 'user-1');
    renderPage();

    // Clica no primeiro botão de Cancelar (Massagem Relaxante com Óleos)
    const botoesCancelar = screen.getAllByRole('button', { name: 'Cancelar' });
    const primeiroBotao = botoesCancelar[0];
    expect(primeiroBotao).toBeDefined();
    if (primeiroBotao) {
      fireEvent.click(primeiroBotao);
    }

    // Modal deve estar visível
    expect(screen.getByTestId('cancel-modal')).toBeInTheDocument();
    expect(screen.getByText('Atenção às regras de cancelamento:')).toBeInTheDocument();

    // Confirma cancelamento
    const botaoConfirmarModal = screen.getByTestId('confirm-cancel-button');
    fireEvent.click(botaoConfirmarModal);

    // Modal deve fechar e feedback deve ser mostrado
    expect(screen.queryByTestId('cancel-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('toast-feedback')).toHaveTextContent(
      'Agendamento cancelado com sucesso.',
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

    const fab = screen.getByTestId('novo-agendamento-fab');
    fireEvent.click(fab);

    expect(await screen.findByText('Catálogo de serviços')).toBeInTheDocument();
  });

  it('abre o modal de detalhes e exibe serviço, data, horário, pagamento, saldo e situação atual', () => {
    saveAgendamentosStorage(MOCK_AGENDAMENTOS, 'user-1');
    renderPage();

    // Clica no botão "Ver detalhes" do primeiro agendamento (Massagem Relaxante com Óleos)
    const botaoDetalhes = screen.getByTestId('detalhes-button-ag-101');
    fireEvent.click(botaoDetalhes);

    // Modal deve estar visível
    const modal = screen.getByTestId('detalhes-agendamento-modal');
    expect(modal).toBeInTheDocument();

    const modalScope = within(modal);

    // 1. Serviço
    expect(
      modalScope.getByRole('heading', { name: 'Massagem Relaxante com Óleos' }),
    ).toBeInTheDocument();
    expect(modalScope.getByText('Tais Romagnoli')).toBeInTheDocument();

    // 2. Data
    expect(modalScope.getByText('Qui, 15 de Outubro')).toBeInTheDocument();

    // 3. Horário
    expect(modalScope.getByText('14:00 - 15:00')).toBeInTheDocument();

    // 4. Pagamento (Sinal)
    expect(modalScope.getByText(/R\$ 45,00/)).toBeInTheDocument();

    // 5. Saldo Restante (R$ 150 - R$ 45 = R$ 105,00)
    expect(modalScope.getByText(/R\$ 105,00/)).toBeInTheDocument();

    // 6. Situação atual
    expect(modalScope.getByTestId('modal-status-badge-ag-101')).toHaveTextContent('Confirmado');

    // Fecha o modal pelo botão Fechar
    const botaoFechar = modalScope.getByRole('button', { name: 'Fechar' });
    fireEvent.click(botaoFechar);

    expect(screen.queryByTestId('detalhes-agendamento-modal')).not.toBeInTheDocument();
  });
});
