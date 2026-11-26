import { describe, expect, it } from 'vitest';
import { getActiveServices, serviceCatalog } from './catalog';

describe('serviceCatalog (Catálogo de Serviços da Clínica)', () => {
  it('não inclui procedimentos estáticos; o catálogo é fornecido pelo Firestore', () => {
    expect(serviceCatalog).toEqual([]);
  });

  it('filtra os serviços ativos recebidos do repositório', () => {
    const services = [
      { id: 'active', name: 'Ativo', description: '', durationMinutes: 30, priceInCents: 10000, imageSrc: '', imageAlt: '', active: true },
      { id: 'inactive', name: 'Inativo', description: '', durationMinutes: 30, priceInCents: 10000, imageSrc: '', imageAlt: '', active: false },
    ];
    const ativos = getActiveServices(services);
    expect(ativos).toHaveLength(1);
    expect(ativos.every((s) => s.active)).toBe(true);
  });
});
