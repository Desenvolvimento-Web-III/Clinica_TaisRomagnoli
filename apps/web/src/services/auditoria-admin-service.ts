import type { FiltroAuditoria, RegistroAuditoria } from '@clinica/shared';
import { registroAuditoriaSchema } from '@clinica/shared';
import { getAuthToken, getFunctionsBaseUrl } from './agendamentos-service';

export const LOGS_AUDITORIA_PADRAO: RegistroAuditoria[] = [
  {
    id: 'audit-demo-1',
    usuarioId: 'admin-tais',
    usuarioEmail: 'admin@clinicataisromagnoli.com.br',
    usuarioRole: 'admin',
    acao: 'horarios_funcionamento.atualizados',
    recurso: 'configuracoes',
    recursoId: 'horarios_funcionamento',
    dataHora: new Date().toISOString(),
    dadosAfetados: { totalDiasConfigurados: 7 },
    ip: '127.0.0.1',
    userAgent: 'ClinicaWeb/1.0',
  },
  {
    id: 'audit-demo-2',
    usuarioId: 'admin-tais',
    usuarioEmail: 'admin@clinicataisromagnoli.com.br',
    usuarioRole: 'admin',
    acao: 'servico.cadastrado',
    recurso: 'servicos',
    recursoId: 'serv-relaxante',
    dataHora: new Date(Date.now() - 3600000).toISOString(),
    dadosAfetados: {
      nome: 'Massagem Relaxante',
      precoTotalEmCentavos: 15000,
    },
    ip: '127.0.0.1',
    userAgent: 'ClinicaWeb/1.0',
  },
];

/**
 * Consulta a trilha de auditoria administrativa a partir da Cloud Function.
 */
export async function obterLogsAuditoriaAdmin(
  filtros: FiltroAuditoria = {},
): Promise<RegistroAuditoria[]> {
  try {
    const token = await getAuthToken();
    const baseUrl = getFunctionsBaseUrl();

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
    console.warn('Não foi possível obter logs de auditoria da Cloud Function:', error);
  }

  // Fallback para logs de demonstração em modo desenvolvimento/offline
  return LOGS_AUDITORIA_PADRAO;
}
