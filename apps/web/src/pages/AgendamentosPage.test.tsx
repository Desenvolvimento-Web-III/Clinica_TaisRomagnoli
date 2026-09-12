import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AgendamentosPage } from './AgendamentosPage';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    currentUser: { uid: 'user-1', displayName: 'Maria Silva' },
    isAuthReady: true,
    logout: vi.fn(),
  }),
  useOptionalAuth: () => ({
    currentUser: { uid: 'user-1', displayName: 'Maria Silva' },
    isAuthReady: true,
    logout: vi.fn(),
  }),
}));

describe('AgendamentosPage', () => {
  const renderPage = () => render(<AgendamentosPage />, { wrapper: MemoryRouter });

  it('renderiza o título da página e a lista de agendamentos', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Meus Agendamentos' })).toBeInTheDocument();
    expect(screen.getByTestId('agendamentos-list')).toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante com Óleos')).toBeInTheDocument();
    expect(screen.getByText('Drenagem Linfática Corporal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.getAllByText('Maria Silva')).not.toHaveLength(0);
  });

  it('filtra agendamentos ao selecionar a aba de status', () => {
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
});
