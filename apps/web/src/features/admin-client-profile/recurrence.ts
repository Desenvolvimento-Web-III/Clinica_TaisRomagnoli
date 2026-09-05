import type { ClientAppointment } from './types';

export type RecurrenceSummary = Readonly<{
  recurring: boolean;
  completedAppointments: number;
  referenceMonth: string;
}>;

export function getRecurrenceSummary(
  appointments: readonly ClientAppointment[],
  referenceMonth: string,
): RecurrenceSummary {
  const completedAppointments = appointments.filter(
    (appointment) =>
      appointment.status === 'concluido' && appointment.startsAt.slice(0, 7) === referenceMonth,
  ).length;

  return {
    recurring: completedAppointments >= 2,
    completedAppointments,
    referenceMonth,
  };
}
