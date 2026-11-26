import { describe, expect, it, vi } from 'vitest';
import type { Agendamento, ReportClient } from '@clinica/shared';
import { intervaloIsoDoMes, type RelatoriosRepository } from './relatorios-repository.js';
import { gerarArquivoCsvRelatorioAdmin, gerarDadosRelatorioAdmin } from './relatorios-service.js';

const cliente: ReportClient = {
  id: 'cliente-1',
  nome: 'Ana Ribeiro',
  email: 'ana@example.com',
  telefone: '(11) 99999-0000',
  status: 'ativo',
};

function agendamento(
  overrides: Partial<Agendamento> & Pick<Agendamento, 'id' | 'dataHoraInicio' | 'status'>,
): Agendamento {
  return {
    clienteId: 'cliente-1',
    clienteNome: 'Ana Ribeiro',
    servicoId: 'servico-1',
    servicoNome: 'Massagem Relaxante',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 20000,
    valorSinalEmCentavos: 6000,
    saldoRestanteEmCentavos: 14000,
    dataHoraFim: '2026-11-03T11:00:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-tais',
    profissionalNome: 'Tais Romagnoli',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

function criarRepositorio(
  porInicio: Agendamento[],
  porConclusao: Agendamento[],
): RelatoriosRepository {
  return {
    listarClientes: vi.fn().mockResolvedValue([cliente]),
    listarAgendamentosPorInicioMes: vi.fn().mockResolvedValue(porInicio),
    listarAgendamentosConcluidosNoMes: vi.fn().mockResolvedValue(porConclusao),
  };
}

describe('relatorios-service', () => {
  it.each([
    ['2026-01', '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'],
    ['2026-12', '2026-12-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z'],
  ])('cria intervalo Firestore fechado-aberto para %s', (mes, inicio, fim) => {
    expect(intervaloIsoDoMes(mes)).toEqual({ inicio, fim });
  });

  it('gera os dados do mês no backend e combina atendimentos concluídos sem duplicar registros', async () => {
    const agNovembro = agendamento({
      id: 'ag-nov',
      dataHoraInicio: '2026-11-03T10:00:00.000Z',
      status: 'concluido',
    });
    const agConcluidoEmNovembro = agendamento({
      id: 'ag-out',
      dataHoraInicio: '2026-10-31T10:00:00.000Z',
      concluidoEm: '2026-11-01T11:00:00.000Z',
      status: 'concluido',
    });
    const repo = criarRepositorio([agNovembro], [agNovembro, agConcluidoEmNovembro]);

    const resultado = await gerarDadosRelatorioAdmin(
      { categoria: 'recorrencia', mesReferencia: '2026-11' },
      repo,
      new Date('2026-11-30T23:00:00.000Z'),
    );

    expect(repo.listarAgendamentosPorInicioMes).not.toHaveBeenCalled();
    expect(repo.listarAgendamentosConcluidosNoMes).toHaveBeenCalledWith('2026-11');
    expect(resultado.geradoEmIso).toBe('2026-11-30T23:00:00.000Z');
    expect(resultado.rows).toHaveLength(1);
    expect(resultado.rows[0]?.values).toEqual(['Ana Ribeiro', 'ana@example.com', '2026-11', 2]);
  });

  it('gera CSV no backend aplicando busca e status antes da exportação', async () => {
    const repo = criarRepositorio(
      [
        agendamento({
          id: 'ag-concluido',
          dataHoraInicio: '2026-11-03T10:00:00.000Z',
          status: 'concluido',
        }),
        agendamento({
          id: 'ag-confirmado',
          clienteNome: '=SUM(A1:A2)',
          dataHoraInicio: '2026-11-10T10:00:00.000Z',
          status: 'confirmado',
        }),
      ],
      [],
    );

    const arquivo = await gerarArquivoCsvRelatorioAdmin(
      {
        categoria: 'agenda',
        mesReferencia: '2026-11',
        busca: '=SUM',
        status: 'confirmado',
      },
      repo,
    );

    expect(arquivo.nomeArquivo).toBe('relatorio-agenda-2026-11.csv');
    expect(arquivo.quantidadeLinhas).toBe(1);
    expect(arquivo.conteudo).toContain("'=SUM(A1:A2)");
    expect(arquivo.conteudo).not.toContain('ag-concluido');
  });

  it('rejeita mês fora do formato antes de consultar os dados', async () => {
    const repo = criarRepositorio([], []);

    await expect(
      gerarDadosRelatorioAdmin({ categoria: 'agenda', mesReferencia: '2026-13' }, repo),
    ).rejects.toThrow();
    expect(repo.listarClientes).not.toHaveBeenCalled();
  });
});
