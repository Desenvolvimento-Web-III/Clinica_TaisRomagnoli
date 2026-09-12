import aromatherapyImage from '@/assets/services/aromaterapia.jpg';
import auriculotherapyImage from '@/assets/services/auriculoterapia.jpg';
import capillaryMassageImage from '@/assets/services/massagem-capilar.jpg';
import chromotherapyImage from '@/assets/services/cromoterapia.jpg';
import cuppingTherapyImage from '@/assets/services/ventosaterapia.jpg';
import facialMassageImage from '@/assets/services/massagem-facial.jpg';
import footRelaxingImage from '@/assets/services/relaxante-pes.jpg';
import hotStonesImage from '@/assets/services/pedras-quentes.jpg';
import lymphaticDrainageImage from '@/assets/services/drenagem-linfatica.jpg';
import myofascialReleaseImage from '@/assets/services/liberacao-miofascial.jpg';
import reikiImage from '@/assets/services/reiki.jpg';
import relaxingMassageImage from '@/assets/services/massagem-relaxante.jpg';
import reflexologyImage from '@/assets/services/reflexologia-podal.jpg';
import shiatsuImage from '@/assets/services/shiatsu.jpg';
import spaFeetHandsImage from '@/assets/services/spa-pes-maos.jpg';
import sportsMassageImage from '@/assets/services/massagem-desportiva.jpg';
import therapeuticMassageImage from '@/assets/services/massagem-terapeutica.jpg';
import ultrasoundTherapyImage from '@/assets/services/terapia-ultrassom.jpg';
import type { Service } from './types';

/**
 * Catálogo padrão de serviços da Clínica Taís Romagnoli.
 * Sincronizado com os serviços cadastrados no Firestore.
 */
export const serviceCatalog = [
  {
    id: 'massagem-relaxante',
    name: 'Massagem Relaxante',
    description:
      'Massagem realizada com movimentos suaves, contínuos e envolventes, geralmente com óleo ou creme, destinada a diminuir tensões musculares e proporcionar relaxamento e bem-estar.',
    durationMinutes: 60,
    priceInCents: 17000,
    imageSrc: relaxingMassageImage,
    imageAlt: 'Sessão de massagem relaxante em ambiente calmo e acolhedor',
    active: true,
  },
  {
    id: 'massagem-terapeutica',
    name: 'Massagem Terapêutica',
    description:
      'Atendimento personalizado que utiliza diferentes manobras e técnicas de massoterapia de acordo com as regiões de tensão ou desconforto, buscando promover relaxamento muscular e bem-estar.',
    durationMinutes: 60,
    priceInCents: 19000,
    imageSrc: therapeuticMassageImage,
    imageAlt: 'Profissional realizando massagem terapêutica cuidando da musculatura',
    active: true,
  },
  {
    id: 'massagem-pedras-quentes',
    name: 'Massagem com Pedras Quentes',
    description:
      'Utiliza pedras aquecidas, geralmente vulcânicas, associadas a manobras de deslizamento e pressão. O calor auxilia no relaxamento muscular e torna a massagem mais profunda e acolhedora.',
    durationMinutes: 60,
    priceInCents: 23000,
    imageSrc: hotStonesImage,
    imageAlt: 'Pedras basálticas aquecidas preparadas em ambiente de bem-estar',
    active: true,
  },
  {
    id: 'massagem-aromatica',
    name: 'Massagem Aromática',
    description:
      'Combina técnicas de massagem com óleos vegetais e óleos essenciais, associando o toque aos aromas para proporcionar relaxamento, conforto e uma experiência sensorial.',
    durationMinutes: 60,
    priceInCents: 23000,
    imageSrc: aromatherapyImage,
    imageAlt: 'Massagem aromática com aplicação sutil de óleos essenciais',
    active: true,
  },
  {
    id: 'massagem-desportiva',
    name: 'Massagem Desportiva',
    description:
      'Técnica direcionada a pessoas fisicamente ativas, utilizando manobras mais específicas e profundas para trabalhar a musculatura, aliviar tensões e auxiliar na recuperação após atividades físicas.',
    durationMinutes: 60,
    priceInCents: 19000,
    imageSrc: sportsMassageImage,
    imageAlt: 'Profissional realizando manobras profundas de massagem desportiva',
    active: true,
  },
  {
    id: 'shiatsu',
    name: 'Shiatsu',
    description:
      'Técnica japonesa que utiliza pressões firmes e ritmadas com dedos, palmas e outras partes das mãos sobre pontos e regiões de tensão, buscando promover relaxamento e equilíbrio corporal.',
    durationMinutes: 60,
    priceInCents: 17000,
    imageSrc: shiatsuImage,
    imageAlt: 'Terapeuta aplicando pressões tradicionais de shiatsu',
    active: true,
  },
  {
    id: 'reiki',
    name: 'Reiki',
    description:
      'Prática integrativa realizada por meio da imposição das mãos sobre ou próximo ao corpo, buscando proporcionar relaxamento e uma experiência de equilíbrio e bem-estar.',
    durationMinutes: 40,
    priceInCents: 13000,
    imageSrc: reikiImage,
    imageAlt: 'Terapeuta em sessão integrativa de reiki',
    active: true,
  },
  {
    id: 'spa-pes-maos',
    name: 'Spa dos pés e mãos',
    description:
      'Ritual de cuidados que pode incluir higienização, imersão ou escalda-pés, esfoliação, hidratação e massagem relaxante nos pés e mãos.',
    durationMinutes: 40,
    priceInCents: 20000,
    imageSrc: spaFeetHandsImage,
    imageAlt: 'Ritual acolhedor de escalda-pés e cuidados para pés e mãos',
    active: true,
  },
  {
    id: 'reflexologia-podal',
    name: 'Reflexologia Podal',
    description:
      'Técnica realizada nos pés por meio de pressões e estímulos em pontos específicos, proporcionando relaxamento e percepção de bem-estar corporal.',
    durationMinutes: 30,
    priceInCents: 13000,
    imageSrc: reflexologyImage,
    imageAlt: 'Profissional realizando reflexologia podal com foco em pontos de pressão',
    active: true,
  },
  {
    id: 'relaxante-pes',
    name: 'Relaxante para os Pés',
    description:
      'Massagem direcionada aos pés, utilizando movimentos suaves de deslizamento, amassamento e pressão para aliviar a sensação de cansaço e proporcionar relaxamento.',
    durationMinutes: 30,
    priceInCents: 10000,
    imageSrc: footRelaxingImage,
    imageAlt: 'Massagem suave e relaxamento dos pés',
    active: true,
  },
  {
    id: 'massagem-facial',
    name: 'Massagem Facial',
    description:
      'Massagem delicada realizada no rosto, podendo envolver movimentos de deslizamento, pressão e drenagem suave, promovendo relaxamento da musculatura facial e sensação de bem-estar.',
    durationMinutes: 30,
    priceInCents: 10000,
    imageSrc: facialMassageImage,
    imageAlt: 'Massagem delicada facial proporcionando relaxamento',
    active: true,
  },
  {
    id: 'massagem-capilar',
    name: 'Massagem Capilar',
    description:
      'Massagem realizada no couro cabeludo, com movimentos de pressão, fricção e deslizamento, proporcionando relaxamento e alívio das tensões da região da cabeça, pescoço e couro cabeludo.',
    durationMinutes: 30,
    priceInCents: 10000,
    imageSrc: capillaryMassageImage,
    imageAlt: 'Massagem relaxante no couro cabeludo e pescoço',
    active: true,
  },
  {
    id: 'cromoterapia',
    name: 'Cromoterapia',
    description:
      'Prática que utiliza diferentes cores e estímulos luminosos como recurso complementar de relaxamento e bem-estar, escolhidos de acordo com a proposta da sessão.',
    durationMinutes: 30,
    priceInCents: 10000,
    imageSrc: chromotherapyImage,
    imageAlt: 'Sessão de cromoterapia com iluminação terapêutica relaxante',
    active: true,
  },
  {
    id: 'auriculoterapia',
    name: 'Auriculoterapia',
    description:
      'Técnica que estimula pontos específicos do pavilhão auricular, normalmente com sementes, esferas ou outros estímulos, de acordo com a avaliação e o objetivo do atendimento.',
    durationMinutes: 30,
    priceInCents: 10000,
    imageSrc: auriculotherapyImage,
    imageAlt: 'Aplicação de estímulos na orelha em sessão de auriculoterapia',
    active: true,
  },
  {
    id: 'ventosaterapia',
    name: 'Ventosaterapia',
    description:
      'Técnica que utiliza ventosas para criar uma pressão negativa sobre a pele, promovendo uma sucção controlada e estímulo local dos tecidos.',
    durationMinutes: 30,
    priceInCents: 10000,
    imageSrc: cuppingTherapyImage,
    imageAlt: 'Aplicação de ventosas terapêuticas sobre a pele',
    active: true,
  },
  {
    id: 'terapia-ultrassom',
    name: 'Terapia de Ultrassom',
    description:
      'Procedimento que utiliza ondas ultrassônicas aplicadas sobre uma região específica do corpo por meio de um equipamento, conforme o objetivo terapêutico definido pelo profissional.',
    durationMinutes: 30,
    priceInCents: 13000,
    imageSrc: ultrasoundTherapyImage,
    imageAlt: 'Equipamento de ondas ultrassônicas aplicadas para fins terapêuticos',
    active: true,
  },
  {
    id: 'drenagem-linfatica',
    name: 'Drenagem Linfática',
    description: 'Movimentos leves e ritmados realizados com cuidado e atenção ao seu conforto.',
    durationMinutes: 60,
    priceInCents: 13000,
    imageSrc: lymphaticDrainageImage,
    imageAlt: 'Profissional realizando movimentos leves de drenagem linfática',
    active: true,
  },
  {
    id: 'liberacao-miofascial',
    name: 'Liberação Miofascial',
    description:
      'Técnica manual com pressão controlada, adaptada aos limites e objetivos de cada cliente.',
    durationMinutes: 45,
    priceInCents: 11000,
    imageSrc: myofascialReleaseImage,
    imageAlt: 'Profissional aplicando liberação miofascial com pressão adaptada',
    active: true,
  },
] satisfies readonly Service[];

export function getActiveServices(services: readonly Service[]) {
  return services.filter((service) => service.active);
}
