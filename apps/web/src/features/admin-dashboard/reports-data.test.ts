import { describe, expect, it } from 'vitest';
import type { Agendamento } from '@clinica/shared';
import type { AdminClientListItem } from './types';
import { montarTabelaRelatorio, serializarRelatorioCsv } from './reports-data';

const clientes: AdminClientListItem[] = [
  {
    id: 'cliente-1',
    nome: 'Ana Ribeiro',
    email: 'ana@example.com',
    telefone: '(11) 99999-0000',
    status: 'ativo',
    totalAtendimentosMes: 2,
  },
];

function agendamento(
  overrides: Partial<Agendamento> & Pick<Agendamento, 'id' | 'dataHoraInicio' | 'status'>,
): Agendamento {
  return {
    clienteId: 'cliente-1',
    clienteNome: 'Ana Ribeiro',
    servicoId: 'servico-1',
    servicoNome: 'Massagem relaxante',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 20000,
    valorSinalEmCentavos: 6000,
    saldoRestanteEmCentavos: 14000,
    dataHoraFim: '2026-11-10T11:00:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-1',
    profissionalNome: 'Tais Romagnoli',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('reports-data', () => {
  it('filtra a agenda pelo mês selecionado', () => {
    const novembro = agendamento({
      id: 'ag-nov',
      dataHoraInicio: '2026-11-10T10:00:00.000Z',
      status: 'confirmado',
    });
    const dezembro = agendamento({
      id: 'ag-dez',
      dataHoraInicio: '2026-12-10T10:00:00.000Z',
      status: 'confirmado',
    });

    const report = montarTabelaRelatorio('agenda', '2026-11', clientes, [novembro, dezembro]);

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]?.id).toBe('ag-nov');
    expect(report.rows[0]?.values).toContain('10/11/2026');
  });

  it('identifica recorrência por dois atendimentos concluídos no mesmo mês', () => {
    const appointments = [
      agendamento({ id: 'ag-1', dataHoraInicio: '2026-11-03T10:00:00.000Z', status: 'concluido' }),
      agendamento({
        id: 'ag-2',
        dataHoraInicio: '2026-10-31T10:00:00.000Z',
        concluidoEm: '2026-11-01T11:00:00.000Z',
        status: 'concluido',
      }),
      agendamento({ id: 'ag-3', dataHoraInicio: '2026-12-10T10:00:00.000Z', status: 'concluido' }),
    ];

    const report = montarTabelaRelatorio('recorrencia', '2026-11', clientes, appointments);

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]?.values).toEqual(['Ana Ribeiro', 'ana@example.com', '2026-11', 2]);
  });

  it('classifica recebido, previsto e sinal retido conforme os estados da agenda', () => {
    const appointments = [
      agendamento({
        id: 'ag-concluido',
        dataHoraInicio: '2026-11-03T10:00:00.000Z',
        status: 'concluido',
      }),
      agendamento({
        id: 'ag-confirmado',
        dataHoraInicio: '2026-11-10T10:00:00.000Z',
        status: 'confirmado',
      }),
      agendamento({
        id: 'ag-falta',
        dataHoraInicio: '2026-11-12T10:00:00.000Z',
        status: 'falta',
      }),
    ];

    const report = montarTabelaRelatorio('pagamentos', '2026-11', clientes, appointments);

    expect(
      report.rows.map((row) => [row.receivedCents, row.expectedCents, row.retainedCents]),
    ).toEqual([
      [20000, 0, 0],
      [0, 20000, 0],
      [6000, 0, 6000],
    ]);
  });

  it('protege valores iniciados por fórmula e escapa aspas no CSV', () => {
    const report = serializarRelatorioCsv(
      ['Nome', 'Observação'],
      [
        {
          id: '1',
          values: ['=1+1', 'Disse "olá"'],
          searchText: '',
          status: '',
        },
      ],
    );

    expect(report).toContain("'=1+1");
    expect(report).toContain('"Disse ""olá"""');
  });
});
