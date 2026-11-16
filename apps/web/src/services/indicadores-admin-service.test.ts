import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  consultarPainelIndicadoresAdmin,
  PAINEL_INDICADORES_PADRAO,
} from './indicadores-admin-service';

describe('indicadores-admin-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna painel padrão quando não há token de autenticação', async () => {
    const painel = await consultarPainelIndicadoresAdmin({ token: null });
    expect(painel).toBeDefined();
    expect(painel.indicadores.agendamentosDoDia.total).toBe(6);
    expect(painel.indicadores.clientesCadastrados.total).toBe(148);
  });

  it('retorna dados da Cloud Function quando requisição tem sucesso', async () => {
    const mockPainelBackend = {
      ...PAINEL_INDICADORES_PADRAO,
      dataReferencia: '2026-11-16',
      indicadores: {
        ...PAINEL_INDICADORES_PADRAO.indicadores,
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

    expect(resultado.indicadores.agendamentosDoDia.total).toBe(10);
    expect(resultado.indicadores.agendamentosDoDia.concluidos).toBe(8);
  });

  it('retorna fallback seguro quando a requisição falha com status de erro', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const resultado = await consultarPainelIndicadoresAdmin({
      token: 'fake-token',
    });

    expect(resultado).toEqual(PAINEL_INDICADORES_PADRAO);
  });
});
