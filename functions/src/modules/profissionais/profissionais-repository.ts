import type { Firestore } from 'firebase-admin/firestore';
import {
  DEFAULT_INITIAL_PROFESSIONAL,
  ID_PROFISSIONAL_PADRAO,
  type Professional,
  type DayOfWeek,
} from '@clinica/shared';

export const PROFISSIONAIS_COLLECTION = 'profissionais';

export interface ProfissionaisRepository {
  salvar(profissional: Professional): Promise<Professional>;
  buscarPorId(id: string): Promise<Professional | null>;
  listar(apenasAtivos?: boolean): Promise<Professional[]>;
  atualizar(profissional: Professional): Promise<Professional>;
  excluir(id: string): Promise<void>;
}

/**
 * Converte dados do Firestore para a tipagem padrão Professional
 */
function mapFirestoreDocToProfessional(id: string, data: Record<string, unknown>): Professional {
  const nome = (data['nome'] as string) || (data['name'] as string) || '';
  const especialidade =
    (data['especialidade'] as string) || (data['specialty'] as string) || 'Profissional';
  const ativo =
    data['ativo'] !== undefined
      ? Boolean(data['ativo'])
      : data['active'] !== undefined
        ? Boolean(data['active'])
        : true;
  const diasFolga = (Array.isArray(data['diasFolga']) ? data['diasFolga'] : [0, 2]) as DayOfWeek[];
  const intervaloMinutos = Number(data['intervaloMinutos'] ?? 30);
  const createdAt = (data['createdAt'] as string) || new Date().toISOString();
  const updatedAt = (data['updatedAt'] as string) || undefined;

  return {
    id,
    nome,
    especialidade,
    ativo,
    diasFolga,
    intervaloMinutos,
    createdAt,
    updatedAt,
  };
}

/**
 * Repositório em memória para desacoplamento e testes unitários.
 * Inicializa automaticamente com a profissional inicial da clínica (Tais Romagnoli).
 */
export class InMemoryProfissionaisRepository implements ProfissionaisRepository {
  private profissionais: Map<string, Professional> = new Map();

  constructor(inicializarPadrao = true) {
    if (inicializarPadrao) {
      this.redefinirPadrao();
    }
  }

  async salvar(profissional: Professional): Promise<Professional> {
    this.profissionais.set(profissional.id, { ...profissional });
    return { ...profissional };
  }

  async buscarPorId(id: string): Promise<Professional | null> {
    const item = this.profissionais.get(id);
    if (!item) {
      // Se for o ID da profissional padrão inicial e não estiver na lista, recria
      if (id === ID_PROFISSIONAL_PADRAO) {
        return { ...DEFAULT_INITIAL_PROFESSIONAL };
      }
      return null;
    }
    return { ...item };
  }

  async listar(apenasAtivos: boolean = false): Promise<Professional[]> {
    let lista = Array.from(this.profissionais.values());
    if (lista.length === 0) {
      lista = [{ ...DEFAULT_INITIAL_PROFESSIONAL }];
    }
    if (apenasAtivos) {
      lista = lista.filter((p) => p.ativo);
    }
    return lista.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async atualizar(profissional: Professional): Promise<Professional> {
    const agora = new Date().toISOString();
    const atualizado: Professional = {
      ...profissional,
      updatedAt: agora,
    };
    this.profissionais.set(profissional.id, atualizado);
    return { ...atualizado };
  }

  async excluir(id: string): Promise<void> {
    this.profissionais.delete(id);
  }

  limpar(): void {
    this.profissionais.clear();
  }

  redefinirPadrao(): void {
    this.profissionais.clear();
    this.profissionais.set(DEFAULT_INITIAL_PROFESSIONAL.id, { ...DEFAULT_INITIAL_PROFESSIONAL });
  }

  popular(lista: Professional[]): void {
    for (const item of lista) {
      this.profissionais.set(item.id, { ...item });
    }
  }
}

/**
 * Repositório Firestore para persistência de profissionais na nuvem.
 */
export class FirestoreProfissionaisRepository implements ProfissionaisRepository {
  constructor(private firestore: Firestore) {}

  private get collection() {
    return this.firestore.collection(PROFISSIONAIS_COLLECTION);
  }

  async salvar(profissional: Professional): Promise<Professional> {
    const docRef = this.collection.doc(profissional.id);
    await docRef.set({
      ...profissional,
      updatedAt: profissional.updatedAt || new Date().toISOString(),
    });
    return profissional;
  }

  async buscarPorId(id: string): Promise<Professional | null> {
    const docRef = this.collection.doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      // Resiliência: se buscar pela profissional inicial padrão e ela ainda não tiver sido
      // persistida no Firestore, retorna a profissional padrão oficial da clínica
      if (id === ID_PROFISSIONAL_PADRAO) {
        return { ...DEFAULT_INITIAL_PROFESSIONAL };
      }
      return null;
    }

    return mapFirestoreDocToProfessional(snap.id, snap.data() as Record<string, unknown>);
  }

  async listar(apenasAtivos: boolean = false): Promise<Professional[]> {
    let query: FirebaseFirestore.Query = this.collection;
    if (apenasAtivos) {
      query = query.where('ativo', '==', true);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      // Caso a coleção ainda esteja vazia, retorna a profissional inicial padrão
      return [{ ...DEFAULT_INITIAL_PROFESSIONAL }];
    }

    const lista = snapshot.docs.map((doc) =>
      mapFirestoreDocToProfessional(doc.id, doc.data() as Record<string, unknown>),
    );

    return lista.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async atualizar(profissional: Professional): Promise<Professional> {
    const agora = new Date().toISOString();
    const atualizado: Professional = {
      ...profissional,
      updatedAt: agora,
    };

    await this.collection.doc(profissional.id).set(atualizado, { merge: true });
    return atualizado;
  }

  async excluir(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
