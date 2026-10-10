import type { Firestore } from 'firebase-admin/firestore';
import type { ServicoModel } from '@clinica/shared';

export interface ServicosRepository {
  salvar(servico: ServicoModel): Promise<ServicoModel>;
  buscarPorId(id: string): Promise<ServicoModel | null>;
  listar(apenasAtivos?: boolean): Promise<ServicoModel[]>;
  atualizar(servico: ServicoModel): Promise<ServicoModel>;
  excluir(id: string): Promise<void>;
}

/**
 * Repositório em memória para testes e desacoplamento de dependências externas
 */
export class InMemoryServicosRepository implements ServicosRepository {
  private servicos: Map<string, ServicoModel> = new Map();

  async salvar(servico: ServicoModel): Promise<ServicoModel> {
    this.servicos.set(servico.id, { ...servico });
    return { ...servico };
  }

  async buscarPorId(id: string): Promise<ServicoModel | null> {
    const item = this.servicos.get(id);
    return item ? { ...item } : null;
  }

  async listar(apenasAtivos: boolean = false): Promise<ServicoModel[]> {
    const lista = Array.from(this.servicos.values());
    if (apenasAtivos) {
      return lista.filter((s) => s.ativo);
    }
    return lista.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async atualizar(servico: ServicoModel): Promise<ServicoModel> {
    this.servicos.set(servico.id, { ...servico });
    return { ...servico };
  }

  async excluir(id: string): Promise<void> {
    this.servicos.delete(id);
  }

  limpar(): void {
    this.servicos.clear();
  }

  popular(servicos: ServicoModel[]): void {
    for (const s of servicos) {
      this.servicos.set(s.id, { ...s });
    }
  }
}

/**
 * Converte documento Firestore para ServicoModel normalizado
 */
function mapFirestoreDocToServico(id: string, data: Record<string, unknown>): ServicoModel {
  const nome = (data['nome'] as string) || (data['name'] as string) || '';
  const duracaoMinutos = Number(
    data['duracaoMinutos'] ?? data['duracao'] ?? data['durationMinutes'] ?? 60,
  );

  let preco = Number(data['preco'] ?? 0);
  let precoEmCentavos = Number(data['precoEmCentavos'] ?? data['priceInCents'] ?? 0);
  if (!preco && precoEmCentavos) {
    preco = precoEmCentavos / 100;
  } else if (preco && !precoEmCentavos) {
    precoEmCentavos = Math.round(preco * 100);
  }

  let sinal = Number(data['sinal'] ?? 0);
  let sinalEmCentavos = Number(data['sinalEmCentavos'] ?? data['sinalInCents'] ?? 0);
  if (!sinal && sinalEmCentavos) {
    sinal = sinalEmCentavos / 100;
  } else if (sinal && !sinalEmCentavos) {
    sinalEmCentavos = Math.round(sinal * 100);
  }

  const sinalPercentual = Number(data['sinalPercentual'] ?? 30);
  const descricao = (data['descricao'] as string) || (data['description'] as string) || '';

  const ativo =
    data['ativo'] !== undefined
      ? Boolean(data['ativo'])
      : data['active'] !== undefined
        ? Boolean(data['active'])
        : true;

  const categoria = (data['categoria'] as string) || (data['category'] as string) || undefined;
  const imageSrc = (data['imageSrc'] as string) || undefined;
  const imageAlt = (data['imageAlt'] as string) || undefined;
  const createdAt = (data['createdAt'] as string) || undefined;
  const updatedAt = (data['updatedAt'] as string) || undefined;

  return {
    id,
    nome,
    duracaoMinutos,
    preco,
    precoEmCentavos,
    sinal,
    sinalEmCentavos,
    sinalPercentual,
    descricao,
    ativo,
    categoria,
    imageSrc,
    imageAlt,
    createdAt,
    updatedAt,
  };
}

/**
 * Repositório Firestore para persistência de serviços na nuvem
 */
export class FirestoreServicosRepository implements ServicosRepository {
  constructor(private firestore: Firestore) {}

  private get collection() {
    return this.firestore.collection('servicos');
  }

  async salvar(servico: ServicoModel): Promise<ServicoModel> {
    const firestoreData = {
      ...servico,
      name: servico.nome,
      description: servico.descricao,
      durationMinutes: servico.duracaoMinutos,
      priceInCents: servico.precoEmCentavos,
      sinalInCents: servico.sinalEmCentavos,
      active: servico.ativo,
      updatedAt: servico.updatedAt || new Date().toISOString(),
    };

    await this.collection.doc(servico.id).set(firestoreData);
    return servico;
  }

  async buscarPorId(id: string): Promise<ServicoModel | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return mapFirestoreDocToServico(doc.id, doc.data() as Record<string, unknown>);
  }

  async listar(apenasAtivos: boolean = false): Promise<ServicoModel[]> {
    let query: FirebaseFirestore.Query = this.collection;
    if (apenasAtivos) {
      query = query.where('ativo', '==', true);
    }

    const snapshot = await query.get();
    const servicos = snapshot.docs.map((doc) =>
      mapFirestoreDocToServico(doc.id, doc.data() as Record<string, unknown>),
    );

    return servicos.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async atualizar(servico: ServicoModel): Promise<ServicoModel> {
    const agora = new Date().toISOString();
    const firestoreData = {
      ...servico,
      name: servico.nome,
      description: servico.descricao,
      durationMinutes: servico.duracaoMinutos,
      priceInCents: servico.precoEmCentavos,
      sinalInCents: servico.sinalEmCentavos,
      active: servico.ativo,
      updatedAt: agora,
    };

    await this.collection.doc(servico.id).set(firestoreData, { merge: true });
    return { ...servico, updatedAt: agora };
  }

  async excluir(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
