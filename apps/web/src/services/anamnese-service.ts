import type { FichaAnamneseData, FichaAnamneseRecord } from '@clinica/shared';
import { getFunctionsBaseUrl, getAuthToken } from './agendamentos-service';

export async function salvarFichaAnamneseApi(
  dados: FichaAnamneseData,
  clienteId?: string,
  token?: string | null,
): Promise<{ sucesso: boolean; dados?: FichaAnamneseRecord; erro?: string }> {
  const authToken = token ?? (await getAuthToken());
  if (!authToken) {
    return { sucesso: false, erro: 'Usuário não autenticado.' };
  }

  try {
    const url = `${getFunctionsBaseUrl()}/salvarFichaAnamnese`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ clienteId, dados }),
    });

    const body = await response.json();
    if (!response.ok) {
      return {
        sucesso: false,
        erro: body.error || 'Erro ao salvar ficha de anamnese no servidor.',
      };
    }

    return { sucesso: true, dados: body.dados };
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Falha na comunicação com o servidor.',
    };
  }
}

export async function obterFichaAnamneseApi(
  clienteId?: string,
  token?: string | null,
): Promise<{ sucesso: boolean; dados?: FichaAnamneseRecord; erro?: string }> {
  const authToken = token ?? (await getAuthToken());
  if (!authToken) {
    return { sucesso: false, erro: 'Usuário não autenticado.' };
  }

  try {
    const params = clienteId ? `?clienteId=${encodeURIComponent(clienteId)}` : '';
    const url = `${getFunctionsBaseUrl()}/obterFichaAnamnese${params}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.status === 404) {
      return { sucesso: true, dados: undefined };
    }

    const body = await response.json();
    if (!response.ok) {
      return {
        sucesso: false,
        erro: body.error || 'Erro ao consultar ficha de anamnese no servidor.',
      };
    }

    return { sucesso: true, dados: body.dados };
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Falha na comunicação com o servidor.',
    };
  }
}
