import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { User } from 'firebase/auth';
import {
  INITIAL_ANAMNESE_DATA,
  MENSAGEM_BLOQUEIO_CONTRAINDICACAO,
  MENSAGEM_ERRO_DATA_PASSADA,
  type Agendamento as SharedAgendamento,
} from '@clinica/shared';
import * as anamneseService from '@/services/anamnese-service';
import * as agendamentosService from '@/services/agendamentos-service';
import * as settingsService from '@/services/clinic-settings-service';
import * as clientesAdminService from '@/services/clientes-admin-service';
import * as indicadoresAdminService from '@/services/indicadores-admin-service';
import * as lembretesAdminService from '@/services/lembretes-admin-service';
import * as serviceRepository from '@/features/services/service-firestore-repository';
import { adminClientsFixture, clinicSettingsFixture, indicatorsFixture, servicesFixture } from '@/test/fixtures';
import type { LembreteFilaItem } from '@/features/admin-dashboard/utils/whatsapp-reminders';
import { AdminDashboardPage } from './AdminDashboardPage';
import { useAuth } from '@/features/auth/auth-context';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

function agendamentosDoDiaDeTeste(): SharedAgendamento[] {
  const data = new Date();
  data.setHours(0, 0, 0, 0);
  const horario = (hora: number) => {
    const value = new Date(data);
    value.setHours(hora);
    return value.toISOString();
  };
  return [
    {
      id: 'ag-1',
      clienteId: 'demo-client-1',
      clienteNome: 'Mariana Silva',
      clienteEmail: 'mariana@example.com',
      clienteTelefone: '(11) 98765-4321',
      servicoId: 'srv-1',
      servicoNome: 'Massagem Relaxante',
      duracaoMinutos: 60,
      valorTotalEmCentavos: 15000,
      valorSinalEmCentavos: 4500,
      saldoRestanteEmCentavos: 10500,
      dataHoraInicio: horario(9),
      dataHoraFim: horario(10),
      intervaloAposMinutos: 30,
      profissionalId: 'prof-tais-romagnoli',
      profissionalNome: 'Tais Romagnoli',
      status: 'concluido',
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      createdAt: horario(8),
      updatedAt: horario(8),
    },
    {
      id: 'ag-2',
      clienteId: 'demo-client-2',
      clienteNome: 'Ana Carolina Santos',
      clienteTelefone: '(11) 97654-3210',
      servicoId: 'srv-2',
      servicoNome: 'Massagem com Pedras Quentes',
      duracaoMinutos: 90,
      valorTotalEmCentavos: 20000,
      valorSinalEmCentavos: 6000,
      saldoRestanteEmCentavos: 14000,
      dataHoraInicio: horario(10),
      dataHoraFim: horario(11),
      intervaloAposMinutos: 30,
      profissionalId: 'prof-tais-romagnoli',
      profissionalNome: 'Tais Romagnoli',
      status: 'confirmado',
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      createdAt: horario(8),
      updatedAt: horario(8),
    },
    {
      id: 'ag-3',
      clienteId: 'demo-client-3',
      clienteNome: 'Juliana Lima',
      clienteTelefone: '(11) 96543-2109',
      servicoId: 'srv-3',
      servicoNome: 'Drenagem Linfática',
      duracaoMinutos: 60,
      valorTotalEmCentavos: 16000,
      valorSinalEmCentavos: 4800,
      saldoRestanteEmCentavos: 11200,
      dataHoraInicio: horario(14),
      dataHoraFim: horario(15),
      intervaloAposMinutos: 30,
      profissionalId: 'prof-tais-romagnoli',
      profissionalNome: 'Tais Romagnoli',
      status: 'confirmado',
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      createdAt: horario(8),
      updatedAt: horario(8),
    },
    {
      id: 'ag-4',
      clienteId: 'demo-client-4',
      clienteNome: 'Carlos Eduardo',
      clienteTelefone: '(11) 95432-1098',
      servicoId: 'srv-4',
      servicoNome: 'Liberação Miofascial',
      duracaoMinutos: 60,
      valorTotalEmCentavos: 17000,
      valorSinalEmCentavos: 5100,
      saldoRestanteEmCentavos: 11900,
      dataHoraInicio: horario(15),
      dataHoraFim: horario(16),
      intervaloAposMinutos: 30,
      profissionalId: 'prof-tais-romagnoli',
      profissionalNome: 'Tais Romagnoli',
      status: 'pendente',
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      createdAt: horario(8),
      updatedAt: horario(8),
    },
  ];
}

describe('AdminDashboardPage', () => {
  const mockLogout = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(agendamentosService, 'buscarAgendamentosAdminDoDia').mockResolvedValue(
      agendamentosDoDiaDeTeste(),
    );
    vi.spyOn(agendamentosService, 'buscarAgendamentosAdmin').mockResolvedValue(
      agendamentosDoDiaDeTeste(),
    );
    vi.spyOn(agendamentosService, 'alterarAgendamentoBackend');
    vi.spyOn(clientesAdminService, 'buscarClientesAdmin').mockResolvedValue(adminClientsFixture);
    vi.spyOn(settingsService, 'buscarConfiguracoesGerais').mockResolvedValue(
      clinicSettingsFixture,
    );
    vi.spyOn(indicadoresAdminService, 'consultarPainelIndicadoresAdmin').mockResolvedValue(indicatorsFixture);
    vi.spyOn(serviceRepository, 'subscribeToServicesFromFirestore').mockImplementation((onUpdate) => {
      onUpdate(servicesFixture);
      return () => {};
    });
    vi.spyOn(lembretesAdminService, 'gerarFilaLembretesAdmin').mockResolvedValue([
      {
        id: 'ag-1',
        clienteId: 'demo-client-1',
        clienteNome: 'Mariana Silva',
        clienteTelefone: '(11) 98765-4321',
        servicoNome: 'Massagem Relaxante',
        duracao: '60 min',
        horario: '09:00 - 10:00',
        dataFormatada: '25/11/2026',
        dataHoraInicio: '2026-11-25T12:00:00.000Z',
        statusAgendamento: 'confirmado',
        statusLembrete: 'pendente',
        mensagemPersonalizada: 'Olá, Mariana Silva!',
      } satisfies LembreteFilaItem,
    ]);
    vi.spyOn(lembretesAdminService, 'salvarEstadoLembreteAdmin').mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        uid: 'admin-1',
        displayName: 'Tais Romagnoli',
        email: 'admin@clinicataisromagnoli.com.br',
      } as unknown as User,
      isAuthenticated: true,
      isLoading: false,
      status: 'authenticated',
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

  it('carrega os atendimentos do dia do Firestore e não usa dados demonstrativos fixos', async () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: /agenda de atendimentos/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /agendamentos presenciais cadastrados pela administradora não exigem sinal/i,
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('Mariana Silva')).toBeInTheDocument();
    expect(screen.getByText('mariana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante • 60 min')).toBeInTheDocument();
    expect(agendamentosService.buscarAgendamentosAdminDoDia).toHaveBeenCalled();
    expect(screen.getByTestId('agenda-item-ag-4')).toHaveTextContent('PENDENTE');
  });

  it('abre o calendário administrativo com agendamentos carregados do banco', async () => {
    renderDashboard();

    fireEvent.click(screen.getByTestId('tab-calendario-agenda'));

    expect(await screen.findByTestId('admin-calendar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('calendar-appointment-ag-1')).toHaveTextContent('Mariana Silva');
    expect(screen.getByTestId('calendar-appointment-ag-1')).toHaveTextContent('Massagem Relaxante');
    expect(agendamentosService.buscarAgendamentosAdmin).toHaveBeenCalled();
  });

  it('permite reagendar um atendimento pelo formulário administrativo', async () => {
    const appointment = agendamentosDoDiaDeTeste()[1]!;
    vi.mocked(agendamentosService.alterarAgendamentoBackend).mockImplementation(async (input) => ({
      sucesso: true,
      dados: {
        ...appointment,
        dataHoraInicio: input.novaDataHoraInicio,
        dataHoraFim: new Date(
          new Date(input.novaDataHoraInicio).getTime() + 60 * 60_000,
        ).toISOString(),
      },
    }));

    renderDashboard();
    fireEvent.click(screen.getByTestId('tab-calendario-agenda'));
    fireEvent.click(await screen.findByTestId(`editar-agendamento-${appointment.id}`));

    expect(
      screen.getByRole('heading', { name: /editar \/ reagendar atendimento/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Cliente cadastrado')).toBeDisabled();
    expect(screen.getByLabelText('Procedimento')).toBeDisabled();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    futureDate.setHours(10, 0, 0, 0);
    const localDateTime = new Date(futureDate.getTime() - futureDate.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
    fireEvent.change(screen.getByLabelText('Data e horário'), { target: { value: localDateTime } });
    fireEvent.change(screen.getByLabelText('Motivo da alteração (opcional)'), {
      target: { value: 'Solicitação da cliente' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alteração' }));

    await waitFor(() => {
      expect(agendamentosService.alterarAgendamentoBackend).toHaveBeenCalledWith({
        agendamentoId: appointment.id,
        novaDataHoraInicio: new Date(localDateTime).toISOString(),
        motivo: 'Solicitação da cliente',
      });
    });
    expect(await screen.findByTestId('agenda-feedback-banner')).toHaveTextContent(
      'atualizado para',
    );
    expect(
      screen.queryByRole('heading', { name: /editar \/ reagendar atendimento/i }),
    ).not.toBeInTheDocument();
  });

  it('exibe estado vazio quando o Firestore não tem agendamentos para hoje', async () => {
    vi.mocked(agendamentosService.buscarAgendamentosAdminDoDia).mockResolvedValueOnce([]);

    renderDashboard();

    expect(await screen.findByTestId('agenda-do-dia-vazia')).toHaveTextContent(
      'Nenhum agendamento cadastrado para hoje.',
    );
    expect(screen.queryByText('Mariana Silva')).not.toBeInTheDocument();
  });

  it('exibe os indicadores operacionais do painel (agendamentos, atendimentos, cancelamentos/faltas, ocupação) na Agenda', async () => {
    renderDashboard();

    const indicadores = await screen.findByTestId('indicadores-operacionais');
    expect(indicadores).toBeInTheDocument();
    expect(screen.getByTestId('indicador-agendamentos-dia')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-atendimentos-mes')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-cancelamentos-faltas')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-ocupacao-agenda')).toBeInTheDocument();
  });

  it('permite alternar para a aba Clientes e buscar cliente', async () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: /clientes/i }));

    expect(screen.getByRole('heading', { name: /gestão de clientes/i })).toBeInTheDocument();
    expect(await screen.findAllByText(/cliente recorrente/i)).not.toHaveLength(0);
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
    expect(screen.getByRole('button', { name: /novo serviço/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /editar/i }).length).toBeGreaterThan(0);
  });

  it('permite abrir o modal de cadastro através do botão Novo Serviço', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: /serviços/i }));

    const btnNovo = screen.getByRole('button', { name: /novo serviço/i });
    fireEvent.click(btnNovo);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cadastrar Novo Serviço')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cadastrar serviço/i })).toBeInTheDocument();

    // Fecha o modal
    const btnCancelar = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(btnCancelar);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('permite abrir o modal de edição pré-preenchido ao clicar em Editar', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: /serviços/i }));

    const botoesEditar = screen.getAllByRole('button', { name: /editar/i });
    expect(botoesEditar.length).toBeGreaterThan(0);
    fireEvent.click(botoesEditar[0]!);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Editar Serviço')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do Serviço/i)).toHaveValue('Massagem Relaxante');
    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeInTheDocument();
  });

  it('permite alternar para a aba Relatórios e exibe os 8 indicadores previstos', async () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: /relatórios/i }));

    expect(
      screen.getByRole('heading', { name: /relatórios e indicadores administrativos/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/1\. Agendamentos do Dia/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Clientes Cadastrados/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Clientes Recorrentes/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Atendimentos no Mês/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Cancelamentos e Faltas/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Ocupação da Agenda/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Valores Recebidos e Previstos/i)).toBeInTheDocument();
    expect(screen.getByText(/8\. Serviço Mais Agendado/i)).toBeInTheDocument();

    expect(screen.getByTestId('indicador-agendamentos-dia')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-clientes-cadastrados')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-clientes-recorrentes')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-atendimentos-mes')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-cancelamentos-faltas')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-ocupacao-agenda')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-valores-recebidos')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-servico-mais-agendado')).toBeInTheDocument();
  });

  it('mantém os cards financeiros e de serviços visíveis quando os indicadores são zero', async () => {
    const painelZerado = structuredClone(indicatorsFixture);
    painelZerado.indicadores.valoresRecebidosEPrevistos = {
      valorTotalRecebidoCentavos: 0,
      valorTotalPrevistoCentavos: 0,
      valorTotalRecebidoReais: 0,
      valorTotalPrevistoReais: 0,
      valorSinaisRetidosCentavos: 0,
      detalhe: 'R$ 0,00 recebidos, R$ 0,00 previstos',
    };
    painelZerado.indicadores.servicoMaisAgendado = {
      servicoId: null,
      nome: 'Nenhum atendimento registrado',
      totalAgendamentos: 0,
      detalhe: 'Sem atendimentos registrados no período',
      rankingTopServicos: [],
    };
    vi.spyOn(indicadoresAdminService, 'consultarPainelIndicadoresAdmin').mockResolvedValue(
      painelZerado,
    );

    renderDashboard();
    fireEvent.click(screen.getByRole('tab', { name: /relatórios/i }));

    await screen.findByTestId('indicador-valores-recebidos');

    const cardPagamentos = screen.getByTestId('indicador-valores-recebidos');
    const cardServicos = screen.getByTestId('indicador-servico-mais-agendado');
    expect(cardPagamentos).toBeVisible();
    expect(cardServicos).toBeVisible();
    await waitFor(() => {
      expect(cardPagamentos).toHaveTextContent('R$ 0');
      expect(cardServicos).toHaveTextContent('Nenhum atendimento registrado');
      expect(cardServicos).toHaveTextContent('0 agendamentos no período');
    });
  });

  it('permite alternar para a aba Configurações e exibe link para gestor de horários e formulário geral', async () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('tab', { name: /configurações/i }));

    expect(screen.getByRole('heading', { name: /configurações da clínica/i })).toBeInTheDocument();
    const linkHorarios = screen.getByRole('link', { name: /abrir gestor de horários/i });
    expect(linkHorarios).toBeInTheDocument();
    expect(linkHorarios).toHaveAttribute('href', '/admin/horarios');

    await waitFor(() => {
      expect(screen.getByText(/sinal de agendamento online/i)).toBeInTheDocument();
      expect(screen.getByText(/30%/i)).toBeInTheDocument();
    });
  });

  it('abre e fecha o modal de novo agendamento presencial', () => {
    renderDashboard();

    const botaoNovo = screen.getByRole('button', { name: /novo agendamento presencial/i });
    fireEvent.click(botaoNovo);

    expect(
      screen.getByRole('heading', { name: /novo agendamento administrativo/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/cliente cadastrado/i)).toBeRequired();
    expect(screen.queryByLabelText(/nome do cliente/i)).not.toBeInTheDocument();

    const botaoCancelar = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(botaoCancelar);

    expect(
      screen.queryByRole('heading', { name: /novo agendamento administrativo/i }),
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

  it('impede confirmação de agendamento pendente na agenda quando ficha exige liberação médica', async () => {
    const spyObterAnamnese = vi.spyOn(anamneseService, 'obterFichaAnamneseApi').mockResolvedValue({
      sucesso: true,
      dados: {
        ...INITIAL_ANAMNESE_DATA,
        consentimentoConfirmado: true,
        tratamentoOncologico: { resposta: true, detalhes: 'Quimioterapia' },
        clienteId: 'demo-client-4',
        submittedAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
        pontosAtencao: ['Tratamento Oncológico: Quimioterapia'],
        exigeLiberacaoMedica: true,
        contraindicacoes: ['Tratamento Oncológico: Quimioterapia'],
        liberacaoMedicaAprovada: false,
      },
    });
    const spyAtualizarStatus = vi.spyOn(agendamentosService, 'atualizarStatusAgendamentoBackend');

    renderDashboard();

    fireEvent.click(await screen.findByTestId('confirmar-agendamento-btn-ag-4'));

    const banner = await screen.findByTestId('agenda-feedback-banner');
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveTextContent(MENSAGEM_BLOQUEIO_CONTRAINDICACAO);
    expect(screen.getByRole('link', { name: /revisar ficha e liberação médica/i })).toHaveAttribute(
      'href',
      '/admin/clientes/demo-client-4',
    );
    expect(spyAtualizarStatus).not.toHaveBeenCalled();
    expect(await screen.findByTestId('agenda-item-ag-4')).toHaveTextContent('PENDENTE');

    spyObterAnamnese.mockRestore();
    spyAtualizarStatus.mockRestore();
  });

  it('permite confirmar agendamento pendente na agenda quando cliente tem liberação médica aprovada', async () => {
    const spyObterAnamnese = vi.spyOn(anamneseService, 'obterFichaAnamneseApi').mockResolvedValue({
      sucesso: true,
      dados: {
        ...INITIAL_ANAMNESE_DATA,
        consentimentoConfirmado: true,
        doencasCardiacas: { resposta: true, detalhes: 'Acompanhamento médico' },
        clienteId: 'demo-client-4',
        submittedAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-05T10:00:00.000Z',
        pontosAtencao: ['Cardíaco: Acompanhamento médico'],
        exigeLiberacaoMedica: true,
        contraindicacoes: ['Cardíaco: Acompanhamento médico'],
        liberacaoMedicaAprovada: true,
      },
    });
    const agendamentoConfirmado: SharedAgendamento = {
      id: 'ag-4',
      clienteId: 'demo-client-4',
      clienteNome: 'Carlos Eduardo',
      servicoId: 'srv-4',
      servicoNome: 'Liberação Miofascial',
      duracaoMinutos: 60,
      valorTotalEmCentavos: 17000,
      valorSinalEmCentavos: 5100,
      saldoRestanteEmCentavos: 11900,
      dataHoraInicio: '2026-10-22T15:30:00.000Z',
      dataHoraFim: '2026-10-22T16:30:00.000Z',
      intervaloAposMinutos: 30,
      profissionalId: 'prof-tais-romagnoli',
      profissionalNome: 'Tais Romagnoli',
      status: 'confirmado',
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      createdAt: '2026-10-20T10:00:00.000Z',
      updatedAt: '2026-10-20T10:05:00.000Z',
    };
    const spyAtualizarStatus = vi
      .spyOn(agendamentosService, 'atualizarStatusAgendamentoBackend')
      .mockResolvedValue({
        sucesso: true,
        dados: agendamentoConfirmado,
      });

    renderDashboard();

    fireEvent.click(await screen.findByTestId('confirmar-agendamento-btn-ag-4'));

    await waitFor(() => {
      expect(screen.getByTestId('agenda-item-ag-4')).toHaveTextContent('CONFIRMADO');
    });
    expect(screen.getByTestId('agenda-feedback-banner')).toHaveTextContent(
      /agendamento de carlos eduardo confirmado com sucesso/i,
    );

    spyObterAnamnese.mockRestore();
    spyAtualizarStatus.mockRestore();
  });

  it('exibe alerta de contraindicação e mantém modal presencial aberto quando cliente selecionado exige liberação médica', async () => {
    const spyObterAnamnese = vi.spyOn(anamneseService, 'obterFichaAnamneseApi').mockResolvedValue({
      sucesso: true,
      dados: {
        ...INITIAL_ANAMNESE_DATA,
        consentimentoConfirmado: true,
        problemasCirculatorios: { resposta: true, detalhes: 'Trombose prévia' },
        clienteId: 'demo-client-1',
        submittedAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
        pontosAtencao: ['Circulatório/Varizes: Trombose prévia'],
        exigeLiberacaoMedica: true,
        contraindicacoes: ['Circulatório/Trombose: Trombose prévia'],
        liberacaoMedicaAprovada: false,
      },
    });
    const spySolicitar = vi.spyOn(agendamentosService, 'criarAgendamentoApi');

    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /novo agendamento presencial/i }));

    await screen.findByRole('option', { name: 'Mariana Silva' });

    fireEvent.change(screen.getByLabelText(/cliente cadastrado/i), {
      target: { value: 'demo-client-1' },
    });

    const alertaModal = await screen.findByTestId('modal-presencial-bloqueio-alerta');
    expect(alertaModal).toHaveTextContent(/ficha exige liberação médica/i);

    const modal = screen.getByRole('dialog');
    const form = modal.querySelector('form')!;
    fireEvent.submit(form);

    const erroModal = await screen.findByTestId('modal-presencial-erro');
    expect(erroModal).toHaveTextContent(MENSAGEM_BLOQUEIO_CONTRAINDICACAO);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(spySolicitar).not.toHaveBeenCalled();

    spyObterAnamnese.mockRestore();
    spySolicitar.mockRestore();
  });

  it('impede criação de agendamento presencial com data ou horário no passado', async () => {
    const spySolicitar = vi.spyOn(agendamentosService, 'criarAgendamentoApi');

    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /novo agendamento presencial/i }));

    const inputDataHora = screen.getByLabelText(/data e horário/i);
    fireEvent.change(inputDataHora, { target: { value: '2020-01-01T10:00' } });

    const modal = screen.getByRole('dialog');
    const form = modal.querySelector('form')!;
    fireEvent.submit(form);

    const erroModal = await screen.findByTestId('modal-presencial-erro');
    expect(erroModal).toHaveTextContent(MENSAGEM_ERRO_DATA_PASSADA);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(spySolicitar).not.toHaveBeenCalled();

    spySolicitar.mockRestore();
  });

  it('permite alternar para a Fila de Lembretes pelo WhatsApp a partir da Agenda', async () => {
    renderDashboard();

    expect(await screen.findByText('Mariana Silva')).toBeInTheDocument();

    // Na Agenda de atendimentos, o botão da Fila de Lembretes está visível
    const btnToggleFila = screen.getByTestId('toggle-fila-lembretes-btn');
    expect(btnToggleFila).toHaveTextContent(/fila de lembretes whatsapp/i);

    // Clica para abrir a fila
    fireEvent.click(btnToggleFila);

    // O container da fila e os contatos pendentes são exibidos
    expect(
      await screen.findByRole('heading', { name: /fila de lembretes pelo whatsapp/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('fila-lembretes-whatsapp-container')).toBeInTheDocument();
    expect(screen.getByTestId('contador-pendentes')).toBeInTheDocument();
    expect(await screen.findByText('Mariana Silva')).toBeInTheDocument();

    // Clica no botão de voltar para os atendimentos
    const btnVoltar = screen.getByLabelText(/voltar para a agenda/i);
    fireEvent.click(btnVoltar);

    // Retorna para a visualização de atendimentos da agenda
    expect(screen.getByRole('heading', { name: /agenda de atendimentos/i })).toBeInTheDocument();
    expect(screen.queryByTestId('fila-lembretes-whatsapp-container')).not.toBeInTheDocument();
  });

  it('abre a Fila de Lembretes diretamente através da rota /admin/lembretes', async () => {
    renderDashboard('/admin/lembretes');

    expect(
      await screen.findByRole('heading', { name: /fila de lembretes pelo whatsapp/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('fila-lembretes-whatsapp-container')).toBeInTheDocument();
    expect(await screen.findByText('Mariana Silva')).toBeInTheDocument();
  });
});
