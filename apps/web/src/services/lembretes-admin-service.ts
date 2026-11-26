import {
  clinicSettingsSchema,
  type Agendamento,
  type ClinicSettings,
} from '@clinica/shared';
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  gerarMensagemLembreteWhatsapp,
  type LembreteFilaItem,
} from '@/features/admin-dashboard/utils/whatsapp-reminders';

const SETTINGS_COLLECTION = 'configuracoes';
const SETTINGS_DOCUMENT = 'geral';
const REMINDER_QUEUE_COLLECTION = 'fila_lembretes';
const MAX_IN_QUERY_VALUES = 30;

interface PerfilLembrete {
  telefone?: string;
  lembretesAgendamento: boolean;
}

interface EstadoPersistidoLembrete {
  agendamentoId: string;
  dataHoraInicio: string;
  status: 'pendente' | 'enviado';
  enviadoEm: string | null;
  mensagemPersonalizada: string;
  updatedAt: string;
}

export interface AtualizacaoLembreteAdmin {
  agendamentoId: string;
  dataHoraInicio: string;
  status: 'pendente' | 'enviado';
  mensagemPersonalizada?: string;
}

function exigirAcessoAutenticado(): void {
  if (!db || !auth?.currentUser) {
    throw new Error('Entre com a conta da administradora para carregar a fila de lembretes.');
  }
}

function converterErroFirestore(error: unknown): Error {
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'permission-denied') {
      return new Error('O Firestore negou o acesso à fila de lembretes para esta conta.');
    }
    if (error.code === 'failed-precondition') {
      return new Error('O Firestore exige um índice para montar a fila de lembretes.');
    }
  }
  return error instanceof Error
    ? error
    : new Error('Não foi possível carregar a fila de lembretes.');
}

async function carregarConfiguracoes(): Promise<ClinicSettings> {
  if (!db) throw new Error('Firebase não está configurado.');
  const snapshot = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOCUMENT));
  const dados = snapshot.exists() ? snapshot.data() : undefined;
  if (!dados) throw new Error('As configurações da clínica ainda não foram cadastradas.');
  const resultado = clinicSettingsSchema.safeParse(dados);
  if (!resultado.success) throw new Error('As configurações da clínica estão inválidas.');
  return resultado.data;
}

function mapearPerfil(snapshot: QueryDocumentSnapshot): PerfilLembrete {
  const dados = snapshot.data();
  const preferencias = dados.preferenciasContato;
  return {
    telefone: typeof dados.telefone === 'string' ? dados.telefone : undefined,
    lembretesAgendamento:
      !preferencias || typeof preferencias !== 'object' || !('lembretesAgendamento' in preferencias)
        ? true
        : preferencias.lembretesAgendamento !== false,
  };
}

async function carregarPerfis(clientIds: string[]): Promise<Map<string, PerfilLembrete>> {
  if (!db || clientIds.length === 0) return new Map();
  const firestore = db;
  const unicos = [...new Set(clientIds)];
  const snapshots = await Promise.all(
    Array.from({ length: Math.ceil(unicos.length / MAX_IN_QUERY_VALUES) }, (_, index) => {
      const lote = unicos.slice(index * MAX_IN_QUERY_VALUES, (index + 1) * MAX_IN_QUERY_VALUES);
      return getDocs(query(collection(firestore, 'clientes'), where(documentId(), 'in', lote)));
    }),
  );
  return new Map(
    snapshots.flatMap((snapshot) =>
      snapshot.docs.map((perfil) => [perfil.id, mapearPerfil(perfil)] as const),
    ),
  );
}

async function carregarEstadosPersistidos(
  agendamentoIds: string[],
): Promise<Map<string, EstadoPersistidoLembrete>> {
  if (!db || agendamentoIds.length === 0) return new Map();
  const firestore = db;
  const snapshots = await Promise.all(
    Array.from({ length: Math.ceil(agendamentoIds.length / MAX_IN_QUERY_VALUES) }, (_, index) => {
      const lote = agendamentoIds.slice(
        index * MAX_IN_QUERY_VALUES,
        (index + 1) * MAX_IN_QUERY_VALUES,
      );
      return getDocs(
        query(collection(firestore, REMINDER_QUEUE_COLLECTION), where(documentId(), 'in', lote)),
      );
    }),
  );
  return new Map(
    snapshots.flatMap((snapshot) =>
      snapshot.docs.flatMap((documento) => {
        const dados = documento.data();
        if (
          dados.agendamentoId !== documento.id ||
          (dados.status !== 'pendente' && dados.status !== 'enviado') ||
          typeof dados.dataHoraInicio !== 'string' ||
          typeof dados.mensagemPersonalizada !== 'string'
        ) {
          return [];
        }
        return [
          [
            documento.id,
            {
              agendamentoId: documento.id,
              dataHoraInicio: dados.dataHoraInicio,
              status: dados.status,
              enviadoEm: typeof dados.enviadoEm === 'string' ? dados.enviadoEm : null,
              mensagemPersonalizada: dados.mensagemPersonalizada,
              updatedAt: typeof dados.updatedAt === 'string' ? dados.updatedAt : '',
            } satisfies EstadoPersistidoLembrete,
          ] as const,
        ];
      }),
    ),
  );
}

function formatarHorario(agendamento: Agendamento): string {
  const inicio = new Date(agendamento.dataHoraInicio);
  const fim = new Date(agendamento.dataHoraFim);
  const opcoes: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  if (Number.isNaN(inicio.getTime())) return '—';
  const horaInicio = inicio.toLocaleTimeString('pt-BR', opcoes);
  const horaFim = Number.isNaN(fim.getTime()) ? '' : fim.toLocaleTimeString('pt-BR', opcoes);
  return horaFim ? `${horaInicio} - ${horaFim}` : horaInicio;
}

function formatarData(value: string): string {
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
}

function mapearAgendamentoParaFila(
  agendamento: Agendamento,
  perfil: PerfilLembrete | undefined,
  persistido: EstadoPersistidoLembrete | undefined,
): LembreteFilaItem {
  const statusPersistido =
    persistido?.dataHoraInicio === agendamento.dataHoraInicio ? persistido : undefined;
  const horario = formatarHorario(agendamento);
  const dataFormatada = formatarData(agendamento.dataHoraInicio);
  const mensagem =
    statusPersistido?.mensagemPersonalizada ||
    gerarMensagemLembreteWhatsapp({
      clienteNome: agendamento.clienteNome,
      servicoNome: agendamento.servicoNome,
      horario,
      dataFormatada,
      profissionalNome: agendamento.profissionalNome,
    });

  return {
    id: agendamento.id,
    clienteId: agendamento.clienteId,
    clienteNome: agendamento.clienteNome,
    clienteTelefone: agendamento.clienteTelefone || perfil?.telefone || '',
    servicoNome: agendamento.servicoNome,
    duracao: `${agendamento.duracaoMinutos} min`,
    horario,
    dataFormatada,
    dataHoraInicio: agendamento.dataHoraInicio,
    statusAgendamento: agendamento.status,
    statusLembrete: statusPersistido?.status ?? 'pendente',
    enviadoEm: statusPersistido?.enviadoEm ?? undefined,
    mensagemPersonalizada: mensagem,
  };
}

export async function gerarFilaLembretesAdmin(agora = new Date()): Promise<LembreteFilaItem[]> {
  exigirAcessoAutenticado();
  if (!db) return [];

  try {
    const configuracoes = await carregarConfiguracoes();
    const lembretes = configuracoes.lembretes;
    if (!lembretes?.lembreteAtivo || !lembretes.canais.whatsapp) return [];

    const inicio = agora.toISOString();
    const fim = new Date(
      agora.getTime() + lembretes.antecedenciaHoras * 60 * 60 * 1000,
    ).toISOString();
    const consulta = query(
      collection(db, 'agendamentos'),
      where('dataHoraInicio', '>=', inicio),
      where('dataHoraInicio', '<', fim),
    );
    const agendamentosSnapshot = await getDocs(consulta);
    const candidatos = agendamentosSnapshot.docs
      .map((documento) => ({ ...(documento.data() as Omit<Agendamento, 'id'>), id: documento.id }))
      .filter((agendamento) => {
        const inicioMs = Date.parse(agendamento.dataHoraInicio);
        return (
          Number.isFinite(inicioMs) &&
          inicioMs >= agora.getTime() &&
          inicioMs < Date.parse(fim) &&
          (agendamento.status === 'pendente' || agendamento.status === 'confirmado')
        );
      });

    if (candidatos.length === 0) return [];

    const [perfis, estados] = await Promise.all([
      carregarPerfis(candidatos.map((agendamento) => agendamento.clienteId)),
      carregarEstadosPersistidos(candidatos.map((agendamento) => agendamento.id)),
    ]);

    return candidatos
      .filter((agendamento) => perfis.get(agendamento.clienteId)?.lembretesAgendamento !== false)
      .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio))
      .map((agendamento) =>
        mapearAgendamentoParaFila(
          agendamento,
          perfis.get(agendamento.clienteId),
          estados.get(agendamento.id),
        ),
      );
  } catch (error) {
    throw converterErroFirestore(error);
  }
}

export async function salvarEstadoLembreteAdmin(
  atualizacao: AtualizacaoLembreteAdmin,
): Promise<void> {
  exigirAcessoAutenticado();
  if (!db) throw new Error('Firebase não está configurado.');
  if (!atualizacao.dataHoraInicio || Number.isNaN(new Date(atualizacao.dataHoraInicio).getTime())) {
    throw new Error('O agendamento não tem uma data válida para registrar o lembrete.');
  }

  const agora = new Date().toISOString();
  try {
    await setDoc(doc(db, REMINDER_QUEUE_COLLECTION, atualizacao.agendamentoId), {
      agendamentoId: atualizacao.agendamentoId,
      dataHoraInicio: atualizacao.dataHoraInicio,
      status: atualizacao.status,
      enviadoEm: atualizacao.status === 'enviado' ? agora : null,
      mensagemPersonalizada: atualizacao.mensagemPersonalizada ?? '',
      updatedAt: agora,
    });
  } catch (error) {
    throw converterErroFirestore(error);
  }
}
