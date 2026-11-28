import type { PainelIndicadores } from '@clinica/shared';
import { painelIndicadoresSchema } from '@clinica/shared';
import { getAuthToken, getApiBaseUrl } from './agendamentos-service';

export interface ConsultarIndicadoresOptions {
  dataReferencia?: string;
  mesReferencia?: string;
  token?: string | null;
}

/**
 * Consulta os 8 indicadores consolidados da clínica na API do backend,
 * com validação de token administrativo. Sem dados reais, retorna null.
 */
export async function consultarPainelIndicadoresAdmin(
  options: ConsultarIndicadoresOptions = {},
): Promise<PainelIndicadores | null> {
  try {
    const authToken = options.token ?? (await getAuthToken());
    if (!authToken) {
      return null;
    }

    const queryParams = new URLSearchParams();
    if (options.dataReferencia) queryParams.set('dataReferencia', options.dataReferencia);
    if (options.mesReferencia) queryParams.set('mesReferencia', options.mesReferencia);

    const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const url = `${getApiBaseUrl()}/obterPainelIndicadoresAdmin${queryStr}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const body = await response.json();
      if (body?.sucesso && body.dados) {
        const parsed = painelIndicadoresSchema.safeParse(body.dados);
        if (parsed.success) {
          return parsed.data;
        }
      }
    }
  } catch (err) {
    console.warn('Falha ao consultar indicadores do painel no backend:', err);
  }

  return null;
}
