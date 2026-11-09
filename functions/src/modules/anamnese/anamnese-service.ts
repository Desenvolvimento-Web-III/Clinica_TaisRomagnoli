import type { UserContext } from '../../middlewares/auth-middleware.js';
import type { AnamneseRepository } from './anamnese-repository.js';
import type { NotificacoesRepository } from '../notificacoes/notificacoes-repository.js';
import {
  fichaAnamneseSchema,
  calcularPontosAtencao,
  type FichaAnamneseData,
  type FichaAnamneseRecord,
  type SalvarFichaAnamneseInput,
} from '@clinica/shared';

export class AnamneseBusinessError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AnamneseBusinessError';
  }
}

export interface SalvarFichaAnamneseOptions {
  input: SalvarFichaAnamneseInput | { clienteId?: string; dados: FichaAnamneseData };
  usuarioAutenticado: UserContext;
  repo: AnamneseRepository;
  notifRepo?: NotificacoesRepository;
}

export interface ObterFichaAnamneseOptions {
  clienteId: string;
  usuarioAutenticado: UserContext;
  repo: AnamneseRepository;
}

/**
 * Salva ou atualiza a ficha de anamnese de um cliente.
 * Regra de acesso: Somente o cliente dono da ficha ou a administradora podem salvar.
 */
export async function salvarFichaAnamneseService({
  input,
  usuarioAutenticado,
  repo,
  notifRepo,
}: SalvarFichaAnamneseOptions): Promise<FichaAnamneseRecord> {
  if (!usuarioAutenticado || !usuarioAutenticado.uid) {
    throw new AnamneseBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  const targetClienteId = input.clienteId || usuarioAutenticado.uid;

  if (!targetClienteId) {
    throw new AnamneseBusinessError('O identificador do cliente é obrigatório.', 400);
  }

  // Validação de acesso estrito: apenas o próprio cliente ou a administradora
  if (targetClienteId !== usuarioAutenticado.uid && !usuarioAutenticado.isAdmin) {
    throw new AnamneseBusinessError(
      'Acesso não autorizado: você só tem permissão para gerenciar sua própria ficha de anamnese.',
      403,
    );
  }

  // Validação dos dados
  const parseResult = fichaAnamneseSchema.safeParse(input.dados);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new AnamneseBusinessError(
      `Dados da ficha de anamnese inválidos: ${errorDetails.join('; ')}`,
      400,
    );
  }

  const dadosValidados = parseResult.data;
  const existente = await repo.obterPorClienteId(targetClienteId);
  const now = new Date().toISOString();
  const pontosAtencao = calcularPontosAtencao(dadosValidados);

  const fichaRecord: FichaAnamneseRecord = {
    ...dadosValidados,
    clienteId: targetClienteId,
    clienteNome: usuarioAutenticado.nome || existente?.clienteNome,
    clienteEmail: usuarioAutenticado.email || existente?.clienteEmail,
    clienteTelefone: usuarioAutenticado.telefone || existente?.clienteTelefone,
    submittedAt: existente?.submittedAt || now,
    updatedAt: now,
    pontosAtencao,
  };

  await repo.salvar(targetClienteId, fichaRecord);

  // Se houver notifRepo e pontos de atenção relevantes, registra notificação interna
  if (notifRepo && pontosAtencao.length > 0) {
    try {
      await notifRepo.salvar({
        id: `notif_anamnese_${targetClienteId}_${Date.now()}`,
        destinatarioId: 'admin',
        destinatarioTipo: 'admin',
        evento: 'confirmacao',
        tipo: 'sistema',
        titulo: 'Ficha de Anamnese com Pontos de Atenção',
        mensagem: `O cliente ${fichaRecord.clienteNome || targetClienteId} registrou sua ficha com ${pontosAtencao.length} ponto(s) de atenção.`,
        lida: false,
        createdAt: now,
        metadados: {
          clienteId: targetClienteId,
          pontosAtencao,
        },
      });
    } catch {
      // Ignora falha de notificação não crítica
    }
  }

  return fichaRecord;
}

/**
 * Consulta a ficha de anamnese de um cliente.
 * Regra de acesso: Somente o cliente dono da ficha ou a administradora podem consultar.
 */
export async function obterFichaAnamneseService({
  clienteId,
  usuarioAutenticado,
  repo,
}: ObterFichaAnamneseOptions): Promise<FichaAnamneseRecord | null> {
  if (!usuarioAutenticado || !usuarioAutenticado.uid) {
    throw new AnamneseBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  const targetClienteId = clienteId || usuarioAutenticado.uid;

  if (!targetClienteId) {
    throw new AnamneseBusinessError('O identificador do cliente é obrigatório.', 400);
  }

  // Validação de acesso estrito: apenas o próprio cliente ou a administradora
  if (targetClienteId !== usuarioAutenticado.uid && !usuarioAutenticado.isAdmin) {
    throw new AnamneseBusinessError(
      'Acesso não autorizado: você só tem permissão para consultar sua própria ficha de anamnese.',
      403,
    );
  }

  return await repo.obterPorClienteId(targetClienteId);
}
