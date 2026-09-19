import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CONFIGURACAO_HORARIOS_PADRAO,
  horariosFuncionamentoSchema,
  salvarHorariosInputSchema,
  type HorariosFuncionamento,
  type SalvarHorariosInput,
} from '@clinica/shared';

export const CONFIGURACOES_COLLECTION = 'configuracoes';
export const HORARIOS_DOCUMENT = 'horarios_funcionamento';

/**
 * Consulta os horários de funcionamento cadastrados na clínica.
 * Caso ainda não haja registro no banco ou o Firebase não esteja configurado (modo demo/smoke test),
 * retorna a configuração padrão da clínica.
 */
export async function buscarHorariosFuncionamento(
  professionalId?: string,
): Promise<HorariosFuncionamento> {
  if (!db) {
    return CONFIGURACAO_HORARIOS_PADRAO;
  }

  const docId = professionalId ? `${HORARIOS_DOCUMENT}_${professionalId}` : HORARIOS_DOCUMENT;
  const docRef = doc(db, CONFIGURACOES_COLLECTION, docId);

  try {
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return CONFIGURACAO_HORARIOS_PADRAO;
    }

    const data = snapshot.data();
    const parsed = horariosFuncionamentoSchema.safeParse(data);

    if (!parsed.success) {
      console.warn('Dados de horários no banco inconsistentes com o schema:', parsed.error);
      return CONFIGURACAO_HORARIOS_PADRAO;
    }

    return parsed.data;
  } catch (error) {
    console.error('Erro ao buscar horários de funcionamento:', error);
    return CONFIGURACAO_HORARIOS_PADRAO;
  }
}

/**
 * Salva ou atualiza a configuração de dias, horários e intervalos de manutenção da clínica.
 * Requer permissão administrativa.
 */
export async function salvarHorariosFuncionamento(
  input: SalvarHorariosInput,
  adminUid?: string,
): Promise<HorariosFuncionamento> {
  const dadosValidados = salvarHorariosInputSchema.parse(input);

  const dadosCompletos: HorariosFuncionamento = {
    ...dadosValidados,
    atualizadoEm: new Date().toISOString(),
    atualizadoPor: adminUid || 'admin',
  };

  if (!db) {
    // Modo demo ou sem Firebase conectado: simula salvamento local
    return dadosCompletos;
  }

  const docId = dadosValidados.professionalId
    ? `${HORARIOS_DOCUMENT}_${dadosValidados.professionalId}`
    : HORARIOS_DOCUMENT;

  const docRef = doc(db, CONFIGURACOES_COLLECTION, docId);
  await setDoc(docRef, dadosCompletos, { merge: true });

  return dadosCompletos;
}
