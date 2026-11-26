import {
  filtrarLinhasRelatorio,
  montarTabelaRelatorio,
  reportDataSchema,
  reportRequestSchema,
  serializarRelatorioCsv,
  type Agendamento,
  type ReportCategory,
  type ReportClient,
  type ReportData,
} from '@clinica/shared';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

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

function intervaloIsoDoMes(mesReferencia: string): { inicio: string; fim: string } {
  const [ano, mes] = mesReferencia.split('-').map(Number);
  const proximoMes = new Date(Date.UTC(ano ?? 0, mes ?? 1, 1));
  const proximoMesIso = `${proximoMes.getUTCFullYear()}-${String(proximoMes.getUTCMonth() + 1).padStart(2, '0')}`;
  return {
    inicio: `${mesReferencia}-01T00:00:00.000Z`,
    fim: `${proximoMesIso}-01T00:00:00.000Z`,
  };
}

function converterDataIso(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    const data = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(data.getTime()) ? undefined : data.toISOString();
  }
  return undefined;
}

function converterCliente(id: string, data: Record<string, unknown>): ReportClient {
  const status = data.status === 'inativo' || data.status === 'pendente' ? data.status : 'ativo';
  return {
    id,
    nome: typeof data.nome === 'string' && data.nome.trim() ? data.nome : 'Cliente sem nome',
    email: typeof data.email === 'string' ? data.email : '',
    telefone: typeof data.telefone === 'string' ? data.telefone : '',
    status,
    createdAt: converterDataIso(data.createdAt),
  };
}

async function listarClientes(): Promise<ReportClient[]> {
  if (!db) throw new Error('Firebase não está configurado para consultar os relatórios.');
  const snapshot = await getDocs(collection(db, 'clientes'));
  return snapshot.docs
    .map((documento) => converterCliente(documento.id, documento.data()))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function listarAgendamentosPorCampoNoMes(
  campo: 'dataHoraInicio' | 'concluidoEm',
  mesReferencia: string,
): Promise<Agendamento[]> {
  if (!db) throw new Error('Firebase não está configurado para consultar os relatórios.');
  const intervalo = intervaloIsoDoMes(mesReferencia);
  const consulta = query(
    collection(db, 'agendamentos'),
    where(campo, '>=', intervalo.inicio),
    where(campo, '<', intervalo.fim),
  );
  const snapshot = await getDocs(consulta);
  return snapshot.docs.map((documento) => ({
    ...(documento.data() as Omit<Agendamento, 'id'>),
    id: documento.id,
  }));
}

function erroFirestore(error: unknown): Error {
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'permission-denied') {
      return new Error(
        'O Firestore negou a leitura. Confira o acesso da administradora nas regras.',
      );
    }
    if (error.code === 'failed-precondition') {
      return new Error('O Firestore exige um índice para esta consulta.');
    }
  }
  return error instanceof Error ? error : new Error('Não foi possível consultar os relatórios.');
}

async function carregarDadosRelatorio(
  input: Pick<RelatorioAdminFiltros, 'categoria' | 'mesReferencia'>,
): Promise<ReportData> {
  if (!auth?.currentUser)
    throw new Error('Entre com a conta da administradora para acessar os relatórios.');
  const filtros = reportRequestSchema.parse(input);
  const precisaDeClientes = filtros.categoria === 'clientes' || filtros.categoria === 'recorrencia';
  const precisaDeAgendamentosConcluidos = filtros.categoria !== 'agenda';

  try {
    const [clientes, agendamentosPorInicio, agendamentosConcluidos] = await Promise.all([
      precisaDeClientes ? listarClientes() : Promise.resolve([]),
      listarAgendamentosPorCampoNoMes('dataHoraInicio', filtros.mesReferencia),
      precisaDeAgendamentosConcluidos
        ? listarAgendamentosPorCampoNoMes('concluidoEm', filtros.mesReferencia)
        : Promise.resolve([]),
    ]);
    const agendamentosUnicos = new Map<string, Agendamento>();
    for (const agendamento of [...agendamentosPorInicio, ...agendamentosConcluidos]) {
      agendamentosUnicos.set(agendamento.id, agendamento);
    }
    const tabela = montarTabelaRelatorio(filtros.categoria, filtros.mesReferencia, clientes, [
      ...agendamentosUnicos.values(),
    ]);
    return reportDataSchema.parse({
      categoria: filtros.categoria,
      mesReferencia: filtros.mesReferencia,
      geradoEmIso: new Date().toISOString(),
      ...tabela,
    });
  } catch (error) {
    throw erroFirestore(error);
  }
}

export function consultarRelatorioAdmin(
  filtros: Pick<RelatorioAdminFiltros, 'categoria' | 'mesReferencia'>,
): Promise<ReportData> {
  return carregarDadosRelatorio(filtros);
}

export async function exportarRelatorioAdmin(
  filtros: RelatorioAdminFiltros,
): Promise<RelatorioCsvDownload> {
  const dados = await carregarDadosRelatorio(filtros);
  const request = reportRequestSchema.parse(filtros);
  const linhas = filtrarLinhasRelatorio(dados.rows, request.busca, request.status);
  const conteudo = `\uFEFF${serializarRelatorioCsv(dados.headers, linhas)}`;
  return {
    blob: new Blob([conteudo], { type: 'text/csv;charset=utf-8;' }),
    nomeArquivo: `relatorio-${request.categoria}-${request.mesReferencia}.csv`,
  };
}
