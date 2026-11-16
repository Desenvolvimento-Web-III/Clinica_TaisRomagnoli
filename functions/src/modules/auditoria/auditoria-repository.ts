import { getFirestore } from 'firebase-admin/firestore';
import type { FiltroAuditoria, RegistroAuditoria } from '@clinica/shared';

export const AUDITORIA_COLLECTION = 'auditoria';

/**
 * Contrato de repositório para registros de auditoria.
 */
export interface AuditoriaRepository {
  salvar(registro: RegistroAuditoria): Promise<RegistroAuditoria>;
  listar(filtros?: FiltroAuditoria): Promise<RegistroAuditoria[]>;
  buscarPorId(id: string): Promise<RegistroAuditoria | null>;
}

/**
 * Implementação em memória para testes unitários.
 */
export class InMemoryAuditoriaRepository implements AuditoriaRepository {
  private registros: Map<string, RegistroAuditoria> = new Map();

  async salvar(registro: RegistroAuditoria): Promise<RegistroAuditoria> {
    this.registros.set(registro.id, { ...registro });
    return { ...registro };
  }

  async listar(filtros?: FiltroAuditoria): Promise<RegistroAuditoria[]> {
    let lista = Array.from(this.registros.values());

    if (filtros?.usuarioId) {
      lista = lista.filter((r) => r.usuarioId === filtros.usuarioId);
    }
    if (filtros?.acao) {
      lista = lista.filter((r) => r.acao === filtros.acao);
    }
    if (filtros?.recurso) {
      lista = lista.filter((r) => r.recurso === filtros.recurso);
    }
    if (filtros?.recursoId) {
      lista = lista.filter((r) => r.recursoId === filtros.recursoId);
    }
    if (filtros?.dataInicio) {
      const inicio = new Date(filtros.dataInicio).getTime();
      lista = lista.filter((r) => new Date(r.dataHora).getTime() >= inicio);
    }
    if (filtros?.dataFim) {
      const fim = new Date(filtros.dataFim).getTime();
      lista = lista.filter((r) => new Date(r.dataHora).getTime() <= fim);
    }

    // Ordenação decrescente por data/hora (mais recente primeiro)
    lista.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());

    const limite = filtros?.limite ?? 50;
    return lista.slice(0, limite);
  }

  async buscarPorId(id: string): Promise<RegistroAuditoria | null> {
    const registro = this.registros.get(id);
    return registro ? { ...registro } : null;
  }

  limpar(): void {
    this.registros.clear();
  }
}

/**
 * Implementação no Firestore do Firebase Admin.
 */
export class FirestoreAuditoriaRepository implements AuditoriaRepository {
  private get collection() {
    return getFirestore().collection(AUDITORIA_COLLECTION);
  }

  async salvar(registro: RegistroAuditoria): Promise<RegistroAuditoria> {
    const docRef = this.collection?.doc?.(registro.id);
    if (docRef && typeof docRef.set === 'function') {
      await docRef.set(registro);
    }
    return { ...registro };
  }

  async listar(filtros?: FiltroAuditoria): Promise<RegistroAuditoria[]> {
    let query: FirebaseFirestore.Query = this.collection;

    if (filtros?.recurso) {
      query = query.where('recurso', '==', filtros.recurso);
    }
    if (filtros?.usuarioId) {
      query = query.where('usuarioId', '==', filtros.usuarioId);
    }
    if (filtros?.acao) {
      query = query.where('acao', '==', filtros.acao);
    }

    // Ordenação decrescente por dataHora
    query = query.orderBy('dataHora', 'desc');

    const limite = filtros?.limite ?? 50;
    query = query.limit(limite);

    const snapshot = await query.get();
    let lista = snapshot.docs.map((doc) => doc.data() as RegistroAuditoria);

    // Filtros secundários em memória para evitar a necessidade de múltiplos índices compostos no Firestore
    if (filtros?.recursoId) {
      lista = lista.filter((r) => r.recursoId === filtros.recursoId);
    }
    if (filtros?.dataInicio) {
      const inicio = new Date(filtros.dataInicio).getTime();
      lista = lista.filter((r) => new Date(r.dataHora).getTime() >= inicio);
    }
    if (filtros?.dataFim) {
      const fim = new Date(filtros.dataFim).getTime();
      lista = lista.filter((r) => new Date(r.dataHora).getTime() <= fim);
    }

    return lista;
  }

  async buscarPorId(id: string): Promise<RegistroAuditoria | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data() as RegistroAuditoria;
  }
}
