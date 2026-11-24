import { getFirestore } from 'firebase-admin/firestore';
import type { CobrancaSinal } from '@clinica/shared';

export const PAGAMENTOS_COLLECTION = 'pagamentos';

/**
 * Contrato de repositório para persistência e recuperação de cobranças e pagamentos de sinal.
 */
export interface PagamentosRepository {
  salvar(cobranca: CobrancaSinal): Promise<CobrancaSinal>;
  buscarPorId(id: string): Promise<CobrancaSinal | null>;
  listarPorCliente(clienteId: string): Promise<CobrancaSinal[]>;
  listarPorAgendamento(agendamentoId: string): Promise<CobrancaSinal[]>;
}

/**
 * Implementação em memória para testes unitários isolados e de rápida execução.
 */
export class InMemoryPagamentosRepository implements PagamentosRepository {
  private cobrancas: Map<string, CobrancaSinal> = new Map();

  async salvar(cobranca: CobrancaSinal): Promise<CobrancaSinal> {
    this.cobrancas.set(cobranca.id, { ...cobranca });
    return { ...cobranca };
  }

  async buscarPorId(id: string): Promise<CobrancaSinal | null> {
    const item = this.cobrancas.get(id);
    return item ? { ...item } : null;
  }

  async listarPorCliente(clienteId: string): Promise<CobrancaSinal[]> {
    return Array.from(this.cobrancas.values())
      .filter((c) => c.clienteId === clienteId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async listarPorAgendamento(agendamentoId: string): Promise<CobrancaSinal[]> {
    return Array.from(this.cobrancas.values())
      .filter((c) => c.agendamentoId === agendamentoId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

/**
 * Implementação Firestore usando o Firebase Admin SDK no Cloud Functions backend.
 * Salva na coleção raiz 'pagamentos' e na subcoleção restrita 'clientes/{clienteId}/pagamentos'.
 */
export class FirestorePagamentosRepository implements PagamentosRepository {
  constructor(private firestore = getFirestore()) {}

  async salvar(cobranca: CobrancaSinal): Promise<CobrancaSinal> {
    const dados = { ...cobranca };
    const batch = this.firestore.batch();

    // 1. Coleção raiz para busca direta e segura por ID
    const rootRef = this.firestore.collection(PAGAMENTOS_COLLECTION).doc(cobranca.id);
    batch.set(rootRef, dados);

    // 2. Subcoleção do cliente para consolidação no perfil administrativo
    const clientPaymentRef = this.firestore
      .collection('clientes')
      .doc(cobranca.clienteId)
      .collection('pagamentos')
      .doc(cobranca.id);
    batch.set(clientPaymentRef, dados);

    await batch.commit();
    return dados;
  }

  async buscarPorId(id: string): Promise<CobrancaSinal | null> {
    const docSnap = await this.firestore.collection(PAGAMENTOS_COLLECTION).doc(id).get();
    if (!docSnap.exists) {
      return null;
    }
    return docSnap.data() as CobrancaSinal;
  }

  async listarPorCliente(clienteId: string): Promise<CobrancaSinal[]> {
    const snapshot = await this.firestore
      .collection('clientes')
      .doc(clienteId)
      .collection('pagamentos')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as CobrancaSinal);
  }

  async listarPorAgendamento(agendamentoId: string): Promise<CobrancaSinal[]> {
    const snapshot = await this.firestore
      .collection(PAGAMENTOS_COLLECTION)
      .where('agendamentoId', '==', agendamentoId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as CobrancaSinal);
  }
}
