import { describe, expect, it } from 'vitest';
import type { AdminReservation, FixedBlock, RecurringBlock, ScheduleDocument } from './schedule.js';

describe('Modelos de bloqueio e recorrência de agenda (schedule)', () => {
  it('suporta bloqueio fixo com carimbo de tempo ISO 8601', () => {
    const fixedBlock: FixedBlock = {
      id: 'block-feriado-1',
      resourceId: 'prof-tais-romagnoli',
      title: 'Feriado Municipal',
      createdBy: 'admin-tais',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
      start: '2026-11-15T00:00:00.000Z',
      end: '2026-11-15T23:59:59.000Z',
      isReservation: false,
    };

    expect(fixedBlock.id).toBe('block-feriado-1');
    expect(fixedBlock.isReservation).toBe(false);
  });

  it('suporta bloqueio recorrente com regra RRULE e objeto Timestamp compatível com Firestore', () => {
    const firestoreTimestamp = {
      seconds: 1793966400,
      nanoseconds: 0,
      toDate: () => new Date(1793966400 * 1000),
    };

    const recurringBlock: RecurringBlock = {
      id: 'rec-almoco',
      resourceId: 'prof-tais-romagnoli',
      title: 'Intervalo de Almoço',
      createdBy: 'admin-tais',
      createdAt: firestoreTimestamp,
      updatedAt: firestoreTimestamp,
      start: '2026-11-06T12:00:00.000Z',
      end: '2026-11-06T13:00:00.000Z',
      rrule: {
        frequency: 'WEEKLY',
        interval: 1,
        byDay: [1, 3, 4, 5, 6],
      },
      exceptionDates: ['2026-12-25T12:00:00.000Z'],
    };

    expect(recurringBlock.rrule.frequency).toBe('WEEKLY');
    expect(recurringBlock.rrule.byDay).toEqual([1, 3, 4, 5, 6]);
  });

  it('suporta reserva administrativa como união discriminada em ScheduleDocument', () => {
    const adminReservation: AdminReservation = {
      id: 'res-manutencao-1',
      resourceId: 'sala-principal',
      title: 'Higienização Profunda',
      createdBy: 'admin-tais',
      createdAt: '2026-11-06T08:00:00.000Z',
      updatedAt: '2026-11-06T08:00:00.000Z',
      start: '2026-11-10T18:00:00.000Z',
      end: '2026-11-10T19:00:00.000Z',
      isReservation: true,
      reasonCode: 'MAINTENANCE',
      notes: 'Higienização mensal de equipamentos',
    };

    const doc: ScheduleDocument = adminReservation;
    expect(doc.title).toBe('Higienização Profunda');
    expect((doc as AdminReservation).reasonCode).toBe('MAINTENANCE');
  });
});
