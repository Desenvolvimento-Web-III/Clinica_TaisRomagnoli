import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  horariosFuncionamentoSchema,
  salvarHorariosInputSchema,
  type HorariosFuncionamento,
  type SalvarHorariosInput,
} from '@clinica/shared';
import { getApiBaseUrl } from './agendamentos-service';

export const CONFIGURACOES_COLLECTION = 'configuracoes';
export const HORARIOS_DOCUMENT = 'horarios_funcionamento';

/**
 * Consulta os horários de funcionamento cadastrados na clínica.
 * Lê somente a configuração persistida da clínica.
 */
export async function buscarHorariosFuncionamento(
  professionalId?: string,
): Promise<HorariosFuncionamento> {
  if (!db) {
    throw new Error('Firebase não está configurado para consultar os horários.');
  }

  try {
    if (professionalId) {
      const profSnap = await getDoc(
        doc(db, CONFIGURACOES_COLLECTION, `${HORARIOS_DOCUMENT}_${professionalId}`),
      );
      if (profSnap.exists()) {
        const parsedProf = horariosFuncionamentoSchema.safeParse(profSnap.data());
        if (parsedProf.success) {
          return parsedProf.data;
        }
      }
    }

    const docRef = doc(db, CONFIGURACOES_COLLECTION, HORARIOS_DOCUMENT);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      throw new Error('A clínica ainda não cadastrou os horários de funcionamento.');
    }

    const data = snapshot.data();
    const parsed = horariosFuncionamentoSchema.safeParse(data);

    if (!parsed.success) {
      console.warn('Dados de horários no banco inconsistentes com o schema:', parsed.error);
      throw new Error('A configuração de horários da clínica está inválida.');
    }

    return parsed.data;
  } catch (error) {
    console.error('Erro ao buscar horários de funcionamento:', error);
    throw error;
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
    throw new Error('Firebase não está configurado para salvar os horários.');
  }

  const docId = dadosValidados.professionalId
    ? `${HORARIOS_DOCUMENT}_${dadosValidados.professionalId}`
    : HORARIOS_DOCUMENT;

  const docRef = doc(db, CONFIGURACOES_COLLECTION, docId);
  await setDoc(docRef, dadosCompletos, { merge: true });

  return dadosCompletos;
}

/**
 * Consulta a disponibilidade calculada no backend com agendamentos, bloqueios e horários fixos.
 */
export async function consultarHorariosDisponiveis(params: {
  data: string;
  duracaoMinutos?: number;
  servicoId?: string;
  profissionalId?: string;
}): Promise<string[]> {
  const query = new URLSearchParams({
    data: params.data,
    profissionalId: params.profissionalId ?? 'prof-tais-romagnoli',
    ...(params.servicoId ? { servicoId: params.servicoId } : {}),
    ...(params.duracaoMinutos ? { duracaoMinutos: String(params.duracaoMinutos) } : {}),
  });
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/obterHorariosDisponiveis?${query}`);
  const body = await response.json();
  if (!response.ok || !body?.sucesso || !Array.isArray(body.dados?.horarios)) {
    throw new Error(body?.error || 'Não foi possível consultar a disponibilidade da agenda.');
  }
  return body.dados.horarios.filter((hora: unknown): hora is string => typeof hora === 'string');
}
