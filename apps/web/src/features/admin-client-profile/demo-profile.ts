import type { AdministrativeClientProfile } from './types';

/** Dados inteiramente fictícios para validação local da interface. */
export const demoAdministrativeClientProfile: AdministrativeClientProfile = {
  id: 'cliente-demonstracao',
  fullName: 'Mariana Oliveira',
  email: 'mariana.exemplo@exemplo.com',
  phone: '(11) 99999-0000',
  birthDate: '1992-04-18',
  status: 'ativo',
  registeredAt: '2026-06-12T10:20:00-03:00',
  appointments: [
    {
      id: 'atendimento-3',
      serviceName: 'Massagem terapêutica',
      startsAt: '2026-09-10T15:00:00-03:00',
      durationMinutes: 60,
      status: 'agendado',
    },
    {
      id: 'atendimento-2',
      serviceName: 'Drenagem linfática',
      startsAt: '2026-08-22T14:30:00-03:00',
      durationMinutes: 60,
      status: 'concluido',
    },
    {
      id: 'atendimento-1',
      serviceName: 'Massagem relaxante',
      startsAt: '2026-08-08T10:00:00-03:00',
      durationMinutes: 60,
      status: 'concluido',
    },
  ],
  payments: [
    {
      id: 'pagamento-2',
      description: 'Sinal — Massagem terapêutica',
      amountInCents: 4200,
      dueAt: '2026-09-08T23:59:00-03:00',
      status: 'pendente',
    },
    {
      id: 'pagamento-1',
      description: 'Sessão — Drenagem linfática',
      amountInCents: 13000,
      dueAt: '2026-08-22T14:30:00-03:00',
      paidAt: '2026-08-22T15:40:00-03:00',
      status: 'pago',
    },
  ],
  anamnesis: {
    submittedAt: '2026-06-12T10:35:00-03:00',
    updatedAt: '2026-08-08T09:45:00-03:00',
    consentConfirmed: true,
    attentionPoints: ['Sensibilidade na região cervical', 'Preferência por pressão moderada'],
    notes:
      'Cliente orientada a informar qualquer desconforto durante a sessão. Dados demonstrativos.',
  },
};
