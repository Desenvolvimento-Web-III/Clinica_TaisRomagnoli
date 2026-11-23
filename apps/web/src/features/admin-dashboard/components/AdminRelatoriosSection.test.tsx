import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Agendamento } from '@clinica/shared';
import type { AdminClientListItem } from '../types';
import { AdminRelatoriosSection } from './AdminRelatoriosSection';

const clients: AdminClientListItem[] = [
  {
    id: 'cliente-1',
    nome: 'Ana Ribeiro',
    email: 'ana@example.com',
    telefone: '(11) 99999-0000',
    status: 'ativo',
    totalAtendimentosMes: 2,
  },
];

const appointments: Agendamento[] = [
  {
    id: 'ag-1',
    clienteId: 'cliente-1',
    clienteNome: 'Ana Ribeiro',
    servicoId: 'servico-1',
    servicoNome: 'Massagem relaxante',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 20000,
    valorSinalEmCentavos: 6000,
    saldoRestanteEmCentavos: 14000,
    dataHoraInicio: '2026-11-03T10:00:00.000Z',
    dataHoraFim: '2026-11-03T11:00:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-1',
    profissionalNome: 'Tais Romagnoli',
    status: 'concluido',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-03T11:00:00.000Z',
  },
  {
    id: 'ag-2',
    clienteId: 'cliente-1',
    clienteNome: 'Ana Ribeiro',
    servicoId: 'servico-1',
    servicoNome: 'Massagem relaxante',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 20000,
    valorSinalEmCentavos: 6000,
    saldoRestanteEmCentavos: 14000,
    dataHoraInicio: '2026-11-10T10:00:00.000Z',
    dataHoraFim: '2026-11-10T11:00:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-1',
    profissionalNome: 'Tais Romagnoli',
    status: 'confirmado',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'ag-3',
    clienteId: 'cliente-1',
    clienteNome: 'Ana Ribeiro',
    servicoId: 'servico-1',
    servicoNome: 'Massagem relaxante',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 20000,
    valorSinalEmCentavos: 6000,
    saldoRestanteEmCentavos: 14000,
    dataHoraInicio: '2026-11-17T10:00:00.000Z',
    dataHoraFim: '2026-11-17T11:00:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-1',
    profissionalNome: 'Tais Romagnoli',
    status: 'concluido',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-17T11:00:00.000Z',
  },
];

describe('AdminRelatoriosSection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('filtra a agenda por mês, status e texto', () => {
    render(<AdminRelatoriosSection clients={clients} appointments={appointments} />);

    fireEvent.change(screen.getByLabelText('Mês de referência do relatório'), {
      target: { value: '2026-11' },
    });
    fireEvent.change(screen.getByLabelText('Status do relatório'), {
      target: { value: 'confirmado' },
    });
    fireEvent.change(screen.getByLabelText('Buscar nos dados do relatório'), {
      target: { value: 'Massagem' },
    });

    expect(screen.getByText('10/11/2026')).toBeInTheDocument();
    expect(screen.queryByText('03/11/2026')).not.toBeInTheDocument();
    expect(screen.getByText('1 registro(s)')).toBeInTheDocument();
  });

  it('mostra clientes recorrentes e exporta apenas as linhas visíveis em CSV', () => {
    const createObjectURL = vi.fn(() => 'blob:relatorio');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<AdminRelatoriosSection clients={clients} appointments={appointments} />);
    fireEvent.change(screen.getByLabelText('Mês de referência do relatório'), {
      target: { value: '2026-11' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Recorrência' }));

    expect(screen.getByText('Ana Ribeiro')).toBeInTheDocument();
    expect(screen.getByText('2', { selector: 'td' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clientes' }));
    expect(screen.getByText('Ana Ribeiro')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar nos dados do relatório'), {
      target: { value: 'Ana Ribeiro' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:relatorio');
  });
});
