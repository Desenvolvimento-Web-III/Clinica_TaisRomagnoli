import type { Firestore } from 'firebase-admin/firestore';
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
 * Obtém a configuração de horários de funcionamento.
 * Caso o documento ainda não exista no Firestore, retorna a configuração padrão da clínica.
 * Preparado para suportar múltiplos profissionais via professionalId.
 */
export async function obterHorarios(
  firestore: Firestore,
  professionalId?: string,
): Promise<HorariosFuncionamento> {
  const docId = professionalId ? `${HORARIOS_DOCUMENT}_${professionalId}` : HORARIOS_DOCUMENT;
  const docRef = firestore.collection(CONFIGURACOES_COLLECTION).doc(docId);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return CONFIGURACAO_HORARIOS_PADRAO;
  }

  const data = snapshot.data();
  const parsed = horariosFuncionamentoSchema.safeParse(data);

  if (!parsed.success) {
    return CONFIGURACAO_HORARIOS_PADRAO;
  }

  return parsed.data;
}

/**
 * Cadastra ou altera a configuração de horários e intervalos da clínica.
 * Valida os dados de entrada e adiciona metadados de auditoria.
 */
export async function salvarHorarios(
  firestore: Firestore,
  input: SalvarHorariosInput,
  adminUid: string,
): Promise<HorariosFuncionamento> {
  const dadosValidados = salvarHorariosInputSchema.parse(input);
  const docId = dadosValidados.professionalId
    ? `${HORARIOS_DOCUMENT}_${dadosValidados.professionalId}`
    : HORARIOS_DOCUMENT;

  const dadosComAuditoria: HorariosFuncionamento = {
    ...dadosValidados,
    atualizadoEm: new Date().toISOString(),
    atualizadoPor: adminUid,
  };

  const docRef = firestore.collection(CONFIGURACOES_COLLECTION).doc(docId);
  await docRef.set(dadosComAuditoria, { merge: true });

  return dadosComAuditoria;
}
