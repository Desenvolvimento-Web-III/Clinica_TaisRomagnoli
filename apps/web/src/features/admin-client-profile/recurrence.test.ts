import { getRecurrenceSummary } from './recurrence';
import type { ClientAppointment } from './types';

const appointments: readonly ClientAppointment[] = [
  {
    id: 'appointment-1',
    serviceName: 'Massagem relaxante',
    startsAt: '2026-08-08T14:00:00-03:00',
    durationMinutes: 60,
    status: 'concluido',
  },
  {
    id: 'appointment-2',
    serviceName: 'Drenagem linfática',
    startsAt: '2026-08-22T15:00:00-03:00',
    durationMinutes: 60,
    status: 'concluido',
  },
  {
    id: 'appointment-3',
    serviceName: 'Massagem terapêutica',
    startsAt: '2026-09-03T16:00:00-03:00',
    durationMinutes: 60,
    status: 'cancelado',
  },
];

describe('getRecurrenceSummary', () => {
  it('considera recorrente quem concluiu ao menos dois atendimentos no mesmo mês', () => {
    expect(getRecurrenceSummary(appointments, '2026-08')).toEqual({
      recurring: true,
      completedAppointments: 2,
      referenceMonth: '2026-08',
    });
  });

  it('não conta atendimentos cancelados como recorrência', () => {
    expect(getRecurrenceSummary(appointments, '2026-09')).toMatchObject({
      recurring: false,
      completedAppointments: 0,
    });
  });
});
