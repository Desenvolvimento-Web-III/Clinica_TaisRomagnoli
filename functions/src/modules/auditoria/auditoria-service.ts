import { randomUUID } from 'node:crypto';
import {
  type CriarRegistroAuditoriaInput,
  type RegistroAuditoria,
  criarRegistroAuditoriaInputSchema,
  filtroAuditoriaSchema,
  registroAuditoriaSchema,
} from '@clinica/shared';
import type { AuditoriaRepository } from './auditoria-repository.js';

export class AuditoriaBusinessError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AuditoriaBusinessError';
  }
}

/**
 * Registra uma operação importante na trilha de auditoria do sistema.
 */
export async function registrarAuditoria(
  input: CriarRegistroAuditoriaInput,
  repository: AuditoriaRepository,
): Promise<RegistroAuditoria> {
  const parsedInput = criarRegistroAuditoriaInputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new AuditoriaBusinessError(
      'DADOS_AUDITORIA_INVALIDOS',
      `Dados de auditoria inválidos: ${parsedInput.error.issues.map((e) => e.message).join(', ')}`,
      400,
    );
  }

  const {
    id = randomUUID(),
    usuarioId,
    usuarioEmail = null,
    usuarioRole = 'sistema',
    acao,
    recurso,
    recursoId,
    dataHora = new Date().toISOString(),
    dadosAfetados = {},
    ip = null,
    userAgent = null,
  } = parsedInput.data;

  const registroCompleto: RegistroAuditoria = {
    id,
    usuarioId,
    usuarioEmail,
    usuarioRole,
    acao,
    recurso,
    recursoId,
    dataHora,
    dadosAfetados,
    ip,
    userAgent,
  };

  const parsedRegistro = registroAuditoriaSchema.safeParse(registroCompleto);
  if (!parsedRegistro.success) {
    throw new AuditoriaBusinessError(
      'REGISTRO_AUDITORIA_INVALIDO',
      'Estrutura do registro de auditoria é inválida para persistência',
      400,
    );
  }

  return repository.salvar(parsedRegistro.data);
}

/**
 * Lista os registros de auditoria aplicando filtros opcionais.
 */
export async function listarLogsAuditoria(
  filtros: unknown = {},
  repository: AuditoriaRepository,
): Promise<RegistroAuditoria[]> {
  const parsedFiltros = filtroAuditoriaSchema.safeParse(filtros);
  if (!parsedFiltros.success) {
    throw new AuditoriaBusinessError(
      'FILTROS_AUDITORIA_INVALIDOS',
      `Filtros de consulta inválidos: ${parsedFiltros.error.issues.map((e) => e.message).join(', ')}`,
      400,
    );
  }

  return repository.listar(parsedFiltros.data);
}

/**
 * Busca um registro de auditoria por ID.
 */
export async function obterLogAuditoria(
  id: string,
  repository: AuditoriaRepository,
): Promise<RegistroAuditoria> {
  if (!id || typeof id !== 'string') {
    throw new AuditoriaBusinessError(
      'ID_INVALIDO',
      'ID do registro de auditoria é obrigatório',
      400,
    );
  }

  const log = await repository.buscarPorId(id);
  if (!log) {
    throw new AuditoriaBusinessError(
      'REGISTRO_NAO_ENCONTRADO',
      'Registro de auditoria não encontrado',
      404,
    );
  }

  return log;
}
