import { reportDataSchema, type ReportCategory, type ReportData } from '@clinica/shared';
import { getAuthToken, getFunctionsBaseUrl } from './agendamentos-service';

export interface RelatorioAdminFiltros {
  categoria: ReportCategory;
  mesReferencia: string;
  busca?: string;
  status?: string;
}

export interface RelatorioCsvDownload {
  blob: Blob;
  nomeArquivo: string;
}

async function criarUrlAutenticada(endpoint: string, filtros: RelatorioAdminFiltros) {
  const token = await getAuthToken();
  if (!token) throw new Error('Entre com a conta da administradora para acessar os relatórios.');

  const parametros = new URLSearchParams({
    categoria: filtros.categoria,
    mesReferencia: filtros.mesReferencia,
  });
  if (filtros.busca?.trim()) parametros.set('busca', filtros.busca.trim());
  if (filtros.status) parametros.set('status', filtros.status);

  return {
    url: `${getFunctionsBaseUrl()}/${endpoint}?${parametros.toString()}`,
    headers: { Authorization: `Bearer ${token}` },
  };
}

async function lerMensagemErro(response: Response, padrao: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return padrao;
}

export async function consultarRelatorioAdmin(
  filtros: Pick<RelatorioAdminFiltros, 'categoria' | 'mesReferencia'>,
): Promise<ReportData> {
  const request = await criarUrlAutenticada('obterRelatorioAdmin', filtros);
  const response = await fetch(request.url, { method: 'GET', headers: request.headers });
  if (!response.ok) {
    throw new Error(await lerMensagemErro(response, 'Não foi possível carregar este relatório.'));
  }

  const body: unknown = await response.json();
  if (
    !body ||
    typeof body !== 'object' ||
    !('sucesso' in body) ||
    !body.sucesso ||
    !('dados' in body)
  ) {
    throw new Error('O backend retornou uma resposta de relatório inválida.');
  }

  const parsed = reportDataSchema.safeParse(body.dados);
  if (!parsed.success) throw new Error('O backend retornou dados incompatíveis com o relatório.');
  return parsed.data;
}

export async function exportarRelatorioAdmin(
  filtros: RelatorioAdminFiltros,
): Promise<RelatorioCsvDownload> {
  const request = await criarUrlAutenticada('exportarRelatorioAdmin', filtros);
  const response = await fetch(request.url, { method: 'GET', headers: request.headers });
  if (!response.ok) {
    throw new Error(await lerMensagemErro(response, 'Não foi possível exportar este relatório.'));
  }

  return {
    blob: await response.blob(),
    nomeArquivo: `relatorio-${filtros.categoria}-${filtros.mesReferencia}.csv`,
  };
}
