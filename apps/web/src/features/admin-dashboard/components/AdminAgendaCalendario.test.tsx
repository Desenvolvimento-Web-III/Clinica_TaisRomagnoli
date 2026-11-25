import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Agendamento } from '@clinica/shared';
import { AdminAgendaCalendario } from './AdminAgendaCalendario';

function agendamentoHoje(): Agendamento {
  const inicio = new Date();
  inicio.setHours(10, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setHours(11, 0, 0, 0);
  return {
    id: 'booking-today',
    clienteId: 'client-1',
    clienteNome: 'Cliente do Firestore',
    clienteEmail: 'cliente@example.com',
    clienteTelefone: '(11) 99999-0000',
    servicoId: 'service-1',
    servicoNome: 'Consulta de teste',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 10000,
    valorSinalEmCentavos: 3000,
    saldoRestanteEmCentavos: 7000,
    dataHoraInicio: inicio.toISOString(),
    dataHoraFim: fim.toISOString(),
    intervaloAposMinutos: 0,
    profissionalId: 'profissional-1',
    profissionalNome: 'Profissional',
    status: 'confirmado',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: inicio.toISOString(),
    updatedAt: inicio.toISOString(),
  };
}

describe('AdminAgendaCalendario', () => {
  it('exibe a visão semanal com os atendimentos do dia selecionado', () => {
    render(
      <AdminAgendaCalendario
        agendamentos={[agendamentoHoje()]}
        isLoading={false}
        error={null}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId(/^calendar-day-\d{4}-/)).toHaveLength(7);
    expect(screen.getByTestId('calendar-appointment-booking-today')).toHaveTextContent(
      'Cliente do Firestore',
    );
  });

  it('alterna para a visão mensal e permite navegar para o mês seguinte', () => {
    render(
      <AdminAgendaCalendario
        agendamentos={[]}
        isLoading={false}
        error={null}
        onRefresh={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mês' }));
    expect(screen.getAllByTestId(/^calendar-day-\d{4}-/)).toHaveLength(42);
    const periodBefore = screen.getByTestId('calendar-period-title').textContent;

    fireEvent.click(screen.getByRole('button', { name: 'Próximo período' }));

    expect(screen.getByTestId('calendar-period-title').textContent).not.toBe(periodBefore);
  });
});
