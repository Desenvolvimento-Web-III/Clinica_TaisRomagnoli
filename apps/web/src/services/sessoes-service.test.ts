import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ACTIVE_SESSION_STORAGE_KEY,
  SESSION_TERMINATED_REASON_KEY,
  MOTIVO_OUTRO_DISPOSITIVO,
  MENSAGEM_DESCONEXAO_OUTRO_DISPOSITIVO,
  getLocalActiveSessionId,
  setLocalActiveSessionId,
  clearLocalActiveSessionId,
  getSessionTerminatedReason,
  setSessionTerminatedReason,
  clearSessionTerminatedReason,
  iniciarSessaoUnicaNoBackend,
} from './sessoes-service';

vi.mock('./agendamentos-service', () => ({
  getAuthToken: vi.fn().mockResolvedValue('token-auth-mock'),
  getApiBaseUrl: vi
    .fn()
    .mockReturnValue('https://api.clinica.test'),
}));

describe('sessoes-service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Storage de sessão única e encerramento', () => {
    it('gerencia activeSessionId no localStorage', () => {
      expect(getLocalActiveSessionId()).toBeNull();

      setLocalActiveSessionId('sessao-12345');
      expect(getLocalActiveSessionId()).toBe('sessao-12345');
      expect(localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)).toBe('sessao-12345');

      clearLocalActiveSessionId();
      expect(getLocalActiveSessionId()).toBeNull();
    });

    it('gerencia motivo de encerramento no localStorage', () => {
      expect(getSessionTerminatedReason()).toBeNull();

      setSessionTerminatedReason(MOTIVO_OUTRO_DISPOSITIVO);
      expect(getSessionTerminatedReason()).toBe(MOTIVO_OUTRO_DISPOSITIVO);
      expect(localStorage.getItem(SESSION_TERMINATED_REASON_KEY)).toBe(MOTIVO_OUTRO_DISPOSITIVO);

      clearSessionTerminatedReason();
      expect(getSessionTerminatedReason()).toBeNull();
    });

    it('define mensagem clara de desconexão por outro dispositivo', () => {
      expect(MENSAGEM_DESCONEXAO_OUTRO_DISPOSITIVO).toContain('outro dispositivo');
    });
  });

  describe('iniciarSessaoUnicaNoBackend', () => {
    it('chama o endpoint da API e armazena o sessionId retornado', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sucesso: true,
          mensagem: 'Política de sessão única aplicada com sucesso.',
          dados: {
            uid: 'user-789',
            sessionId: 'sessao-gerada-cloud',
            revogadoEm: '2026-11-13T12:00:00.000Z',
            politicaSessaoUnica: true,
          },
        }),
      });
      globalThis.fetch = mockFetch;

      const resultado = await iniciarSessaoUnicaNoBackend('meu-token-jwt');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.clinica.test/iniciarSessaoUnica',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer meu-token-jwt',
          }),
        }),
      );

      expect(resultado?.sessionId).toBe('sessao-gerada-cloud');
      expect(getLocalActiveSessionId()).toBe('sessao-gerada-cloud');
    });

    it('não cria sessão local quando o backend falha', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      globalThis.fetch = mockFetch;

      const resultado = await iniciarSessaoUnicaNoBackend('meu-token', 'sessao-solicitada');

      expect(resultado).toBeNull();
      expect(getLocalActiveSessionId()).toBeNull();
    });
  });
});
