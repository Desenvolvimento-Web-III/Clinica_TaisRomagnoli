import type { Firestore } from 'firebase-admin/firestore';
import type { NotificacaoInterna, EventoNotificacaoAgendamento } from '@clinica/shared';

export interface ListarNotificacoesOptions {
  apenasNaoLidas?: boolean;
  limite?: number;
}

export interface NotificacoesRepository {
  salvar(notificacao: NotificacaoInterna): Promise<NotificacaoInterna>;
  buscarPorId(id: string, destinatarioId: string): Promise<NotificacaoInterna | null>;
  listarPorDestinatario(
    destinatarioId: string,
    options?: ListarNotificacoesOptions,
  ): Promise<NotificacaoInterna[]>;
  marcarComoLida(id: string, destinatarioId: string): Promise<NotificacaoInterna | null>;
  listarPorAgendamentoEEvento(
    agendamentoId: string,
    evento: EventoNotificacaoAgendamento,
  ): Promise<NotificacaoInterna[]>;
}

/**
 * Repositório em memória para testes unitários e testes sem conexão externa
 */
export class InMemoryNotificacoesRepository implements NotificacoesRepository {
  private itens: Map<string, NotificacaoInterna> = new Map();

  async salvar(notificacao: NotificacaoInterna): Promise<NotificacaoInterna> {
    this.itens.set(notificacao.id, { ...notificacao });
    return { ...notificacao };
  }

  async buscarPorId(id: string, destinatarioId: string): Promise<NotificacaoInterna | null> {
    const item = this.itens.get(id);
    if (!item || item.destinatarioId !== destinatarioId) return null;
    return { ...item };
  }

  async listarPorDestinatario(
    destinatarioId: string,
    options?: ListarNotificacoesOptions,
  ): Promise<NotificacaoInterna[]> {
    let lista = Array.from(this.itens.values())
      .filter((n) => n.destinatarioId === destinatarioId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.apenasNaoLidas) {
      lista = lista.filter((n) => !n.lida);
    }

    if (options?.limite && options.limite > 0) {
      lista = lista.slice(0, options.limite);
    }

    return lista;
  }

  async marcarComoLida(id: string, destinatarioId: string): Promise<NotificacaoInterna | null> {
    const item = this.itens.get(id);
    if (!item || item.destinatarioId !== destinatarioId) return null;

    const atualizada: NotificacaoInterna = {
      ...item,
      lida: true,
      updatedAt: new Date().toISOString(),
    };
    this.itens.set(id, atualizada);
    return { ...atualizada };
  }

  async listarPorAgendamentoEEvento(
    agendamentoId: string,
    evento: EventoNotificacaoAgendamento,
  ): Promise<NotificacaoInterna[]> {
    return Array.from(this.itens.values()).filter(
      (n) => n.agendamentoId === agendamentoId && n.evento === evento,
    );
  }

  limpar(): void {
    this.itens.clear();
  }
}

/**
 * Repositório Firestore conectado às subcoleções do cliente
 * /clientes/{destinatarioId}/notificacoes/{id}
 */
export class FirestoreNotificacoesRepository implements NotificacoesRepository {
  constructor(private firestore: Firestore) {}

  private getCollection(destinatarioId: string) {
    return this.firestore.collection('clientes').doc(destinatarioId).collection('notificacoes');
  }

  async salvar(notificacao: NotificacaoInterna): Promise<NotificacaoInterna> {
    const collection = this.getCollection(notificacao.destinatarioId);
    await collection.doc(notificacao.id).set(notificacao);
    return notificacao;
  }

  async buscarPorId(id: string, destinatarioId: string): Promise<NotificacaoInterna | null> {
    const doc = await this.getCollection(destinatarioId).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as NotificacaoInterna;
  }

  async listarPorDestinatario(
    destinatarioId: string,
    options?: ListarNotificacoesOptions,
  ): Promise<NotificacaoInterna[]> {
    let query: FirebaseFirestore.Query = this.getCollection(destinatarioId);

    if (options?.apenasNaoLidas) {
      query = query.where('lida', '==', false);
    }

    query = query.orderBy('createdAt', 'desc');

    if (options?.limite && options.limite > 0) {
      query = query.limit(options.limite);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((d) => d.data() as NotificacaoInterna);
  }

  async marcarComoLida(id: string, destinatarioId: string): Promise<NotificacaoInterna | null> {
    const docRef = this.getCollection(destinatarioId).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const agora = new Date().toISOString();
    await docRef.update({
      lida: true,
      updatedAt: agora,
    });

    const atualizado = await docRef.get();
    return atualizado.data() as NotificacaoInterna;
  }

  async listarPorAgendamentoEEvento(
    agendamentoId: string,
    evento: EventoNotificacaoAgendamento,
  ): Promise<NotificacaoInterna[]> {
    // Busca em subcoleção do grupo 'notificacoes' usando collectionGroup
    const snapshot = await this.firestore
      .collectionGroup('notificacoes')
      .where('agendamentoId', '==', agendamentoId)
      .where('evento', '==', evento)
      .get();

    return snapshot.docs.map((d) => d.data() as NotificacaoInterna);
  }
}
