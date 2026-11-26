import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: null }));
vi.mock('@/config/env', () => ({
  environment: { firebase: { projectId: 'demo-clinica-tests' }, useFirebaseEmulators: true },
}));

import { consultarHorariosDisponiveis } from './horarios-service';

describe('horarios-service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('consulta disponibilidade nas Cloud Functions', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ sucesso: true, dados: { horarios: ['08:00', '08:30'] } }),
    } as Response);
    const horarios = await consultarHorariosDisponiveis({
      data: '2026-11-25',
      duracaoMinutos: 40,
      servicoId: 'reiki',
    });

    expect(horarios).toEqual(['08:00', '08:30']);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/obterHorariosDisponiveis?'));
  });
});
