import {
  criarBloqueioInputSchema,
  criarHorarioFixoInputSchema,
  atualizarHorarioFixoInputSchema,
  verificarConflitoBloqueioOuHorarioFixo,
  type BloqueioAgenda,
  type HorarioFixoCliente,
  type ResultadoChecagemConflito,
} from '@clinica/shared';
import type { BloqueiosRepository } from './bloqueios-repository.js';
import type { HorariosFixosRepository } from './horarios-fixos-repository.js';

export interface CallerContext {
  uid: string;
  isAdmin: boolean;
  email?: string;
  nome?: string;
}

export class AgendaBloqueiosBusinessError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'AgendaBloqueiosBusinessError';
  }
}

/**
 * Cria um novo bloqueio na agenda (único ou recorrente).
 * Exige perfil de administradora autenticada.
 */
export async function criarBloqueioAgenda(
  input: unknown,
  caller: CallerContext,
  repo: BloqueiosRepository,
): Promise<BloqueioAgenda> {
  if (!caller.isAdmin) {
    throw new AgendaBloqueiosBusinessError(
      'Apenas administradoras autorizadas podem criar bloqueios na agenda.',
      403,
    );
  }

  const parsed = criarBloqueioInputSchema.parse(input);
  const nowIso = new Date().toISOString();
  const id = `bloq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  let novoBloqueio: BloqueioAgenda;

  if (parsed.tipo === 'unico') {
    novoBloqueio = {
      id,
      tipo: 'unico',
      data: parsed.data,
      horaInicio: parsed.horaInicio,
      horaFim: parsed.horaFim,
      diaInteiro: parsed.diaInteiro ?? false,
      motivo: parsed.motivo,
      profissionalId: parsed.profissionalId ?? 'default',
      ativo: true,
      criadoPor: caller.uid,
      criadoEm: nowIso,
    };
  } else {
    novoBloqueio = {
      id,
      tipo: 'recorrente',
      diaSemana: parsed.diaSemana,
      horaInicio: parsed.horaInicio,
      horaFim: parsed.horaFim,
      frequencia: parsed.frequencia ?? 'semanal',
      dataInicio: parsed.dataInicio,
      dataFim: parsed.dataFim,
      motivo: parsed.motivo,
      profissionalId: parsed.profissionalId ?? 'default',
      ativo: true,
      criadoPor: caller.uid,
      criadoEm: nowIso,
    };
  }

  return repo.salvar(novoBloqueio);
}

/**
 * Lista bloqueios da agenda.
 * Administradoras podem visualizar todos ou filtrar por profissional e status.
 * Clientes/visitantes autenticados recebem apenas bloqueios ativos para cálculo de slots disponíveis.
 */
export async function listarBloqueiosAgenda(
  caller: CallerContext,
  repo: BloqueiosRepository,
  apenasAtivos = true,
  profissionalId?: string,
): Promise<BloqueioAgenda[]> {
  if (caller.isAdmin) {
    if (apenasAtivos) {
      return repo.listarAtivos(profissionalId);
    }
    return repo.listarTodos(profissionalId);
  }

  // Não-administradores só acessam bloqueios ativos
  return repo.listarAtivos(profissionalId);
}

/**
 * Remove um bloqueio da agenda pelo ID.
 * Exige autorização administrativa.
 */
export async function removerBloqueioAgenda(
  id: string,
  caller: CallerContext,
  repo: BloqueiosRepository,
): Promise<{ id: string; removido: boolean }> {
  if (!caller.isAdmin) {
    throw new AgendaBloqueiosBusinessError(
      'Acesso restrito à administradora para excluir bloqueios de agenda.',
      403,
    );
  }

  if (!id || typeof id !== 'string') {
    throw new AgendaBloqueiosBusinessError('Identificador do bloqueio é obrigatório.', 400);
  }

  const existente = await repo.buscarPorId(id);
  if (!existente) {
    throw new AgendaBloqueiosBusinessError('Bloqueio de agenda não encontrado.', 404);
  }

  await repo.remover(id);
  return { id, removido: true };
}

/**
 * Alterna o status ativo/inativo de um bloqueio existente.
 */
export async function alternarStatusBloqueioAgenda(
  id: string,
  ativo: boolean,
  caller: CallerContext,
  repo: BloqueiosRepository,
): Promise<BloqueioAgenda> {
  if (!caller.isAdmin) {
    throw new AgendaBloqueiosBusinessError(
      'Acesso restrito à administradora para alterar status de bloqueio.',
      403,
    );
  }

  const atualizado = await repo.atualizarStatus(id, ativo);
  if (!atualizado) {
    throw new AgendaBloqueiosBusinessError('Bloqueio de agenda não encontrado.', 404);
  }

  return atualizado;
}

/**
 * Cria uma reserva de horário fixo recorrente para um cliente específico.
 * Exige autorização de administradora.
 */
export async function criarHorarioFixoCliente(
  input: unknown,
  caller: CallerContext,
  repo: HorariosFixosRepository,
): Promise<HorarioFixoCliente> {
  if (!caller.isAdmin) {
    throw new AgendaBloqueiosBusinessError(
      'Apenas administradoras autorizadas podem criar reservas para clientes fixos.',
      403,
    );
  }

  const parsed = criarHorarioFixoInputSchema.parse(input);
  const nowIso = new Date().toISOString();
  const id = `fixo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const novoHorarioFixo: HorarioFixoCliente = {
    id,
    clienteId: parsed.clienteId,
    clienteNome: parsed.clienteNome,
    clienteTelefone: parsed.clienteTelefone,
    clienteEmail: parsed.clienteEmail,
    servicoId: parsed.servicoId,
    servicoNome: parsed.servicoNome,
    profissionalId: parsed.profissionalId ?? 'default',
    diaSemana: parsed.diaSemana,
    horaInicio: parsed.horaInicio,
    horaFim: parsed.horaFim,
    frequencia: parsed.frequencia ?? 'semanal',
    dataInicio: parsed.dataInicio,
    dataFim: parsed.dataFim,
    observacoes: parsed.observacoes,
    ativo: parsed.ativo ?? true,
    criadoPor: caller.uid,
    criadoEm: nowIso,
  };

  return repo.salvar(novoHorarioFixo);
}

/**
 * Lista horários fixos de clientes.
 * Se administradora, pode listar todos ou filtrar por cliente.
 * Se cliente comum, só visualiza os próprios horários fixos.
 */
export async function listarHorariosFixosClientes(
  caller: CallerContext,
  repo: HorariosFixosRepository,
  clienteIdFiltro?: string,
  profissionalId?: string,
): Promise<HorarioFixoCliente[]> {
  if (caller.isAdmin) {
    if (clienteIdFiltro) {
      return repo.listarPorCliente(clienteIdFiltro);
    }
    return repo.listarTodos(profissionalId);
  }

  // Clientes comuns só têm permissão para ver os próprios horários fixos
  return repo.listarPorCliente(caller.uid);
}

/**
 * Remove uma reserva de horário fixo de cliente.
 * Exige autorização de administradora.
 */
export async function removerHorarioFixoCliente(
  id: string,
  caller: CallerContext,
  repo: HorariosFixosRepository,
): Promise<{ id: string; removido: boolean }> {
  if (!caller.isAdmin) {
    throw new AgendaBloqueiosBusinessError(
      'Acesso restrito à administradora para excluir horários fixos.',
      403,
    );
  }

  if (!id || typeof id !== 'string') {
    throw new AgendaBloqueiosBusinessError('Identificador do horário fixo é obrigatório.', 400);
  }

  const existente = await repo.buscarPorId(id);
  if (!existente) {
    throw new AgendaBloqueiosBusinessError('Reserva de horário fixo não encontrada.', 404);
  }

  await repo.remover(id);
  return { id, removido: true };
}

/**
 * Atualiza um horário fixo de cliente existente.
 */
export async function atualizarHorarioFixoCliente(
  input: unknown,
  caller: CallerContext,
  repo: HorariosFixosRepository,
): Promise<HorarioFixoCliente> {
  if (!caller.isAdmin) {
    throw new AgendaBloqueiosBusinessError(
      'Acesso restrito à administradora para alterar horários fixos.',
      403,
    );
  }

  const parsed = atualizarHorarioFixoInputSchema.parse(input);
  const existente = await repo.buscarPorId(parsed.id);
  if (!existente) {
    throw new AgendaBloqueiosBusinessError('Reserva de horário fixo não encontrada.', 404);
  }

  const atualizado: HorarioFixoCliente = {
    ...existente,
    ...(parsed.diaSemana !== undefined ? { diaSemana: parsed.diaSemana } : {}),
    ...(parsed.horaInicio !== undefined ? { horaInicio: parsed.horaInicio } : {}),
    ...(parsed.horaFim !== undefined ? { horaFim: parsed.horaFim } : {}),
    ...(parsed.frequencia !== undefined ? { frequencia: parsed.frequencia } : {}),
    ...(parsed.servicoId !== undefined ? { servicoId: parsed.servicoId } : {}),
    ...(parsed.servicoNome !== undefined ? { servicoNome: parsed.servicoNome } : {}),
    ...(parsed.dataInicio !== undefined ? { dataInicio: parsed.dataInicio } : {}),
    ...(parsed.dataFim !== undefined ? { dataFim: parsed.dataFim } : {}),
    ...(parsed.observacoes !== undefined ? { observacoes: parsed.observacoes } : {}),
    ...(parsed.ativo !== undefined ? { ativo: parsed.ativo } : {}),
    atualizadoEm: new Date().toISOString(),
  };

  return repo.atualizar(atualizado);
}

/**
 * Verifica a disponibilidade de um slot considerando bloqueios e horários fixos de clientes.
 */
export async function verificarDisponibilidadeAgenda(
  params: {
    dataHoraInicioIso: string;
    dataHoraFimIso: string;
    clienteIdSolicitante?: string;
    profissionalId?: string;
  },
  bloqueiosRepo: BloqueiosRepository,
  horariosFixosRepo: HorariosFixosRepository,
): Promise<ResultadoChecagemConflito & { disponivel: boolean }> {
  const [bloqueios, horariosFixos] = await Promise.all([
    bloqueiosRepo.listarAtivos(params.profissionalId),
    horariosFixosRepo.listarAtivos(params.profissionalId),
  ]);

  const checagem = verificarConflitoBloqueioOuHorarioFixo({
    dataHoraInicioIso: params.dataHoraInicioIso,
    dataHoraFimIso: params.dataHoraFimIso,
    clienteIdSolicitante: params.clienteIdSolicitante,
    bloqueios,
    horariosFixos,
  });

  return {
    ...checagem,
    disponivel: !checagem.conflito,
  };
}
