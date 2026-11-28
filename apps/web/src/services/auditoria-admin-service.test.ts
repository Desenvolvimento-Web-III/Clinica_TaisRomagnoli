import { describe, it, expect, vi, beforeEach } from 'vitest';
import { obterLogsAuditoriaAdmin, LOGS_AUDITORIA_PADRAO } from './auditoria-admin-service.js';

vi.mock('./agendamentos-service', () => ({
  getAuthToken: vi.fn().mockResolvedValue('fake-token'),
  getApiBaseUrl: vi.fn().mockReturnValue('https://api.clinica.test'),
}));

describe('auditoria-admin-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna logs da API quando a chamada HTTP for bem-sucedida', async () => {
    const mockDados = [
      {
        id: 'audit-1',
        usuarioId: 'admin-1',
        usuarioRole: 'admin',
        acao: 'servico.cadastrado',
        recurso: 'servicos',
        recursoId: 'serv-1',
        dataHora: '2026-11-16T10:00:00.000Z',
        dadosAfetados: { nome: 'Reiki' },
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sucesso: true, dados: mockDados }),
    });

    const logs = await obterLogsAuditoriaAdmin({ recurso: 'servicos' });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.id).toBe('audit-1');
    expect(logs[0]?.acao).toBe('servico.cadastrado');
  });

  it('retorna logs padrão quando o endpoint falhar ou estiver inacessível', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    const logs = await obterLogsAuditoriaAdmin();
    expect(logs).toEqual(LOGS_AUDITORIA_PADRAO);
  });
});
