import {
  criarProfissionalInputSchema,
  atualizarProfissionalInputSchema,
  vincularServicoProfissionalInputSchema,
  ID_PROFISSIONAL_PADRAO,
  type Professional,
  type ServicoModel,
  type DayOfWeek,
} from '@clinica/shared';
import type { ProfissionaisRepository } from './profissionais-repository.js';
import type { ServicosRepository } from '../servicos/servicos-repository.js';
import type { UserContext } from '../../middlewares/auth-middleware.js';

export class ProfissionalBusinessError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'ProfissionalBusinessError';
  }
}

/**
 * Converte um nome para formato slug seguro para identificador de profissional
 */
function gerarSlugProfissional(nome: string): string {
  const limpo = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  return limpo.startsWith('prof-') ? limpo : `prof-${limpo}`;
}

/**
 * Valida se o usuário autenticado possui perfil de administradora
 */
function validarPermissaoAdministradora(
  user: UserContext | null | undefined,
): asserts user is UserContext {
  if (!user) {
    throw new ProfissionalBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }
  if (!user.isAdmin) {
    throw new ProfissionalBusinessError(
      'Acesso negado. Apenas a administradora possui permissão para gerenciar profissionais.',
      403,
    );
  }
}

/**
 * Lista todos os profissionais cadastrados (público para clientes selecionarem na agenda, ou administrativo).
 * Mantém sempre a profissional inicial disponível.
 */
export async function listarProfissionais(
  repo: ProfissionaisRepository,
  apenasAtivos: boolean = false,
): Promise<Professional[]> {
  return repo.listar(apenasAtivos);
}

/**
 * Obtém os detalhes de um profissional específico pelo ID.
 */
export async function obterProfissionalPorId(
  id: string,
  repo: ProfissionaisRepository,
): Promise<Professional> {
  const idNormalizado = id.trim();
  if (!idNormalizado) {
    throw new ProfissionalBusinessError('O identificador do profissional é obrigatório.', 400);
  }

  const profissional = await repo.buscarPorId(idNormalizado);
  if (!profissional) {
    throw new ProfissionalBusinessError('Profissional não encontrado.', 404);
  }

  return profissional;
}

/**
 * Cadastra um novo profissional na clínica (restrito à administradora).
 * Previne duplicidade de identificador e define valores padrão para folgas e intervalos.
 */
export async function cadastrarProfissional(
  input: unknown,
  user: UserContext,
  repo: ProfissionaisRepository,
): Promise<Professional> {
  validarPermissaoAdministradora(user);

  const parsed = criarProfissionalInputSchema.parse(input);

  let id: string;
  if (parsed.id && parsed.id.trim().length > 0) {
    id = parsed.id.trim();
    const existente = await repo.buscarPorId(id);
    if (existente) {
      throw new ProfissionalBusinessError(
        'Já existe um profissional cadastrado com este identificador.',
        409,
      );
    }
  } else {
    const slugBase = gerarSlugProfissional(parsed.nome);
    const existente = await repo.buscarPorId(slugBase);
    id = existente ? `${slugBase}-${Date.now().toString(36)}` : slugBase;
  }

  const novoProfissional: Professional = {
    id,
    nome: parsed.nome,
    especialidade: parsed.especialidade,
    ativo: parsed.ativo ?? true,
    diasFolga: (parsed.diasFolga ?? [0, 2]) as DayOfWeek[],
    intervaloMinutos: parsed.intervaloMinutos ?? 30,
    createdAt: new Date().toISOString(),
  };

  return repo.salvar(novoProfissional);
}

/**
 * Atualiza os dados de um profissional existente (restrito à administradora).
 */
export async function atualizarProfissional(
  input: unknown,
  user: UserContext,
  repo: ProfissionaisRepository,
): Promise<Professional> {
  validarPermissaoAdministradora(user);

  const parsed = atualizarProfissionalInputSchema.parse(input);

  const existente = await repo.buscarPorId(parsed.id);
  if (!existente) {
    throw new ProfissionalBusinessError('Profissional não encontrado para atualização.', 404);
  }

  const atualizado: Professional = {
    ...existente,
    nome: parsed.nome !== undefined ? parsed.nome : existente.nome,
    especialidade:
      parsed.especialidade !== undefined ? parsed.especialidade : existente.especialidade,
    ativo: parsed.ativo !== undefined ? parsed.ativo : existente.ativo,
    diasFolga: (parsed.diasFolga !== undefined
      ? parsed.diasFolga
      : existente.diasFolga) as DayOfWeek[],
    intervaloMinutos:
      parsed.intervaloMinutos !== undefined ? parsed.intervaloMinutos : existente.intervaloMinutos,
    updatedAt: new Date().toISOString(),
  };

  return repo.atualizar(atualizado);
}

/**
 * Vincula ou desvincula um profissional a um procedimento/serviço da clínica.
 * Garante que o serviço e o profissional existam e estejam em conformidade.
 */
export async function vincularProfissionalAoServico(
  input: unknown,
  user: UserContext,
  servicosRepo: ServicosRepository,
  profissionaisRepo: ProfissionaisRepository,
): Promise<ServicoModel> {
  validarPermissaoAdministradora(user);

  const parsed = vincularServicoProfissionalInputSchema.parse(input);

  const [servico, profissional] = await Promise.all([
    servicosRepo.buscarPorId(parsed.servicoId),
    profissionaisRepo.buscarPorId(parsed.profissionalId),
  ]);

  if (!servico) {
    throw new ProfissionalBusinessError('Serviço não encontrado.', 404);
  }

  if (!profissional) {
    throw new ProfissionalBusinessError('Profissional não encontrado.', 404);
  }

  if (parsed.habilitado && !profissional.ativo) {
    throw new ProfissionalBusinessError(
      'Não é possível vincular um profissional desativado ao serviço.',
      422,
    );
  }

  const habilitadosAtuais = new Set(
    servico.profissionaisHabilitados && servico.profissionaisHabilitados.length > 0
      ? servico.profissionaisHabilitados
      : [ID_PROFISSIONAL_PADRAO],
  );

  if (parsed.habilitado) {
    habilitadosAtuais.add(parsed.profissionalId);
  } else {
    habilitadosAtuais.delete(parsed.profissionalId);
    if (habilitadosAtuais.size === 0) {
      // Se remover todos, mantém a profissional padrão para garantir que o serviço não fique sem ninguém
      habilitadosAtuais.add(ID_PROFISSIONAL_PADRAO);
    }
  }

  const profissionaisHabilitados = Array.from(habilitadosAtuais);
  const profissionalPadraoId = profissionaisHabilitados.includes(servico.profissionalPadraoId || '')
    ? servico.profissionalPadraoId
    : profissionaisHabilitados[0] || ID_PROFISSIONAL_PADRAO;

  const servicoAtualizado: ServicoModel = {
    ...servico,
    profissionaisHabilitados,
    profissionalPadraoId,
    updatedAt: new Date().toISOString(),
  };

  return servicosRepo.atualizar(servicoAtualizado);
}
