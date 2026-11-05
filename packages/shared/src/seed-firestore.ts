import {
  DEFAULT_CLINIC_SETTINGS,
  DEFAULT_INITIAL_ADMIN,
  DEFAULT_INITIAL_PROFESSIONAL,
  DEFAULT_INITIAL_SERVICES,
} from './constants/default-seeds.js';
import type { ClinicSettings } from './types/clinic-settings.js';
import type { Professional } from './types/professional.js';
import type { UserProfile } from './types/user-profile.js';
import type { ServicoModel } from './schemas/servico.js';

export interface SeedDocument<T> {
  collection: string;
  id: string;
  data: T;
}

export interface InitialClinicData {
  settings: SeedDocument<ClinicSettings>;
  professional: SeedDocument<Professional>;
  admin: SeedDocument<UserProfile>;
  services: SeedDocument<ServicoModel>[];
}

/**
 * Retorna os serviços padrão da clínica formatados para seed no Firestore, com os campos de sinal incluídos.
 */
export function getInitialServicesData(): SeedDocument<ServicoModel>[] {
  return DEFAULT_INITIAL_SERVICES.map((servico) => ({
    collection: 'servicos',
    id: servico.id,
    data: { ...servico },
  }));
}

/**
 * Retorna os dados padrão iniciais da clínica estruturados por coleção e identificador de documento.
 */
export function getInitialClinicData(): InitialClinicData {
  return {
    settings: {
      collection: 'configuracoes',
      id: 'geral',
      data: { ...DEFAULT_CLINIC_SETTINGS },
    },
    professional: {
      collection: 'profissionais',
      id: DEFAULT_INITIAL_PROFESSIONAL.id,
      data: { ...DEFAULT_INITIAL_PROFESSIONAL },
    },
    admin: {
      collection: 'usuarios',
      id: DEFAULT_INITIAL_ADMIN.uid,
      data: { ...DEFAULT_INITIAL_ADMIN },
    },
    services: getInitialServicesData(),
  };
}

export interface FirestoreLikeWriter {
  doc(path: string): unknown;
  setDoc(docRef: unknown, data: Record<string, unknown>): Promise<unknown>;
}

export interface SeedOptions {
  includeServices?: boolean;
}

/**
 * Aplica os serviços padrão da clínica com sinal no Firestore usando um adapter simples de persistência.
 */
export async function seedServicesData(writer: {
  set(collection: string, id: string, data: Record<string, unknown>): Promise<void>;
}): Promise<{ count: number; collections: string[] }> {
  const services = getInitialServicesData();

  for (const item of services) {
    const firestorePayload = {
      ...item.data,
      name: item.data.nome,
      description: item.data.descricao,
      duracao: item.data.duracaoMinutos,
      durationMinutes: item.data.duracaoMinutos,
      preco: item.data.preco,
      precoCentavos: item.data.precoEmCentavos,
      priceInCents: item.data.precoEmCentavos,
      sinal: item.data.sinal,
      sinalCentavos: item.data.sinalEmCentavos,
      sinalInCents: item.data.sinalEmCentavos,
      sinalPercentual: item.data.sinalPercentual,
      ativo: item.data.ativo,
      active: item.data.ativo,
    };
    await writer.set(
      item.collection,
      item.id,
      firestorePayload as unknown as Record<string, unknown>,
    );
  }

  return {
    count: services.length,
    collections: ['servicos'],
  };
}

/**
 * Aplica os dados padrão iniciais da clínica no Firestore usando um adapter simples de persistência.
 * Suporta opção `includeServices` para também inicializar o catálogo de serviços com o sinal de reserva.
 */
export async function seedClinicData(
  writer: {
    set(collection: string, id: string, data: Record<string, unknown>): Promise<void>;
  },
  options: SeedOptions = {},
): Promise<{ count: number; collections: string[] }> {
  const initialData = getInitialClinicData();
  const docs: Array<SeedDocument<unknown>> = [
    initialData.settings,
    initialData.professional,
    initialData.admin,
  ];

  if (options.includeServices) {
    docs.push(...initialData.services);
  }

  for (const item of docs) {
    await writer.set(item.collection, item.id, item.data as unknown as Record<string, unknown>);
  }

  return {
    count: docs.length,
    collections: Array.from(new Set(docs.map((d) => d.collection))),
  };
}
