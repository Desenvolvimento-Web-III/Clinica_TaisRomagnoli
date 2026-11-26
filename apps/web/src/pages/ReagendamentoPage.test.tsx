import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Agendamento } from '@/features/agendamentos/types/agendamento';
import { ReagendamentoPage } from './ReagendamentoPage';

const { mockAlterarAgendamento, mockCarregarAgendamentos, mockBuscarHorarios, mockConsultarGrade } =
  vi.hoisted(() => ({
    mockAlterarAgendamento: vi.fn(),
    mockCarregarAgendamentos: vi.fn(),
    mockBuscarHorarios: vi.fn(),
    mockConsultarGrade: vi.fn(),
  }));

const agendamentoTeste: Agendamento = {
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
};

vi.mock('@/services/agendamentos-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/agendamentos-service')>();
  return {
    ...actual,
    alterarAgendamentoBackend: mockAlterarAgendamento,
    carregarAgendamentos: mockCarregarAgendamentos,
  };
});

vi.mock('@/services/horarios-service', () => ({
  buscarHorariosFuncionamento: mockBuscarHorarios,
  consultarHorariosDisponiveis: mockConsultarGrade,
}));

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
    mockCarregarAgendamentos.mockResolvedValue({ agendamentos: [agendamentoTeste], sincronizadoComBackend: true });
    mockConsultarGrade.mockResolvedValue(['10:00', '11:30', '14:00']);
    mockBuscarHorarios.mockResolvedValue({
      dias: [
        { dia: 0, ativo: false, turnos: [], intervaloMinutos: 30, intervalosManutencao: [] },
        {
          dia: 1,
          ativo: true,
          turnos: [{ inicio: '08:00', fim: '18:00' }],
          intervaloMinutos: 30,
          intervalosManutencao: [],
        },
        { dia: 2, ativo: false, turnos: [], intervaloMinutos: 30, intervalosManutencao: [] },
        {
          dia: 3,
          ativo: true,
          turnos: [{ inicio: '08:00', fim: '18:00' }],
          intervaloMinutos: 30,
          intervalosManutencao: [],
        },
        {
          dia: 4,
          ativo: true,
          turnos: [{ inicio: '08:00', fim: '18:00' }],
          intervaloMinutos: 30,
          intervalosManutencao: [],
        },
        {
          dia: 5,
          ativo: true,
          turnos: [{ inicio: '08:00', fim: '18:00' }],
          intervaloMinutos: 30,
          intervalosManutencao: [],
        },
        {
          dia: 6,
          ativo: true,
          turnos: [{ inicio: '08:00', fim: '18:00' }],
          intervaloMinutos: 30,
          intervalosManutencao: [],
        },
      ],
      intervaloPadraoMinutos: 30,
    });
    mockAlterarAgendamento.mockImplementation(async (input: { novaDataHoraInicio: string }) => ({
      sucesso: true,
      dados: {
        id: 'ag-101',
        clienteId: 'user-1',
        servicoId: 'serv-1',
        servicoNome: 'Massagem Relaxante com Óleos',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: input.novaDataHoraInicio,
        dataHoraFim: new Date(Date.parse(input.novaDataHoraInicio) + 60 * 60 * 1000).toISOString(),
        intervaloAposMinutos: 30,
        profissionalId: 'prof-1',
        profissionalNome: 'Tais Romagnoli',
        status: 'confirmado',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      },
    }));
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date('2026-10-20T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderPage = async (id = 'ag-101') => {
    const result = render(
      <MemoryRouter initialEntries={[`/agendamentos/reagendar/${id}`]}>
        <Routes>
          <Route path="/agendamentos/reagendar/:id" element={<ReagendamentoPage />} />
          <Route path="/agendamentos" element={<div>Lista de Agendamentos</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Reagendar Atendimento' });
    return result;
  };

  it('renderiza os dados do agendamento original e as regras de reagendamento', async () => {
    await renderPage('ag-101');

    expect(screen.getByRole('heading', { name: 'Reagendar Atendimento' })).toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante com Óleos')).toBeInTheDocument();
    expect(screen.getByText('Com Tais Romagnoli')).toBeInTheDocument();
    expect(screen.getByText('Qui, 15 de Outubro')).toBeInTheDocument();
    expect(screen.getByText(/Reagendamentos solicitados com pelo menos/i)).toBeInTheDocument();
  });

  it('permite selecionar nova data, horário retornado pela grade e preencher motivo opcional', async () => {
    await renderPage('ag-101');

    // Seleciona a opção de data de 23 de Outubro
    const dataOption = screen.getByTestId('data-option-2026-10-23');
    fireEvent.click(dataOption);

    // Seleciona horário 11:30
    const horarioOption = await screen.findByTestId('horario-option-11:30');
    fireEvent.click(horarioOption);

    // Digita motivo
    const motivoInput = screen.getByTestId('motivo-input');
    fireEvent.change(motivoInput, { target: { value: 'Consulta médica no horário antigo' } });

    expect((motivoInput as HTMLTextAreaElement).value).toBe('Consulta médica no horário antigo');
  });

  it('confirma o reagendamento no backend e exibe os detalhes retornados', async () => {
    await renderPage('ag-101');

    await screen.findByTestId('horario-option-10:00');
    const btnConfirmar = screen.getByTestId('confirmar-reagendamento-btn');
    fireEvent.click(btnConfirmar);

    expect(await screen.findByTestId('reagendamento-sucesso-card')).toBeInTheDocument();
    expect(screen.getByText('Consulta Reagendada com Sucesso!')).toBeInTheDocument();
    expect(mockAlterarAgendamento).toHaveBeenCalledWith(
      expect.objectContaining({ agendamentoId: 'ag-101', novaDataHoraInicio: expect.any(String) }),
    );

    // Clica para voltar a agendamentos
    const btnVoltar = screen.getByTestId('voltar-aposterior-btn');
    fireEvent.click(btnVoltar);

    expect(screen.getByText('Lista de Agendamentos')).toBeInTheDocument();
  });

  it('mostra o erro do backend e mantém o reagendamento sem confirmação quando a API recusa', async () => {
    mockAlterarAgendamento.mockResolvedValueOnce({
      sucesso: false,
      erro: 'O horário selecionado não está mais disponível.',
    });
    await renderPage('ag-101');
    await screen.findByTestId('horario-option-10:00');

    fireEvent.click(screen.getByTestId('confirmar-reagendamento-btn'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O horário selecionado não está mais disponível.',
    );
    expect(screen.queryByTestId('reagendamento-sucesso-card')).not.toBeInTheDocument();
  });

  it('permite voltar para a lista de agendamentos pelo botão superior', async () => {
    await renderPage('ag-101');

    const btnVoltarTopo = screen.getByTestId('voltar-agendamentos-btn');
    fireEvent.click(btnVoltarTopo);

    expect(screen.getByText('Lista de Agendamentos')).toBeInTheDocument();
  });

  it('gera opções dinâmicas da semana seguinte excluindo as folgas da dona da clínica (domingos e terças)', async () => {
    // Definimos a data do sistema como 2026-10-20 (terça-feira)
    vi.setSystemTime(new Date('2026-10-20T10:00:00.000Z'));
    await renderPage('ag-101');

    // Dias úteis seguintes gerados dinamicamente
    expect(screen.getByTestId('data-option-2026-10-21')).toBeInTheDocument(); // Quarta
    expect(screen.getByTestId('data-option-2026-10-22')).toBeInTheDocument(); // Quinta
    expect(screen.getByTestId('data-option-2026-10-23')).toBeInTheDocument(); // Sexta
    expect(screen.getByTestId('data-option-2026-10-24')).toBeInTheDocument(); // Sábado
    expect(screen.getByTestId('data-option-2026-10-26')).toBeInTheDocument(); // Segunda
    expect(screen.getByTestId('data-option-2026-10-28')).toBeInTheDocument(); // Quarta

    // Folgas da dona da clínica não devem aparecer na seleção rápida
    expect(screen.queryByTestId('data-option-2026-10-25')).not.toBeInTheDocument(); // Domingo
    expect(screen.queryByTestId('data-option-2026-10-27')).not.toBeInTheDocument(); // Terça
  });
});
