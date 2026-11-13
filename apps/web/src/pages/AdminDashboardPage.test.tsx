import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { User } from 'firebase/auth';
import {
  DEFAULT_CLINIC_SETTINGS,
  INITIAL_ANAMNESE_DATA,
  MENSAGEM_BLOQUEIO_CONTRAINDICACAO,
  type Agendamento as SharedAgendamento,
} from '@clinica/shared';
import * as anamneseService from '@/services/anamnese-service';
import * as agendamentosService from '@/services/agendamentos-service';
import * as settingsService from '@/services/clinic-settings-service';
import { AdminDashboardPage } from './AdminDashboardPage';
import { useAuth } from '@/features/auth/auth-context';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

describe('AdminDashboardPage', () => {
  const mockLogout = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(settingsService, 'buscarConfiguracoesGerais').mockResolvedValue(
      DEFAULT_CLINIC_SETTINGS,
    );
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

    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn-ag-4'));

    const banner = await screen.findByTestId('agenda-feedback-banner');
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveTextContent(MENSAGEM_BLOQUEIO_CONTRAINDICACAO);
    expect(screen.getByRole('link', { name: /revisar ficha e liberação médica/i })).toHaveAttribute(
      'href',
      '/admin/clientes/demo-client-4',
    );
    expect(spyAtualizarStatus).not.toHaveBeenCalled();
    expect(screen.getByTestId('agenda-item-ag-4')).toHaveTextContent('PENDENTE');

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

    fireEvent.click(screen.getByTestId('confirmar-agendamento-btn-ag-4'));

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
    const spySolicitar = vi.spyOn(agendamentosService, 'solicitarAgendamentoBackend');

    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /novo agendamento presencial/i }));

    fireEvent.change(screen.getByLabelText(/cliente cadastrado/i), {
      target: { value: 'demo-client-1' },
    });

    const alertaModal = await screen.findByTestId('modal-presencial-bloqueio-alerta');
    expect(alertaModal).toHaveTextContent(/ficha exige liberação médica/i);

    const modal = screen.getByRole('dialog');
    fireEvent.click(within(modal).getByRole('button', { name: /confirmar agendamento/i }));

    const erroModal = await screen.findByTestId('modal-presencial-erro');
    expect(erroModal).toHaveTextContent(MENSAGEM_BLOQUEIO_CONTRAINDICACAO);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(spySolicitar).not.toHaveBeenCalled();

    spyObterAnamnese.mockRestore();
    spySolicitar.mockRestore();
  });
});
