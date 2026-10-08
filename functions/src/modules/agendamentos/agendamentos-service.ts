import {
  solicitarAgendamentoInputSchema,
  cancelarAgendamentoInputSchema,
  calcularValoresAgendamento,
  calcularDataHoraFim,
  verificarConflitoHorarios,
  verificarAntecedenciaCancelamento,
  CONFIGURACAO_HORARIOS_PADRAO,
  type Agendamento,
} from '@clinica/shared';
import type { AgendamentosRepository } from './agendamentos-repository.js';

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
 * folgas, concorrência e o sinal de 30%.
 */
export async function solicitarNovoAgendamento(
  input: unknown,
  user: UserContext,
  repo: AgendamentosRepository,
): Promise<Agendamento> {
  const parsed = solicitarAgendamentoInputSchema.parse(input);

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

  return repo.salvar(novoAgendamento);
}

/**
 * Cancela um agendamento existente aplicando a regra de antecedência mínima de 3 horas
 * para retenção ou liberação do sinal.
 */
export async function cancelarAgendamentoExistente(
  input: unknown,
  user: { uid: string; isAdmin: boolean },
  repo: AgendamentosRepository,
  dataReferencia = new Date(),
): Promise<Agendamento> {
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
    updatedAt: dataReferencia.toISOString(),
  };

  return repo.atualizar(atualizado);
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
    // Administradora listando por cliente
    return repo.listarPorCliente(user.uid);
  }

  // Cliente comum sempre restrito ao seu próprio UID
  return repo.listarPorCliente(user.uid);
}
