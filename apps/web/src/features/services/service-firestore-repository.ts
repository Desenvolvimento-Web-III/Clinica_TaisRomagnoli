import { collection, getDocs, onSnapshot, type Firestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { serviceCatalog } from './catalog';
import type { Service } from './types';

// Imagens locais do projeto para cada serviço
import aromatherapyImage from '@/assets/services/aromaterapia.jpg';
import auriculotherapyImage from '@/assets/services/auriculoterapia.jpg';
import capillaryMassageImage from '@/assets/services/massagem-capilar.jpg';
import chromotherapyImage from '@/assets/services/cromoterapia.jpg';
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
import cuppingTherapyImage from '@/assets/services/ventosaterapia.jpg';

/**
 * Mapeamento de imagens locais do projeto por identificador, slug ou palavras-chave de serviço.
 */
export const localServiceImages: Record<string, string> = {
  // Spa dos pés e mãos
  '4rnoliy2iv9mlg0x9qau': spaFeetHandsImage,
  'spa-dos-pes-e-maos': spaFeetHandsImage,
  'spa-pes-maos': spaFeetHandsImage,
  spa: spaFeetHandsImage,

  // Cromoterapia
  '8ss6vois9ggjstimwonmy': chromotherapyImage,
  cromoterapia: chromotherapyImage,

  // Reiki
  dhncthnoudukjr5apqkt: reikiImage,
  reiki: reikiImage,

  // Massagem com Pedras Quentes
  hrnepjdulzmfxrr86anz: hotStonesImage,
  'massagem-com-pedras-quentes': hotStonesImage,
  'massagem-pedras-quentes': hotStonesImage,
  'pedras-quentes': hotStonesImage,
  pedras: hotStonesImage,

  // Reflexologia Podal
  mjdlieayuozyofbinddb4: reflexologyImage,
  'reflexologia-podal': reflexologyImage,
  reflexologia: reflexologyImage,

  // Massagem Desportiva
  mwabnoa0c3cczjlm1phz: sportsMassageImage,
  'massagem-desportiva': sportsMassageImage,
  desportiva: sportsMassageImage,

  // Massagem Terapêutica
  p8peevsrpyydkdnnssbbi: therapeuticMassageImage,
  'massagem-terapeutica': therapeuticMassageImage,
  terapeutica: therapeuticMassageImage,

  // Shiatsu
  skqdnchkm13l8xh5yrxh: shiatsuImage,
  shiatsu: shiatsuImage,

  // Auriculoterapia
  shak1fpslrbrzyi6zumn: auriculotherapyImage,
  auriculoterapia: auriculotherapyImage,
  auriculo: auriculotherapyImage,

  // Massagem Facial
  tp99tycdzkbinco4hvim: facialMassageImage,
  'massagem-facial': facialMassageImage,
  facial: facialMassageImage,

  // Ventosaterapia
  vzozykrj61jspvnl3ghz: cuppingTherapyImage,
  ventosaterapia: cuppingTherapyImage,
  ventosa: cuppingTherapyImage,

  // Relaxante para os Pés
  a20qznvpd0owhrhb28lm: footRelaxingImage,
  'relaxante-para-os-pes': footRelaxingImage,
  'relaxante-pes': footRelaxingImage,

  // Massagem Capilar
  grm6q94hqaadmjrfch3o: capillaryMassageImage,
  'massagem-capilar': capillaryMassageImage,
  capilar: capillaryMassageImage,

  // Terapia de Ultrassom
  qypezv0uxzpyhyoqebop: ultrasoundTherapyImage,
  'terapia-de-ultrassom': ultrasoundTherapyImage,
  'terapia-ultrassom': ultrasoundTherapyImage,
  ultrassom: ultrasoundTherapyImage,

  // Massagem Aromática / Aromaterapia
  sxlhpybpc5iipnjrchv5: aromatherapyImage,
  'massagem-aromatica': aromatherapyImage,
  aromaterapia: aromatherapyImage,
  aromatica: aromatherapyImage,
  aroma: aromatherapyImage,

  // Massagem Relaxante
  weergte1bhk0sl6tqgm: relaxingMassageImage,
  'massagem-relaxante': relaxingMassageImage,
  relaxante: relaxingMassageImage,

  // Drenagem Linfática
  'drenagem-linfatica': lymphaticDrainageImage,
  drenagem: lymphaticDrainageImage,

  // Liberação Miofascial
  'liberacao-miofascial': myofascialReleaseImage,
  liberacao: myofascialReleaseImage,
  miofascial: myofascialReleaseImage,
};

/**
 * Retorna a imagem local correspondente ao serviço ou uma imagem padrão da clínica.
 */
export function resolveLocalServiceImage(serviceId: string, serviceName: string): string {
  const normalizedId = serviceId.toLowerCase().trim();
  const normalizedName = serviceName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (localServiceImages[normalizedId]) {
    return localServiceImages[normalizedId];
  }

  if (localServiceImages[normalizedName]) {
    return localServiceImages[normalizedName];
  }

  for (const [key, image] of Object.entries(localServiceImages)) {
    if (normalizedName.includes(key) || normalizedId.includes(key)) {
      return image;
    }
  }

  return relaxingMassageImage;
}

export interface FirestoreServiceData {
  name?: string;
  nome?: string;
  nome_servico?: string;
  description?: string;
  descricao?: string;
  durationMinutes?: number | string;
  duracao?: number | string;
  priceInCents?: number | string;
  preco?: number | string;
  precoCentavos?: number | string;
  active?: boolean;
  ativo?: boolean;
  imageAlt?: string;
  createdAt?: unknown;
}

/**
 * Mapeia o documento do Firestore para a entidade Service com a imagem do projeto local.
 */
export function mapFirestoreDocToService(id: string, data: FirestoreServiceData): Service {
  const name = data.nome_servico || data.nome || data.name || 'Serviço';
  const description =
    data.descricao ||
    data.description ||
    'Atendimento especializado de massoterapia e cuidados terapêuticos.';
  const durationMinutes = Number(data.durationMinutes ?? data.duracao ?? 60);

  let priceInCents = 12000;
  if (data.priceInCents !== undefined && data.priceInCents !== null) {
    priceInCents = Number(data.priceInCents);
  } else if (data.precoCentavos !== undefined && data.precoCentavos !== null) {
    priceInCents = Number(data.precoCentavos);
  } else if (data.preco !== undefined && data.preco !== null) {
    const parsed = Number(data.preco);
    priceInCents = Number.isNaN(parsed) ? 12000 : Math.round(parsed * 100);
  }

  const active =
    data.active !== undefined
      ? Boolean(data.active)
      : data.ativo !== undefined
        ? Boolean(data.ativo)
        : true;

  const imageSrc = resolveLocalServiceImage(id, name);
  const imageAlt = data.imageAlt || `Sessão de ${name}`;

  return {
    id,
    name,
    description,
    durationMinutes,
    priceInCents,
    imageSrc,
    imageAlt,
    active,
  };
}

/**
 * Consulta os serviços no Firestore e resolve suas imagens da pasta local do projeto.
 */
export async function fetchServicesFromFirestore(
  customDb: Firestore | null = db,
): Promise<Service[]> {
  if (!customDb) {
    return [...serviceCatalog];
  }

  try {
    const snapshot = await getDocs(collection(customDb, 'servicos'));

    if (snapshot.empty) {
      return [...serviceCatalog];
    }

    return snapshot.docs
      .map((doc) => mapFirestoreDocToService(doc.id, doc.data() as FirestoreServiceData))
      .filter((service) => service.active);
  } catch {
    return [...serviceCatalog];
  }
}

/**
 * Escuta em tempo real as atualizações de serviços do Firestore.
 */
export function subscribeToServicesFromFirestore(
  onUpdate: (services: Service[]) => void,
  customDb: Firestore | null = db,
): () => void {
  if (!customDb) {
    onUpdate([...serviceCatalog]);
    return () => {};
  }

  try {
    const colRef = collection(customDb, 'servicos');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate([...serviceCatalog]);
          return;
        }

        const services = snapshot.docs
          .map((doc) => mapFirestoreDocToService(doc.id, doc.data() as FirestoreServiceData))
          .filter((service) => service.active);

        onUpdate(services.length > 0 ? services : [...serviceCatalog]);
      },
      () => {
        onUpdate([...serviceCatalog]);
      },
    );

    return unsubscribe;
  } catch {
    onUpdate([...serviceCatalog]);
    return () => {};
  }
}
