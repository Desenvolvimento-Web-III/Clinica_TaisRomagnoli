import { describe, it, expect, vi, beforeEach } from 'vitest';
import { consultarPainelIndicadoresAdmin } from './indicadores-admin-service';
import { indicatorsFixture } from '@/test/fixtures';

vi.mock('@/config/env', () => ({
  environment: { firebase: { projectId: 'demo-clinica-tests' }, useFirebaseEmulators: true },
}));

describe('indicadores-admin-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna ausência de dados quando não há token de autenticação', async () => {
    const painel = await consultarPainelIndicadoresAdmin({ token: null });
    expect(painel).toBeNull();
  });

  it('retorna dados da Cloud Function quando requisição tem sucesso', async () => {
    const mockPainelBackend = {
      ...indicatorsFixture,
      dataReferencia: '2026-11-16',
      indicadores: {
        ...indicatorsFixture.indicadores,
        agendamentosDoDia: {
          total: 10,
          concluidos: 8,
          pendentes: 2,
          emAndamento: 0,
          cancelados: 0,
          detalhe: '8 concluídos, 2 pendentes',
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sucesso: true,
        dados: mockPainelBackend,
      }),
    });

    const resultado = await consultarPainelIndicadoresAdmin({
      token: 'fake-admin-token',
      dataReferencia: '2026-11-16',
    });

    expect(resultado?.indicadores.agendamentosDoDia.total).toBe(10);
    expect(resultado?.indicadores.agendamentosDoDia.concluidos).toBe(8);
  });

  it('retorna fallback seguro quando a requisição falha com status de erro', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const resultado = await consultarPainelIndicadoresAdmin({
      token: 'fake-token',
    });

    expect(resultado).toBeNull();
  });
});
