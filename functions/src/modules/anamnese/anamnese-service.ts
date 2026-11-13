import type { UserContext } from '../../middlewares/auth-middleware.js';
import type { AnamneseRepository } from './anamnese-repository.js';
import type { NotificacoesRepository } from '../notificacoes/notificacoes-repository.js';
import {
  fichaAnamneseSchema,
  calcularPontosAtencao,
  calcularContraindicacoesLiberacaoMedica,
  listarChavesContraindicacao,
  avaliarBloqueioContraindicacao,
  registrarLiberacaoMedicaInputSchema,
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
  input:
    | SalvarFichaAnamneseInput
    | {
        clienteId?: string;
        dados: FichaAnamneseData;
        exigeLiberacaoMedica?: boolean;
        liberacaoMedicaAprovada?: boolean;
        liberacaoMedicaObservacoes?: string;
      };
  usuarioAutenticado: UserContext;
  repo: AnamneseRepository;
  notifRepo?: NotificacoesRepository;
}

export interface ObterFichaAnamneseOptions {
  clienteId: string;
  usuarioAutenticado: UserContext;
  repo: AnamneseRepository;
}

export interface RegistrarLiberacaoMedicaOptions {
  input: unknown;
  usuarioAutenticado: UserContext;
  repo: AnamneseRepository;
}

/**
 * Salva ou atualiza a ficha de anamnese de um cliente.
 * Regra de acesso: Somente o cliente dono da ficha ou a administradora podem salvar.
 * Controle de liberação médica é exclusivo da administradora.
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

  // Captura sinalizadores administrativos antes que a validação de formulário remova chaves extras
  const rawInput = input as Record<string, unknown>;
  const rawDados =
    input.dados && typeof input.dados === 'object'
      ? (input.dados as unknown as Record<string, unknown>)
      : {};
  const solicitouExigeLiberacao =
    typeof rawInput['exigeLiberacaoMedica'] === 'boolean'
      ? rawInput['exigeLiberacaoMedica']
      : typeof rawDados['exigeLiberacaoMedica'] === 'boolean'
        ? rawDados['exigeLiberacaoMedica']
        : undefined;
  const solicitouLiberacaoAprovada =
    typeof rawInput['liberacaoMedicaAprovada'] === 'boolean'
      ? rawInput['liberacaoMedicaAprovada']
      : typeof rawDados['liberacaoMedicaAprovada'] === 'boolean'
        ? rawDados['liberacaoMedicaAprovada']
        : undefined;
  const observacoesLiberacaoInformadas =
    typeof rawInput['liberacaoMedicaObservacoes'] === 'string'
      ? rawInput['liberacaoMedicaObservacoes']
      : typeof rawDados['liberacaoMedicaObservacoes'] === 'string'
        ? rawDados['liberacaoMedicaObservacoes']
        : undefined;

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
  const contraindicacoes = calcularContraindicacoesLiberacaoMedica(dadosValidados);
  const chavesAtuais = listarChavesContraindicacao(dadosValidados);
  const chavesAnteriores = listarChavesContraindicacao(existente);
  const adicionouNovaContraindicacao = chavesAtuais.some(
    (chave) => !chavesAnteriores.includes(chave),
  );

  // Nunca permitir que um cliente comum aprove sua própria liberação médica ou remova exigência clínica
  if (!usuarioAutenticado.isAdmin) {
    if (solicitouLiberacaoAprovada === true && existente?.liberacaoMedicaAprovada !== true) {
      throw new AnamneseBusinessError(
        'Acesso não autorizado: apenas a administradora pode aprovar a liberação médica.',
        403,
      );
    }
    if (solicitouExigeLiberacao === false && contraindicacoes.length > 0) {
      throw new AnamneseBusinessError(
        'Acesso não autorizado: não é permitido desativar a exigência de liberação médica quando há contraindicações clínicas.',
        403,
      );
    }
  }

  const restricaoManualAnteriorSemClinica = Boolean(
    existente?.exigeLiberacaoMedica &&
    (!existente.contraindicacoes || existente.contraindicacoes.length === 0) &&
    chavesAnteriores.length === 0,
  );

  let exigeLiberacaoMedica: boolean;
  if (usuarioAutenticado.isAdmin && typeof solicitouExigeLiberacao === 'boolean') {
    exigeLiberacaoMedica = solicitouExigeLiberacao || contraindicacoes.length > 0;
  } else {
    exigeLiberacaoMedica = contraindicacoes.length > 0 || restricaoManualAnteriorSemClinica;
  }

  let liberacaoMedicaAprovada = false;
  let liberacaoMedicaAprovadaEm: string | undefined;
  let liberacaoMedicaAprovadaPor: string | undefined;
  let liberacaoMedicaObservacoes: string | undefined;

  if (usuarioAutenticado.isAdmin && typeof solicitouLiberacaoAprovada === 'boolean') {
    liberacaoMedicaAprovada = solicitouLiberacaoAprovada;
    if (solicitouLiberacaoAprovada) {
      liberacaoMedicaAprovadaEm = now;
      liberacaoMedicaAprovadaPor = usuarioAutenticado.uid;
    }
    liberacaoMedicaObservacoes =
      observacoesLiberacaoInformadas ?? existente?.liberacaoMedicaObservacoes;
  } else if (exigeLiberacaoMedica && !adicionouNovaContraindicacao) {
    liberacaoMedicaAprovada = existente?.liberacaoMedicaAprovada === true;
    if (liberacaoMedicaAprovada) {
      liberacaoMedicaAprovadaEm = existente?.liberacaoMedicaAprovadaEm;
      liberacaoMedicaAprovadaPor = existente?.liberacaoMedicaAprovadaPor;
    }
    liberacaoMedicaObservacoes = usuarioAutenticado.isAdmin
      ? (observacoesLiberacaoInformadas ?? existente?.liberacaoMedicaObservacoes)
      : existente?.liberacaoMedicaObservacoes;
  }

  const fichaRecord: FichaAnamneseRecord = {
    ...dadosValidados,
    clienteId: targetClienteId,
    clienteNome: usuarioAutenticado.isAdmin
      ? existente?.clienteNome || usuarioAutenticado.nome
      : usuarioAutenticado.nome || existente?.clienteNome,
    clienteEmail: usuarioAutenticado.isAdmin
      ? existente?.clienteEmail
      : usuarioAutenticado.email || existente?.clienteEmail,
    clienteTelefone: usuarioAutenticado.isAdmin
      ? existente?.clienteTelefone
      : usuarioAutenticado.telefone || existente?.clienteTelefone,
    submittedAt: existente?.submittedAt || now,
    updatedAt: now,
    pontosAtencao,
    exigeLiberacaoMedica,
    contraindicacoes,
    liberacaoMedicaAprovada,
    ...(liberacaoMedicaAprovadaEm ? { liberacaoMedicaAprovadaEm } : {}),
    ...(liberacaoMedicaAprovadaPor ? { liberacaoMedicaAprovadaPor } : {}),
    ...(liberacaoMedicaObservacoes !== undefined ? { liberacaoMedicaObservacoes } : {}),
  };

  await repo.salvar(targetClienteId, fichaRecord);

  // Se houver notifRepo e pontos de atenção relevantes ou bloqueio pendente, registra notificação interna
  if (
    notifRepo &&
    (pontosAtencao.length > 0 || (exigeLiberacaoMedica && !liberacaoMedicaAprovada))
  ) {
    try {
      await notifRepo.salvar({
        id: `notif_anamnese_${targetClienteId}_${Date.now()}`,
        destinatarioId: 'admin',
        destinatarioTipo: 'admin',
        evento: 'confirmacao',
        tipo: 'sistema',
        titulo: exigeLiberacaoMedica
          ? 'Ficha de Anamnese Exige Liberação Médica'
          : 'Ficha de Anamnese com Pontos de Atenção',
        mensagem: exigeLiberacaoMedica
          ? `O cliente ${fichaRecord.clienteNome || targetClienteId} registrou sua ficha com exigência de liberação médica (${contraindicacoes.length || pontosAtencao.length} registro(s)).`
          : `O cliente ${fichaRecord.clienteNome || targetClienteId} registrou sua ficha com ${pontosAtencao.length} ponto(s) de atenção.`,
        lida: false,
        createdAt: now,
        metadados: {
          clienteId: targetClienteId,
          pontosAtencao,
          exigeLiberacaoMedica,
          contraindicacoes,
        },
      });
    } catch {
      // Ignora falha de notificação não crítica
    }
  }

  return fichaRecord;
}

/**
 * Registra ou revoga a aprovação da liberação médica na ficha de anamnese.
 * Operação restrita exclusivamente à administradora.
 */
export async function registrarLiberacaoMedicaService({
  input,
  usuarioAutenticado,
  repo,
}: RegistrarLiberacaoMedicaOptions): Promise<FichaAnamneseRecord> {
  if (!usuarioAutenticado || !usuarioAutenticado.uid) {
    throw new AnamneseBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  if (!usuarioAutenticado.isAdmin) {
    throw new AnamneseBusinessError(
      'Acesso não autorizado: apenas a administradora pode registrar ou alterar a liberação médica.',
      403,
    );
  }

  const parseResult = registrarLiberacaoMedicaInputSchema.safeParse(input);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new AnamneseBusinessError(
      `Dados de liberação médica inválidos: ${errorDetails.join('; ')}`,
      400,
    );
  }

  const parsed = parseResult.data;
  const existente = await repo.obterPorClienteId(parsed.clienteId);
  if (!existente) {
    throw new AnamneseBusinessError(
      'Ficha de anamnese não encontrada para o cliente informado.',
      404,
    );
  }

  const avaliacaoAtual = avaliarBloqueioContraindicacao(existente);
  const contraindicacoesClinicas = calcularContraindicacoesLiberacaoMedica(existente);
  const contraindicacoes = Array.from(
    new Set([...contraindicacoesClinicas, ...avaliacaoAtual.contraindicacoes]),
  );

  const exigeLiberacaoMedica =
    typeof parsed.exigeLiberacaoMedica === 'boolean'
      ? parsed.exigeLiberacaoMedica || contraindicacoes.length > 0
      : avaliacaoAtual.exigeLiberacaoMedica;

  const now = new Date().toISOString();
  const fichaAtualizada: FichaAnamneseRecord = {
    ...existente,
    clienteId: parsed.clienteId,
    updatedAt: now,
    exigeLiberacaoMedica,
    contraindicacoes,
    liberacaoMedicaAprovada: parsed.aprovada,
    ...(parsed.aprovada
      ? {
          liberacaoMedicaAprovadaEm: now,
          liberacaoMedicaAprovadaPor: usuarioAutenticado.uid,
        }
      : {}),
    ...(parsed.observacoes !== undefined ? { liberacaoMedicaObservacoes: parsed.observacoes } : {}),
  };

  if (!parsed.aprovada) {
    delete fichaAtualizada.liberacaoMedicaAprovadaEm;
    delete fichaAtualizada.liberacaoMedicaAprovadaPor;
  }

  await repo.salvar(parsed.clienteId, fichaAtualizada);
  return fichaAtualizada;
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
