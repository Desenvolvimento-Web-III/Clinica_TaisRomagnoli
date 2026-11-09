import type { Firestore } from 'firebase-admin/firestore';
import type { BloqueioAgenda } from '@clinica/shared';

export const BLOQUEIOS_AGENDA_COLLECTION = 'bloqueios_agenda';

export interface BloqueiosRepository {
  salvar(bloqueio: BloqueioAgenda): Promise<BloqueioAgenda>;
  buscarPorId(id: string): Promise<BloqueioAgenda | null>;
  listarAtivos(profissionalId?: string): Promise<BloqueioAgenda[]>;
  listarTodos(profissionalId?: string): Promise<BloqueioAgenda[]>;
  remover(id: string): Promise<void>;
  atualizarStatus(id: string, ativo: boolean): Promise<BloqueioAgenda | null>;
}

export class FirestoreBloqueiosRepository implements BloqueiosRepository {
  constructor(private readonly firestore: Firestore) {}

  async salvar(bloqueio: BloqueioAgenda): Promise<BloqueioAgenda> {
    await this.firestore
      .collection(BLOQUEIOS_AGENDA_COLLECTION)
      .doc(bloqueio.id)
      .set(bloqueio, { merge: true });
    return bloqueio;
  }

  async buscarPorId(id: string): Promise<BloqueioAgenda | null> {
    const doc = await this.firestore.collection(BLOQUEIOS_AGENDA_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as BloqueioAgenda;
  }

  async listarAtivos(profissionalId?: string): Promise<BloqueioAgenda[]> {
    let query = this.firestore.collection(BLOQUEIOS_AGENDA_COLLECTION).where('ativo', '==', true);

    if (profissionalId && profissionalId !== 'default') {
      query = query.where('profissionalId', 'in', [profissionalId, 'default']);
    } else if (profissionalId === 'default') {
      query = query.where('profissionalId', '==', 'default');
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as BloqueioAgenda);
  }

  async listarTodos(profissionalId?: string): Promise<BloqueioAgenda[]> {
    let query: FirebaseFirestore.Query = this.firestore.collection(BLOQUEIOS_AGENDA_COLLECTION);

    if (profissionalId) {
      query = query.where('profissionalId', '==', profissionalId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as BloqueioAgenda);
  }

  async remover(id: string): Promise<void> {
    await this.firestore.collection(BLOQUEIOS_AGENDA_COLLECTION).doc(id).delete();
  }

  async atualizarStatus(id: string, ativo: boolean): Promise<BloqueioAgenda | null> {
    const docRef = this.firestore.collection(BLOQUEIOS_AGENDA_COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const atualizadoEm = new Date().toISOString();
    await docRef.update({ ativo, atualizadoEm });
    const atualizado = await docRef.get();
    return atualizado.data() as BloqueioAgenda;
  }
}

export class InMemoryBloqueiosRepository implements BloqueiosRepository {
  private itens = new Map<string, BloqueioAgenda>();

  async salvar(bloqueio: BloqueioAgenda): Promise<BloqueioAgenda> {
    this.itens.set(bloqueio.id, { ...bloqueio });
    return { ...bloqueio };
  }

  async buscarPorId(id: string): Promise<BloqueioAgenda | null> {
    const item = this.itens.get(id);
    return item ? { ...item } : null;
  }

  async listarAtivos(profissionalId?: string): Promise<BloqueioAgenda[]> {
    return Array.from(this.itens.values()).filter((item) => {
      if (!item.ativo) return false;
      if (
        profissionalId &&
        profissionalId !== 'default' &&
        item.profissionalId !== 'default' &&
        item.profissionalId !== profissionalId
      ) {
        return false;
      }
      return true;
    });
  }

  async listarTodos(profissionalId?: string): Promise<BloqueioAgenda[]> {
    return Array.from(this.itens.values()).filter((item) => {
      if (profissionalId && item.profissionalId !== profissionalId) return false;
      return true;
    });
  }

  async remover(id: string): Promise<void> {
    this.itens.delete(id);
  }

  async atualizarStatus(id: string, ativo: boolean): Promise<BloqueioAgenda | null> {
    const item = this.itens.get(id);
    if (!item) return null;
    const atualizado: BloqueioAgenda = {
      ...item,
      ativo,
      atualizadoEm: new Date().toISOString(),
    };
    this.itens.set(id, atualizado);
    return { ...atualizado };
  }
}
