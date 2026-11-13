import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { avaliarBloqueioContraindicacao, type FichaAnamneseRecord } from '@clinica/shared';
import { db } from '@/lib/firebase';
import { demoAdministrativeClientProfile } from '@/features/admin-client-profile/demo-profile';
import type {
  AdministrativeClientProfile,
  AppointmentStatus,
  ClientAnamnesis,
} from '@/features/admin-client-profile/types';
import type { AdminClientListItem } from '@/features/admin-dashboard/types';
import { obterFichaAnamneseApi } from './anamnese-service';
import { listarAgendamentosBackend } from './agendamentos-service';

export const CLIENTES_DEMO_INICIAIS: AdminClientListItem[] = [
  {
    id: 'demo-client-1',
    nome: 'Mariana Silva',
    email: 'mariana.silva@exemplo.com',
    telefone: '(11) 98765-4321',
    status: 'ativo',
    totalAtendimentosMes: 3,
    ultimoAtendimento: '26/09/2026',
  },
  {
    id: 'demo-client-2',
    nome: 'Ana Carolina Santos',
    email: 'ana.santos@exemplo.com',
    telefone: '(11) 97654-3210',
    status: 'ativo',
    totalAtendimentosMes: 2,
    ultimoAtendimento: '25/09/2026',
  },
  {
    id: 'demo-client-3',
    nome: 'Juliana Lima',
    email: 'juliana.lima@exemplo.com',
    telefone: '(11) 96543-2109',
    status: 'ativo',
    totalAtendimentosMes: 1,
    ultimoAtendimento: '20/09/2026',
  },
  {
    id: 'demo-client-4',
    nome: 'Carlos Eduardo',
    email: 'carlos.eduardo@exemplo.com',
    telefone: '(11) 95432-1098',
    status: 'inativo',
    totalAtendimentosMes: 0,
    ultimoAtendimento: '22/09/2026',
  },
];

/**
 * Consulta a lista de clientes para a visão administrativa.
 * Consulta o Firestore com autorização administrativa (Security Rules: allow list: if isAdmin()).
 * Caso ocorra falha de rede ou em modo demonstrativo, retorna os clientes iniciais de fallback.
 */
export async function buscarClientesAdmin(): Promise<AdminClientListItem[]> {
  if (db) {
    try {
      const q = query(collection(db, 'clientes'), orderBy('nome', 'asc'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        return snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            nome: data.nome || 'Cliente sem nome',
            email: data.email || '',
            telefone: data.telefone || '',
            status: data.status === 'inativo' ? 'inativo' : 'ativo',
            totalAtendimentosMes:
              typeof data.totalAtendimentosMes === 'number' ? data.totalAtendimentosMes : 0,
            ultimoAtendimento: data.ultimoAtendimento || undefined,
            createdAt: data.createdAt || undefined,
          };
        });
      }
    } catch (err) {
      console.warn('Aviso: Consulta direta ao Firestore /clientes falhou ou sem permissão:', err);
    }
  }

  return CLIENTES_DEMO_INICIAIS;
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
  const demoListMatch = CLIENTES_DEMO_INICIAIS.find((c) => c.id === clientId);
  let fullName = demoListMatch?.nome || demoAdministrativeClientProfile.fullName;
  let email = demoListMatch?.email || demoAdministrativeClientProfile.email;
  let phone = demoListMatch?.telefone || demoAdministrativeClientProfile.phone;
  let status: 'ativo' | 'inativo' =
    demoListMatch?.status === 'inativo' ? 'inativo' : demoAdministrativeClientProfile.status;
  let registeredAt = demoListMatch?.createdAt || demoAdministrativeClientProfile.registeredAt;
  let birthDate = demoAdministrativeClientProfile.birthDate;

  let anamnesis: ClientAnamnesis | null =
    clientId === demoAdministrativeClientProfile.id || demoListMatch
      ? demoAdministrativeClientProfile.anamnesis
      : null;

  if (db) {
    try {
      const clientSnap = await getDoc(doc(db, 'clientes', clientId));
      if (clientSnap.exists()) {
        const data = clientSnap.data();
        fullName = data.nome || fullName;
        email = data.email || email;
        phone = data.telefone || phone;
        status = data.status === 'inativo' ? 'inativo' : 'ativo';
        registeredAt = data.createdAt || registeredAt;
        birthDate = data.dataNascimento || birthDate;
      }
    } catch {
      // fallback silencioso caso cliente seja demonstrativo ou sem doc
    }
  }

  const anamneseRes = await obterFichaAnamneseApi(clientId);
  if (anamneseRes.sucesso && anamneseRes.dados) {
    anamnesis = mapFichaAnamneseToAdminView(anamneseRes.dados);
  } else if (db && (!anamneseRes.sucesso || !anamneseRes.dados)) {
    try {
      const fichaSnap = await getDoc(doc(db, 'anamneses', clientId));
      if (fichaSnap.exists()) {
        anamnesis = mapFichaAnamneseToAdminView(fichaSnap.data() as Partial<FichaAnamneseRecord>);
      }
    } catch {
      // mantém anamnesis obtida anteriormente ou null
    }
  }

  let appointments =
    clientId === demoAdministrativeClientProfile.id || demoListMatch
      ? demoAdministrativeClientProfile.appointments
      : [];
  let payments =
    clientId === demoAdministrativeClientProfile.id || demoListMatch
      ? demoAdministrativeClientProfile.payments
      : [];

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
