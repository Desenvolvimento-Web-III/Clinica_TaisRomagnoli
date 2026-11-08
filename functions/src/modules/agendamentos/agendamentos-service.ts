import {
  solicitarAgendamentoInputSchema,
  cancelarAgendamentoInputSchema,
  alterarAgendamentoInputSchema,
  atualizarStatusAgendamentoInputSchema,
  validarTransicaoStatus,
  calcularValoresAgendamento,
  calcularDataHoraFim,
  verificarConflitoHorarios,
  verificarConflitoBloqueioOuHorarioFixo,
  verificarAntecedenciaCancelamento,
  validarEncaixeHorariosFuncionamento,
  CONFIGURACAO_HORARIOS_PADRAO,
  verificarProfissionalHabilitadoParaServico,
  type HorariosFuncionamento,
  type Agendamento,
} from '@clinica/shared';
import type { AgendamentosRepository } from './agendamentos-repository.js';
import type { NotificacoesRepository } from '../notificacoes/notificacoes-repository.js';
import type { ServicosRepository } from '../servicos/servicos-repository.js';
import type { BloqueiosRepository } from '../agenda/bloqueios-repository.js';
import type { HorariosFixosRepository } from '../agenda/horarios-fixos-repository.js';
import type { ProfissionaisRepository } from '../profissionais/profissionais-repository.js';
import {
  criarNotificacaoConfirmacao,
  criarNotificacaoAlteracao,
  criarNotificacaoCancelamento,
} from '../notificacoes/notificacoes-service.js';

export interface UserContext {
  uid: string;
  nome: string;
  email?: string;
  telefone?: string;
  isAdmin: boolean;
}

export class AgendamentoBusinessError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'AgendamentoBusinessError';
  }
}

/**
 * Cria uma nova solicitação de agendamento validando regras de negócio,
 * folgas, concorrência e o sinal de 30%, disparando notificação interna de confirmação.
 */
export async function solicitarNovoAgendamento(
  input: unknown,
  user: UserContext,
  repo: AgendamentosRepository,
  notificacoesRepo?: NotificacoesRepository,
  servicosRepo?: ServicosRepository,
  bloqueiosRepo?: BloqueiosRepository,
  horariosFixosRepo?: HorariosFixosRepository,
  configuracaoHorarios?: HorariosFuncionamento,
  profissionaisRepo?: ProfissionaisRepository,
): Promise<Agendamento> {
  const parsed = solicitarAgendamentoInputSchema.parse(input);

  let profissionalNomeFinal = parsed.profissionalNome;

  // 0. Validação de Profissional Ativo e Habilitado (se repositório fornecido)
  if (profissionaisRepo) {
    const profissional = await profissionaisRepo.buscarPorId(parsed.profissionalId);
    if (!profissional) {
      throw new AgendamentoBusinessError('Profissional selecionado não encontrado.', 404);
    }
    if (!profissional.ativo) {
      throw new AgendamentoBusinessError(
        'O profissional selecionado não está ativo para agendamentos.',
        422,
      );
    }
    profissionalNomeFinal = profissional.nome;

    const inicioDate = new Date(parsed.dataHoraInicio);
    const diaSemana = inicioDate.getDay();
    if (
      profissional.diasFolga &&
      profissional.diasFolga.includes(diaSemana as 0 | 1 | 2 | 3 | 4 | 5 | 6)
    ) {
      throw new AgendamentoBusinessError(
        'O profissional selecionado não realiza atendimentos no dia da semana selecionado (folga cadastrada).',
        422,
      );
    }
  }

  // 1. Validação de Serviço Ativo, Duração e Habilitação do Profissional (se repositório fornecido)
  if (servicosRepo) {
    const servico = await servicosRepo.buscarPorId(parsed.servicoId);
    if (!servico) {
      throw new AgendamentoBusinessError('Procedimento selecionado não encontrado.', 404);
    }
    if (!servico.ativo) {
      throw new AgendamentoBusinessError(
        'O procedimento selecionado está desativado e não aceita novos agendamentos.',
        422,
      );
    }
    if (servico.duracaoMinutos !== parsed.duracaoMinutos) {
      throw new AgendamentoBusinessError(
        `A duração informada (${parsed.duracaoMinutos} min) não corresponde à duração cadastrada para o serviço (${servico.duracaoMinutos} min).`,
        422,
      );
    }
    if (!verificarProfissionalHabilitadoParaServico(servico, parsed.profissionalId)) {
      throw new AgendamentoBusinessError(
        'O profissional selecionado não realiza o procedimento solicitado.',
        422,
      );
    }
  }

  // 1. Validação de Folga e Encaixe nos Horários da Clínica
  if (configuracaoHorarios) {
    const validacaoEncaixe = validarEncaixeHorariosFuncionamento(
      parsed.dataHoraInicio,
      parsed.duracaoMinutos,
      configuracaoHorarios,
    );
    if (!validacaoEncaixe.valido) {
      throw new AgendamentoBusinessError(
        validacaoEncaixe.motivo ||
          'O horário selecionado não é válido para atendimento na clínica.',
        422,
      );
    }
  } else {
    const inicioDate = new Date(parsed.dataHoraInicio);
    const diaSemana = inicioDate.getDay();
    const diaConfig = CONFIGURACAO_HORARIOS_PADRAO.dias.find((d) => d.dia === diaSemana);
    if (diaConfig && !diaConfig.ativo) {
      throw new AgendamentoBusinessError(
        'A clínica não realiza atendimentos no dia da semana selecionado (folga cadastrada).',
        422,
      );
    }
  }

  // 2. Cálculo da data/hora de término garantindo a duração exata do serviço
  const dataHoraFim = calcularDataHoraFim(parsed.dataHoraInicio, parsed.duracaoMinutos);

  // 3. Verificação de conflitos com Bloqueios Únicos, Recorrentes ou Reservas de Clientes Fixos
  if (bloqueiosRepo || horariosFixosRepo) {
    const bloqueios = bloqueiosRepo ? await bloqueiosRepo.listarAtivos(parsed.profissionalId) : [];
    const horariosFixos = horariosFixosRepo
      ? await horariosFixosRepo.listarAtivos(parsed.profissionalId)
      : [];
    const checagemBloqueios = verificarConflitoBloqueioOuHorarioFixo({
      dataHoraInicioIso: parsed.dataHoraInicio,
      dataHoraFimIso: dataHoraFim,
      clienteIdSolicitante: user.uid,
      bloqueios,
      horariosFixos,
    });
    if (checagemBloqueios.conflito) {
      throw new AgendamentoBusinessError(
        checagemBloqueios.motivo || 'O horário selecionado está bloqueado na agenda da clínica.',
        409,
      );
    }
  }

  // 4. Verificação de conflitos de horários e respeito ao intervalo de 30 min com outros agendamentos
  const dataYmd = parsed.dataHoraInicio.substring(0, 10);
  const existentes = await repo.listarPorProfissionalEData(parsed.profissionalId, dataYmd);

  const conflito = existentes.some((existente) =>
    verificarConflitoHorarios(
      { inicioIso: parsed.dataHoraInicio, fimIso: dataHoraFim, intervaloMinutos: 30 },
      {
        inicioIso: existente.dataHoraInicio,
        fimIso: existente.dataHoraFim,
        intervaloMinutos: existente.intervaloAposMinutos,
      },
    ),
  );

  if (conflito) {
    throw new AgendamentoBusinessError(
      'O horário selecionado não está disponível devido a outro agendamento ou intervalo de manutenção de 30 minutos.',
      409,
    );
  }

  // 5. Regra de Negócio de Isenção de Sinal (apenas administradora em agendamento presencial)
  const isencaoSinal = user.isAdmin && parsed.isencaoSinalAdmin === true;
  const valores = calcularValoresAgendamento(parsed.valorTotalEmCentavos, 30, isencaoSinal);

  const novoAgendamento: Agendamento = {
    id: `ag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    clienteId: user.uid,
    clienteNome: user.nome,
    clienteEmail: user.email,
    clienteTelefone: user.telefone,
    servicoId: parsed.servicoId,
    servicoNome: parsed.servicoNome,
    duracaoMinutos: parsed.duracaoMinutos,
    valorTotalEmCentavos: valores.valorTotalEmCentavos,
    valorSinalEmCentavos: valores.valorSinalEmCentavos,
    saldoRestanteEmCentavos: valores.saldoRestanteEmCentavos,
    dataHoraInicio: parsed.dataHoraInicio,
    dataHoraFim,
    intervaloAposMinutos: 30,
    profissionalId: parsed.profissionalId,
    profissionalNome: profissionalNomeFinal,
    status: isencaoSinal ? 'confirmado' : 'pendente',
    metodoPagamento: parsed.metodoPagamento,
    origem: user.isAdmin ? 'presencial_admin' : 'app_cliente',
    sinalIsento: valores.sinalIsento,
    observacoes: parsed.observacoes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const salvo = await repo.salvar(novoAgendamento);

  if (notificacoesRepo) {
    await criarNotificacaoConfirmacao(salvo, notificacoesRepo);
  }

  return salvo;
}

/**
 * Altera ou reagenda um agendamento existente com validação de regras de concorrência,
 * folga da clínica e antecedência mínima de 3 horas, disparando notificação interna de alteração.
 */
export async function alterarAgendamentoExistente(
  input: unknown,
  user: { uid: string; isAdmin: boolean },
  repo: AgendamentosRepository,
  notificacoesRepoOuDataRef?: NotificacoesRepository | Date,
  dataReferenciaParam?: Date,
  bloqueiosRepo?: BloqueiosRepository,
  horariosFixosRepo?: HorariosFixosRepository,
  configuracaoHorarios?: HorariosFuncionamento,
  profissionaisRepo?: ProfissionaisRepository,
  servicosRepo?: ServicosRepository,
): Promise<Agendamento> {
  const notificacoesRepo =
    notificacoesRepoOuDataRef instanceof Date ? undefined : notificacoesRepoOuDataRef;
  const dataReferencia =
    notificacoesRepoOuDataRef instanceof Date
      ? notificacoesRepoOuDataRef
      : dataReferenciaParam instanceof Date
        ? dataReferenciaParam
        : new Date();

  const parsed = alterarAgendamentoInputSchema.parse(input);

  const agendamento = await repo.buscarPorId(parsed.agendamentoId);
  if (!agendamento) {
    throw new AgendamentoBusinessError('Agendamento não encontrado.', 404);
  }

  // Apenas o próprio cliente titular ou a administradora podem alterar
  if (!user.isAdmin && agendamento.clienteId !== user.uid) {
    throw new AgendamentoBusinessError('Acesso negado para alterar este agendamento.', 403);
  }

  if (agendamento.status === 'cancelado') {
    throw new AgendamentoBusinessError('Não é possível alterar um agendamento cancelado.', 400);
  }

  if (agendamento.status === 'concluido') {
    throw new AgendamentoBusinessError('Não é possível alterar um agendamento já concluído.', 400);
  }

  // Validação de antecedência mínima de 3 horas para reagendamento pelo cliente
  const antecedencia = verificarAntecedenciaCancelamento(
    agendamento.dataHoraInicio,
    3,
    dataReferencia,
  );
  if (!user.isAdmin && !antecedencia.permitido) {
    throw new AgendamentoBusinessError(
      'Reagendamentos devem ser solicitados com pelo menos 3 horas de antecedência do horário original.',
      422,
    );
  }

  // 1. Validação de Folga e Encaixe nos Horários da Clínica na nova data
  if (configuracaoHorarios) {
    const validacaoEncaixe = validarEncaixeHorariosFuncionamento(
      parsed.novaDataHoraInicio,
      agendamento.duracaoMinutos,
      configuracaoHorarios,
    );
    if (!validacaoEncaixe.valido) {
      throw new AgendamentoBusinessError(
        validacaoEncaixe.motivo ||
          'O horário selecionado não é válido para atendimento na clínica.',
        422,
      );
    }
  } else {
    const inicioDate = new Date(parsed.novaDataHoraInicio);
    const diaSemana = inicioDate.getDay();
    const diaConfig = CONFIGURACAO_HORARIOS_PADRAO.dias.find((d) => d.dia === diaSemana);
    if (diaConfig && !diaConfig.ativo) {
      throw new AgendamentoBusinessError(
        'A clínica não realiza atendimentos no dia da semana selecionado (folga cadastrada).',
        422,
      );
    }
  }

  // 2. Novo cálculo de término
  const novoDataHoraFim = calcularDataHoraFim(
    parsed.novaDataHoraInicio,
    agendamento.duracaoMinutos,
  );

  const profissionalId = parsed.novoProfissionalId || agendamento.profissionalId;
  let profissionalNome = parsed.novoProfissionalNome || agendamento.profissionalNome;

  // Validação de Profissional Ativo e Folga (se repositório fornecido)
  if (profissionaisRepo) {
    const profissional = await profissionaisRepo.buscarPorId(profissionalId);
    if (!profissional) {
      throw new AgendamentoBusinessError('Profissional selecionado não encontrado.', 404);
    }
    if (!profissional.ativo) {
      throw new AgendamentoBusinessError(
        'O profissional selecionado não está ativo para agendamentos.',
        422,
      );
    }
    profissionalNome = profissional.nome;

    const novaInicioDate = new Date(parsed.novaDataHoraInicio);
    const diaSemana = novaInicioDate.getDay();
    if (
      profissional.diasFolga &&
      profissional.diasFolga.includes(diaSemana as 0 | 1 | 2 | 3 | 4 | 5 | 6)
    ) {
      throw new AgendamentoBusinessError(
        'O profissional selecionado não realiza atendimentos no dia da semana selecionado (folga cadastrada).',
        422,
      );
    }
  }

  // Validação se o profissional realiza o serviço (se repositório fornecido)
  if (servicosRepo) {
    const servico = await servicosRepo.buscarPorId(agendamento.servicoId);
    if (servico && !verificarProfissionalHabilitadoParaServico(servico, profissionalId)) {
      throw new AgendamentoBusinessError(
        'O profissional selecionado não realiza o procedimento solicitado.',
        422,
      );
    }
  }

  // 3. Verificação de conflitos com Bloqueios Únicos, Recorrentes ou Horários Fixos
  if (bloqueiosRepo || horariosFixosRepo) {
    const bloqueios = bloqueiosRepo ? await bloqueiosRepo.listarAtivos(profissionalId) : [];
    const horariosFixos = horariosFixosRepo
      ? await horariosFixosRepo.listarAtivos(profissionalId)
      : [];
    const checagemBloqueios = verificarConflitoBloqueioOuHorarioFixo({
      dataHoraInicioIso: parsed.novaDataHoraInicio,
      dataHoraFimIso: novoDataHoraFim,
      clienteIdSolicitante: agendamento.clienteId,
      bloqueios,
      horariosFixos,
    });
    if (checagemBloqueios.conflito) {
      throw new AgendamentoBusinessError(
        checagemBloqueios.motivo ||
          'O novo horário selecionado está bloqueado na agenda da clínica.',
        409,
      );
    }
  }

  // 4. Conflitos de horário com outros atendimentos
  const novaDataYmd = parsed.novaDataHoraInicio.substring(0, 10);
  const existentes = await repo.listarPorProfissionalEData(profissionalId, novaDataYmd);

  const conflito = existentes.some((existente) => {
    if (existente.id === agendamento.id) return false;
    return verificarConflitoHorarios(
      { inicioIso: parsed.novaDataHoraInicio, fimIso: novoDataHoraFim, intervaloMinutos: 30 },
      {
        inicioIso: existente.dataHoraInicio,
        fimIso: existente.dataHoraFim,
        intervaloMinutos: existente.intervaloAposMinutos,
      },
    );
  });

  if (conflito) {
    throw new AgendamentoBusinessError(
      'O novo horário selecionado não está disponível devido a outro agendamento ou intervalo de manutenção de 30 minutos.',
      409,
    );
  }

  const dataHoraAnterior = agendamento.dataHoraInicio;
  const atualizado: Agendamento = {
    ...agendamento,
    dataHoraInicio: parsed.novaDataHoraInicio,
    dataHoraFim: novoDataHoraFim,
    profissionalId,
    profissionalNome,
    updatedAt: dataReferencia.toISOString(),
  };

  const salvo = await repo.atualizar(atualizado);

  if (notificacoesRepo) {
    await criarNotificacaoAlteracao(salvo, dataHoraAnterior, notificacoesRepo, parsed.motivo);
  }

  return salvo;
}

/**
 * Cancela um agendamento existente aplicando a regra de antecedência mínima de 3 horas
 * para retenção ou liberação do sinal, disparando notificação interna de cancelamento.
 */
export async function cancelarAgendamentoExistente(
  input: unknown,
  user: { uid: string; isAdmin: boolean },
  repo: AgendamentosRepository,
  notificacoesRepoOuDataRef?: NotificacoesRepository | Date,
  dataReferenciaParam?: Date,
): Promise<Agendamento> {
  const notificacoesRepo =
    notificacoesRepoOuDataRef instanceof Date ? undefined : notificacoesRepoOuDataRef;
  const dataReferencia =
    notificacoesRepoOuDataRef instanceof Date
      ? notificacoesRepoOuDataRef
      : dataReferenciaParam instanceof Date
        ? dataReferenciaParam
        : new Date();

  const parsed = cancelarAgendamentoInputSchema.parse(input);

  const agendamento = await repo.buscarPorId(parsed.agendamentoId);
  if (!agendamento) {
    throw new AgendamentoBusinessError('Agendamento não encontrado.', 404);
  }

  // Apenas o próprio cliente ou a administradora podem cancelar
  if (!user.isAdmin && agendamento.clienteId !== user.uid) {
    throw new AgendamentoBusinessError('Acesso negado para cancelar este agendamento.', 403);
  }

  if (agendamento.status === 'cancelado') {
    throw new AgendamentoBusinessError('Este agendamento já se encontra cancelado.', 400);
  }

  if (agendamento.status === 'concluido') {
    throw new AgendamentoBusinessError('Não é possível cancelar um agendamento já concluído.', 400);
  }

  const antecedencia = verificarAntecedenciaCancelamento(
    agendamento.dataHoraInicio,
    3,
    dataReferencia,
  );

  const atualizado: Agendamento = {
    ...agendamento,
    status: 'cancelado',
    canceladoEm: dataReferencia.toISOString(),
    motivoCancelamento: parsed.motivo || 'Cancelado pelo cliente',
    sinalRetido: antecedencia.sinalRetido,
    classificacaoCancelamento: antecedencia.classificacao,
    tipoCancelamento: antecedencia.classificacao,
    sinalDisponivelReagendamento: antecedencia.sinalDisponivelReagendamento,
    antecedenciaCancelamentoHoras: antecedencia.horasRestantes,
    updatedAt: dataReferencia.toISOString(),
  };

  const salvo = await repo.atualizar(atualizado);

  if (notificacoesRepo) {
    await criarNotificacaoCancelamento(
      salvo,
      salvo.sinalRetido ?? false,
      notificacoesRepo,
      parsed.motivo,
      antecedencia.classificacao,
    );
  }

  return salvo;
}

/**
 * Consulta agendamentos com autorização de acesso
 */
export async function listarAgendamentos(
  user: { uid: string; isAdmin: boolean },
  clienteIdFiltro: string | undefined,
  repo: AgendamentosRepository,
): Promise<Agendamento[]> {
  if (user.isAdmin) {
    if (clienteIdFiltro) {
      return repo.listarPorCliente(clienteIdFiltro);
    }
    return repo.listarPorCliente(user.uid);
  }

  return repo.listarPorCliente(user.uid);
}

/**
 * Atualiza o status de um agendamento existente conforme a máquina de estados.
 * Operação restrita à administradora.
 * Controla os estados: pendente, confirmado, em_andamento, concluido, cancelado, reagendado e falta.
 */
export async function atualizarStatusAgendamento(
  input: unknown,
  user: { uid: string; isAdmin: boolean },
  repo: AgendamentosRepository,
  notificacoesRepo?: NotificacoesRepository,
  dataReferenciaParam?: Date,
): Promise<Agendamento> {
  if (!user.isAdmin) {
    throw new AgendamentoBusinessError(
      'Acesso negado. Apenas a administradora possui permissão para alterar o status do agendamento.',
      403,
    );
  }

  const parsed = atualizarStatusAgendamentoInputSchema.parse(input);
  const dataReferencia = dataReferenciaParam || new Date();
  const dataReferenciaIso = dataReferencia.toISOString();

  const agendamento = await repo.buscarPorId(parsed.agendamentoId);
  if (!agendamento) {
    throw new AgendamentoBusinessError('Agendamento não encontrado.', 404);
  }

  if (agendamento.status === parsed.novoStatus) {
    return agendamento;
  }

  const validacao = validarTransicaoStatus(agendamento.status, parsed.novoStatus);
  if (!validacao.valida) {
    throw new AgendamentoBusinessError(
      validacao.erro ||
        `Transição de status inválida: não é permitido alterar de '${agendamento.status}' para '${parsed.novoStatus}'.`,
      422,
    );
  }

  const atualizado: Agendamento = {
    ...agendamento,
    status: parsed.novoStatus,
    updatedAt: dataReferenciaIso,
  };

  if (parsed.observacoes) {
    atualizado.observacoes = agendamento.observacoes
      ? `${agendamento.observacoes}\n${parsed.observacoes}`
      : parsed.observacoes;
  }

  switch (parsed.novoStatus) {
    case 'falta': {
      // Regra: "Cancelamento tardio ou falta causará perda do sinal."
      atualizado.sinalRetido = true;
      atualizado.sinalDisponivelReagendamento = false;
      atualizado.faltaRegistradaEm = dataReferenciaIso;
      atualizado.motivoCancelamento = parsed.motivo || 'Falta registrada pela administração';
      break;
    }
    case 'cancelado': {
      const antecedencia = verificarAntecedenciaCancelamento(
        agendamento.dataHoraInicio,
        3,
        dataReferencia,
      );
      atualizado.canceladoEm = dataReferenciaIso;
      atualizado.motivoCancelamento = parsed.motivo || 'Cancelamento registrado pela administração';
      atualizado.sinalRetido = antecedencia.sinalRetido;
      atualizado.classificacaoCancelamento = antecedencia.classificacao;
      atualizado.tipoCancelamento = antecedencia.classificacao;
      atualizado.sinalDisponivelReagendamento = antecedencia.sinalDisponivelReagendamento;
      atualizado.antecedenciaCancelamentoHoras = antecedencia.horasRestantes;
      break;
    }
    case 'concluido': {
      atualizado.concluidoEm = dataReferenciaIso;
      break;
    }
    case 'reagendado': {
      atualizado.reagendadoEm = dataReferenciaIso;
      if (parsed.motivo) {
        atualizado.motivoCancelamento = parsed.motivo;
      }
      break;
    }
    case 'confirmado':
    case 'em_andamento':
    case 'pendente':
    default:
      break;
  }

  const salvo = await repo.atualizar(atualizado);

  if (notificacoesRepo) {
    if (parsed.novoStatus === 'cancelado') {
      await criarNotificacaoCancelamento(
        salvo,
        salvo.sinalRetido ?? false,
        notificacoesRepo,
        parsed.motivo,
        salvo.classificacaoCancelamento,
      );
    } else if (parsed.novoStatus === 'falta') {
      await criarNotificacaoCancelamento(
        salvo,
        true,
        notificacoesRepo,
        parsed.motivo || 'Falta registrada pela administração da clínica',
        'tardio',
      );
    }
  }

  return salvo;
}
