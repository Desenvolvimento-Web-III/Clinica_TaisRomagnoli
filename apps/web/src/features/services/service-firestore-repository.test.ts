import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  resolveLocalServiceImage,
  mapFirestoreDocToService,
  mergeServicesWithDefaultCatalog,
  fetchServicesFromFirestore,
  subscribeToServicesFromFirestore,
  saveServiceToFirestore,
  localServiceImages,
} from './service-firestore-repository';

// Mocks do Firestore
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockDoc = vi.fn();
const mockSetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock('@/lib/firebase', () => ({
  auth: null,
  db: {},
}));

describe('service-firestore-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveLocalServiceImage', () => {
    it('associa a imagem correta a partir do ID ou do nome do serviço', () => {
      const imgRelaxante = resolveLocalServiceImage('massagem-relaxante', 'Massagem Relaxante');
      expect(imgRelaxante).toBe(localServiceImages['massagem-relaxante']);

      const imgDrenagem = resolveLocalServiceImage('qualquer-id', 'Drenagem Linfática Corporal');
      expect(imgDrenagem).toBe(localServiceImages['drenagem-linfatica']);

      const imgTerapeutica = resolveLocalServiceImage('serv-1', 'Massagem Terapêutica');
      expect(imgTerapeutica).toBe(localServiceImages['massagem-terapeutica']);

      const imgDesportiva = resolveLocalServiceImage('serv-desp', 'Massagem Desportiva');
      expect(imgDesportiva).toBe(localServiceImages['massagem-desportiva']);

      const imgMiofascial = resolveLocalServiceImage('serv-2', 'Liberação Miofascial');
      expect(imgMiofascial).toBe(localServiceImages['liberacao-miofascial']);

      const imgAroma = resolveLocalServiceImage('aromaterapia', 'Massagem Aromática');
      expect(imgAroma).toBe(localServiceImages['aromaterapia']);

      const imgPedras = resolveLocalServiceImage(
        'massagem-pedras-quentes',
        'Massagem com Pedras Quentes',
      );
      expect(imgPedras).toBe(localServiceImages['massagem-pedras-quentes']);

      const imgReflexo = resolveLocalServiceImage('reflexologia-podal', 'Reflexologia Podal');
      expect(imgReflexo).toBe(localServiceImages['reflexologia-podal']);

      const imgSpa = resolveLocalServiceImage('4RnOLIy2iV9mlG0x9qAU', 'Spa dos pés e mãos');
      expect(imgSpa).toBe(localServiceImages['4rnoliy2iv9mlg0x9qau']);
    });

    it('retorna vazio quando não encontra uma imagem correspondente', () => {
      const fallback = resolveLocalServiceImage('servico-desconhecido', 'Nova Terapia Especial');
      expect(fallback).toBe('');
    });
  });

  describe('mapFirestoreDocToService', () => {
    it('mapeia campos em português (nome, descricao, duracao) e atribui imagem do projeto', () => {
      const service = mapFirestoreDocToService('drenagem-123', {
        nome: 'Drenagem Linfática',
        descricao: 'Massagem manual para retenção de líquidos.',
        duracao: 50,
        preco: 130,
        ativo: true,
      });

      expect(service.id).toBe('drenagem-123');
      expect(service.name).toBe('Drenagem Linfática');
      expect(service.description).toBe('Massagem manual para retenção de líquidos.');
      expect(service.durationMinutes).toBe(50);
      expect(service.priceInCents).toBe(13000);
      expect(service.imageSrc).toBe(localServiceImages['drenagem-linfatica']);
      expect(service.active).toBe(true);
    });

    it('mapeia nome_servico e preco em formato string vindos do console do Firestore', () => {
      const service = mapFirestoreDocToService('4RnOLIy2iV9mlG0x9qAU', {
        nome_servico: 'Spa dos pés e mãos',
        descricao: 'Ritual de cuidados para pés e mãos.',
        duracao: 40,
        preco: '200',
      });

      expect(service.id).toBe('4RnOLIy2iV9mlG0x9qAU');
      expect(service.name).toBe('Spa dos pés e mãos');
      expect(service.durationMinutes).toBe(40);
      expect(service.priceInCents).toBe(20000);
      expect(service.imageSrc).toBe(localServiceImages['4rnoliy2iv9mlg0x9qau']);
      expect(service.active).toBe(true);
    });

    it('mapeia campo duracaoMinutos salvo pelo backend no Firestore', () => {
      const service = mapFirestoreDocToService('pedras-90', {
        nome: 'Massagem com Pedras Quentes',
        descricao: 'Sessão estendida de 90 minutos.',
        duracaoMinutos: 90,
        preco: 250,
        ativo: true,
      });

      expect(service.durationMinutes).toBe(90);
      expect(service.priceInCents).toBe(25000);
    });

    it('mapeia campos em inglês (name, description, durationMinutes) e atribui imagem do projeto', () => {
      const service = mapFirestoreDocToService('liberacao-456', {
        name: 'Liberação Miofascial',
        descricao: 'Técnica manual com pressão profunda.',
        durationMinutes: 45,
        priceInCents: 11000,
        active: true,
      });

      expect(service.name).toBe('Liberação Miofascial');
      expect(service.durationMinutes).toBe(45);
      expect(service.priceInCents).toBe(11000);
      expect(service.imageSrc).toBe(localServiceImages['liberacao-miofascial']);
    });
  });

  describe('mergeServicesWithDefaultCatalog', () => {
    it('mantém somente os serviços recebidos quando não há catálogo base', () => {
      const editedService = {
        id: 'massagem-desportiva',
        name: 'Massagem Desportiva Pro',
        description: 'Descrição nova para atletas.',
        durationMinutes: 75,
        priceInCents: 22000,
        sinalPercentual: 30,
        sinalInCents: 6600,
        category: 'Corporal',
        imageSrc: 'https://example.com/desportiva.jpg',
        imageAlt: 'Sessão desportiva pro',
        active: true,
      };

      const merged = mergeServicesWithDefaultCatalog([editedService]);

      expect(merged).toHaveLength(1);
      const desp = merged.find((s) => s.id === 'massagem-desportiva');
      expect(desp?.name).toBe('Massagem Desportiva Pro');
      expect(desp?.durationMinutes).toBe(75);
      expect(desp?.priceInCents).toBe(22000);

      // Não injeta serviços estáticos ausentes do Firestore.
      const relax = merged.find((s) => s.id === 'massagem-relaxante');
      expect(relax).toBeUndefined();
    });

    it('adiciona novos serviços personalizados cadastrados no Firestore', () => {
      const customService = {
        id: 'terapia-especial-zen',
        name: 'Terapia Especial Zen',
        description: 'Terapia exclusiva.',
        durationMinutes: 90,
        priceInCents: 30000,
        sinalPercentual: 30,
        sinalInCents: 9000,
        category: 'Exclusiva',
        imageSrc: 'https://example.com/zen.jpg',
        imageAlt: 'Terapia zen',
        active: true,
      };

      const merged = mergeServicesWithDefaultCatalog([customService]);

      expect(merged).toHaveLength(1);
      expect(merged.some((s) => s.id === 'terapia-especial-zen')).toBe(true);
    });
  });

  describe('fetchServicesFromFirestore', () => {
    it('retorna somente os serviços existentes no Firestore com imagens locais', async () => {
      const fakeDb = {} as unknown as Parameters<typeof fetchServicesFromFirestore>[0];
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'massagem-relaxante',
            data: () => ({
              nome: 'Massagem Relaxante VIP',
              descricao: 'Descrição personalizada do banco.',
              duracao: 75,
              precoCentavos: 16000,
              ativo: true,
            }),
          },
        ],
      });

      const services = await fetchServicesFromFirestore(fakeDb);

      expect(services).toHaveLength(1);
      const relaxante = services.find((s) => s.id === 'massagem-relaxante');
      expect(relaxante?.name).toBe('Massagem Relaxante VIP');
      expect(relaxante?.description).toBe('Descrição personalizada do banco.');
      expect(relaxante?.durationMinutes).toBe(75);
      expect(relaxante?.imageSrc).toBe(localServiceImages['massagem-relaxante']);

      // Serviços ausentes do Firestore não são simulados pelo catálogo.
      const terapeutica = services.find((s) => s.id === 'massagem-terapeutica');
      expect(terapeutica).toBeUndefined();
    });

    it('retorna lista vazia caso Firestore não esteja inicializado', async () => {
      const services = await fetchServicesFromFirestore(null);
      expect(services).toEqual([]);
    });
  });

  describe('subscribeToServicesFromFirestore', () => {
    it('escuta alterações em tempo real do Firestore e emite os serviços atualizados', () => {
      const fakeDb = {} as unknown as Parameters<typeof subscribeToServicesFromFirestore>[1];
      const onUpdate = vi.fn();

      mockOnSnapshot.mockImplementation((_query, onNext) => {
        onNext({
          empty: false,
          docs: [
            {
              id: 'massagem-terapeutica',
              data: () => ({
                nome: 'Massagem Terapêutica Realtime',
                descricao: 'Descrição realtime.',
                duracao: 60,
                precoCentavos: 14000,
                ativo: true,
              }),
            },
          ],
        });
        return vi.fn();
      });

      const unsubscribe = subscribeToServicesFromFirestore(onUpdate, fakeDb);

      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(onUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Massagem Terapêutica Realtime',
            imageSrc: localServiceImages['massagem-terapeutica'],
          }),
        ]),
      );
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('saveServiceToFirestore', () => {
    it('salva novo serviço com cálculo automático de sinal e converte valores', async () => {
      const fakeDb = {} as unknown as Parameters<typeof saveServiceToFirestore>[1];
      const fakeDocRef = { id: 'srv-novo' };
      mockDoc.mockReturnValue(fakeDocRef);
      mockSetDoc.mockResolvedValue(undefined);

      const saved = await saveServiceToFirestore(
        {
          nome: 'Massagem Craniana Especial',
          duracaoMinutos: 45,
          preco: 120,
          sinal: 36,
          descricao: 'Terapia focada no alívio de enxaqueca.',
          ativo: true,
          categoria: 'Terapêutica',
        },
        fakeDb,
      );

      expect(mockDoc).toHaveBeenCalled();
      expect(mockSetDoc).toHaveBeenCalledWith(
        fakeDocRef,
        expect.objectContaining({
          nome: 'Massagem Craniana Especial',
          duracao: 45,
          preco: 120,
          precoCentavos: 12000,
          sinal: 36,
          sinalCentavos: 3600,
          sinalPercentual: 30,
          ativo: true,
        }),
        { merge: true },
      );
      expect(saved.name).toBe('Massagem Craniana Especial');
      expect(saved.priceInCents).toBe(12000);
      expect(saved.sinalInCents).toBe(3600);
    });

    it('atualiza serviço existente mantendo seu id', async () => {
      const fakeDb = {} as unknown as Parameters<typeof saveServiceToFirestore>[1];
      const fakeDocRef = { id: 'massagem-relaxante' };
      mockDoc.mockReturnValue(fakeDocRef);
      mockSetDoc.mockResolvedValue(undefined);

      const saved = await saveServiceToFirestore(
        {
          id: 'massagem-relaxante',
          nome: 'Massagem Relaxante Renovada',
          duracaoMinutos: 90,
          preco: 200,
          sinalPercentual: 40,
          descricao: 'Sessão profunda e renovadora.',
          ativo: false,
        },
        fakeDb,
      );

      expect(mockDoc).toHaveBeenCalledWith(fakeDb, 'servicos', 'massagem-relaxante');
      expect(mockSetDoc).toHaveBeenCalledWith(
        fakeDocRef,
        expect.objectContaining({
          nome: 'Massagem Relaxante Renovada',
          duracao: 90,
          preco: 200,
          precoCentavos: 20000,
          sinalCentavos: 8000,
          sinalPercentual: 40,
          ativo: false,
        }),
        { merge: true },
      );
      expect(saved.id).toBe('massagem-relaxante');
      expect(saved.active).toBe(false);
    });
  });
});
