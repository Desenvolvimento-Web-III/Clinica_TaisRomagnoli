import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreServicosRepository } from '../src/modules/servicos/servicos-repository.js';
import type { ServicoModel } from '@clinica/shared';

describe('FirestoreServicosRepository', () => {
  let mockDocGet: ReturnType<typeof vi.fn>;
  let mockDocSet: ReturnType<typeof vi.fn>;
  let mockDocDelete: ReturnType<typeof vi.fn>;
  let mockDocRef: { get: typeof mockDocGet; set: typeof mockDocSet; delete: typeof mockDocDelete };
  let mockCollectionWhere: ReturnType<typeof vi.fn>;
  let mockCollectionGet: ReturnType<typeof vi.fn>;
  let mockCollection: ReturnType<typeof vi.fn>;
  let mockFirestore: Firestore;
  let repo: FirestoreServicosRepository;

  const sampleServico: ServicoModel = {
    id: 'massagem-relaxante',
    nome: 'Massagem Relaxante',
    duracaoMinutos: 60,
    preco: 150,
    precoEmCentavos: 15000,
    sinal: 45,
    sinalEmCentavos: 4500,
    sinalPercentual: 30,
    descricao: 'Movimentos suaves.',
    ativo: true,
    categoria: 'Corporal',
  };

  beforeEach(() => {
    mockDocGet = vi.fn();
    mockDocSet = vi.fn();
    mockDocDelete = vi.fn();
    mockDocRef = {
      get: mockDocGet,
      set: mockDocSet,
      delete: mockDocDelete,
    };
    mockCollectionGet = vi.fn();
    mockCollectionWhere = vi.fn().mockReturnValue({
      get: mockCollectionGet,
    });
    mockCollection = vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDocRef),
      where: mockCollectionWhere,
      get: mockCollectionGet,
    });
    mockFirestore = {
      collection: mockCollection,
    } as unknown as Firestore;

    repo = new FirestoreServicosRepository(mockFirestore);
  });

  it('salva um serviço com mapeamento bilíngue/retrocompatível', async () => {
    mockDocSet.mockResolvedValueOnce(undefined);

    const salvo = await repo.salvar(sampleServico);

    expect(salvo.id).toBe('massagem-relaxante');
    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'massagem-relaxante',
        nome: 'Massagem Relaxante',
        name: 'Massagem Relaxante',
        durationMinutes: 60,
        priceInCents: 15000,
        sinalInCents: 4500,
        active: true,
      }),
    );
  });

  it('recupera um serviço pelo ID e normaliza campos em formato ServicoModel', async () => {
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      id: 'massagem-relaxante',
      data: () => ({
        name: 'Massagem Relaxante',
        durationMinutes: 60,
        priceInCents: 15000,
        sinalInCents: 4500,
        sinalPercentual: 30,
        description: 'Movimentos suaves.',
        active: true,
        categoria: 'Corporal',
      }),
    });

    const encontrado = await repo.buscarPorId('massagem-relaxante');

    expect(encontrado).not.toBeNull();
    expect(encontrado?.nome).toBe('Massagem Relaxante');
    expect(encontrado?.preco).toBe(150);
    expect(encontrado?.precoEmCentavos).toBe(15000);
    expect(encontrado?.sinal).toBe(45);
    expect(encontrado?.sinalEmCentavos).toBe(4500);
    expect(encontrado?.ativo).toBe(true);
  });

  it('retorna null quando o documento não existe', async () => {
    mockDocGet.mockResolvedValueOnce({ exists: false });

    const resultado = await repo.buscarPorId('inexistente');
    expect(resultado).toBeNull();
  });

  it('lista serviços filtrando apenas ativos quando solicitado', async () => {
    mockCollectionGet.mockResolvedValueOnce({
      docs: [
        {
          id: 'massagem-relaxante',
          data: () => ({
            nome: 'Massagem Relaxante',
            duracaoMinutos: 60,
            precoEmCentavos: 15000,
            sinalEmCentavos: 4500,
            descricao: 'Desc',
            ativo: true,
          }),
        },
      ],
    });

    const lista = await repo.listar(true);

    expect(mockCollectionWhere).toHaveBeenCalledWith('ativo', '==', true);
    expect(lista).toHaveLength(1);
    expect(lista[0]?.id).toBe('massagem-relaxante');
  });

  it('atualiza documento com merge e timestamp recente', async () => {
    mockDocSet.mockResolvedValueOnce(undefined);

    const atualizado = await repo.atualizar({
      ...sampleServico,
      preco: 180,
      precoEmCentavos: 18000,
    });

    expect(atualizado.preco).toBe(180);
    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        priceInCents: 18000,
      }),
      { merge: true },
    );
  });

  it('exclui documento pelo ID', async () => {
    mockDocDelete.mockResolvedValueOnce(undefined);

    await repo.excluir('massagem-relaxante');
    expect(mockDocDelete).toHaveBeenCalled();
  });

  describe('buscarPorNome', () => {
    it('recupera serviço pelo atributo nome', async () => {
      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'massagem-relaxante',
            data: () => ({
              nome: 'Massagem Relaxante',
              duracaoMinutos: 60,
              precoEmCentavos: 15000,
              sinalEmCentavos: 4500,
              descricao: 'Desc',
              ativo: true,
            }),
          },
        ],
      });

      const encontrado = await repo.buscarPorNome('Massagem Relaxante');

      expect(mockCollectionWhere).toHaveBeenCalledWith('nome', '==', 'Massagem Relaxante');
      expect(encontrado?.id).toBe('massagem-relaxante');
      expect(encontrado?.nome).toBe('Massagem Relaxante');
    });

    it('recupera serviço via fallback para atributo name legado', async () => {
      // Primeira busca por 'nome' vazia
      mockCollectionGet.mockResolvedValueOnce({ docs: [] });
      // Segunda busca por 'name' encontra
      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'drenagem-linfatica',
            data: () => ({
              name: 'Drenagem Linfática',
              durationMinutes: 60,
              priceInCents: 16000,
              active: true,
            }),
          },
        ],
      });

      const encontrado = await repo.buscarPorNome('Drenagem Linfática');

      expect(mockCollectionWhere).toHaveBeenCalledWith('name', '==', 'Drenagem Linfática');
      expect(encontrado?.id).toBe('drenagem-linfatica');
      expect(encontrado?.nome).toBe('Drenagem Linfática');
    });

    it('retorna null se não encontrar por nome nem por name', async () => {
      mockCollectionGet.mockResolvedValueOnce({ docs: [] });
      mockCollectionGet.mockResolvedValueOnce({ docs: [] });
      mockCollectionGet.mockResolvedValueOnce({ docs: [] }); // listar

      const resultado = await repo.buscarPorNome('Serviço Inexistente');
      expect(resultado).toBeNull();
    });
  });
});
