import { describe, it, expect, vi, beforeEach } from 'vitest';
import { INITIAL_ANAMNESE_DATA, type FichaAnamneseRecord } from '@clinica/shared';

const { mockGetDoc, mockAuth } = vi.hoisted(() => ({
  mockGetDoc: vi.fn(),
  mockAuth: {
    currentUser: null as null | { uid: string; getIdToken: ReturnType<typeof vi.fn> },
  },
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...parts: string[]) => parts.join('/')),
  getDoc: mockGetDoc,
}));
vi.mock('@/lib/firebase', () => ({ db: {}, auth: mockAuth }));
vi.mock('@/config/env', () => ({
  environment: {
    firebase: { projectId: 'demo-clinica-tests' },
    useFirebaseEmulators: true,
  },
}));

import {
  salvarFichaAnamneseApi,
  obterFichaAnamneseApi,
  atualizarLiberacaoMedicaApi,
} from './anamnese-service';

describe('anamnese-service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetDoc.mockReset();
    mockAuth.currentUser = {
      uid: 'cli-1',
      getIdToken: vi.fn().mockResolvedValue('token-jwt'),
    };
  });

  const fichaMock: FichaAnamneseRecord = {
    ...INITIAL_ANAMNESE_DATA,
    consentimentoConfirmado: true,
    tratamentoOncologico: {
      resposta: true,
      detalhes: 'Quimioterapia recente',
    },
    clienteId: 'cli-1',
    submittedAt: '2026-10-10T10:00:00.000Z',
    updatedAt: '2026-10-10T10:00:00.000Z',
    pontosAtencao: ['Tratamento Oncológico: Quimioterapia recente'],
    exigeLiberacaoMedica: true,
    contraindicacoes: ['Tratamento Oncológico: Quimioterapia recente'],
    liberacaoMedicaAprovada: false,
  };

  it('salvarFichaAnamneseApi retorna erro quando usuário não está autenticado', async () => {
    mockAuth.currentUser = null;
    const res = await salvarFichaAnamneseApi(
      { ...INITIAL_ANAMNESE_DATA, consentimentoConfirmado: true },
      'cli-1',
      null,
    );

    expect(res.sucesso).toBe(false);
    expect(res.erro).toMatch(/não autenticado/i);
  });

  it('salvarFichaAnamneseApi envia POST e retorna ficha com contraindicações calculadas', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dados: fichaMock }),
    } as Response);

    const res = await salvarFichaAnamneseApi(fichaMock, 'cli-1', 'token-jwt');

    expect(res.sucesso).toBe(true);
    expect(res.dados?.exigeLiberacaoMedica).toBe(true);
    expect(res.dados?.liberacaoMedicaAprovada).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/salvarFichaAnamnese'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-jwt',
        }),
      }),
    );
  });

  it('obterFichaAnamneseApi consulta o Firestore e trata ausência como ficha ainda não preenchida', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => false });

    const res = await obterFichaAnamneseApi('cli-1');

    expect(res.sucesso).toBe(true);
    expect(res.dados).toBeUndefined();
    expect(mockGetDoc).toHaveBeenNthCalledWith(1, 'anamneses/cli-1');
    expect(mockGetDoc).toHaveBeenNthCalledWith(2, 'clientes/cli-1/anamneses/atual');
  });

  it('obterFichaAnamneseApi repassa erro de permissão do Firestore', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('Missing or insufficient permissions.'));

    const res = await obterFichaAnamneseApi('cli-2');

    expect(res.sucesso).toBe(false);
    expect(res.erro).toBe('Missing or insufficient permissions.');
  });

  it('atualizarLiberacaoMedicaApi envia POST autenticado e retorna ficha liberada', async () => {
    const fichaAprovada: FichaAnamneseRecord = {
      ...fichaMock,
      liberacaoMedicaAprovada: true,
      liberacaoMedicaObservacoes: 'Atestado apresentado',
      liberacaoMedicaAprovadaEm: '2026-10-12T10:00:00.000Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dados: fichaAprovada }),
    } as Response);

    const res = await atualizarLiberacaoMedicaApi(
      {
        clienteId: 'cli-1',
        aprovada: true,
        observacoes: 'Atestado apresentado',
      },
      'admin-jwt',
    );

    expect(res.sucesso).toBe(true);
    expect(res.dados?.liberacaoMedicaAprovada).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/atualizarLiberacaoMedica'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-jwt',
        }),
      }),
    );
  });

  it('atualizarLiberacaoMedicaApi repassa statusCode 403 quando usuário não é admin', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Acesso não autorizado.' }),
    } as Response);

    const res = await atualizarLiberacaoMedicaApi(
      { clienteId: 'cli-1', aprovada: true },
      'client-jwt',
    );

    expect(res.sucesso).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.erro).toBe('Acesso não autorizado.');
  });
});
