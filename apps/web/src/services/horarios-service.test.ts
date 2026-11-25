import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: null }));

import { consultarHorariosDisponiveis } from './horarios-service';

describe('horarios-service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('calcula disponibilidade sem chamar Cloud Functions', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const horarios = await consultarHorariosDisponiveis({
      data: '2026-11-25',
      duracaoMinutos: 40,
      servicoId: 'reiki',
    });

    expect(horarios).toContain('08:00');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
