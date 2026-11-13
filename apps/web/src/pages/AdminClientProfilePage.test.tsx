import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { INITIAL_ANAMNESE_DATA, MENSAGEM_BLOQUEIO_CONTRAINDICACAO } from '@clinica/shared';
import type { AdministrativeClientProfile } from '@/features/admin-client-profile/types';
import * as clientesAdminService from '@/services/clientes-admin-service';
import { AdminClientProfilePage } from './AdminClientProfilePage';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    currentUser: { uid: 'admin-1', displayName: 'Tais Romagnoli' },
    isAuthReady: true,
    logout: vi.fn(),
  }),
  useOptionalAuth: () => ({
    currentUser: { uid: 'admin-1', displayName: 'Tais Romagnoli' },
    isAuthReady: true,
    logout: vi.fn(),
  }),
}));

const profile: AdministrativeClientProfile = {
  id: 'client-1',
  fullName: 'Cliente de Teste',
  email: 'cliente@exemplo.com',
  phone: '(11) 99999-9999',
  birthDate: '1990-01-15',
  status: 'ativo',
  registeredAt: '2026-01-02T12:00:00-03:00',
  appointments: [
    {
      id: 'appointment-1',
      serviceName: 'Massagem relaxante',
      startsAt: '2026-08-10T12:00:00-03:00',
      durationMinutes: 60,
      status: 'concluido',
    },
    {
      id: 'appointment-2',
      serviceName: 'Drenagem linfática',
      startsAt: '2026-08-20T12:00:00-03:00',
      durationMinutes: 60,
      status: 'concluido',
    },
  ],
  payments: [
    {
      id: 'payment-1',
      description: 'Sinal — Massagem relaxante',
      amountInCents: 3600,
      dueAt: '2026-08-08T12:00:00-03:00',
      paidAt: '2026-08-08T12:00:00-03:00',
      status: 'pago',
    },
  ],
  anamnesis: {
    submittedAt: '2026-01-02T12:00:00-03:00',
    updatedAt: '2026-08-10T12:00:00-03:00',
    consentConfirmed: true,
    attentionPoints: ['Sensibilidade cervical'],
    notes: 'Pressão moderada.',
  },
};

describe('AdminClientProfilePage', () => {
  const renderPage = (pageProfile: AdministrativeClientProfile) =>
    render(<AdminClientProfilePage profile={pageProfile} />, { wrapper: MemoryRouter });

  it('exibe cadastro, histórico, recorrência, pagamentos e anamnese', () => {
    renderPage(profile);

    expect(screen.getByRole('heading', { name: 'Cliente de Teste' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cadastro' })).toBeInTheDocument();
    expect(screen.getByText('15 de jan. de 1990')).toBeInTheDocument();
    expect(screen.getByText('Cliente recorrente')).toBeInTheDocument();

    const history = screen
      .getByRole('heading', { name: 'Histórico de atendimentos' })
      .closest('section');
    expect(history).not.toBeNull();
    expect(within(history!).getByText('Massagem relaxante')).toBeInTheDocument();

    const payments = screen.getByRole('heading', { name: 'Pagamentos' }).closest('section');
    expect(payments).not.toBeNull();
    expect(within(payments!).getByText('R$ 36,00')).toBeInTheDocument();

    const anamnesis = screen.getByRole('heading', { name: 'Anamnese' }).closest('section');
    expect(anamnesis).not.toBeNull();
    expect(within(anamnesis!).getByText('Sensibilidade cervical')).toBeInTheDocument();
  });

  it('informa quando ainda não existe anamnese', () => {
    renderPage({ ...profile, anamnesis: null });

    expect(
      screen.getByText('O cliente ainda não preencheu a ficha de anamnese.'),
    ).toBeInTheDocument();
  });

  it('exibe contraindicações, bloqueia confirmação pendente e permite aprovar e revogar liberação médica', async () => {
    const mockAtualizar = vi
      .fn()
      .mockResolvedValueOnce({
        sucesso: true,
        dados: {
          ...INITIAL_ANAMNESE_DATA,
          consentimentoConfirmado: true,
          doencasCardiacas: { resposta: true, detalhes: 'Arritmia controlada' },
          clienteId: 'client-1',
          submittedAt: '2026-01-02T12:00:00-03:00',
          updatedAt: '2026-08-15T10:00:00-03:00',
          pontosAtencao: ['Cardíaco: Arritmia controlada'],
          exigeLiberacaoMedica: true,
          contraindicacoes: ['Cardíaco: Arritmia controlada'],
          liberacaoMedicaAprovada: true,
          liberacaoMedicaAprovadaEm: '2026-08-15T10:00:00-03:00',
          liberacaoMedicaAprovadaPor: 'admin-1',
          liberacaoMedicaObservacoes: 'Atestado cardiológico validado',
        },
      })
      .mockResolvedValueOnce({
        sucesso: true,
        dados: {
          ...INITIAL_ANAMNESE_DATA,
          consentimentoConfirmado: true,
          doencasCardiacas: { resposta: true, detalhes: 'Arritmia controlada' },
          clienteId: 'client-1',
          submittedAt: '2026-01-02T12:00:00-03:00',
          updatedAt: '2026-08-16T10:00:00-03:00',
          pontosAtencao: ['Cardíaco: Arritmia controlada'],
          exigeLiberacaoMedica: true,
          contraindicacoes: ['Cardíaco: Arritmia controlada'],
          liberacaoMedicaAprovada: false,
          liberacaoMedicaObservacoes: 'Aguardando renovação do atestado',
        },
      });

    const profileBloqueado: AdministrativeClientProfile = {
      ...profile,
      appointments: [
        ...profile.appointments,
        {
          id: 'appointment-pendente',
          serviceName: 'Drenagem linfática',
          startsAt: '2026-09-10T14:00:00-03:00',
          durationMinutes: 60,
          status: 'pendente',
        },
      ],
      anamnesis: {
        ...profile.anamnesis!,
        exigeLiberacaoMedica: true,
        contraindicacoes: ['Cardíaco: Arritmia controlada'],
        liberacaoMedicaAprovada: false,
      },
    };

    render(
      <AdminClientProfilePage
        profile={profileBloqueado}
        onAtualizarLiberacaoMedica={mockAtualizar}
      />,
      { wrapper: MemoryRouter },
    );

    expect(screen.getByTestId('status-liberacao-medica')).toHaveTextContent(
      /bloqueado — aguarda liberação médica/i,
    );
    expect(screen.getByText('Cardíaco: Arritmia controlada')).toBeInTheDocument();

    // Tentar confirmar agendamento pendente enquanto bloqueado exibe alerta e não altera status
    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_BLOQUEIO_CONTRAINDICACAO);

    // Aprovar liberação médica com observações
    const textarea = screen.getByLabelText(/observações da liberação médica/i);
    fireEvent.change(textarea, { target: { value: 'Atestado cardiológico validado' } });
    fireEvent.click(screen.getByRole('button', { name: /aprovar liberação médica/i }));

    await waitFor(() => {
      expect(mockAtualizar).toHaveBeenCalledWith({
        clienteId: 'client-1',
        aprovada: true,
        observacoes: 'Atestado cardiológico validado',
        exigeLiberacaoMedica: true,
      });
    });

    expect(await screen.findByTestId('status-liberacao-medica')).toHaveTextContent(
      /liberação médica aprovada/i,
    );

    // Revogar liberação médica
    fireEvent.change(textarea, { target: { value: 'Aguardando renovação do atestado' } });
    fireEvent.click(screen.getByRole('button', { name: /revogar liberação médica/i }));

    await waitFor(() => {
      expect(screen.getByTestId('status-liberacao-medica')).toHaveTextContent(
        /bloqueado — aguarda liberação médica/i,
      );
    });
  });

  it('carrega perfil completo do cliente via parâmetro clientId da rota', async () => {
    const spyBuscarPerfil = vi
      .spyOn(clientesAdminService, 'buscarPerfilClienteAdmin')
      .mockResolvedValue({
        ...profile,
        id: 'cli-99',
        fullName: 'Helena Costa',
        anamnesis: {
          ...profile.anamnesis!,
          exigeLiberacaoMedica: true,
          contraindicacoes: ['Circulatório/Trombose: Trombose prévia'],
          liberacaoMedicaAprovada: false,
        },
      });

    render(
      <MemoryRouter initialEntries={['/admin/clientes/cli-99']}>
        <Routes>
          <Route path="/admin/clientes/:clientId" element={<AdminClientProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Helena Costa' })).toBeInTheDocument();
    expect(screen.getByText('Circulatório/Trombose: Trombose prévia')).toBeInTheDocument();
    spyBuscarPerfil.mockRestore();
  });
});
