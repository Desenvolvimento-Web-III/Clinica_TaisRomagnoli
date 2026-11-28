import type { FiltroAuditoria, RegistroAuditoria } from '@clinica/shared';
import { registroAuditoriaSchema } from '@clinica/shared';
import { getAuthToken, getApiBaseUrl } from './agendamentos-service';

/** Resultado vazio usado quando ainda não existem eventos reais de auditoria. */
export const LOGS_AUDITORIA_PADRAO: RegistroAuditoria[] = [];

/**
 * Consulta a trilha de auditoria administrativa a partir da API do backend.
 */
export async function obterLogsAuditoriaAdmin(
  filtros: FiltroAuditoria = {},
): Promise<RegistroAuditoria[]> {
  try {
    const token = await getAuthToken();
    const baseUrl = getApiBaseUrl();

    const queryParams = new URLSearchParams();
    if (filtros.usuarioId) queryParams.set('usuarioId', filtros.usuarioId);
    if (filtros.acao) queryParams.set('acao', filtros.acao);
    if (filtros.recurso) queryParams.set('recurso', filtros.recurso);
    if (filtros.recursoId) queryParams.set('recursoId', filtros.recursoId);
    if (filtros.dataInicio) queryParams.set('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) queryParams.set('dataFim', filtros.dataFim);
    if (filtros.limite) queryParams.set('limite', filtros.limite.toString());

    const queryString = queryParams.toString();
    const url = `${baseUrl}/listarAuditoriaAdmin${queryString ? `?${queryString}` : ''}`;

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const json = await response.json();
      if (json && Array.isArray(json.dados)) {
        const parsed = registroAuditoriaSchema.array().safeParse(json.dados);
        if (parsed.success) {
          return parsed.data;
        }
      }
    }
  } catch (error) {
      console.warn('Não foi possível obter logs de auditoria da API:', error);
  }

  return [];
}
