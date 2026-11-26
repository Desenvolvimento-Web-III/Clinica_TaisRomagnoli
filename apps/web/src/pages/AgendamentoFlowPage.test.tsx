import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CONFIGURACAO_HORARIOS_PADRAO,
  INITIAL_ANAMNESE_DATA,
  type Agendamento as SharedAgendamento,
} from '@clinica/shared';
import * as anamneseService from '@/services/anamnese-service';
import * as agendamentosService from '@/services/agendamentos-service';
import * as horariosService from '@/services/horarios-service';
import * as serviceRepo from '@/features/services/service-firestore-repository';
import { AgendamentoFlowPage } from './AgendamentoFlowPage';

const mockUseOptionalAuth = vi.fn<() => unknown>(() => null);
const mockUseAuth = vi.fn(() => ({ currentUser: null, logout: vi.fn(), isAdmin: false }));

const agendamentoSalvoMock: SharedAgendamento = {
  id: 'ag-salvo-no-firestore',
  clienteId: 'cli-1',
  clienteNome: 'Mariana Souza',
  clienteEmail: 'mariana@example.com',
  clienteTelefone: '(11) 99999-0000',
  servicoId: 'massagem-relaxante',
  servicoNome: 'Massagem Relaxante',
  duracaoMinutos: 60,
  valorTotalEmCentavos: 17000,
  valorSinalEmCentavos: 5100,
  saldoRestanteEmCentavos: 11900,
  dataHoraInicio: '2026-10-22T11:00:00.000Z',
  dataHoraFim: '2026-10-22T12:00:00.000Z',
  intervaloAposMinutos: 30,
  profissionalId: 'prof-tais-romagnoli',
  profissionalNome: 'Tais Romagnoli',
  status: 'pendente',
  metodoPagamento: 'pix',
  origem: 'app_cliente',
  sinalIsento: false,
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
};

vi.mock('@/features/auth/auth-context', () => ({
  useOptionalAuth: () => mockUseOptionalAuth(),
  useAuth: () => mockUseAuth(),
}));

describe('AgendamentoFlowPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-20T10:00:00.000Z'));
    localStorage.clear();
    mockUseOptionalAuth.mockReturnValue(null);
    mockUseAuth.mockReturnValue({ currentUser: null, logout: vi.fn(), isAdmin: false });
    vi.spyOn(serviceRepo, 'subscribeToServicesFromFirestore').mockImplementation((cb) => {
      cb([
        { id: 'massagem-relaxante', name: 'Massagem Relaxante', description: 'Sessão de teste', durationMinutes: 60, priceInCents: 17000, imageSrc: '', imageAlt: 'Massagem Relaxante', active: true },
        { id: 'reflexologia-podal', name: 'Reflexologia Podal', description: 'Sessão de teste', durationMinutes: 30, priceInCents: 10000, imageSrc: '', imageAlt: 'Reflexologia Podal', active: true },
      ]);
      return () => {};
    });
    vi.spyOn(horariosService, 'buscarHorariosFuncionamento').mockResolvedValue({
      ...CONFIGURACAO_HORARIOS_PADRAO,
      dias: CONFIGURACAO_HORARIOS_PADRAO.dias.map((dia) => ({
        ...dia,
        ativo: true,
        turnos: [{ inicio: '09:00', fim: '12:00' }, { inicio: '14:00', fim: '18:00' }],
      })),
    });
    vi.spyOn(horariosService, 'consultarHorariosDisponiveis').mockImplementation(async ({ duracaoMinutos = 30 }) => {
      const horarios: string[] = [];
      for (const [inicio, fim] of [[9 * 60, 12 * 60], [14 * 60, 18 * 60]]) {
        for (let minutos = inicio; minutos + duracaoMinutos <= fim; minutos += 30) {
          horarios.push(`${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`);
        }
      }
      return horarios;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderFlow = async (initialRoute = '/agendar/massagem-relaxante') => {
    const result = render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/agendar/:serviceId" element={<AgendamentoFlowPage />} />
          <Route path="/agendar" element={<AgendamentoFlowPage />} />
          <Route path="/servicos" element={<div>Página de Serviços</div>} />
          <Route path="/agendamentos" element={<div>Página de Meus Agendamentos</div>} />
          <Route path="/anamnese" element={<div>Página de Anamnese</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('Calendário');
    fireEvent.click(screen.getByTestId('dia-disponivel-2026-10-23'));
    const slots = await screen.findAllByTestId(/^slot-hora-/);
    fireEvent.click(slots[0]!);
    return result;
  };

  it('renderiza o Calendário na etapa inicial com legendas e navegação de mês', async () => {
    await renderFlow('/agendar/massagem-relaxante');

    expect(screen.getByText('Calendário')).toBeInTheDocument();
    expect(screen.getByTestId('legenda-disponivel')).toBeInTheDocument();
    expect(screen.getByTestId('legenda-indisponivel')).toBeInTheDocument();
    expect(screen.getByTestId('select-mes')).toBeInTheDocument();
    expect(screen.getByTestId('select-ano')).toBeInTheDocument();
    expect(
      screen.getByText(/Intervalos de 30 minutos são reservados automaticamente/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('confirmar-agendamento-btn')).toBeInTheDocument();
  });

  it('libera no calendário os dias ativos retornados pela configuração da clínica', async () => {
    const configuracaoComTercaAberta = {
      ...CONFIGURACAO_HORARIOS_PADRAO,
      dias: CONFIGURACAO_HORARIOS_PADRAO.dias.map((dia) =>
        dia.dia === 2 ? { ...dia, ativo: true, turnos: [{ inicio: '09:00', fim: '17:00' }] } : dia,
      ),
    };
    vi.spyOn(horariosService, 'buscarHorariosFuncionamento').mockResolvedValue(
      configuracaoComTercaAberta,
    );

    await renderFlow('/agendar/massagem-relaxante');

    expect(await screen.findByTestId('dia-disponivel-2026-10-20')).toBeInTheDocument();
    expect(screen.getByTestId('dia-disponivel-2026-10-21')).toBeInTheDocument();
  });

  it('permite selecionar data e horário no Calendário e avançar para confirmação', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'cli-1', displayName: 'Mariana Souza' },
    });
    await renderFlow('/agendar/massagem-relaxante');

    // Seleciona um dia disponível (ex: dia 23)
    const dia23 = screen.getByTestId('dia-disponivel-2026-10-23');
    fireEvent.click(dia23);

    // Seleciona um slot de horário (ex: 11:00)
    const slot11 = screen.getByTestId('slot-hora-11:00');
    fireEvent.click(slot11);

    // Clica em Confirmar Agendamento
    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));

    // Chega na tela de Confirmação do Agendamento (Somente leitura)
    expect(screen.getByText('Confirmação do Agendamento')).toBeInTheDocument();
    expect(screen.getByText(/Nome do cliente/i)).toBeInTheDocument();
    expect(screen.getByTestId('nome-cliente-display')).toHaveTextContent('Mariana Souza');
    expect(screen.getByText('Tais Romagnoli')).toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante')).toBeInTheDocument();
    expect(screen.getByText(/11:00 às 12:00/i)).toBeInTheDocument();
    expect(screen.getByTestId('avancar-pagamento-btn')).toBeInTheDocument();
    expect(screen.getByTestId('voltar-btn')).toBeInTheDocument();
    // Confirma que não existem campos editáveis (inputs/selects de alteração)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('permite voltar do formulário de confirmação para o Calendário', async () => {
    await renderFlow('/agendar/massagem-relaxante');

    // Avança para confirmação
    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));
    expect(screen.getByText('Confirmação do Agendamento')).toBeInTheDocument();

    // Clica em Voltar
    fireEvent.click(screen.getByTestId('voltar-btn'));
    expect(screen.getByText('Calendário')).toBeInTheDocument();
  });

  it('conclui o fluxo somente depois que o Firestore salva o agendamento', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'cli-1', displayName: 'Mariana Souza' },
    });
    const spySolicitar = vi
      .spyOn(agendamentosService, 'criarAgendamentoFirestore')
      .mockResolvedValue({ sucesso: true, dados: agendamentoSalvoMock });

    await renderFlow('/agendar/massagem-relaxante');

    // Calendário -> Confirmação
    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));
    expect(screen.getByText('Confirmação do Agendamento')).toBeInTheDocument();

    // Confirmação -> Pagamento
    fireEvent.click(screen.getByTestId('avancar-pagamento-btn'));
    expect(screen.getByRole('heading', { name: 'Pagamento' })).toBeInTheDocument();
    expect(screen.getByTestId('pix-qrcode-container')).toBeInTheDocument();

    // Pagamento -> Finalizar
    fireEvent.click(screen.getByTestId('finalizar-agendamento-btn'));

    // Agendamento Concluído (fundo verde)
    expect(await screen.findByTestId('pagina-confirmacao-concluido')).toBeInTheDocument();
    expect(screen.getByText('Solicitação registrada!')).toBeInTheDocument();
    expect(spySolicitar).toHaveBeenCalledWith(
      expect.objectContaining({ servicoId: 'massagem-relaxante' }),
    );

    // Clica para ver agendamentos
    fireEvent.click(screen.getByTestId('ver-meus-agendamentos-btn'));
    await waitFor(() => {
      expect(screen.getByText('Página de Meus Agendamentos')).toBeInTheDocument();
    });
  });

  it('não conclui o agendamento de visitante sem salvar no backend', async () => {
    await renderFlow('/agendar/massagem-relaxante');

    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));
    fireEvent.click(screen.getByTestId('avancar-pagamento-btn'));
    fireEvent.click(screen.getByTestId('finalizar-agendamento-btn'));

    expect(await screen.findByTestId('erro-finalizar-agendamento')).toHaveTextContent(
      'Entre na sua conta para salvar e confirmar o agendamento.',
    );
    expect(screen.queryByText('Solicitação registrada!')).not.toBeInTheDocument();
  });

  it('permite alternar métodos de pagamento no passo de Pagamento', async () => {
    await renderFlow('/agendar/massagem-relaxante');

    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));
    fireEvent.click(screen.getByTestId('avancar-pagamento-btn'));

    // Alterna para Cartão
    fireEvent.click(screen.getByTestId('metodo-cartao-btn'));
    expect(screen.getByTestId('cartao-form-container')).toBeInTheDocument();

    // Alterna para Boleto
    fireEvent.click(screen.getByTestId('metodo-boleto-btn'));
    expect(screen.getByTestId('boleto-info-container')).toBeInTheDocument();
    expect(screen.getByTestId('copiar-boleto-btn')).toBeInTheDocument();
  });

  it('valida campos do cartão de crédito e aplica máscaras antes de finalizar', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'cli-1', displayName: 'Mariana Souza' },
    });
    vi.spyOn(agendamentosService, 'criarAgendamentoFirestore').mockResolvedValue({
      sucesso: true,
      dados: agendamentoSalvoMock,
    });
    await renderFlow('/agendar/massagem-relaxante');

    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));
    fireEvent.click(screen.getByTestId('avancar-pagamento-btn'));
    fireEvent.click(screen.getByTestId('metodo-cartao-btn'));

    // Tenta finalizar com campos vazios
    fireEvent.click(screen.getByTestId('finalizar-agendamento-btn'));

    // Deve exibir mensagens de erro
    expect(screen.getByTestId('cartao-numero-error')).toHaveTextContent(
      'Informe o número do cartão.',
    );
    expect(screen.getByTestId('cartao-nome-error')).toHaveTextContent(
      'Informe o nome impresso no cartão.',
    );
    expect(screen.getByTestId('cartao-validade-error')).toHaveTextContent('Informe a validade.');
    expect(screen.getByTestId('cartao-cvv-error')).toHaveTextContent('Informe o código CVV.');

    // Preenche com máscaras
    const inputNumero = screen.getByLabelText(/Número do Cartão/i);
    fireEvent.change(inputNumero, { target: { value: '4111222233334444' } });
    expect(inputNumero).toHaveValue('4111 2222 3333 4444');
    expect(screen.getByTestId('cartao-bandeira-badge')).toHaveTextContent(/visa/i);

    const inputNome = screen.getByLabelText(/Nome impresso no Cartão/i);
    fireEvent.change(inputNome, { target: { value: 'mariana souza' } });
    expect(inputNome).toHaveValue('MARIANA SOUZA');

    const inputValidade = screen.getByLabelText(/Validade/i);
    fireEvent.change(inputValidade, { target: { value: '1230' } });
    expect(inputValidade).toHaveValue('12/30');

    const inputCvv = screen.getByLabelText(/CVV/i);
    fireEvent.change(inputCvv, { target: { value: '123' } });
    expect(inputCvv).toHaveValue('123');

    // Finaliza com sucesso
    fireEvent.click(screen.getByTestId('finalizar-agendamento-btn'));
    expect(await screen.findByText('Solicitação registrada!')).toBeInTheDocument();
  });

  it('exibe aviso de liberação médica pendente na confirmação e no resumo concluído para cliente bloqueado', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'cli-blocked', displayName: 'Ana Clara' },
    });

    vi.spyOn(anamneseService, 'obterFichaAnamneseApi').mockResolvedValue({
      sucesso: true,
      dados: {
        ...INITIAL_ANAMNESE_DATA,
        consentimentoConfirmado: true,
        tratamentoOncologico: { resposta: true, detalhes: 'Em tratamento' },
        clienteId: 'cli-blocked',
        submittedAt: '2026-10-10T10:00:00.000Z',
        updatedAt: '2026-10-10T10:00:00.000Z',
        pontosAtencao: ['Tratamento Oncológico: Em tratamento'],
        exigeLiberacaoMedica: true,
        contraindicacoes: ['Tratamento Oncológico: Em tratamento'],
        liberacaoMedicaAprovada: false,
      },
    });
    vi.spyOn(agendamentosService, 'criarAgendamentoFirestore').mockResolvedValue({
      sucesso: true,
      dados: agendamentoSalvoMock,
    });

    await renderFlow('/agendar/massagem-relaxante');

    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));

    const aviso = await screen.findByTestId('aviso-liberacao-medica-agendamento');
    expect(aviso).toHaveTextContent(/liberação médica necessária antes da confirmação/i);
    expect(aviso).toHaveTextContent(/tratamento oncológico: em tratamento/i);
    expect(screen.getByRole('link', { name: /revisar ficha de anamnese/i })).toHaveAttribute(
      'href',
      '/anamnese',
    );

    fireEvent.click(screen.getByTestId('avancar-pagamento-btn'));
    fireEvent.click(screen.getByTestId('finalizar-agendamento-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('aviso-concluido-liberacao-medica')).toHaveTextContent(
        /confirmação condicionada à liberação médica/i,
      );
    });
  });

  it('exibe erro e impede conclusão quando a gravação no Firestore falha', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'cli-1', displayName: 'Mariana' },
    });
    vi.spyOn(anamneseService, 'obterFichaAnamneseApi').mockResolvedValue({
      sucesso: true,
      dados: undefined,
    });
    vi.spyOn(agendamentosService, 'criarAgendamentoFirestore').mockResolvedValue({
      sucesso: false,
      erro: 'O Firebase recusou a gravação.',
    });

    await renderFlow('/agendar/massagem-relaxante');

    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));
    fireEvent.click(screen.getByTestId('avancar-pagamento-btn'));
    fireEvent.click(screen.getByTestId('finalizar-agendamento-btn'));

    const erro = await screen.findByTestId('erro-finalizar-agendamento');
    expect(erro).toHaveTextContent('O Firebase recusou a gravação.');
    expect(screen.queryByText('Solicitação registrada!')).not.toBeInTheDocument();
  });

  it('desabilita navegação para meses anteriores ao mês atual', async () => {
    await renderFlow('/agendar/massagem-relaxante');

    const btnMesAnterior = screen.getByTestId('mes-anterior-btn');
    expect(btnMesAnterior).toBeDisabled();
  });

  it('marca dias que já passaram como desabilitados no calendário', async () => {
    await renderFlow('/agendar/massagem-relaxante');

    // 2026-10-08 é anterior à data de referência 2026-10-20
    const diaPassado = screen.getByTestId('dia-passado-2026-10-08');
    expect(diaPassado).toBeInTheDocument();
    expect(diaPassado).toHaveAttribute('aria-disabled', 'true');
  });

  it('permite agendar para horários futuros no próprio dia atual e oculta horários que já passaram', async () => {
    // Quarta-feira às 16:40
    vi.setSystemTime(new Date('2026-10-21T16:40:00.000'));
    await renderFlow('/agendar/massagem-relaxante');

    // Seleciona o dia de hoje (2026-10-21)
    const diaHoje = screen.getByTestId('dia-disponivel-2026-10-21');
    fireEvent.click(diaHoje);

    // Horários anteriores às 16:40 não devem ser exibidos
    expect(screen.queryByTestId('slot-hora-10:00')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slot-hora-14:00')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slot-hora-16:00')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slot-hora-16:30')).not.toBeInTheDocument();

    // Horário futuro (17:00) deve estar disponível e ser selecionável
    const slot17 = screen.getByTestId('slot-hora-17:00');
    expect(slot17).toBeInTheDocument();
    fireEvent.click(slot17);

    // Permite confirmar agendamento para o mesmo dia em horário futuro
    const btnConfirmar = screen.getByTestId('confirmar-agendamento-btn');
    expect(btnConfirmar).not.toBeDisabled();
    fireEvent.click(btnConfirmar);

    expect(screen.getByText('Confirmação do Agendamento')).toBeInTheDocument();
    expect(screen.getByText(/17:00 às 18:00/i)).toBeInTheDocument();
  });

  it('ajusta os últimos horários disponíveis de cada turno conforme a duração do serviço (30 min vs 60 min)', async () => {
    const { unmount } = await renderFlow('/agendar/massagem-relaxante'); // 60 min
    expect(screen.getByTestId('slot-hora-11:00')).toBeInTheDocument();
    expect(screen.queryByTestId('slot-hora-11:30')).not.toBeInTheDocument();
    expect(screen.getByTestId('slot-hora-17:00')).toBeInTheDocument();
    expect(screen.queryByTestId('slot-hora-17:30')).not.toBeInTheDocument();
    unmount();

    await renderFlow('/agendar/reflexologia-podal'); // 30 min
    expect(screen.getByTestId('slot-hora-11:30')).toBeInTheDocument();
    expect(screen.getByTestId('slot-hora-17:30')).toBeInTheDocument();
  });

  it('usa a duração real de serviço carregado do Firestore (90 min) limitando os turnos em 10:30 e 16:30', async () => {
    vi.spyOn(serviceRepo, 'subscribeToServicesFromFirestore').mockImplementation((cb) => {
      cb([
        {
          id: 'serv-firestore-90',
          name: 'Ritual Completo 90 min',
          description: 'Sessão estendida de 90 minutos.',
          durationMinutes: 90,
          priceInCents: 26000,
          imageSrc: '',
          imageAlt: 'Ritual Completo',
          active: true,
        },
      ]);
      return () => {};
    });

    await renderFlow('/agendar/serv-firestore-90');

    await waitFor(() => {
      expect(screen.getByTestId('slot-hora-10:30')).toBeInTheDocument();
      expect(screen.queryByTestId('slot-hora-11:00')).not.toBeInTheDocument();
      expect(screen.getByTestId('slot-hora-16:30')).toBeInTheDocument();
      expect(screen.queryByTestId('slot-hora-17:00')).not.toBeInTheDocument();
    });
  });

  it('bloqueia os horários ocupados pelo agendamento concluído respeitando duração + 30 min de intervalo', async () => {
    mockUseOptionalAuth.mockReturnValue({
      currentUser: { uid: 'cli-1', displayName: 'Mariana Souza' },
    });
    vi.spyOn(agendamentosService, 'criarAgendamentoFirestore').mockResolvedValue({
      sucesso: true,
      dados: {
        ...agendamentoSalvoMock,
        dataHoraInicio: '2026-10-23T09:00:00.000Z',
        dataHoraFim: '2026-10-23T10:00:00.000Z',
      },
    });

    const { unmount } = await renderFlow('/agendar/massagem-relaxante'); // 60 min

    fireEvent.click(screen.getByTestId('dia-disponivel-2026-10-23'));
    fireEvent.click(screen.getByTestId('slot-hora-09:00'));
    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn'));
    fireEvent.click(screen.getByTestId('avancar-pagamento-btn'));
    fireEvent.click(screen.getByTestId('finalizar-agendamento-btn'));

    expect(await screen.findByText('Solicitação registrada!')).toBeInTheDocument();
    unmount();

    await renderFlow('/agendar/massagem-relaxante');
    fireEvent.click(screen.getByTestId('dia-disponivel-2026-10-23'));

    expect(screen.queryByTestId('slot-hora-08:00')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slot-hora-08:30')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slot-hora-09:00')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slot-hora-09:30')).not.toBeInTheDocument();
    expect(screen.queryByTestId('slot-hora-10:00')).not.toBeInTheDocument();

    expect(screen.getByTestId('slot-hora-10:30')).toBeInTheDocument();
    expect(screen.getByTestId('slot-hora-11:00')).toBeInTheDocument();
  });
});
