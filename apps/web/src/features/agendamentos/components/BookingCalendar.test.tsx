import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookingCalendar } from './BookingCalendar';

function renderCalendar(diasAtivosClinica: number[]) {
  render(
    <BookingCalendar
      dataSelecionada="2026-12-02"
      horarioSelecionado="10:00"
      horariosDisponiveis={['10:00']}
      diasAtivosClinica={diasAtivosClinica}
      onSelectData={vi.fn()}
      onSelectHorario={vi.fn()}
      onConfirmar={vi.fn()}
    />,
  );
}

describe('BookingCalendar', () => {
  it('desabilita os dias que não estão liberados na agenda da clínica', () => {
    renderCalendar([1, 3, 4, 5, 6]);

    expect(screen.getByTestId('dia-indisponivel-2026-12-01')).toHaveAttribute(
      'title',
      'Dia indisponível (Folga da clínica)',
    );
    expect(screen.getByTestId('dia-disponivel-2026-12-02')).toBeInTheDocument();
  });

  it('libera no calendário um dia da semana habilitado pela configuração da clínica', () => {
    renderCalendar([1, 2, 3, 4, 5, 6]);

    expect(screen.getByTestId('dia-disponivel-2026-12-01')).toBeInTheDocument();
  });
});
