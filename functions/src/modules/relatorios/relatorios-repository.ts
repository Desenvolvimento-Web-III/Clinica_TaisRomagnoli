import type { Firestore } from 'firebase-admin/firestore';
import type { Agendamento } from '@clinica/shared';
import type { ReportClient } from '@clinica/shared';

export interface RelatoriosRepository {
  listarClientes(): Promise<ReportClient[]>;
  listarAgendamentosPorInicioMes(mesReferencia: string): Promise<Agendamento[]>;
  listarAgendamentosConcluidosNoMes(mesReferencia: string): Promise<Agendamento[]>;
}

export function intervaloIsoDoMes(mesReferencia: string): { inicio: string; fim: string } {
  const [ano, mes] = mesReferencia.split('-').map(Number);
  const proximoMes = new Date(Date.UTC(ano ?? 0, mes ?? 1, 1));
  const proximoMesIso = `${proximoMes.getUTCFullYear()}-${String(proximoMes.getUTCMonth() + 1).padStart(2, '0')}`;

  return {
    inicio: `${mesReferencia}-01T00:00:00.000Z`,
    fim: `${proximoMesIso}-01T00:00:00.000Z`,
  };
}

export class FirestoreRelatoriosRepository implements RelatoriosRepository {
  constructor(private readonly firestore: Firestore) {}

  async listarClientes(): Promise<ReportClient[]> {
    const snapshot = await this.firestore.collection('clientes').get();
    return snapshot.docs.map((documento) => {
      const data = documento.data();
      const status =
        data.status === 'inativo' || data.status === 'pendente' ? data.status : 'ativo';
      return {
        id: documento.id,
        nome: typeof data.nome === 'string' && data.nome.trim() ? data.nome : 'Cliente sem nome',
        email: typeof data.email === 'string' ? data.email : '',
        telefone: typeof data.telefone === 'string' ? data.telefone : '',
        status,
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
      };
    });
  }

  async listarAgendamentosPorInicioMes(mesReferencia: string): Promise<Agendamento[]> {
    const intervalo = intervaloIsoDoMes(mesReferencia);
    const snapshot = await this.firestore
      .collection('agendamentos')
      .where('dataHoraInicio', '>=', intervalo.inicio)
      .where('dataHoraInicio', '<', intervalo.fim)
      .get();

    return snapshot.docs.map((documento) => ({
      ...(documento.data() as Agendamento),
      id: documento.id,
    }));
  }

  async listarAgendamentosConcluidosNoMes(mesReferencia: string): Promise<Agendamento[]> {
    const intervalo = intervaloIsoDoMes(mesReferencia);
    const snapshot = await this.firestore
      .collection('agendamentos')
      .where('concluidoEm', '>=', intervalo.inicio)
      .where('concluidoEm', '<', intervalo.fim)
      .get();

    return snapshot.docs.map((documento) => ({
      ...(documento.data() as Agendamento),
      id: documento.id,
    }));
  }
}
