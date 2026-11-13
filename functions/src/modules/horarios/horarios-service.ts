import type { Firestore } from 'firebase-admin/firestore';
import {
  CONFIGURACAO_HORARIOS_PADRAO,
  horariosFuncionamentoSchema,
  salvarHorariosInputSchema,
  consultarHorariosDisponiveisInputSchema,
  gerarHorariosDisponiveis,
  verificarProfissionalHabilitadoParaServico,
  obterDataAtualIso,
  type HorariosFuncionamento,
  type SalvarHorariosInput,
  type SlotDisponivel,
} from '@clinica/shared';
import type { AgendamentosRepository } from '../agendamentos/agendamentos-repository.js';
import type { BloqueiosRepository } from '../agenda/bloqueios-repository.js';
import type { HorariosFixosRepository } from '../agenda/horarios-fixos-repository.js';
import type { ServicosRepository } from '../servicos/servicos-repository.js';
import type { ProfissionaisRepository } from '../profissionais/profissionais-repository.js';

export const CONFIGURACOES_COLLECTION = 'configuracoes';
export const HORARIOS_DOCUMENT = 'horarios_funcionamento';

export class HorariosBusinessError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'HorariosBusinessError';
  }
}

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

export interface ResultadoGradeHorariosDisponiveis {
  data: string;
  duracaoMinutos: number;
  intervaloMinutos: number;
  slots: SlotDisponivel[];
  horarios: string[];
}

/**
 * Consulta a grade de horários disponíveis aplicando rigorosamente a duração do serviço
 * e o intervalo padrão de 30 minutos de organização entre sessões.
 */
export async function consultarGradeHorariosDisponiveis(
  input: unknown,
  firestore: Firestore,
  agendamentosRepo: AgendamentosRepository,
  bloqueiosRepo: BloqueiosRepository,
  horariosFixosRepo: HorariosFixosRepository,
  servicosRepo?: ServicosRepository,
  clienteIdSolicitante?: string,
  profissionaisRepo?: ProfissionaisRepository,
  dataReferenciaParam?: Date,
): Promise<ResultadoGradeHorariosDisponiveis> {
  const parsed = consultarHorariosDisponiveisInputSchema.parse(input);
  const dataReferencia =
    dataReferenciaParam ?? (process.env.NODE_ENV === 'test' ? undefined : new Date());

  if (dataReferencia) {
    const hojeYmd = obterDataAtualIso(dataReferencia);
    if (parsed.data < hojeYmd) {
      return {
        data: parsed.data,
        duracaoMinutos: parsed.duracaoMinutos ?? 60,
        intervaloMinutos: 30,
        slots: [],
        horarios: [],
      };
    }
  }

  const profissionalId = parsed.profissionalId || 'prof-tais-romagnoli';

  if (profissionaisRepo) {
    const profissional = await profissionaisRepo.buscarPorId(profissionalId);
    if (!profissional) {
      throw new HorariosBusinessError('Profissional informado não encontrado.', 404);
    }
    if (!profissional.ativo) {
      throw new HorariosBusinessError(
        'O profissional informado não está ativo para agendamentos.',
        422,
      );
    }
  }

  let duracaoMinutos = parsed.duracaoMinutos;

  if (parsed.servicoId) {
    if (servicosRepo) {
      const servico = await servicosRepo.buscarPorId(parsed.servicoId);
      if (!servico) {
        throw new HorariosBusinessError('Serviço informado não encontrado.', 404);
      }
      if (!servico.ativo) {
        throw new HorariosBusinessError(
          'O procedimento selecionado está desativado e não aceita novos agendamentos.',
          422,
        );
      }
      if (!verificarProfissionalHabilitadoParaServico(servico, profissionalId)) {
        throw new HorariosBusinessError(
          'O profissional selecionado não realiza o procedimento solicitado.',
          422,
        );
      }
      duracaoMinutos = servico.duracaoMinutos;
    } else if (!duracaoMinutos) {
      throw new HorariosBusinessError(
        'Duração do serviço não informada e catálogo indisponível.',
        400,
      );
    }
  }

  if (!duracaoMinutos) {
    throw new HorariosBusinessError(
      'É obrigatório informar a duração do atendimento em minutos ou o ID do serviço.',
      400,
    );
  }

  const config = await obterHorarios(firestore, profissionalId);

  const agendamentos = await agendamentosRepo.listarPorProfissionalEData(
    profissionalId,
    parsed.data,
  );

  const [bloqueios, horariosFixos] = await Promise.all([
    bloqueiosRepo.listarAtivos(profissionalId),
    horariosFixosRepo.listarAtivos(profissionalId),
  ]);

  const slots = gerarHorariosDisponiveis({
    data: parsed.data,
    duracaoMinutos,
    intervaloMinutos: config.intervaloPadraoMinutos ?? 30,
    passoMinutos: parsed.passoMinutos ?? 30,
    configuracaoHorarios: config,
    agendamentosExistentes: agendamentos,
    bloqueios,
    horariosFixos,
    clienteIdSolicitante,
  });

  let slotsFinais = slots;
  if (dataReferencia) {
    const hojeYmd = obterDataAtualIso(dataReferencia);
    if (parsed.data === hojeYmd) {
      slotsFinais = slots.filter((s) => {
        const slotMs = new Date(`${parsed.data}T${s.horaInicio}:00.000Z`).getTime();
        return slotMs > dataReferencia.getTime();
      });
    }
  }

  return {
    data: parsed.data,
    duracaoMinutos,
    intervaloMinutos: config.intervaloPadraoMinutos ?? 30,
    slots: slotsFinais,
    horarios: slotsFinais.map((s) => s.horaInicio),
  };
}
