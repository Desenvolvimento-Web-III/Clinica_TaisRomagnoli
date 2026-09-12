import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AdministrativeClientProfile } from '@/features/admin-client-profile/types';
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
});
