import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  resolveLocalServiceImage,
  mapFirestoreDocToService,
  fetchServicesFromFirestore,
  subscribeToServicesFromFirestore,
  localServiceImages,
} from './service-firestore-repository';
import { serviceCatalog } from './catalog';

// Mocks do Firestore
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: (...args: unknown[]) => mockCollection(...args),
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

    it('retorna a imagem padrão relaxante caso não encontre correspondência exata', () => {
      const fallback = resolveLocalServiceImage('servico-desconhecido', 'Nova Terapia Especial');
      expect(fallback).toBe(localServiceImages['massagem-relaxante']);
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

  describe('fetchServicesFromFirestore', () => {
    it('retorna os serviços do Firestore com imagens locais', async () => {
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
      expect(services[0]?.name).toBe('Massagem Relaxante VIP');
      expect(services[0]?.description).toBe('Descrição personalizada do banco.');
      expect(services[0]?.durationMinutes).toBe(75);
      expect(services[0]?.imageSrc).toBe(localServiceImages['massagem-relaxante']);
    });

    it('usa catálogo padrão local caso Firestore não esteja inicializado ou falhe', async () => {
      const services = await fetchServicesFromFirestore(null);
      expect(services).toEqual(serviceCatalog);
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
});
