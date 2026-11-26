import { afterEach, describe, expect, it, vi } from 'vitest';
import { consultarRelatorioAdmin, exportarRelatorioAdmin } from './relatorios-admin-service';

vi.mock('./agendamentos-service', () => ({
  getAuthToken: vi.fn().mockResolvedValue('token-admin'),
  getFunctionsBaseUrl: vi.fn().mockReturnValue('https://functions.example.test'),
}));

const filtros = { categoria: 'agenda' as const, mesReferencia: '2026-11' };

describe('relatorios-admin-service', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('consulta dados mensais usando token autenticado e valida a resposta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          sucesso: true,
          dados: {
            ...filtros,
            geradoEmIso: '2026-11-25T12:00:00.000Z',
            headers: ['Cliente'],
            rows: [{ id: 'cliente-1', values: ['Ana'], searchText: 'ana', status: 'ativo' }],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await consultarRelatorioAdmin(filtros);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://functions.example.test/obterRelatorioAdmin?categoria=agenda&mesReferencia=2026-11',
      { method: 'GET', headers: { Authorization: 'Bearer token-admin' } },
    );
    expect(resultado.rows[0]?.values).toEqual(['Ana']);
  });

  it('envia filtros de busca e status para a exportação CSV no backend', async () => {
    const arquivo = new Blob(['csv'], { type: 'text/csv' });
    const fetchMock = vi.fn().mockResolvedValue(new Response(arquivo, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await exportarRelatorioAdmin({
      ...filtros,
      busca: 'Ana Ribeiro',
      status: 'confirmado',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://functions.example.test/exportarRelatorioAdmin?categoria=agenda&mesReferencia=2026-11&busca=Ana+Ribeiro&status=confirmado',
      { method: 'GET', headers: { Authorization: 'Bearer token-admin' } },
    );
    expect(resultado.blob).toEqual(arquivo);
    expect(resultado.nomeArquivo).toBe('relatorio-agenda-2026-11.csv');
  });

  it('não inicia requisição sem sessão autenticada', async () => {
    const { getAuthToken } = await import('./agendamentos-service');
    vi.mocked(getAuthToken).mockResolvedValueOnce(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(consultarRelatorioAdmin(filtros)).rejects.toThrow(
      'Entre com a conta da administradora',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
