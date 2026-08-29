import lymphaticDrainageImage from '@/assets/services/drenagem-linfatica.jpg';
import myofascialReleaseImage from '@/assets/services/liberacao-miofascial.jpg';
import relaxingMassageImage from '@/assets/services/massagem-relaxante.jpg';
import therapeuticMassageImage from '@/assets/services/massagem-terapeutica.jpg';
import type { Service } from './types';

/**
 * Catálogo demonstrativo do MVP.
 * Nomes, durações e valores devem ser substituídos pelos dados comerciais oficiais
 * antes de qualquer publicação para clientes reais.
 */
export const serviceCatalog = [
  {
    id: 'massagem-relaxante',
    name: 'Massagem relaxante',
    description:
      'Movimentos suaves para proporcionar uma pausa tranquila e uma experiência de cuidado.',
    durationMinutes: 60,
    priceInCents: 12000,
    imageSrc: relaxingMassageImage,
    imageAlt: 'Sala de massoterapia preparada com maca, toalhas e luz natural',
    active: true,
  },
  {
    id: 'massagem-terapeutica',
    name: 'Massagem terapêutica',
    description:
      'Atendimento direcionado às áreas de maior tensão, respeitando as necessidades de cada sessão.',
    durationMinutes: 60,
    priceInCents: 14000,
    imageSrc: therapeuticMassageImage,
    imageAlt: 'Profissional realizando massagem sobre uma cobertura de tecido',
    active: true,
  },
  {
    id: 'drenagem-linfatica',
    name: 'Drenagem linfática',
    description: 'Movimentos leves e ritmados realizados com cuidado e atenção ao seu conforto.',
    durationMinutes: 60,
    priceInCents: 13000,
    imageSrc: lymphaticDrainageImage,
    imageAlt: 'Profissional realizando movimentos leves de massagem na perna de uma cliente',
    active: true,
  },
  {
    id: 'liberacao-miofascial',
    name: 'Liberação miofascial',
    description:
      'Técnica manual com pressão controlada, adaptada aos limites e objetivos de cada cliente.',
    durationMinutes: 45,
    priceInCents: 11000,
    imageSrc: myofascialReleaseImage,
    imageAlt: 'Profissional aplicando pressão controlada no ombro de uma cliente vestida',
    active: true,
  },
] satisfies readonly Service[];

export function getActiveServices(services: readonly Service[]) {
  return services.filter((service) => service.active);
}
