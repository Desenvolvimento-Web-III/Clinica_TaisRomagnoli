import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  DEFAULT_CLINIC_SETTINGS,
  clinicSettingsSchema,
  type ClinicSettings,
} from '@clinica/shared';

export const CONFIGURACOES_COLLECTION = 'configuracoes';
export const CONFIGURACOES_GERAL_DOC = 'geral';
const STORAGE_KEY = 'clinica_tais_configuracoes_geral_v1';

/**
 * Carrega as configurações gerais da clínica.
 * Prioriza o Firestore; caso offline, sem db ou sem registro, consulta o localStorage ou retorna DEFAULT_CLINIC_SETTINGS.
 */
export async function buscarConfiguracoesGerais(): Promise<ClinicSettings> {
  if (db) {
    try {
      const docRef = doc(db, CONFIGURACOES_COLLECTION, CONFIGURACOES_GERAL_DOC);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        const parsed = clinicSettingsSchema.safeParse(data);
        if (parsed.success) {
          // Salva no localStorage para cache local resiliente
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.data));
            } catch {
              // Fallback silencioso
            }
          }
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('Aviso: Não foi possível obter configurações do Firestore:', error);
    }
  }

  // Fallback 1: cache local no localStorage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = clinicSettingsSchema.safeParse(JSON.parse(cached));
        if (parsed.success) {
          return parsed.data;
        }
      }
    } catch {
      // Fallback silencioso
    }
  }

  // Fallback 2: padrões oficiais do sistema
  return DEFAULT_CLINIC_SETTINGS;
}

/**
 * Salva as configurações gerais da clínica no Firestore e no cache local.
 * Valida todos os campos contra o schema antes de gravar.
 */
export async function salvarConfiguracoesGerais(settings: ClinicSettings): Promise<ClinicSettings> {
  const dadosValidados = clinicSettingsSchema.parse({
    ...settings,
    updatedAt: new Date().toISOString(),
  });

  if (db) {
    try {
      const docRef = doc(db, CONFIGURACOES_COLLECTION, CONFIGURACOES_GERAL_DOC);
      await setDoc(docRef, dadosValidados, { merge: true });
    } catch (error) {
      console.warn('Aviso: Não foi possível persistir configurações no Firestore:', error);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dadosValidados));
    } catch {
      // Fallback silencioso
    }
  }

  return dadosValidados;
}

/**
 * Restaura as configurações da clínica para os valores padrão oficiais
 */
export async function restaurarConfiguracoesPadrao(): Promise<ClinicSettings> {
  return salvarConfiguracoesGerais(DEFAULT_CLINIC_SETTINGS);
}
