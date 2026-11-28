import {
  type Agendamento as SharedAgendamento,
  type SolicitarAgendamentoInput,
  type CancelarAgendamentoInput,
  type AlterarAgendamentoInput,
  type AtualizarStatusAgendamentoInput,
} from '@clinica/shared';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { environment } from '@/config/env';
import { auth, db } from '@/lib/firebase';
import type { Agendamento as UiAgendamento } from '@/features/agendamentos/types/agendamento';
import {
  resolveLocalServiceImage,
} from '@/features/services/service-firestore-repository';

/** Retorna a URL base da API do backend configurada no build do frontend. */
export function getApiBaseUrl(): string {
  if (!environment.availabilityApiBaseUrl) {
    throw new Error('A URL da API do Coolify não está configurada.');
  }
  return environment.availabilityApiBaseUrl;
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
    servicoId: item.servicoId,
    servicoNome: item.servicoNome,
    servicoCategoria: 'Massoterapia',
    duracaoMinutos: item.duracaoMinutos,
    profissionalId: item.profissionalId,
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
 * Solicita um novo agendamento na API do backend.
 */
export async function solicitarAgendamentoBackend(
  input: SolicitarAgendamentoInput,
  token?: string | null,
): Promise<{
  sucesso: boolean;
  dados?: SharedAgendamento;
  erro?: string;
  statusCode?: number;
  networkError?: boolean;
}> {
  const authToken = token ?? (await getAuthToken());
  if (!authToken) {
    return { sucesso: false, erro: 'Usuário não autenticado no Firebase.' };
  }

  try {
    const url = `${getApiBaseUrl()}/solicitarAgendamento`;
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
        statusCode: response.status,
      };
    }

    return { sucesso: true, dados: body.dados };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na comunicação com o servidor.';
    return { sucesso: false, erro: msg, networkError: true };
  }
}

/**
 * Atualiza o status de um agendamento existente via API (restrito à administradora).
 */
export async function atualizarStatusAgendamentoBackend(
  input: AtualizarStatusAgendamentoInput,
  token?: string | null,
): Promise<{
  sucesso: boolean;
  dados?: SharedAgendamento;
  erro?: string;
  statusCode?: number;
  networkError?: boolean;
}> {
  const authToken = token ?? (await getAuthToken());
  if (!authToken) {
    return { sucesso: false, erro: 'Usuário não autenticado no Firebase.' };
  }

  try {
    const url = `${getApiBaseUrl()}/atualizarStatusAgendamento`;
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
        erro: body.error || 'Não foi possível atualizar o status do agendamento.',
        statusCode: response.status,
      };
    }

    return { sucesso: true, dados: body.dados };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na comunicação com o servidor.';
    return { sucesso: false, erro: msg, networkError: true };
  }
}

/**
 * Altera ou reagenda um agendamento existente na API do backend.
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
    const url = `${getApiBaseUrl()}/alterarAgendamento`;
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
 * Cancela um agendamento existente na API do backend com validação da regra de 3 horas.
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
    const url = `${getApiBaseUrl()}/cancelarAgendamento`;
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
 * Lista agendamentos no Firestore. A consulta do cliente é limitada ao próprio UID;
 * consultas administrativas para outro cliente continuam sujeitas às Security Rules.
 */
export async function listarAgendamentosBackend(
  token?: string | null,
  clienteId?: string,
): Promise<{ sucesso: boolean; dados: SharedAgendamento[]; erro?: string }> {
  const uidAutenticado = auth?.currentUser?.uid;
  if (!db || !uidAutenticado) {
    return { sucesso: false, dados: [], erro: 'Usuário não autenticado no Firebase.' };
  }

  try {
    const donoConsulta = clienteId ?? uidAutenticado;
    const constraints = [where('clienteId', '==', donoConsulta), orderBy('dataHoraInicio', 'asc')];
    const q = query(collection(db, 'agendamentos'), ...constraints);
    const snapshot = await getDocs(q);
    const dados = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as SharedAgendamento),
      id: docSnap.id,
    }));
    return { sucesso: true, dados };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na comunicação com o servidor.';
    return { sucesso: false, dados: [], erro: msg };
  }
}

/**
 * Consulta agendamentos diretamente no Firestore para a visão da agenda administrativa.
 */
export async function buscarAgendamentosAdmin(): Promise<SharedAgendamento[]> {
  if (!db || !auth?.currentUser) {
    return [];
  }

  try {
    const q = query(collection(db, 'agendamentos'), orderBy('dataHoraInicio', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((docSnap) => docSnap.data() as SharedAgendamento);
  } catch {
    return [];
  }
}

/** Busca no Firestore os agendamentos do dia local atual para a agenda administrativa. */
export async function buscarAgendamentosAdminDoDia(
  dataReferencia = new Date(),
): Promise<SharedAgendamento[]> {
  if (!db || !auth?.currentUser) {
    throw new Error('Faça login como administradora para consultar a agenda.');
  }

  const inicioDoDia = new Date(dataReferencia);
  inicioDoDia.setHours(0, 0, 0, 0);
  const inicioDoProximoDia = new Date(inicioDoDia);
  inicioDoProximoDia.setDate(inicioDoProximoDia.getDate() + 1);

  const q = query(
    collection(db, 'agendamentos'),
    where('dataHoraInicio', '>=', inicioDoDia.toISOString()),
    where('dataHoraInicio', '<', inicioDoProximoDia.toISOString()),
    orderBy('dataHoraInicio', 'asc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data() as SharedAgendamento);
}

/** Cria um agendamento pela API, que valida perfil, serviço, anamnese e disponibilidade. */
export async function criarAgendamentoApi(
  input: SolicitarAgendamentoInput,
  clienteIdSolicitado?: string,
): Promise<{ sucesso: boolean; dados?: SharedAgendamento; erro?: string }> {
  const payload = clienteIdSolicitado ? { ...input, clienteId: clienteIdSolicitado } : input;
  return await solicitarAgendamentoBackend(payload, await getAuthToken());
}

/**
 * Busca agendamentos persistidos no backend para a UI.
 */
export async function carregarAgendamentos(
  userId?: string | null,
): Promise<{ agendamentos: UiAgendamento[]; sincronizadoComBackend: boolean; erro?: string }> {
  if (!userId || auth?.currentUser?.uid !== userId) {
    return { agendamentos: [], sincronizadoComBackend: false, erro: 'Entre na sua conta para consultar os agendamentos.' };
  }
  const resultado = await listarAgendamentosBackend();
  if (!resultado.sucesso) {
    return { agendamentos: [], sincronizadoComBackend: false, erro: resultado.erro };
  }
  return { agendamentos: resultado.dados.map(mapBackendAgendamentoToUi), sincronizadoComBackend: true };
}

/**
 * Criação de agendamento pela UI:
 * Realiza a solicitação autenticada no backend e retorna apenas o resultado persistido.
 */
export async function criarAgendamento(
  input: SolicitarAgendamentoInput,
  userId?: string | null,
): Promise<{ sucesso: boolean; agendamento?: UiAgendamento; erro?: string }> {
  const token = await getAuthToken();

  if (!userId || !token) {
    return { sucesso: false, erro: 'Entre na sua conta para salvar o agendamento.' };
  }
  const resposta = await solicitarAgendamentoBackend(input, token);
  if (!resposta.sucesso || !resposta.dados) {
    return { sucesso: false, erro: resposta.erro || 'O backend não confirmou a gravação do agendamento.' };
  }
  return { sucesso: true, agendamento: mapBackendAgendamentoToUi(resposta.dados) };
}
