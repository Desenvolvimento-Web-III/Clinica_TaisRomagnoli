import type { Firestore } from 'firebase-admin/firestore';
import type { UserProfile } from '@clinica/shared';

export interface ClientesRepository {
  salvar(cliente: UserProfile): Promise<UserProfile>;
  buscarPorUid(uid: string): Promise<UserProfile | null>;
  buscarPorEmail(email: string): Promise<UserProfile | null>;
  atualizar(uid: string, dados: Partial<UserProfile>): Promise<UserProfile | null>;
}

/**
 * Repositório em memória para testes unitários determinísticos
 */
export class InMemoryClientesRepository implements ClientesRepository {
  private itens: Map<string, UserProfile> = new Map();

  async salvar(cliente: UserProfile): Promise<UserProfile> {
    this.itens.set(cliente.uid, { ...cliente });
    return { ...cliente };
  }

  async buscarPorUid(uid: string): Promise<UserProfile | null> {
    const item = this.itens.get(uid);
    if (!item) return null;
    return { ...item };
  }

  async buscarPorEmail(email: string): Promise<UserProfile | null> {
    const emailNormalizado = email.trim().toLowerCase();
    for (const item of this.itens.values()) {
      if (item.email.trim().toLowerCase() === emailNormalizado) {
        return { ...item };
      }
    }
    return null;
  }

  async atualizar(uid: string, dados: Partial<UserProfile>): Promise<UserProfile | null> {
    const item = this.itens.get(uid);
    if (!item) return null;

    const atualizado: UserProfile = {
      ...item,
      ...dados,
      updatedAt: new Date().toISOString(),
    };
    this.itens.set(uid, atualizado);
    return { ...atualizado };
  }

  limpar(): void {
    this.itens.clear();
  }
}

/**
 * Repositório oficial do Firestore para coleção /clientes
 */
export class FirestoreClientesRepository implements ClientesRepository {
  constructor(private firestore: Firestore) {}

  private get collection() {
    return this.firestore.collection('clientes');
  }

  async salvar(cliente: UserProfile): Promise<UserProfile> {
    await this.collection.doc(cliente.uid).set(cliente);
    return { ...cliente };
  }

  async buscarPorUid(uid: string): Promise<UserProfile | null> {
    const docSnap = await this.collection.doc(uid).get();
    if (!docSnap.exists) {
      return null;
    }
    return docSnap.data() as UserProfile;
  }

  async buscarPorEmail(email: string): Promise<UserProfile | null> {
    const snapshot = await this.collection
      .where('email', '==', email.trim().toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty || !snapshot.docs[0]) {
      return null;
    }

    return snapshot.docs[0].data() as UserProfile;
  }

  async atualizar(uid: string, dados: Partial<UserProfile>): Promise<UserProfile | null> {
    const docRef = this.collection.doc(uid);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return null;
    }

    const payload = {
      ...dados,
      updatedAt: new Date().toISOString(),
    };

    await docRef.update(payload);
    const atualizado = await docRef.get();
    return atualizado.data() as UserProfile;
  }
}
