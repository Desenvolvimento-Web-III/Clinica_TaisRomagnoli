import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { clinicSettingsSchema, type ClinicSettings } from '@clinica/shared';

export const CONFIGURACOES_COLLECTION = 'configuracoes';
export const CONFIGURACOES_GERAL_DOC = 'geral';

export async function buscarConfiguracoesGerais(): Promise<ClinicSettings> {
  if (!db) throw new Error('Firebase não está configurado.');
  const snapshot = await getDoc(doc(db, CONFIGURACOES_COLLECTION, CONFIGURACOES_GERAL_DOC));
  if (!snapshot.exists()) throw new Error('As configurações gerais ainda não foram cadastradas.');
  const parsed = clinicSettingsSchema.safeParse(snapshot.data());
  if (!parsed.success) throw new Error('As configurações gerais salvas estão inválidas.');
  return parsed.data;
}

export async function salvarConfiguracoesGerais(settings: ClinicSettings): Promise<ClinicSettings> {
  if (!db) throw new Error('Firebase não está configurado.');
  const validated = clinicSettingsSchema.parse({ ...settings, updatedAt: new Date().toISOString() });
  await setDoc(doc(db, CONFIGURACOES_COLLECTION, CONFIGURACOES_GERAL_DOC), validated, { merge: true });
  return validated;
}
