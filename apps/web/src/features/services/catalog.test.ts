import { describe, expect, it } from 'vitest';
import { getActiveServices, serviceCatalog } from './catalog';

describe('serviceCatalog (Catálogo de Serviços da Clínica)', () => {
  it('contém os 18 procedimentos cadastrados com seus respectivos sinais de pagamento', () => {
    expect(serviceCatalog).toHaveLength(18);

    for (const service of serviceCatalog) {
      expect(service.id).toBeTruthy();
      expect(service.name).toBeTruthy();
      expect(service.durationMinutes).toBeGreaterThanOrEqual(15);
      expect(service.priceInCents).toBeGreaterThan(0);

      // Verificação específica da regra de negócio: sinal de 30%
      expect(service.sinalPercentual).toBe(30);
      expect(service.sinalInCents).toBe(Math.round(service.priceInCents * 0.3));
      expect(service.sinalInCents).toBeLessThanOrEqual(service.priceInCents);
    }
  });

  it('calcula o sinal de reserva correto para serviços emblemáticos', () => {
    const relaxante = serviceCatalog.find((s) => s.id === 'massagem-relaxante');
    expect(relaxante).toBeDefined();
    expect(relaxante?.priceInCents).toBe(17000); // R$ 170,00
    expect(relaxante?.sinalInCents).toBe(5100); // R$ 51,00 (30%)
    expect(relaxante?.sinalPercentual).toBe(30);

    const pedras = serviceCatalog.find((s) => s.id === 'massagem-pedras-quentes');
    expect(pedras).toBeDefined();
    expect(pedras?.priceInCents).toBe(23000); // R$ 230,00
    expect(pedras?.sinalInCents).toBe(6900); // R$ 69,00 (30%)

    const pes = serviceCatalog.find((s) => s.id === 'relaxante-pes');
    expect(pes).toBeDefined();
    expect(pes?.priceInCents).toBe(10000); // R$ 100,00
    expect(pes?.sinalInCents).toBe(3000); // R$ 30,00 (30%)
  });

  it('retorna apenas procedimentos ativos com getActiveServices', () => {
    const ativos = getActiveServices(serviceCatalog);
    expect(ativos.length).toBe(18);
    expect(ativos.every((s) => s.active)).toBe(true);
  });
});
