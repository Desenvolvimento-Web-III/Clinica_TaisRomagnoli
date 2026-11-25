import { useMemo, useState } from 'react';
import type { Agendamento } from '@clinica/shared';

type CalendarView = 'week' | 'month';

interface AdminAgendaCalendarioProps {
  agendamentos: Agendamento[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEditAppointment?: (appointment: Agendamento) => void;
}

const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateAtNoon(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  return copy;
}

function getStartOfWeek(date: Date): Date {
  const start = dateAtNoon(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function getMonthGrid(date: Date): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const start = getStartOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function getAppointmentDateKey(appointment: Agendamento): string | null {
  const date = new Date(appointment.dataHoraInicio);
  return Number.isNaN(date.getTime()) ? null : toDateKey(date);
}

function getAppointmentTime(appointment: Agendamento): string {
  const date = new Date(appointment.dataHoraInicio);
  return Number.isNaN(date.getTime())
    ? '--:--'
    : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatPeriod(date: Date, view: CalendarView): string {
  if (view === 'month') {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
  }

  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
    start,
  );
  const endLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(end);
  return `${startLabel} – ${endLabel}`;
}

export function AdminAgendaCalendario({
  agendamentos,
  isLoading,
  error,
  onRefresh,
  onEditAppointment,
}: AdminAgendaCalendarioProps) {
  const [view, setView] = useState<CalendarView>('week');
  const [periodDate, setPeriodDate] = useState(() => dateAtNoon(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const todayKey = toDateKey(new Date());

  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, Agendamento[]>();
    for (const appointment of agendamentos) {
      const key = getAppointmentDateKey(appointment);
      if (!key) continue;
      const items = grouped.get(key) ?? [];
      items.push(appointment);
      grouped.set(key, items);
    }
    for (const items of grouped.values()) {
      items.sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));
    }
    return grouped;
  }, [agendamentos]);

  const calendarDays = useMemo(() => {
    if (view === 'month') return getMonthGrid(periodDate);
    const start = getStartOfWeek(periodDate);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [periodDate, view]);

  const selectedAppointments = appointmentsByDate.get(selectedDate) ?? [];

  const navigatePeriod = (direction: -1 | 1) => {
    setPeriodDate((current) => {
      const next = dateAtNoon(current);
      if (view === 'week') next.setDate(next.getDate() + 7 * direction);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const selectView = (nextView: CalendarView) => {
    setView(nextView);
    setPeriodDate(new Date(`${selectedDate}T12:00:00`));
  };

  const selectToday = () => {
    const today = dateAtNoon(new Date());
    setPeriodDate(today);
    setSelectedDate(toDateKey(today));
  };

  return (
    <section
      aria-labelledby="admin-calendar-title"
      className="space-y-4"
      data-testid="admin-calendar"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="admin-calendar-title"
            className="text-lg font-bold text-[var(--color-text-primary)]"
          >
            Calendário da agenda
          </h2>
          <p
            data-testid="calendar-period-title"
            className="text-sm capitalize text-[var(--color-text-secondary)]"
          >
            {formatPeriod(periodDate, view)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-[var(--color-canvas-neutral)] p-1">
            <button
              type="button"
              aria-pressed={view === 'week'}
              data-testid="agenda-view-week"
              onClick={() => selectView('week')}
              className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${view === 'week' ? 'bg-white text-[var(--color-brand-deep)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
            >
              Semana
            </button>
            <button
              type="button"
              aria-pressed={view === 'month'}
              data-testid="agenda-view-month"
              onClick={() => selectView('month')}
              className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${view === 'month' ? 'bg-white text-[var(--color-brand-deep)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
            >
              Mês
            </button>
          </div>
          <button
            type="button"
            onClick={selectToday}
            className="min-h-10 rounded-xl border border-[var(--color-border-default)] px-3 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-canvas-neutral)]"
          >
            Hoje
          </button>
          <button
            type="button"
            aria-label="Período anterior"
            onClick={() => navigatePeriod(-1)}
            className="min-h-10 min-w-10 rounded-xl border border-[var(--color-border-default)] text-lg font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-canvas-neutral)]"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próximo período"
            onClick={() => navigatePeriod(1)}
            className="min-h-10 min-w-10 rounded-xl border border-[var(--color-border-default)] text-lg font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-canvas-neutral)]"
          >
            ›
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="min-h-10 rounded-xl border border-[var(--color-border-default)] px-3 text-sm font-semibold text-[var(--color-brand-deep)] hover:bg-[var(--color-brand-soft)] disabled:opacity-60"
          >
            {isLoading ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)]">
          {NOMES_DIAS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-bold text-[var(--color-text-secondary)]"
            >
              {day}
            </div>
          ))}
        </div>
        <div className={`grid grid-cols-7 ${view === 'month' ? '' : 'min-h-44'}`}>
          {calendarDays.map((day) => {
            const key = toDateKey(day);
            const count = appointmentsByDate.get(key)?.length ?? 0;
            const outsideMonth = day.getMonth() !== periodDate.getMonth();
            const selected = key === selectedDate;
            const today = key === todayKey;
            return (
              <button
                type="button"
                key={key}
                data-testid={`calendar-day-${key}`}
                aria-label={`${day.toLocaleDateString('pt-BR', { dateStyle: 'full' })}, ${count} agendamentos`}
                aria-pressed={selected}
                onClick={() => {
                  setSelectedDate(key);
                  if (outsideMonth) setPeriodDate(dateAtNoon(day));
                }}
                className={`relative flex min-h-16 flex-col items-center border-b border-r border-[var(--color-border-default)] p-1.5 text-sm sm:min-h-20 sm:items-start sm:p-2 ${selected ? 'bg-[var(--color-brand-soft)] ring-2 ring-inset ring-[var(--color-brand-primary)]' : 'hover:bg-[var(--color-canvas-neutral)]'} ${outsideMonth ? 'text-slate-400' : 'text-[var(--color-text-primary)]'}`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full font-semibold ${today ? 'bg-[var(--color-brand-deep)] text-white' : ''}`}
                >
                  {day.getDate()}
                </span>
                {count > 0 && (
                  <span className="mt-1 rounded-full bg-[var(--color-brand-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-brand-deep)] sm:text-xs">
                    {count} {count === 1 ? 'agendamento' : 'agendamentos'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section aria-labelledby="selected-calendar-day" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3
            id="selected-calendar-day"
            className="font-bold capitalize text-[var(--color-text-primary)]"
          >
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {selectedAppointments.length}{' '}
            {selectedAppointments.length === 1 ? 'atendimento' : 'atendimentos'}
          </span>
        </div>

        {isLoading ? (
          <p
            role="status"
            className="rounded-xl border bg-white p-5 text-center text-sm text-[var(--color-text-secondary)]"
          >
            Carregando agenda consolidada…
          </p>
        ) : selectedAppointments.length === 0 ? (
          <p
            data-testid="calendar-day-empty"
            className="rounded-xl border border-dashed border-[var(--color-border-default)] bg-white p-5 text-center text-sm text-[var(--color-text-secondary)]"
          >
            Nenhum agendamento neste dia.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedAppointments.map((appointment) => (
              <article
                key={appointment.id}
                data-testid={`calendar-appointment-${appointment.id}`}
                className="flex flex-col gap-2 rounded-xl border border-[var(--color-border-default)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-[var(--color-brand-soft)] px-2.5 py-1.5 text-sm font-bold text-[var(--color-brand-deep)]">
                    {getAppointmentTime(appointment)}
                  </span>
                  <div>
                    <p className="font-bold text-[var(--color-text-primary)]">
                      {appointment.clienteNome}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {appointment.servicoNome} · {appointment.duracaoMinutos} min
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-fit rounded-full border border-[var(--color-border-default)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--color-text-secondary)]">
                    {appointment.status.replace('_', ' ')}
                  </span>
                  {onEditAppointment &&
                    appointment.status !== 'cancelado' &&
                    appointment.status !== 'concluido' && (
                      <button
                        type="button"
                        data-testid={`editar-agendamento-${appointment.id}`}
                        onClick={() => onEditAppointment(appointment)}
                        className="min-h-9 rounded-lg border border-[var(--color-border-default)] px-3 text-xs font-semibold text-[var(--color-brand-deep)] hover:bg-[var(--color-brand-soft)]"
                      >
                        Editar / reagendar
                      </button>
                    )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
