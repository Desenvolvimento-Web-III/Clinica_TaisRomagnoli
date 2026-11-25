import type { Firestore } from 'firebase-admin/firestore';
import {
  CONFIGURACAO_HORARIOS_PADRAO,
  ID_PROFISSIONAL_PADRAO,
  validarEncaixeHorariosFuncionamento,
  verificarConflitoHorarios,
  verificarConflitoBloqueioOuHorarioFixo,
  verificarProfissionalHabilitadoParaServico,
  verificarReservaExpirada,
  extrairDataHoraLocal,
  calcularDataHoraFim,
  type HorariosFuncionamento,
  type BloqueioAgenda,
  type HorarioFixoCliente,
} from '@clinica/shared';
import type { AgendamentosRepository } from '../agendamentos/agendamentos-repository.js';
import type { BloqueiosRepository } from './bloqueios-repository.js';
import type { HorariosFixosRepository } from './horarios-fixos-repository.js';
import type { ServicosRepository } from '../servicos/servicos-repository.js';
import type { ProfissionaisRepository } from '../profissionais/profissionais-repository.js';
import {
  obterHorarios,
  consultarGradeHorariosDisponiveis,
  HorariosBusinessError,
  type ResultadoGradeHorariosDisponiveis,
} from '../horarios/horarios-service.js';

export interface CalcularDisponibilidadeSlotParams {
  dataHoraInicioIso: string;
  dataHoraFimIso?: string;
  duracaoMinutos?: number;
  servicoId?: string;
  profissionalId?: string;
  clienteIdSolicitante?: string;
  agendamentoIdIgnorado?: string;
  intervaloMinutos?: number;
}

export type TipoConflitoDisponibilidade =
  | 'dia_inativo'
  | 'fora_do_turno'
  | 'intervalo_manutencao'
  | 'bloqueio_unico'
  | 'bloqueio_recorrente'
  | 'horario_fixo_outro_cliente'
  | 'conflito_agendamento'
  | 'data_passada';

export interface ResultadoDisponibilidadeSlot {
  disponivel: boolean;
  conflito: boolean;
  dataHoraInicioIso: string;
  dataHoraFimIso: string;
  duracaoMinutos: number;
  intervaloMinutos: number;
  motivo?: string;
  tipoConflito?: TipoConflitoDisponibilidade;
  detalhes?: {
    id?: string;
    descricao?: string;
  };
}

export interface ContextoDisponibilidadeAgenda {
  firestore?: Firestore;
  configuracaoHorarios?: HorariosFuncionamento;
  agendamentosRepo?: AgendamentosRepository;
  bloqueiosRepo?: BloqueiosRepository;
  horariosFixosRepo?: HorariosFixosRepository;
  servicosRepo?: ServicosRepository;
  profissionaisRepo?: ProfissionaisRepository;
  dataReferencia?: Date;
}

/**
 * Calcula a disponibilidade de um horário (slot) combinando rigorosamente:
 * 1. Funcionamento da clínica (dias ativos, turnos de atendimento, manutenção/almoço).
 * 2. Duração do serviço solicitado.
 * 3. Intervalo padrão de organização de 30 minutos entre atendimentos.
 * 4. Bloqueios de agenda (únicos, pontuais, de dia inteiro ou recorrentes) e horários fixos de clientes.
 * 5. Agendamentos existentes ativos (considerando intervalos mútuos).
 * 6. Bloqueio de datas e horários passados.
 */
export async function calcularDisponibilidadeSlotAgenda(
  params: CalcularDisponibilidadeSlotParams,
  context: ContextoDisponibilidadeAgenda,
): Promise<ResultadoDisponibilidadeSlot> {
  if (!params.dataHoraInicioIso || typeof params.dataHoraInicioIso !== 'string') {
    throw new HorariosBusinessError('Data/hora de início é obrigatória.', 400);
  }

  const slotInicioMs = new Date(params.dataHoraInicioIso).getTime();
  if (Number.isNaN(slotInicioMs)) {
    throw new HorariosBusinessError('Data/hora de início inválida.', 400);
  }

  if (
    params.duracaoMinutos !== undefined &&
    (!Number.isFinite(params.duracaoMinutos) || params.duracaoMinutos <= 0)
  ) {
    throw new HorariosBusinessError('A duração do atendimento deve ser maior que zero.', 400);
  }

  if (
    params.intervaloMinutos !== undefined &&
    (!Number.isFinite(params.intervaloMinutos) || params.intervaloMinutos < 0)
  ) {
    throw new HorariosBusinessError('O intervalo entre atendimentos não pode ser negativo.', 400);
  }

  const profissionalId = params.profissionalId || ID_PROFISSIONAL_PADRAO;

  // 1. Validar profissional caso repositório seja fornecido
  if (context.profissionaisRepo) {
    const prof = await context.profissionaisRepo.buscarPorId(profissionalId);
    if (!prof) {
      throw new HorariosBusinessError('Profissional informado não encontrado.', 404);
    }
    if (!prof.ativo) {
      throw new HorariosBusinessError(
        'O profissional informado não está ativo para agendamentos.',
        422,
      );
    }
  }

  // 2. Determinar duração e horário final de forma consistente
  let duracaoMinutos = params.duracaoMinutos;
  let duracaoDefinidaExplicitamente = params.duracaoMinutos !== undefined;

  if (params.servicoId) {
    if (context.servicosRepo) {
      const servico = await context.servicosRepo.buscarPorId(params.servicoId);
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
      duracaoDefinidaExplicitamente = true;
    } else if (duracaoMinutos === undefined && !params.dataHoraFimIso) {
      throw new HorariosBusinessError(
        'Duração do serviço não informada e catálogo indisponível.',
        400,
      );
    }
  }

  let dataHoraFimIso: string;

  if (duracaoDefinidaExplicitamente && duracaoMinutos !== undefined) {
    dataHoraFimIso = calcularDataHoraFim(params.dataHoraInicioIso, duracaoMinutos);
  } else if (params.dataHoraFimIso) {
    const slotFimMs = new Date(params.dataHoraFimIso).getTime();
    if (Number.isNaN(slotFimMs)) {
      throw new HorariosBusinessError('Data/hora de término inválida.', 400);
    }
    if (slotFimMs <= slotInicioMs) {
      throw new HorariosBusinessError(
        'O horário de término deve ser posterior ao horário de início.',
        400,
      );
    }
    duracaoMinutos = Math.round((slotFimMs - slotInicioMs) / (1000 * 60));
    if (duracaoMinutos <= 0) {
      throw new HorariosBusinessError('A duração do atendimento deve ser maior que zero.', 400);
    }
    dataHoraFimIso = params.dataHoraFimIso;
  } else {
    throw new HorariosBusinessError(
      'É obrigatório informar dataHoraFimIso, duracaoMinutos ou servicoId.',
      400,
    );
  }

  // 3. Obter configuração de horários de funcionamento
  let config = context.configuracaoHorarios;
  if (!config) {
    if (context.firestore) {
      config = await obterHorarios(context.firestore, profissionalId);
    } else {
      config = CONFIGURACAO_HORARIOS_PADRAO;
    }
  }

  const intervaloMinutos = params.intervaloMinutos ?? config.intervaloPadraoMinutos ?? 30;

  // 4. Validação de data/horário no passado
  const dataReferencia =
    context.dataReferencia ?? (process.env.NODE_ENV === 'test' ? undefined : new Date());

  if (dataReferencia && slotInicioMs <= dataReferencia.getTime()) {
    return {
      disponivel: false,
      conflito: true,
      dataHoraInicioIso: params.dataHoraInicioIso,
      dataHoraFimIso,
      duracaoMinutos,
      intervaloMinutos,
      motivo: 'Não é permitido agendar em datas ou horários que já passaram.',
      tipoConflito: 'data_passada',
    };
  }

  // 5. 1º Pilar: Funcionamento da clínica (dias ativos, turnos e intervalos de manutenção)
  const validacaoEncaixe = validarEncaixeHorariosFuncionamento(
    params.dataHoraInicioIso,
    duracaoMinutos,
    config,
  );

  if (!validacaoEncaixe.valido) {
    return {
      disponivel: false,
      conflito: true,
      dataHoraInicioIso: params.dataHoraInicioIso,
      dataHoraFimIso,
      duracaoMinutos,
      intervaloMinutos,
      motivo: validacaoEncaixe.motivo,
      tipoConflito: validacaoEncaixe.codigoErro,
    };
  }

  // 6. Buscar bloqueios, horários fixos e agendamentos em paralelo
  const { dataYmd } = extrairDataHoraLocal(params.dataHoraInicioIso);

  const [bloqueios, horariosFixos, agendamentos] = await Promise.all([
    context.bloqueiosRepo
      ? context.bloqueiosRepo.listarAtivos(profissionalId)
      : Promise.resolve<BloqueioAgenda[]>([]),
    context.horariosFixosRepo
      ? context.horariosFixosRepo.listarAtivos(profissionalId)
      : Promise.resolve<HorarioFixoCliente[]>([]),
    context.agendamentosRepo
      ? context.agendamentosRepo.listarPorProfissionalEData(profissionalId, dataYmd)
      : Promise.resolve([]),
  ]);

  // 7. 2º Pilar: Bloqueios e Horários Fixos de Clientes
  const checagemBloqueios = verificarConflitoBloqueioOuHorarioFixo({
    dataHoraInicioIso: params.dataHoraInicioIso,
    dataHoraFimIso,
    clienteIdSolicitante: params.clienteIdSolicitante,
    bloqueios,
    horariosFixos,
  });

  if (checagemBloqueios.conflito) {
    return {
      disponivel: false,
      conflito: true,
      dataHoraInicioIso: params.dataHoraInicioIso,
      dataHoraFimIso,
      duracaoMinutos,
      intervaloMinutos,
      motivo: checagemBloqueios.motivo,
      tipoConflito: checagemBloqueios.tipoConflito,
      detalhes: checagemBloqueios.detalhes,
    };
  }

  // 8. 3º e 4º Pilares: Agendamentos existentes e Intervalo de 30 min entre atendimentos
  const dataReferenciaExpiracao = dataReferencia ?? new Date();
  const conflitoAgendamento = agendamentos.find((existente) => {
    if (existente.status === 'cancelado' || existente.status === 'reagendado') {
      return false;
    }
    if (verificarReservaExpirada(existente, dataReferenciaExpiracao)) {
      return false;
    }
    if (params.agendamentoIdIgnorado && existente.id === params.agendamentoIdIgnorado) {
      return false;
    }
    return verificarConflitoHorarios(
      {
        inicioIso: params.dataHoraInicioIso,
        fimIso: dataHoraFimIso,
        intervaloMinutos,
      },
      {
        inicioIso: existente.dataHoraInicio,
        fimIso: existente.dataHoraFim,
        intervaloMinutos: existente.intervaloAposMinutos ?? intervaloMinutos,
      },
    );
  });

  if (conflitoAgendamento) {
    return {
      disponivel: false,
      conflito: true,
      dataHoraInicioIso: params.dataHoraInicioIso,
      dataHoraFimIso,
      duracaoMinutos,
      intervaloMinutos,
      motivo: `O horário selecionado colide com um agendamento existente ou seu intervalo de organização (${intervaloMinutos} min).`,
      tipoConflito: 'conflito_agendamento',
      detalhes: {
        id: conflitoAgendamento.id,
        descricao: conflitoAgendamento.servicoNome,
      },
    };
  }

  // 9. Tudo em conformidade -> Slot Disponível!
  return {
    disponivel: true,
    conflito: false,
    dataHoraInicioIso: params.dataHoraInicioIso,
    dataHoraFimIso,
    duracaoMinutos,
    intervaloMinutos,
  };
}

export interface CalcularDisponibilidadeGradeParams {
  data: string; // YYYY-MM-DD
  duracaoMinutos?: number;
  servicoId?: string;
  profissionalId?: string;
  clienteIdSolicitante?: string;
  agendamentoIdIgnorado?: string;
  passoMinutos?: number;
}

/**
 * Calcula a grade completa de horários disponíveis para uma data,
 * combinando funcionamento, duração, intervalo de 30 min, bloqueios e agendamentos existentes.
 */
export async function calcularGradeDisponibilidadeAgenda(
  params: CalcularDisponibilidadeGradeParams,
  context: {
    firestore: Firestore;
    agendamentosRepo: AgendamentosRepository;
    bloqueiosRepo: BloqueiosRepository;
    horariosFixosRepo: HorariosFixosRepository;
    servicosRepo?: ServicosRepository;
    profissionaisRepo?: ProfissionaisRepository;
    dataReferencia?: Date;
  },
): Promise<ResultadoGradeHorariosDisponiveis> {
  return consultarGradeHorariosDisponiveis(
    params,
    context.firestore,
    context.agendamentosRepo,
    context.bloqueiosRepo,
    context.horariosFixosRepo,
    context.servicosRepo,
    params.clienteIdSolicitante,
    context.profissionaisRepo,
    context.dataReferencia,
  );
}
