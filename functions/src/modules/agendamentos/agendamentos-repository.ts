import type { Firestore } from 'firebase-admin/firestore';
import type { Agendamento } from '@clinica/shared';

export interface AgendamentosRepository {
  salvar(agendamento: Agendamento): Promise<Agendamento>;
  buscarPorId(id: string): Promise<Agendamento | null>;
  listarPorCliente(clienteId: string): Promise<Agendamento[]>;
  listarPorProfissionalEData(profissionalId: string, dataYmd: string): Promise<Agendamento[]>;
  listarPorServico(servicoId: string): Promise<Agendamento[]>;
  atualizar(agendamento: Agendamento): Promise<Agendamento>;
}

/**
 * Repositório em memória para testes e execução desacoplada
 */
export class InMemoryAgendamentosRepository implements AgendamentosRepository {
  private agendamentos: Map<string, Agendamento> = new Map();

  async salvar(agendamento: Agendamento): Promise<Agendamento> {
    this.agendamentos.set(agendamento.id, { ...agendamento });
    return { ...agendamento };
  }

  async buscarPorId(id: string): Promise<Agendamento | null> {
    const item = this.agendamentos.get(id);
    return item ? { ...item } : null;
  }

  async listarPorCliente(clienteId: string): Promise<Agendamento[]> {
    return Array.from(this.agendamentos.values())
      .filter((a) => a.clienteId === clienteId)
      .sort((a, b) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime());
  }

  async listarPorProfissionalEData(
    profissionalId: string,
    dataYmd: string,
  ): Promise<Agendamento[]> {
    return Array.from(this.agendamentos.values()).filter((a) => {
      const isProf = a.profissionalId === profissionalId;
      const isData = a.dataHoraInicio.startsWith(dataYmd);
      const isAtivo = a.status !== 'cancelado';
      return isProf && isData && isAtivo;
    });
  }

  async listarPorServico(servicoId: string): Promise<Agendamento[]> {
    return Array.from(this.agendamentos.values()).filter((a) => a.servicoId === servicoId);
  }

  async atualizar(agendamento: Agendamento): Promise<Agendamento> {
    this.agendamentos.set(agendamento.id, { ...agendamento });
    return { ...agendamento };
  }

  limpar(): void {
    this.agendamentos.clear();
  }
}

/**
 * Repositório Firestore preparado para persistência definitiva no banco NoSQL
 */
export class FirestoreAgendamentosRepository implements AgendamentosRepository {
  constructor(private firestore: Firestore) {}

  private get collection() {
    return this.firestore.collection('agendamentos');
  }

  async salvar(agendamento: Agendamento): Promise<Agendamento> {
    await this.collection.doc(agendamento.id).set(agendamento);
    return agendamento;
  }

  async buscarPorId(id: string): Promise<Agendamento | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Agendamento;
  }

  async listarPorCliente(clienteId: string): Promise<Agendamento[]> {
    const snapshot = await this.collection
      .where('clienteId', '==', clienteId)
      .orderBy('dataHoraInicio', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as Agendamento);
  }

  async listarPorProfissionalEData(
    profissionalId: string,
    dataYmd: string,
  ): Promise<Agendamento[]> {
    const startOfDay = `${dataYmd}T00:00:00.000Z`;
    const endOfDay = `${dataYmd}T23:59:59.999Z`;

    const snapshot = await this.collection
      .where('profissionalId', '==', profissionalId)
      .where('dataHoraInicio', '>=', startOfDay)
      .where('dataHoraInicio', '<=', endOfDay)
      .get();

    return snapshot.docs
      .map((doc) => doc.data() as Agendamento)
      .filter((a) => a.status !== 'cancelado');
  }

  async listarPorServico(servicoId: string): Promise<Agendamento[]> {
    const snapshot = await this.collection.where('servicoId', '==', servicoId).get();
    return snapshot.docs.map((doc) => doc.data() as Agendamento);
  }

  async atualizar(agendamento: Agendamento): Promise<Agendamento> {
    await this.collection.doc(agendamento.id).update({
      ...agendamento,
      updatedAt: new Date().toISOString(),
    });
    return agendamento;
  }
}
