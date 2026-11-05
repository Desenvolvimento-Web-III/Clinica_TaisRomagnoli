import {
  DEFAULT_CLINIC_SETTINGS,
  DEFAULT_INITIAL_ADMIN,
  DEFAULT_INITIAL_PROFESSIONAL,
  DEFAULT_INITIAL_AGENDAMENTOS,
} from './constants/default-seeds.js';
import type { Agendamento } from './types/agendamento.js';
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
  agendamentos: SeedDocument<Agendamento>[];
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
    agendamentos: DEFAULT_INITIAL_AGENDAMENTOS.map((ag) => ({
      collection: 'agendamentos',
      id: ag.id,
      data: { ...ag },
    })),
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
  const docs: SeedDocument<unknown>[] = [
    initialData.settings,
    initialData.professional,
    initialData.admin,
    ...initialData.agendamentos,
  ];

  for (const item of docs) {
    await writer.set(item.collection, item.id, item.data as unknown as Record<string, unknown>);
  }

  return {
    count: docs.length,
    collections: Array.from(new Set(docs.map((d) => d.collection))),
  };
}
