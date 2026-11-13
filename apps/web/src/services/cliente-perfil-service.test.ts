import { describe, it, expect, vi, beforeEach } from 'vitest';
import { consultarRecorrenciaCliente } from './cliente-perfil-service';

const mockGetDoc = vi.fn();
const mockDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

const mockGetAuthToken = vi.fn();
vi.mock('./agendamentos-service', () => ({
  getAuthToken: () => mockGetAuthToken(),
  getFunctionsBaseUrl: () => 'http://127.0.0.1:5001/clinica-tais-romagnoli/us-central1',
}));

vi.mock('@/lib/firebase', () => ({
  auth: null,
  db: { app: {} },
}));

describe('cliente-perfil-service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetAuthToken.mockResolvedValue(null);
  });

  it('retorna null se userUid não for fornecido', async () => {
    const res = await consultarRecorrenciaCliente(null);
    expect(res).toBeNull();
  });

  it('retorna dados de recorrência obtidos da Cloud Function quando bem-sucedido', async () => {
    mockGetAuthToken.mockResolvedValue('token-123');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sucesso: true,
        dados: {
          clienteId: 'user-1',
          recorrente: true,
          totalAtendimentosMes: 3,
          totalAtendimentosConcluidos: 5,
          mesReferencia: '2026-11',
          criterioMinimo: 2,
        },
      }),
    } as Response);

    const res = await consultarRecorrenciaCliente('user-1');

    expect(res).toEqual({
      recorrente: true,
      totalAtendimentosMes: 3,
      totalAtendimentosConcluidos: 5,
      mesReferencia: '2026-11',
      criterioMinimo: 2,
      ultimoAtendimento: undefined,
    });
  });

  it('usa fallback no Firestore quando a Cloud Function falha', async () => {
    mockGetAuthToken.mockResolvedValue('token-123');

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    mockDoc.mockReturnValue({});
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        recorrente: true,
        totalAtendimentosMes: 2,
        mesReferenciaRecorrencia: '2026-11',
      }),
    });

    const res = await consultarRecorrenciaCliente('user-1');

    expect(res).toEqual({
      recorrente: true,
      totalAtendimentosMes: 2,
      totalAtendimentosConcluidos: undefined,
      mesReferencia: '2026-11',
      criterioMinimo: 2,
      ultimoAtendimento: undefined,
    });
  });

  it('retorna null se fallback no Firestore não encontrar o documento', async () => {
    mockGetAuthToken.mockResolvedValue(null);
    mockDoc.mockReturnValue({});
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    const res = await consultarRecorrenciaCliente('user-inexistente');
    expect(res).toBeNull();
  });
});
