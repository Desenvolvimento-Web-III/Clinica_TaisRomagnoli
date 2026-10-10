import {
  solicitarAgendamentoInputSchema,
  cancelarAgendamentoInputSchema,
  alterarAgendamentoInputSchema,
  calcularValoresAgendamento,
  calcularDataHoraFim,
  verificarConflitoHorarios,
  verificarAntecedenciaCancelamento,
  CONFIGURACAO_HORARIOS_PADRAO,
  type Agendamento,
} from '@clinica/shared';
import type { AgendamentosRepository } from './agendamentos-repository.js';
import type { NotificacoesRepository } from '../notificacoes/notificacoes-repository.js';
import type { ServicosRepository } from '../servicos/servicos-repository.js';
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
): Promise<Agendamento> {
  const parsed = solicitarAgendamentoInputSchema.parse(input);

  // 0. Validação de Serviço Ativo (se repositório fornecido)
  if (servicosRepo) {
    const servico = await servicosRepo.buscarPorId(parsed.servicoId);
    if (servico && !servico.ativo) {
      throw new AgendamentoBusinessError(
        'O procedimento selecionado está desativado e não aceita novos agendamentos.',
        422,
      );
    }
  }

  // 1. Validação de Folga da Clínica
  const inicioDate = new Date(parsed.dataHoraInicio);
  const diaSemana = inicioDate.getDay();
  const diaConfig = CONFIGURACAO_HORARIOS_PADRAO.dias.find((d) => d.dia === diaSemana);
  if (diaConfig && !diaConfig.ativo) {
    throw new AgendamentoBusinessError(
      'A clínica não realiza atendimentos no dia da semana selecionado (folga cadastrada).',
      422,
    );
  }

  // 2. Cálculo da data/hora de término
  const dataHoraFim = calcularDataHoraFim(parsed.dataHoraInicio, parsed.duracaoMinutos);

  // 3. Verificação de conflitos de horários e respeito ao intervalo de 30 min
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

  // 4. Regra de Negócio de Isenção de Sinal (apenas administradora em agendamento presencial)
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
    profissionalNome: parsed.profissionalNome,
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

  // 1. Validação de Folga da Clínica na nova data
  const inicioDate = new Date(parsed.novaDataHoraInicio);
  const diaSemana = inicioDate.getDay();
  const diaConfig = CONFIGURACAO_HORARIOS_PADRAO.dias.find((d) => d.dia === diaSemana);
  if (diaConfig && !diaConfig.ativo) {
    throw new AgendamentoBusinessError(
      'A clínica não realiza atendimentos no dia da semana selecionado (folga cadastrada).',
      422,
    );
  }

  // 2. Novo cálculo de término
  const novoDataHoraFim = calcularDataHoraFim(
    parsed.novaDataHoraInicio,
    agendamento.duracaoMinutos,
  );

  // 3. Conflitos de horário com outros atendimentos
  const profissionalId = parsed.novoProfissionalId || agendamento.profissionalId;
  const profissionalNome = parsed.novoProfissionalNome || agendamento.profissionalNome;
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
