import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Agendamento } from '@clinica/shared';
import { consultarRelatorioAdmin, exportarRelatorioAdmin } from './relatorios-admin-service';

const { mockCollection, mockGetDocs, mockQuery, mockWhere, mockAuth } = vi.hoisted(() => ({
  mockCollection: vi.fn((...args: unknown[]) => ({ args })),
  mockGetDocs: vi.fn(),
  mockQuery: vi.fn((...args: unknown[]) => ({ args })),
  mockWhere: vi.fn((...args: unknown[]) => ({ args })),
  mockAuth: { currentUser: { uid: 'admin-1' } as { uid: string } | null },
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  getDocs: mockGetDocs,
  query: mockQuery,
  where: mockWhere,
}));

vi.mock('@/lib/firebase', () => ({ db: {}, auth: mockAuth }));

function criarAgendamento(overrides: Partial<Agendamento> & Pick<Agendamento, 'id' | 'status'>) {
  const { id, ...dados } = overrides;
  return {
    id,
    dataHoraInicio: '2026-11-03T10:00:00.000Z',
    dataHoraFim: '2026-11-03T11:00:00.000Z',
    clienteId: 'cliente-1',
    clienteNome: 'Ana Ribeiro',
    servicoId: 'servico-1',
    servicoNome: 'Massagem relaxante',
    duracaoMinutos: 60,
    intervaloAposMinutos: 30,
    profissionalId: 'prof-1',
    profissionalNome: 'Tais Romagnoli',
    valorTotalEmCentavos: 20000,
    valorSinalEmCentavos: 6000,
    saldoRestanteEmCentavos: 14000,
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...dados,
  } as Agendamento;
}

function snapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: docs.map(({ id, data }) => ({ id, data: () => data })) };
}

describe('relatorios-admin-service', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockCollection.mockClear();
    mockQuery.mockClear();
    mockWhere.mockClear();
    mockAuth.currentUser = { uid: 'admin-1' };
  });

  afterEach(() => vi.restoreAllMocks());

  it('consulta somente o intervalo do mês diretamente na coleção do Firestore', async () => {
    mockGetDocs.mockResolvedValue(
      snapshot([
        {
          id: 'ag-1',
          data: criarAgendamento({ id: 'ag-1', status: 'confirmado' }) as unknown as Record<
            string,
            unknown
          >,
        },
      ]),
    );

    const resultado = await consultarRelatorioAdmin({
      categoria: 'agenda',
      mesReferencia: '2026-11',
    });

    expect(mockCollection).toHaveBeenCalledWith({}, 'agendamentos');
    expect(mockWhere).toHaveBeenNthCalledWith(
      1,
      'dataHoraInicio',
      '>=',
      '2026-11-01T00:00:00.000Z',
    );
    expect(mockWhere).toHaveBeenNthCalledWith(2, 'dataHoraInicio', '<', '2026-12-01T00:00:00.000Z');
    expect(resultado.rows[0]?.values).toEqual([
      '03/11/2026',
      '10:00',
      'Ana Ribeiro',
      'Massagem relaxante',
      '60 min',
      'Confirmado',
      'R$ 200,00',
    ]);
  });

  it('gera CSV localmente e aplica os filtros escolhidos sem chamar Cloud Functions', async () => {
    mockGetDocs.mockResolvedValue(
      snapshot([
        {
          id: 'ag-confirmado',
          data: criarAgendamento({
            id: 'ag-confirmado',
            status: 'confirmado',
          }) as unknown as Record<string, unknown>,
        },
        {
          id: 'ag-concluido',
          data: criarAgendamento({
            id: 'ag-concluido',
            status: 'concluido',
            dataHoraInicio: '2026-11-10T10:00:00.000Z',
          }) as unknown as Record<string, unknown>,
        },
      ]),
    );

    const arquivo = await exportarRelatorioAdmin({
      categoria: 'agenda',
      mesReferencia: '2026-11',
      busca: 'Ana',
      status: 'confirmado',
    });
    const csv = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(arquivo.blob);
    });

    expect(arquivo.nomeArquivo).toBe('relatorio-agenda-2026-11.csv');
    expect(csv).toContain('Ana Ribeiro');
    expect(csv).toContain('Confirmado');
    expect(csv).not.toContain('Concluído');
    expect(mockGetDocs).toHaveBeenCalledOnce();
  });

  it('calcula recorrência com atendimentos concluídos agendados no mês', async () => {
    mockGetDocs
      .mockResolvedValueOnce(
        snapshot([
          {
            id: 'cliente-1',
            data: {
              nome: 'Ana Ribeiro',
              email: 'ana@example.com',
              telefone: '(11) 99999-0000',
              status: 'ativo',
            },
          },
        ]),
      )
      .mockResolvedValueOnce(
        snapshot([
          {
            id: 'ag-1',
            data: criarAgendamento({ id: 'ag-1', status: 'concluido' }) as unknown as Record<
              string,
              unknown
            >,
          },
          {
            id: 'ag-2',
            data: criarAgendamento({
              id: 'ag-2',
              status: 'concluido',
              dataHoraInicio: '2026-11-10T10:00:00.000Z',
            }) as unknown as Record<string, unknown>,
          },
        ]),
      )
      .mockResolvedValueOnce(snapshot([]));

    const resultado = await consultarRelatorioAdmin({
      categoria: 'recorrencia',
      mesReferencia: '2026-11',
    });

    expect(resultado.rows).toHaveLength(1);
    expect(resultado.rows[0]?.values).toEqual(['Ana Ribeiro', 'ana@example.com', '2026-11', 2]);
    expect(mockWhere).toHaveBeenCalledWith('dataHoraInicio', '>=', '2026-11-01T00:00:00.000Z');
  });

  it('não consulta o Firestore se não há usuário autenticado', async () => {
    mockAuth.currentUser = null;

    await expect(
      consultarRelatorioAdmin({ categoria: 'agenda', mesReferencia: '2026-11' }),
    ).rejects.toThrow('Entre com a conta da administradora');
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it('traduz a recusa das Security Rules em uma mensagem clara', async () => {
    mockGetDocs.mockRejectedValue(
      Object.assign(new Error('Denied'), { code: 'permission-denied' }),
    );

    await expect(
      consultarRelatorioAdmin({ categoria: 'agenda', mesReferencia: '2026-11' }),
    ).rejects.toThrow('O Firestore negou a leitura');
  });
});
