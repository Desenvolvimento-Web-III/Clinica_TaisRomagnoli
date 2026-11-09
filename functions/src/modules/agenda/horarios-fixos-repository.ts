import type { Firestore } from 'firebase-admin/firestore';
import type { HorarioFixoCliente } from '@clinica/shared';

export const HORARIOS_FIXOS_COLLECTION = 'horarios_fixos';

export interface HorariosFixosRepository {
  salvar(horarioFixo: HorarioFixoCliente): Promise<HorarioFixoCliente>;
  buscarPorId(id: string): Promise<HorarioFixoCliente | null>;
  listarAtivos(profissionalId?: string): Promise<HorarioFixoCliente[]>;
  listarPorCliente(clienteId: string): Promise<HorarioFixoCliente[]>;
  listarTodos(profissionalId?: string): Promise<HorarioFixoCliente[]>;
  remover(id: string): Promise<void>;
  atualizar(horarioFixo: HorarioFixoCliente): Promise<HorarioFixoCliente>;
}

export class FirestoreHorariosFixosRepository implements HorariosFixosRepository {
  constructor(private readonly firestore: Firestore) {}

  async salvar(horarioFixo: HorarioFixoCliente): Promise<HorarioFixoCliente> {
    await this.firestore
      .collection(HORARIOS_FIXOS_COLLECTION)
      .doc(horarioFixo.id)
      .set(horarioFixo, { merge: true });
    return horarioFixo;
  }

  async buscarPorId(id: string): Promise<HorarioFixoCliente | null> {
    const doc = await this.firestore.collection(HORARIOS_FIXOS_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as HorarioFixoCliente;
  }

  async listarAtivos(profissionalId?: string): Promise<HorarioFixoCliente[]> {
    let query = this.firestore.collection(HORARIOS_FIXOS_COLLECTION).where('ativo', '==', true);

    if (profissionalId && profissionalId !== 'default') {
      query = query.where('profissionalId', 'in', [profissionalId, 'default']);
    } else if (profissionalId === 'default') {
      query = query.where('profissionalId', '==', 'default');
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as HorarioFixoCliente);
  }

  async listarPorCliente(clienteId: string): Promise<HorarioFixoCliente[]> {
    const snapshot = await this.firestore
      .collection(HORARIOS_FIXOS_COLLECTION)
      .where('clienteId', '==', clienteId)
      .get();
    return snapshot.docs.map((doc) => doc.data() as HorarioFixoCliente);
  }

  async listarTodos(profissionalId?: string): Promise<HorarioFixoCliente[]> {
    let query: FirebaseFirestore.Query = this.firestore.collection(HORARIOS_FIXOS_COLLECTION);

    if (profissionalId) {
      query = query.where('profissionalId', '==', profissionalId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as HorarioFixoCliente);
  }

  async remover(id: string): Promise<void> {
    await this.firestore.collection(HORARIOS_FIXOS_COLLECTION).doc(id).delete();
  }

  async atualizar(horarioFixo: HorarioFixoCliente): Promise<HorarioFixoCliente> {
    await this.firestore
      .collection(HORARIOS_FIXOS_COLLECTION)
      .doc(horarioFixo.id)
      .set(horarioFixo, { merge: true });
    return horarioFixo;
  }
}

export class InMemoryHorariosFixosRepository implements HorariosFixosRepository {
  private itens = new Map<string, HorarioFixoCliente>();

  async salvar(horarioFixo: HorarioFixoCliente): Promise<HorarioFixoCliente> {
    this.itens.set(horarioFixo.id, { ...horarioFixo });
    return { ...horarioFixo };
  }

  async buscarPorId(id: string): Promise<HorarioFixoCliente | null> {
    const item = this.itens.get(id);
    return item ? { ...item } : null;
  }

  async listarAtivos(profissionalId?: string): Promise<HorarioFixoCliente[]> {
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

  async listarPorCliente(clienteId: string): Promise<HorarioFixoCliente[]> {
    return Array.from(this.itens.values()).filter((item) => item.clienteId === clienteId);
  }

  async listarTodos(profissionalId?: string): Promise<HorarioFixoCliente[]> {
    return Array.from(this.itens.values()).filter((item) => {
      if (profissionalId && item.profissionalId !== profissionalId) return false;
      return true;
    });
  }

  async remover(id: string): Promise<void> {
    this.itens.delete(id);
  }

  async atualizar(horarioFixo: HorarioFixoCliente): Promise<HorarioFixoCliente> {
    this.itens.set(horarioFixo.id, { ...horarioFixo });
    return { ...horarioFixo };
  }
}
