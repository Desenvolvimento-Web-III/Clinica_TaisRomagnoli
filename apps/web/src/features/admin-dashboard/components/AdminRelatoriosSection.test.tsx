import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  consultarRelatorioAdmin,
  exportarRelatorioAdmin,
} from '@/services/relatorios-admin-service';
import { AdminRelatoriosSection } from './AdminRelatoriosSection';

vi.mock('@/services/relatorios-admin-service', () => ({
  consultarRelatorioAdmin: vi.fn(),
  exportarRelatorioAdmin: vi.fn(),
}));

const consultarMock = vi.mocked(consultarRelatorioAdmin);
const exportarMock = vi.mocked(exportarRelatorioAdmin);

const report = {
  categoria: 'agenda' as const,
  mesReferencia: '2026-11',
  geradoEmIso: '2026-11-25T12:00:00.000Z',
  headers: ['Data', 'Cliente', 'Serviço', 'Status'],
  rows: [
    {
      id: 'ag-1',
      values: ['03/11/2026', 'Ana Ribeiro', 'Massagem relaxante', 'Concluído'],
      searchText: '03/11/2026 ana ribeiro massagem relaxante concluído',
      status: 'concluido',
    },
    {
      id: 'ag-2',
      values: ['10/11/2026', 'Ana Ribeiro', 'Massagem relaxante', 'Confirmado'],
      searchText: '10/11/2026 ana ribeiro massagem relaxante confirmado',
      status: 'confirmado',
    },
  ],
};

describe('AdminRelatoriosSection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    consultarMock.mockReset();
    exportarMock.mockReset();
  });

  it('carrega do serviço e filtra por mês, status e texto', async () => {
    consultarMock.mockResolvedValue(report);
    render(<AdminRelatoriosSection />);

    await screen.findByText('03/11/2026');
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
    expect(consultarMock).toHaveBeenCalledWith(expect.objectContaining({ categoria: 'agenda' }));
  });

  it('solicita a exportação ao backend com os filtros aplicados', async () => {
    consultarMock.mockResolvedValue(report);
    const blob = new Blob(['csv'], { type: 'text/csv' });
    exportarMock.mockResolvedValue({ blob, nomeArquivo: 'relatorio-agenda-2026-11.csv' });
    const createObjectURL = vi.fn(() => 'blob:relatorio');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<AdminRelatoriosSection />);
    await screen.findByText('03/11/2026');
    fireEvent.change(screen.getByLabelText('Status do relatório'), {
      target: { value: 'confirmado' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));

    await waitFor(() =>
      expect(exportarMock).toHaveBeenCalledWith({
        categoria: 'agenda',
        mesReferencia: expect.any(String),
        busca: '',
        status: 'confirmado',
      }),
    );
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:relatorio');
  });
});
