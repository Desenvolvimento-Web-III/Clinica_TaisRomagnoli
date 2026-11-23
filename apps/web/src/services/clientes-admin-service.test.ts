import { describe, it, expect, vi, beforeEach } from 'vitest';
const { mockCollection, mockGetDocs } = vi.hoisted(() => ({
  mockCollection: vi.fn(),
  mockGetDocs: vi.fn(),
}));
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    collection: (...args: unknown[]) => mockCollection(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
  };
});
import { INITIAL_ANAMNESE_DATA, type Agendamento as SharedAgendamento } from '@clinica/shared';
import * as anamneseService from './anamnese-service';
import * as agendamentosService from './agendamentos-service';
import { db } from '@/lib/firebase';
import {
  buscarClientesAdmin,
  buscarPerfilClienteAdmin,
  mapFichaAnamneseToAdminView,
  mapFirestoreClientToAdminListItem,
} from './clientes-admin-service';

describe('clientes-admin-service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCollection.mockReset().mockReturnValue('clientes-collection');
    mockGetDocs.mockReset();
  });

  it('buscarClientesAdmin lê diretamente os documentos da coleção clientes', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'cliente-b',
          data: () => ({ nome: 'Bruna', email: 'bruna@exemplo.com', status: 'ativo' }),
        },
        {
          id: 'cliente-a',
          data: () => ({ nome: 'Ana', telefone: '(11) 98888-7777', status: 'inativo' }),
        },
      ],
    } as never);

    await expect(buscarClientesAdmin()).resolves.toEqual([
      {
        id: 'cliente-a',
        nome: 'Ana',
        email: '',
        telefone: '(11) 98888-7777',
        status: 'inativo',
        totalAtendimentosMes: 0,
        ultimoAtendimento: undefined,
        createdAt: undefined,
      },
      {
        id: 'cliente-b',
        nome: 'Bruna',
        email: 'bruna@exemplo.com',
        telefone: '',
        status: 'ativo',
        totalAtendimentosMes: 0,
        ultimoAtendimento: undefined,
        createdAt: undefined,
      },
    ]);
    expect(mockCollection).toHaveBeenCalledWith(db, 'clientes');
    expect(mockGetDocs).toHaveBeenCalledWith('clientes-collection');
  });

  it('buscarClientesAdmin retorna lista vazia quando coleção não tem documentos', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await expect(buscarClientesAdmin()).resolves.toEqual([]);
  });

  it('mapFirestoreClientToAdminListItem converte Timestamp e valores ausentes', () => {
    const timestamp = new Date('2026-11-20T10:00:00.000Z');
    expect(
      mapFirestoreClientToAdminListItem('cliente-1', {
        nome: ' Cliente ',
        createdAt: { toDate: () => timestamp },
      }),
    ).toEqual({
      id: 'cliente-1',
      nome: ' Cliente ',
      email: '',
      telefone: '',
      status: 'ativo',
      totalAtendimentosMes: 0,
      ultimoAtendimento: undefined,
      createdAt: '2026-11-20T10:00:00.000Z',
    });
  });

  it('mapFichaAnamneseToAdminView converte contraindicações e status de liberação médica', () => {
    const view = mapFichaAnamneseToAdminView({
      ...INITIAL_ANAMNESE_DATA,
      consentimentoConfirmado: true,
      doencasCardiacas: { resposta: true, detalhes: 'Arritmia controlada' },
      descricaoQueixa: 'Tensão em ombros',
      observacoesAdicionais: 'Preferência por pressão suave',
      pontosAtencao: ['Cardíaco: Arritmia controlada'],
      liberacaoMedicaAprovada: true,
      liberacaoMedicaObservacoes: 'Atestado cardiológico válido',
      liberacaoMedicaAprovadaEm: '2026-10-12T10:00:00.000Z',
      liberacaoMedicaAprovadaPor: 'admin-1',
    });

    expect(view.consentConfirmed).toBe(true);
    expect(view.exigeLiberacaoMedica).toBe(true);
    expect(view.contraindicacoes).toEqual(['Cardíaco: Arritmia controlada']);
    expect(view.liberacaoMedicaAprovada).toBe(true);
    expect(view.liberacaoMedicaObservacoes).toBe('Atestado cardiológico válido');
    expect(view.notes).toBe('Tensão em ombros • Preferência por pressão suave');
  });

  it('buscarPerfilClienteAdmin agrega ficha de anamnese e agendamentos obtidos da API', async () => {
    vi.spyOn(anamneseService, 'obterFichaAnamneseApi').mockResolvedValue({
      sucesso: true,
      dados: {
        ...INITIAL_ANAMNESE_DATA,
        consentimentoConfirmado: true,
        tratamentoOncologico: { resposta: true, detalhes: 'Acompanhamento médico' },
        clienteId: 'demo-client-1',
        submittedAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-10T10:00:00.000Z',
        pontosAtencao: ['Tratamento Oncológico: Acompanhamento médico'],
        exigeLiberacaoMedica: true,
        contraindicacoes: ['Tratamento Oncológico: Acompanhamento médico'],
        liberacaoMedicaAprovada: false,
      },
    });

    const agendamentoMock: SharedAgendamento = {
      id: 'ag-cli-1',
      clienteId: 'demo-client-1',
      clienteNome: 'Mariana Silva',
      servicoId: 'srv-1',
      servicoNome: 'Massagem Relaxante',
      duracaoMinutos: 60,
      valorTotalEmCentavos: 15000,
      valorSinalEmCentavos: 4500,
      saldoRestanteEmCentavos: 10500,
      dataHoraInicio: '2026-10-20T10:00:00.000Z',
      dataHoraFim: '2026-10-20T11:00:00.000Z',
      intervaloAposMinutos: 30,
      profissionalId: 'prof-tais-romagnoli',
      profissionalNome: 'Tais Romagnoli',
      status: 'pendente',
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
    };

    vi.spyOn(agendamentosService, 'listarAgendamentosBackend').mockResolvedValue({
      sucesso: true,
      dados: [agendamentoMock],
    });

    const perfil = await buscarPerfilClienteAdmin('demo-client-1');

    expect(perfil.fullName).toBe('Mariana Silva');
    expect(perfil.anamnesis?.exigeLiberacaoMedica).toBe(true);
    expect(perfil.anamnesis?.liberacaoMedicaAprovada).toBe(false);
    expect(perfil.appointments).toHaveLength(1);
    expect(perfil.appointments[0]?.status).toBe('pendente');
    expect(perfil.payments[0]?.status).toBe('pendente');
  });
});
