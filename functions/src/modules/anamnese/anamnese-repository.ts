import type { Firestore } from 'firebase-admin/firestore';
import type { FichaAnamneseRecord } from '@clinica/shared';

export interface AnamneseRepository {
  salvar(clienteId: string, ficha: FichaAnamneseRecord): Promise<void>;
  obterPorClienteId(clienteId: string): Promise<FichaAnamneseRecord | null>;
}

export class FirestoreAnamneseRepository implements AnamneseRepository {
  constructor(private readonly firestore: Firestore) {}

  async salvar(clienteId: string, ficha: FichaAnamneseRecord): Promise<void> {
    const docData = {
      ...ficha,
      clienteId,
    };

    // Salva na coleção raiz /anamneses/{clienteId}
    await this.firestore.collection('anamneses').doc(clienteId).set(docData, { merge: true });

    // Salva também na subcoleção do cliente /clientes/{clienteId}/anamneses/atual para consistência
    try {
      await this.firestore
        .collection('clientes')
        .doc(clienteId)
        .collection('anamneses')
        .doc('atual')
        .set(docData, { merge: true });
    } catch {
      // Ignora erro na subcoleção caso o doc cliente ainda não esteja estruturado
    }
  }

  async obterPorClienteId(clienteId: string): Promise<FichaAnamneseRecord | null> {
    const docSnap = await this.firestore.collection('anamneses').doc(clienteId).get();

    if (!docSnap.exists) {
      // Tenta fallback na subcoleção /clientes/{clienteId}/anamneses/atual
      const subSnap = await this.firestore
        .collection('clientes')
        .doc(clienteId)
        .collection('anamneses')
        .doc('atual')
        .get();

      if (!subSnap.exists) {
        return null;
      }
      return subSnap.data() as FichaAnamneseRecord;
    }

    return docSnap.data() as FichaAnamneseRecord;
  }
}

export class InMemoryAnamneseRepository implements AnamneseRepository {
  private readonly dados = new Map<string, FichaAnamneseRecord>();

  async salvar(clienteId: string, ficha: FichaAnamneseRecord): Promise<void> {
    this.dados.set(clienteId, { ...ficha, clienteId });
  }

  async obterPorClienteId(clienteId: string): Promise<FichaAnamneseRecord | null> {
    return this.dados.get(clienteId) || null;
  }

  limpar(): void {
    this.dados.clear();
  }
}
