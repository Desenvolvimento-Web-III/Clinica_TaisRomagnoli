import {
  type Agendamento as SharedAgendamento,
  type SolicitarAgendamentoInput,
  type CancelarAgendamentoInput,
  type AlterarAgendamentoInput,
} from '@clinica/shared';
import { environment } from '@/config/env';
import { auth } from '@/lib/firebase';
import type { Agendamento as UiAgendamento } from '@/features/agendamentos/types/agendamento';
import {
  getAgendamentosStorage,
  saveAgendamentosStorage,
  addAgendamentoStorage,
} from '@/features/agendamentos/data/agendamentos-storage';
import { resolveLocalServiceImage } from '@/features/services/service-firestore-repository';

/**
 * Obtém a URL base das Cloud Functions para o ambiente atual.
 */
export function getFunctionsBaseUrl(): string {
  const projectId = environment.firebase?.projectId || 'demo-clinica-local';
  if (environment.useFirebaseEmulators || import.meta.env.DEV) {
    return `http://127.0.0.1:5001/${projectId}/us-central1`;
  }
  return `https://us-central1-${projectId}.cloudfunctions.net`;
}

/**
 * Converte um agendamento do backend/Firestore para o modelo de exibição da UI.
 */
export function mapBackendAgendamentoToUi(item: SharedAgendamento): UiAgendamento {
  const dataInicio = new Date(item.dataHoraInicio);
  const dataFim = new Date(item.dataHoraFim);

  const diaSemana = dataInicio.toLocaleDateString('pt-BR', { weekday: 'short' });
  const dia = dataInicio.getDate().toString().padStart(2, '0');
  const mes = dataInicio.toLocaleDateString('pt-BR', { month: 'short' });

  const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const horaFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let statusUi: UiAgendamento['status'] = 'pendente';
  if (item.status === 'confirmado') statusUi = 'confirmado';
  else if (item.status === 'cancelado') statusUi = 'cancelado';
  else if (item.status === 'concluido') statusUi = 'concluido';
  else statusUi = 'pendente';

  return {
    id: item.id,
    clienteId: item.clienteId,
    servicoNome: item.servicoNome,
    servicoCategoria: 'Massoterapia',
    duracaoMinutos: item.duracaoMinutos,
    profissionalNome: item.profissionalNome || 'Tais Romagnoli',
    dataHoraIso: item.dataHoraInicio,
    dataFormatada: `${diaSemana}, ${dia} ${mes}`,
    horarioFormatado: `${horaInicio} - ${horaFim}`,
    valorTotal: item.valorTotalEmCentavos / 100,
    sinalPago: item.valorSinalEmCentavos / 100,
    status: statusUi,
    imagemUrl: resolveLocalServiceImage(item.servicoId, item.servicoNome),
    observacao: item.observacoes,
  };
}

/**
 * Obtém o token de autenticação JWT atual do usuário logado, se houver.
 */
export async function getAuthToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Solicita um novo agendamento na Cloud Function do backend.
 */
export async function solicitarAgendamentoBackend(
  input: SolicitarAgendamentoInput,
  token?: string | null,
): Promise<{ sucesso: boolean; dados?: SharedAgendamento; erro?: string }> {
  const authToken = token ?? (await getAuthToken());
  if (!authToken) {
    return { sucesso: false, erro: 'Usuário não autenticado no Firebase.' };
  }

  try {
    const url = `${getFunctionsBaseUrl()}/solicitarAgendamento`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(input),
    });

    const body = await response.json();

    if (!response.ok) {
      return {
        sucesso: false,
        erro: body.error || 'Não foi possível processar o agendamento no servidor.',
      };
    }

    return { sucesso: true, dados: body.dados };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na comunicação com o servidor.';
    return { sucesso: false, erro: msg };
  }
}

/**
 * Altera ou reagenda um agendamento existente na Cloud Function do backend.
 */
export async function alterarAgendamentoBackend(
  input: AlterarAgendamentoInput,
  token?: string | null,
): Promise<{ sucesso: boolean; dados?: SharedAgendamento; erro?: string }> {
  const authToken = token ?? (await getAuthToken());
  if (!authToken) {
    return { sucesso: false, erro: 'Usuário não autenticado no Firebase.' };
  }

  try {
    const url = `${getFunctionsBaseUrl()}/alterarAgendamento`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(input),
    });

    const body = await response.json();

    if (!response.ok) {
      return {
        sucesso: false,
        erro: body.error || 'Não foi possível alterar o agendamento no servidor.',
      };
    }

    return { sucesso: true, dados: body.dados };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na comunicação com o servidor.';
    return { sucesso: false, erro: msg };
  }
}

/**
 * Cancela um agendamento existente na Cloud Function do backend com validação da regra de 3 horas.
 */
export async function cancelarAgendamentoBackend(
  input: CancelarAgendamentoInput,
  token?: string | null,
): Promise<{ sucesso: boolean; dados?: SharedAgendamento; erro?: string }> {
  const authToken = token ?? (await getAuthToken());
  if (!authToken) {
    return { sucesso: false, erro: 'Usuário não autenticado no Firebase.' };
  }

  try {
    const url = `${getFunctionsBaseUrl()}/cancelarAgendamento`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(input),
    });

    const body = await response.json();

    if (!response.ok) {
      return {
        sucesso: false,
        erro: body.error || 'Não foi possível cancelar o agendamento no servidor.',
      };
    }

    return { sucesso: true, dados: body.dados };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na comunicação com o servidor.';
    return { sucesso: false, erro: msg };
  }
}

/**
 * Lista os agendamentos do cliente autenticado via Cloud Function.
 */
export async function listarAgendamentosBackend(
  token?: string | null,
): Promise<{ sucesso: boolean; dados: SharedAgendamento[]; erro?: string }> {
  const authToken = token ?? (await getAuthToken());
  if (!authToken) {
    return { sucesso: false, dados: [], erro: 'Usuário não autenticado no Firebase.' };
  }

  try {
    const url = `${getFunctionsBaseUrl()}/listarMeusAgendamentos`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const body = await response.json();

    if (!response.ok) {
      return {
        sucesso: false,
        dados: [],
        erro: body.error || 'Não foi possível buscar agendamentos do servidor.',
      };
    }

    return { sucesso: true, dados: body.dados || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na comunicação com o servidor.';
    return { sucesso: false, dados: [], erro: msg };
  }
}

/**
 * Sincroniza e busca agendamentos para a UI:
 * Se logado com Firebase e backend disponível, busca do servidor e atualiza o storage local.
 * Caso contrário, consulta o storage local (modo offline / convidado / fallback).
 */
export async function carregarAgendamentos(
  userId?: string | null,
): Promise<{ agendamentos: UiAgendamento[]; sincronizadoComBackend: boolean; erro?: string }> {
  const token = await getAuthToken();

  if (userId && token) {
    const resultado = await listarAgendamentosBackend(token);
    if (resultado.sucesso && Array.isArray(resultado.dados)) {
      const mapeados = resultado.dados.map(mapBackendAgendamentoToUi);

      // Sincroniza no cache local preservando agendamentos locais se não houver no servidor ainda
      if (mapeados.length > 0) {
        saveAgendamentosStorage(mapeados, userId);
        return { agendamentos: mapeados, sincronizadoComBackend: true };
      }
    }
  }

  // Fallback: storage local
  const locais = getAgendamentosStorage(userId);
  return { agendamentos: locais, sincronizadoComBackend: false };
}

/**
 * Criação de agendamento pela UI:
 * Se autenticado, realiza a chamada para a Cloud Function com gravação no Firestore.
 * Também mantém o cache local atualizado e funciona em fallback caso offline.
 */
export async function criarAgendamento(
  input: SolicitarAgendamentoInput,
  userId?: string | null,
): Promise<{ sucesso: boolean; agendamento?: UiAgendamento; erro?: string }> {
  const token = await getAuthToken();

  if (userId && token) {
    const resposta = await solicitarAgendamentoBackend(input, token);
    if (resposta.sucesso && resposta.dados) {
      const uiAgendamento = mapBackendAgendamentoToUi(resposta.dados);
      addAgendamentoStorage(uiAgendamento, userId);
      return { sucesso: true, agendamento: uiAgendamento };
    }

    // Se houve erro de regra de negócio vindo do backend, retorne o erro
    if (resposta.erro) {
      return { sucesso: false, erro: resposta.erro };
    }
  }

  // Fallback local caso sem Firebase autenticado
  const dataInicio = new Date(input.dataHoraInicio);
  const dataFim = new Date(dataInicio.getTime() + input.duracaoMinutos * 60 * 1000);
  const diaSemana = dataInicio.toLocaleDateString('pt-BR', { weekday: 'short' });
  const dia = dataInicio.getDate().toString().padStart(2, '0');
  const mes = dataInicio.toLocaleDateString('pt-BR', { month: 'short' });
  const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const horaFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const valorTotal = input.valorTotalEmCentavos / 100;
  const sinalPago = Math.round(valorTotal * 0.3 * 100) / 100;

  const fallbackAgendamento: UiAgendamento = {
    id: `ag-${Date.now()}`,
    clienteId: userId ?? undefined,
    servicoNome: input.servicoNome,
    servicoCategoria: 'Massoterapia',
    duracaoMinutos: input.duracaoMinutos,
    profissionalNome: input.profissionalNome || 'Tais Romagnoli',
    dataHoraIso: input.dataHoraInicio,
    dataFormatada: `${diaSemana}, ${dia} ${mes}`,
    horarioFormatado: `${horaInicio} - ${horaFim}`,
    valorTotal,
    sinalPago,
    status: 'pendente',
    imagemUrl: resolveLocalServiceImage(input.servicoId, input.servicoNome),
    observacao: input.observacoes,
  };

  addAgendamentoStorage(fallbackAgendamento, userId);
  return { sucesso: true, agendamento: fallbackAgendamento };
}
