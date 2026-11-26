import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CONFIGURACAO_HORARIOS_PADRAO,
  horariosFuncionamentoSchema,
  salvarHorariosInputSchema,
  gerarHorariosDisponiveis,
  calcularDataHoraFim,
  type HorariosFuncionamento,
  type SalvarHorariosInput,
} from '@clinica/shared';
import { getTodosAgendamentosStorage } from '@/features/agendamentos/data/agendamentos-storage';

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

/**
 * Calcula os horários a partir das configurações da clínica e dos agendamentos locais.
 * Os documentos de agendamento não são consultados por clientes porque contêm dados pessoais.
 */
export async function consultarHorariosDisponiveis(params: {
  data: string;
  duracaoMinutos?: number;
  servicoId?: string;
  profissionalId?: string;
}): Promise<string[]> {
  // Sem Functions, usa a configuração Firestore e o cache local do navegador.
  const config = await buscarHorariosFuncionamento(params.profissionalId);
  const todosAgendamentos = getTodosAgendamentosStorage();
  const slots = gerarHorariosDisponiveis({
    data: params.data,
    duracaoMinutos: params.duracaoMinutos ?? 60,
    intervaloMinutos: config.intervaloPadraoMinutos ?? 30,
    configuracaoHorarios: config,
    agendamentosExistentes: todosAgendamentos.map((a) => {
      const dataYmd = a.dataHoraIso.slice(0, 10);
      const hora = a.horarioFormatado?.match(/^\d{2}:\d{2}/)?.[0] || a.dataHoraIso.slice(11, 16);
      const inicioIso = `${dataYmd}T${hora}:00.000Z`;
      return {
        id: a.id,
        dataHoraInicio: inicioIso,
        dataHoraFim: calcularDataHoraFim(inicioIso, a.duracaoMinutos),
        intervaloAposMinutos: 30,
        status: a.status,
      };
    }),
  });
  return slots.map((s) => s.horaInicio);
}
