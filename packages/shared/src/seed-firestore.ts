import {
  DEFAULT_CLINIC_SETTINGS,
  DEFAULT_INITIAL_ADMIN,
  DEFAULT_INITIAL_PROFESSIONAL,
} from './constants/default-seeds.js';
import type { ClinicSettings } from './types/clinic-settings.js';
import type { Professional } from './types/professional.js';
import type { UserProfile } from './types/user-profile.js';

export interface SeedDocument<T> {
  collection: string;
  id: string;
  data: T;
}

export interface InitialClinicData {
  settings: SeedDocument<ClinicSettings>;
  professional: SeedDocument<Professional>;
  admin: SeedDocument<UserProfile>;
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
  };
}

export interface FirestoreLikeWriter {
  doc(path: string): unknown;
  setDoc(docRef: unknown, data: Record<string, unknown>): Promise<unknown>;
}

/**
 * Aplica os dados padrão iniciais da clínica no Firestore usando um adapter simples de persistência.
 */
export async function seedClinicData(writer: {
  set(collection: string, id: string, data: Record<string, unknown>): Promise<void>;
}): Promise<{ count: number; collections: string[] }> {
  const initialData = getInitialClinicData();
  const docs = [initialData.settings, initialData.professional, initialData.admin];

  for (const item of docs) {
    await writer.set(item.collection, item.id, item.data as unknown as Record<string, unknown>);
  }

  return {
    count: docs.length,
    collections: Array.from(new Set(docs.map((d) => d.collection))),
  };
}
