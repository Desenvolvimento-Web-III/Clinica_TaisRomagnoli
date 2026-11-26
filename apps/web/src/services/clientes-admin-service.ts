import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { avaliarBloqueioContraindicacao, type FichaAnamneseRecord } from '@clinica/shared';
import { db } from '@/lib/firebase';
import type {
  AdministrativeClientProfile,
  AppointmentStatus,
  ClientAnamnesis,
} from '@/features/admin-client-profile/types';
import type { AdminClientListItem } from '@/features/admin-dashboard/types';
import type { Firestore } from 'firebase/firestore';
import { obterFichaAnamneseApi } from './anamnese-service';
import { listarAgendamentosBackend } from './agendamentos-service';

/** Converte um documento da coleção /clientes para o formato da listagem administrativa. */
export function mapFirestoreClientToAdminListItem(
  id: string,
  cliente: Record<string, unknown>,
): AdminClientListItem {
  const toIsoString = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'toDate' in value) {
      const date = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }
    return undefined;
  };

  return {
    id,
    nome:
      typeof cliente.nome === 'string' && cliente.nome.trim() ? cliente.nome : 'Cliente sem nome',
    email: typeof cliente.email === 'string' ? cliente.email : '',
    telefone: typeof cliente.telefone === 'string' ? cliente.telefone : '',
    status: cliente.status === 'inativo' ? 'inativo' : 'ativo',
    totalAtendimentosMes:
      typeof cliente.totalAtendimentosMes === 'number' ? cliente.totalAtendimentosMes : 0,
    ultimoAtendimento: toIsoString(cliente.ultimoAtendimento),
    createdAt: toIsoString(cliente.createdAt),
  };
}

/** Lista diretamente os documentos da coleção /clientes, protegida pelas Security Rules. */
export async function buscarClientesAdmin(
  customDb: Firestore | null = db,
): Promise<AdminClientListItem[]> {
  if (!customDb) {
    throw new Error('Firebase não está configurado para carregar os clientes.');
  }

  const snapshot = await getDocs(collection(customDb, 'clientes'));
  return snapshot.docs
    .map((clienteDoc) => mapFirestoreClientToAdminListItem(clienteDoc.id, clienteDoc.data()))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function mapFichaAnamneseToAdminView(ficha: Partial<FichaAnamneseRecord>): ClientAnamnesis {
  const avaliacao = avaliarBloqueioContraindicacao(ficha);
  const notesParts = [ficha.descricaoQueixa, ficha.observacoesAdicionais].filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0,
  );

  return {
    submittedAt: ficha.submittedAt || ficha.updatedAt || new Date().toISOString(),
    updatedAt: ficha.updatedAt || ficha.submittedAt || new Date().toISOString(),
    consentConfirmed: Boolean(ficha.consentimentoConfirmado),
    attentionPoints: Array.isArray(ficha.pontosAtencao) ? ficha.pontosAtencao : [],
    notes:
      notesParts.length > 0
        ? notesParts.join(' • ')
        : 'Nenhuma observação adicional registrada na ficha.',
    exigeLiberacaoMedica: avaliacao.exigeLiberacaoMedica,
    contraindicacoes: avaliacao.contraindicacoes,
    liberacaoMedicaAprovada: avaliacao.liberacaoMedicaAprovada,
    liberacaoMedicaObservacoes: ficha.liberacaoMedicaObservacoes,
    liberacaoMedicaAprovadaEm: ficha.liberacaoMedicaAprovadaEm,
    liberacaoMedicaAprovadaPor: ficha.liberacaoMedicaAprovadaPor,
  };
}

/**
 * Consulta perfil detalhado, ficha de anamnese e histórico de um cliente para o painel administrativo.
 */
export async function buscarPerfilClienteAdmin(
  clientId: string,
): Promise<AdministrativeClientProfile> {
  if (!db) throw new Error('Firebase não está configurado para carregar o perfil do cliente.');
  const clientSnap = await getDoc(doc(db, 'clientes', clientId));
  if (!clientSnap.exists()) throw new Error('Cliente não encontrado.');
  const data = clientSnap.data();
  const fullName = typeof data.nome === 'string' ? data.nome : 'Cliente sem nome';
  const email = typeof data.email === 'string' ? data.email : '';
  const phone = typeof data.telefone === 'string' ? data.telefone : '';
  const status: 'ativo' | 'inativo' = data.status === 'inativo' ? 'inativo' : 'ativo';
  const registeredAt = data.createdAt;
  const birthDate = data.dataNascimento;
  let anamnesis: ClientAnamnesis | null = null;

  const anamneseRes = await obterFichaAnamneseApi(clientId);
  if (anamneseRes.sucesso && anamneseRes.dados) {
    anamnesis = mapFichaAnamneseToAdminView(anamneseRes.dados);
  }

  let appointments: AdministrativeClientProfile['appointments'] = [];
  let payments: AdministrativeClientProfile['payments'] = [];

  const agendamentosRes = await listarAgendamentosBackend(undefined, clientId);
  if (agendamentosRes.sucesso && agendamentosRes.dados.length > 0) {
    appointments = agendamentosRes.dados.map((item) => ({
      id: item.id,
      serviceName: item.servicoNome,
      startsAt: item.dataHoraInicio,
      durationMinutes: item.duracaoMinutos,
      status: (item.status as AppointmentStatus) || 'agendado',
    }));
    payments = agendamentosRes.dados.map((item) => ({
      id: `pag-${item.id}`,
      description: `Sinal — ${item.servicoNome}`,
      amountInCents: item.valorSinalEmCentavos,
      dueAt: item.dataHoraInicio,
      status: item.sinalRetido ? 'perdido' : item.status === 'concluido' ? 'pago' : 'pendente',
    }));
  }

  return {
    id: clientId,
    fullName,
    email,
    phone,
    birthDate,
    status,
    registeredAt,
    appointments,
    payments,
    anamnesis,
  };
}
