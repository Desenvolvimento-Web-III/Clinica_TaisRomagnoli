import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MOCK_AGENDAMENTOS } from '@/features/agendamentos/data/mockAgendamentos';
import { saveAgendamentosStorage } from '@/features/agendamentos/data/agendamentos-storage';
import { ReagendamentoPage } from './ReagendamentoPage';

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

describe('ReagendamentoPage', () => {
  beforeEach(() => {
    localStorage.clear();
    saveAgendamentosStorage(MOCK_AGENDAMENTOS, 'user-1');
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date('2026-10-20T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderPage = (id = 'ag-101') =>
    render(
      <MemoryRouter initialEntries={[`/agendamentos/reagendar/${id}`]}>
        <Routes>
          <Route path="/agendamentos/reagendar/:id" element={<ReagendamentoPage />} />
          <Route path="/agendamentos" element={<div>Lista de Agendamentos</div>} />
        </Routes>
      </MemoryRouter>,
    );

  it('renderiza os dados do agendamento original e as regras de reagendamento', () => {
    renderPage('ag-101');

    expect(screen.getByRole('heading', { name: 'Reagendar Atendimento' })).toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante com Óleos')).toBeInTheDocument();
    expect(screen.getByText('Com Tais Romagnoli')).toBeInTheDocument();
    expect(screen.getByText('Qui, 15 de Outubro')).toBeInTheDocument();
    expect(screen.getByText(/Reagendamentos solicitados com pelo menos/i)).toBeInTheDocument();
  });

  it('permite selecionar nova data, novo horário e preencher motivo opcional', () => {
    renderPage('ag-101');

    // Seleciona a opção de data de 23 de Outubro
    const dataOption = screen.getByTestId('data-option-2026-10-23');
    fireEvent.click(dataOption);

    // Seleciona horário 11:00
    const horarioOption = screen.getByTestId('horario-option-11:00');
    fireEvent.click(horarioOption);

    // Digita motivo
    const motivoInput = screen.getByTestId('motivo-input');
    fireEvent.change(motivoInput, { target: { value: 'Consulta médica no horário antigo' } });

    expect((motivoInput as HTMLTextAreaElement).value).toBe('Consulta médica no horário antigo');
  });

  it('confirma o reagendamento e exibe o cartão de sucesso com os detalhes atualizados', async () => {
    renderPage('ag-101');

    const btnConfirmar = screen.getByTestId('confirmar-reagendamento-btn');
    fireEvent.click(btnConfirmar);

    // Avança o timer do setTimeout
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId('reagendamento-sucesso-card')).toBeInTheDocument();
    expect(screen.getByText('Consulta Reagendada com Sucesso!')).toBeInTheDocument();

    // Clica para voltar a agendamentos
    const btnVoltar = screen.getByTestId('voltar-aposterior-btn');
    fireEvent.click(btnVoltar);

    expect(screen.getByText('Lista de Agendamentos')).toBeInTheDocument();
  });

  it('permite voltar para a lista de agendamentos pelo botão superior', () => {
    renderPage('ag-101');

    const btnVoltarTopo = screen.getByTestId('voltar-agendamentos-btn');
    fireEvent.click(btnVoltarTopo);

    expect(screen.getByText('Lista de Agendamentos')).toBeInTheDocument();
  });

  it('desabilita opções de datas que já passaram', () => {
    // Definimos a data do sistema como 2026-10-23
    vi.setSystemTime(new Date('2026-10-23T10:00:00.000Z'));
    renderPage('ag-101');

    // 2026-10-22 é anterior a 2026-10-23
    const dataPassada = screen.getByTestId('data-option-2026-10-22');
    expect(dataPassada).toBeDisabled();

    // 2026-10-24 é futura
    const dataFutura = screen.getByTestId('data-option-2026-10-24');
    expect(dataFutura).not.toBeDisabled();
  });
});
