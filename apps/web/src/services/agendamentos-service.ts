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
  runTransaction,
  setDoc,
  where,
} from 'firebase/firestore';
import { environment } from '@/config/env';
import { auth, db } from '@/lib/firebase';
import type { Agendamento as UiAgendamento } from '@/features/agendamentos/types/agendamento';
import {
  mapFirestoreDocToService,
  resolveLocalServiceImage,
  type FirestoreServiceData,
} from '@/features/services/service-firestore-repository';

/**
 * Obtém a URL base das Cloud Functions para o ambiente atual.
 */
export function getFunctionsBaseUrl(): string {
  const projectId = environment.firebase?.projectId;
  if (!projectId) {
    throw new Error('Firebase não está configurado.');
  }
  if (environment.useFirebaseEmulators) {
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
 * Solicita um novo agendamento na Cloud Function do backend.
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
 * Atualiza o status de um agendamento existente via Cloud Function (restrito à administradora).
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
    const url = `${getFunctionsBaseUrl()}/atualizarStatusAgendamento`;
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

/** Salva uma solicitação diretamente no Firestore, usando perfil e serviço como fontes oficiais. */
export async function criarAgendamentoFirestore(
  input: SolicitarAgendamentoInput,
  clienteIdSolicitado?: string,
): Promise<{ sucesso: boolean; dados?: SharedAgendamento; erro?: string }> {
  if (!db || !auth?.currentUser) {
    return { sucesso: false, erro: 'Entre na sua conta para salvar o agendamento.' };
  }

  const usuario = auth.currentUser;
  const clienteId = clienteIdSolicitado ?? usuario.uid;
  const perfilRef = doc(db, 'clientes', clienteId);
  const servicoRef = doc(db, 'servicos', input.servicoId);
  let etapa = 'consultar o perfil do cliente';

  try {
    const perfilSnapshot = await getDoc(perfilRef);
    if (!perfilSnapshot.exists()) {
      return { sucesso: false, erro: 'O perfil deste cliente não foi encontrado no Firebase.' };
    }
    if (typeof perfilSnapshot.data().nome !== 'string' || !perfilSnapshot.data().nome.trim()) {
      return { sucesso: false, erro: 'O perfil deste cliente não possui um nome válido.' };
    }

    etapa = 'consultar o serviço selecionado';
    const servicoSnapshot = await getDoc(servicoRef);
    if (!servicoSnapshot.exists()) {
      return { sucesso: false, erro: 'O serviço selecionado não foi encontrado no Firebase.' };
    }

    const perfil = perfilSnapshot.data();
    const servico = mapFirestoreDocToService(
      servicoSnapshot.id,
      servicoSnapshot.data() as FirestoreServiceData,
    );
    if (!servico.active) {
      return { sucesso: false, erro: 'Este serviço está inativo e não pode ser agendado.' };
    }

    const inicio = new Date(input.dataHoraInicio);
    if (Number.isNaN(inicio.getTime()) || inicio.getTime() <= Date.now()) {
      return { sucesso: false, erro: 'Escolha uma data e horário futuros válidos.' };
    }
    const fim = new Date(inicio.getTime() + servico.durationMinutes * 60_000);
    const agora = new Date().toISOString();
    const id = `ag-${crypto.randomUUID()}`;
    const sinalIsento = usuario.uid !== clienteId && input.isencaoSinalAdmin === true;
    const creditoAgendamentoId = input.creditoAgendamentoId;
    let valorSinalEmCentavos = sinalIsento
      ? 0
      : (servico.sinalInCents ?? Math.round(servico.priceInCents * 0.3));

    let agendamentoCreditoRef: ReturnType<typeof doc> | undefined;
    let creditoSinalEmCentavos: number | undefined;
    if (creditoAgendamentoId) {
      if (sinalIsento) {
        return {
          sucesso: false,
          erro: 'Um agendamento isento não pode consumir crédito de sinal.',
        };
      }
      agendamentoCreditoRef = doc(db, 'agendamentos', creditoAgendamentoId);
      const creditoSnapshot = await getDoc(agendamentoCreditoRef);
      if (!creditoSnapshot.exists()) {
        return { sucesso: false, erro: 'O crédito de sinal selecionado não foi encontrado.' };
      }
      const credito = creditoSnapshot.data() as SharedAgendamento;
      if (
        credito.clienteId !== clienteId ||
        credito.status !== 'cancelado' ||
        credito.classificacaoCancelamento !== 'no_prazo' ||
        credito.sinalRetido !== false ||
        credito.sinalPagoConfirmado !== true ||
        credito.sinalDisponivelReagendamento !== true ||
        !Number.isInteger(credito.valorSinalEmCentavos) ||
        credito.valorSinalEmCentavos <= 0
      ) {
        return {
          sucesso: false,
          erro: 'Este agendamento não possui um sinal disponível para reaproveitamento.',
        };
      }
      if (credito.valorSinalEmCentavos > servico.priceInCents) {
        return {
          sucesso: false,
          erro: 'O valor do serviço escolhido é menor que o sinal disponível para reaproveitamento.',
        };
      }
      creditoSinalEmCentavos = credito.valorSinalEmCentavos;
      valorSinalEmCentavos = creditoSinalEmCentavos;
    }
    const agendamento: SharedAgendamento = {
      id,
      clienteId,
      clienteNome: String(perfil.nome ?? ''),
      ...(typeof perfil.email === 'string' ? { clienteEmail: perfil.email } : {}),
      ...(typeof perfil.telefone === 'string' ? { clienteTelefone: perfil.telefone } : {}),
      servicoId: servico.id,
      servicoNome: servico.name,
      duracaoMinutos: servico.durationMinutes,
      valorTotalEmCentavos: servico.priceInCents,
      valorSinalEmCentavos,
      saldoRestanteEmCentavos: servico.priceInCents - valorSinalEmCentavos,
      dataHoraInicio: inicio.toISOString(),
      dataHoraFim: fim.toISOString(),
      intervaloAposMinutos: 30,
      profissionalId: input.profissionalId ?? 'prof-tais-romagnoli',
      profissionalNome: input.profissionalNome ?? 'Tais Romagnoli',
      status: 'pendente',
      metodoPagamento: input.metodoPagamento,
      origem: usuario.uid === clienteId ? 'app_cliente' : 'presencial_admin',
      sinalIsento,
      ...(creditoAgendamentoId ? { creditoAgendamentoOrigemId: creditoAgendamentoId } : {}),
      ...(input.observacoes ? { observacoes: input.observacoes } : {}),
      createdAt: agora,
      updatedAt: agora,
    };
    etapa = 'gravar o agendamento';
    const agendamentoRef = doc(db, 'agendamentos', id);
    if (agendamentoCreditoRef && creditoSinalEmCentavos !== undefined) {
      await runTransaction(db, async (transaction) => {
        const creditoSnapshot = await transaction.get(agendamentoCreditoRef!);
        if (!creditoSnapshot.exists()) {
          throw new Error('O crédito de sinal selecionado não foi encontrado.');
        }
        const credito = creditoSnapshot.data() as SharedAgendamento;
        if (
          credito.clienteId !== clienteId ||
          credito.status !== 'cancelado' ||
          credito.classificacaoCancelamento !== 'no_prazo' ||
          credito.sinalRetido !== false ||
          credito.sinalPagoConfirmado !== true ||
          credito.sinalDisponivelReagendamento !== true ||
          credito.valorSinalEmCentavos !== creditoSinalEmCentavos
        ) {
          throw new Error('Este crédito de sinal já foi utilizado ou não está mais disponível.');
        }
        transaction.update(agendamentoCreditoRef!, {
          sinalDisponivelReagendamento: false,
          sinalTransferidoParaAgendamentoId: id,
          sinalTransferidoEm: agora,
          updatedAt: agora,
        });
        transaction.set(agendamentoRef, agendamento);
      });
    } else {
      await setDoc(agendamentoRef, agendamento);
    }
    return { sucesso: true, dados: agendamento };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gravar no Firestore.';
    const firebaseCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : undefined;
    if (
      firebaseCode === 'permission-denied' ||
      /missing or insufficient permissions/i.test(message)
    ) {
      return {
        sucesso: false,
        erro: `O Firebase recusou a operação ao ${etapa} (permission-denied). Confira a autorização da coleção correspondente nas Security Rules.`,
      };
    }
    return {
      sucesso: false,
      erro: message,
    };
  }
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
