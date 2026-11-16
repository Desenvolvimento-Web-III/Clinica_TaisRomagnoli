import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  AdminIndicadoresOperacionais,
  type AdminIndicadoresOperacionaisProps,
} from './AdminIndicadoresOperacionais.js';

const mockIndicadoresOperacionais: AdminIndicadoresOperacionaisProps['indicadores'] = {
  agendamentosDoDia: {
    total: 8,
    concluidos: 5,
    pendentes: 3,
    emAndamento: 0,
    cancelados: 1,
    detalhe: '5 concluídos, 3 pendentes',
  },
  atendimentosRealizadosMes: {
    total: 42,
    totalMinutos: 2520,
    detalhe: 'Sessões concluídas',
  },
  cancelamentosEFaltas: {
    totalCancelamentos: 4,
    cancelamentosNoPrazo: 3,
    cancelamentosTardios: 1,
    faltas: 1,
    taxaCancelamentoPercentual: 7.1,
    detalhe: '3 com aviso ≥ 3h, 1 falta',
  },
  ocupacaoAgenda: {
    taxaOcupacaoPercentual: 84,
    slotsOcupados: 42,
    slotsDisponiveis: 50,
    metaOcupacaoPercentual: 80,
    metaSuperada: true,
    detalhe: 'Meta mensal de 80% superada',
  },
};

describe('AdminIndicadoresOperacionais Component', () => {
  it('renderiza os 4 cartões de indicadores operacionais', () => {
    render(<AdminIndicadoresOperacionais indicadores={mockIndicadoresOperacionais} />);

    expect(screen.getByTestId('indicadores-operacionais')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-agendamentos-dia')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-atendimentos-mes')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-cancelamentos-faltas')).toBeInTheDocument();
    expect(screen.getByTestId('indicador-ocupacao-agenda')).toBeInTheDocument();
  });

  it('exibe as métricas de agendamentos do dia', () => {
    render(<AdminIndicadoresOperacionais indicadores={mockIndicadoresOperacionais} />);

    const card = screen.getByTestId('indicador-agendamentos-dia');
    expect(within(card).getByText('Agendamentos do Dia')).toBeInTheDocument();
    expect(within(card).getByText('8')).toBeInTheDocument();
    expect(within(card).getByText(/5 concluídos/i)).toBeInTheDocument();
    expect(within(card).getByText(/3 pendentes/i)).toBeInTheDocument();
  });

  it('exibe total de atendimentos do mês e conversão de minutos em horas', () => {
    render(<AdminIndicadoresOperacionais indicadores={mockIndicadoresOperacionais} />);

    const card = screen.getByTestId('indicador-atendimentos-mes');
    expect(within(card).getByText('Atendimentos no Mês')).toBeInTheDocument();
    expect(within(card).getByText('42')).toBeInTheDocument();
    expect(within(card).getByText(/42h/)).toBeInTheDocument();
    expect(within(card).getByText(/2520 min/)).toBeInTheDocument();
  });

  it('exibe métricas de cancelamentos, faltas e taxa percentual', () => {
    render(<AdminIndicadoresOperacionais indicadores={mockIndicadoresOperacionais} />);

    const card = screen.getByTestId('indicador-cancelamentos-faltas');
    expect(within(card).getByText('Cancelamentos e Faltas')).toBeInTheDocument();
    expect(within(card).getByText('7.1% taxa')).toBeInTheDocument();
    expect(within(card).getByText('5')).toBeInTheDocument(); // totalCancelamentos + faltas (4 + 1)
    expect(within(card).getByText('3')).toBeInTheDocument(); // cancelamentosNoPrazo
    expect(within(card).getByText('2')).toBeInTheDocument(); // cancelamentosTardios + faltas (1 + 1)
  });

  it('exibe indicador de ocupação com meta superada quando aplicável', () => {
    render(<AdminIndicadoresOperacionais indicadores={mockIndicadoresOperacionais} />);

    const card = screen.getByTestId('indicador-ocupacao-agenda');
    expect(within(card).getByText('Ocupação da Agenda')).toBeInTheDocument();
    expect(within(card).getByText('84%')).toBeInTheDocument();
    expect(within(card).getByText('Meta Superada')).toBeInTheDocument();
    expect(within(card).getByText(/slots mensais/)).toBeInTheDocument();
  });

  it('exibe status "Abaixo da Meta" quando a ocupação for inferior a 80%', () => {
    const abaixoDaMeta = {
      ...mockIndicadoresOperacionais,
      ocupacaoAgenda: {
        ...mockIndicadoresOperacionais.ocupacaoAgenda,
        taxaOcupacaoPercentual: 65,
        metaSuperada: false,
      },
    };

    render(<AdminIndicadoresOperacionais indicadores={abaixoDaMeta} />);

    const card = screen.getByTestId('indicador-ocupacao-agenda');
    expect(within(card).getByText('65%')).toBeInTheDocument();
    expect(within(card).getByText('Abaixo da Meta')).toBeInTheDocument();
  });

  it('renderiza skeleton de carregamento quando isLoading for true', () => {
    render(
      <AdminIndicadoresOperacionais indicadores={mockIndicadoresOperacionais} isLoading={true} />,
    );

    expect(screen.getByTestId('indicadores-operacionais-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('indicadores-operacionais')).not.toBeInTheDocument();
  });
});
