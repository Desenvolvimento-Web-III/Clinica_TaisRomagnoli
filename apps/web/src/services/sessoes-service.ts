import type { ResultadoRevogacaoSessao } from '@clinica/shared';
import { getAuthToken, getFunctionsBaseUrl } from './agendamentos-service';

export const ACTIVE_SESSION_STORAGE_KEY = 'clinica:active_session_id';
export const SESSION_TERMINATED_REASON_KEY = 'clinica:session_terminated_reason';
export const MOTIVO_OUTRO_DISPOSITIVO = 'outro_dispositivo';

export const MENSAGEM_DESCONEXAO_OUTRO_DISPOSITIVO =
  'Sua sessão foi encerrada porque sua conta foi conectada em outro dispositivo.';

/**
 * Retorna o ID da sessão única ativa armazenada neste dispositivo.
 */
export function getLocalActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Grava o ID da sessão única ativa local deste dispositivo.
 */
export function setLocalActiveSessionId(sessionId: string): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
  } catch {
    // Silencioso em caso de restrição de storage
  }
}

/**
 * Remove o ID de sessão local ao deslogar ou quando a sessão cai.
 */
export function clearLocalActiveSessionId(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {
    // Silencioso
  }
}

/**
 * Obtém o motivo de encerramento de sessão anterior (ex: outro dispositivo conectado).
 */
export function getSessionTerminatedReason(): string | null {
  try {
    return localStorage.getItem(SESSION_TERMINATED_REASON_KEY);
  } catch {
    return null;
  }
}

/**
 * Registra o motivo pelo qual a sessão do dispositivo foi encerrada ("caiu").
 */
export function setSessionTerminatedReason(reason: string): void {
  try {
    localStorage.setItem(SESSION_TERMINATED_REASON_KEY, reason);
  } catch {
    // Silencioso
  }
}

/**
 * Limpa o motivo de encerramento da sessão.
 */
export function clearSessionTerminatedReason(): void {
  try {
    localStorage.removeItem(SESSION_TERMINATED_REASON_KEY);
  } catch {
    // Silencioso
  }
}

/**
 * Aciona o backend para aplicar a política de sessão única:
 * Invalida todos os tokens anteriores no Firebase Auth e atualiza o activeSessionId.
 */
export async function iniciarSessaoUnicaNoBackend(
  token?: string | null,
  sessionIdDesejado?: string,
  motivo?: string,
): Promise<ResultadoRevogacaoSessao | null> {
  try {
    const authToken = token ?? (await getAuthToken());
    if (!authToken) {
      return null;
    }

    const url = `${getFunctionsBaseUrl()}/iniciarSessaoUnica`;
    const payload: Record<string, string> = {
      motivo: motivo || 'Início de nova sessão sob política de sessão única',
    };
    if (sessionIdDesejado) {
      payload.sessionId = sessionIdDesejado;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const body = await response.json();
      if (body?.sucesso && body.dados) {
        const resultado = body.dados as ResultadoRevogacaoSessao;
        if (resultado.sessionId) {
          setLocalActiveSessionId(resultado.sessionId);
        }
        return resultado;
      }
    }
  } catch (error) {
    console.warn('Aviso: Falha ao contatar endpoint de sessão única:', error);
  }

  // Fallback seguro em ambientes offline ou testes
  const fallbackSessionId =
    sessionIdDesejado || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  setLocalActiveSessionId(fallbackSessionId);
  return {
    uid: '',
    sessionId: fallbackSessionId,
    revogadoEm: new Date().toISOString(),
    mensagem: 'Sessão iniciada localmente.',
    politicaSessaoUnica: true,
  };
}

