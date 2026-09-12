import { collection, getDocs, query, where, onSnapshot, type Firestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { serviceCatalog } from './catalog';
import type { Service } from './types';

// Imagens locais do projeto
import lymphaticDrainageImage from '@/assets/services/drenagem-linfatica.jpg';
import myofascialReleaseImage from '@/assets/services/liberacao-miofascial.jpg';
import relaxingMassageImage from '@/assets/services/massagem-relaxante.jpg';
import therapeuticMassageImage from '@/assets/services/massagem-terapeutica.jpg';

/**
 * Mapeamento de imagens locais do projeto por identificador ou slug de serviço.
 */
export const localServiceImages: Record<string, string> = {
  'massagem-relaxante': relaxingMassageImage,
  relaxante: relaxingMassageImage,
  'massagem-terapeutica': therapeuticMassageImage,
  terapeutica: therapeuticMassageImage,
  'drenagem-linfatica': lymphaticDrainageImage,
  drenagem: lymphaticDrainageImage,
  'liberacao-miofascial': myofascialReleaseImage,
  liberacao: myofascialReleaseImage,
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
    .trim();

  if (localServiceImages[normalizedId]) {
    return localServiceImages[normalizedId];
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
  description?: string;
  descricao?: string;
  durationMinutes?: number;
  duracao?: number;
  priceInCents?: number;
  preco?: number;
  precoCentavos?: number;
  active?: boolean;
  ativo?: boolean;
  imageAlt?: string;
}

/**
 * Mapeia o documento do Firestore para a entidade Service com a imagem do projeto local.
 */
export function mapFirestoreDocToService(id: string, data: FirestoreServiceData): Service {
  const name = data.name || data.nome || 'Serviço';
  const description =
    data.description ||
    data.descricao ||
    'Atendimento especializado de massoterapia e cuidados terapêuticos.';
  const durationMinutes = Number(data.durationMinutes ?? data.duracao ?? 60);
  const priceInCents = Number(
    data.priceInCents ?? data.precoCentavos ?? (data.preco ? data.preco * 100 : 12000),
  );
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
    const q = query(collection(customDb, 'servicos'), where('active', '!=', false));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [...serviceCatalog];
    }

    return snapshot.docs.map((doc) =>
      mapFirestoreDocToService(doc.id, doc.data() as FirestoreServiceData),
    );
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
