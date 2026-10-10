import {
  editarServicoInputSchema,
  servicoInputSchema,
  calcularSinal,
  calcularPercentualSinal,
  reaisParaCentavos,
  PERCENTUAL_SINAL_PADRAO,
  type ServicoModel,
} from '@clinica/shared';
import type { ServicosRepository } from './servicos-repository.js';
import type { AgendamentosRepository } from '../agendamentos/agendamentos-repository.js';
import type { UserContext } from '../agendamentos/agendamentos-service.js';

export class ServicoBusinessError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'ServicoBusinessError';
  }
}

/**
 * Valida se o usuário autenticado possui perfil de administradora
 */
function validarPermissaoAdministradora(
  user: UserContext | null | undefined,
): asserts user is UserContext {
  if (!user) {
    throw new ServicoBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }
  if (!user.isAdmin) {
    throw new ServicoBusinessError(
      'Acesso negado. Apenas a administradora possui permissão para gerenciar serviços.',
      403,
    );
  }
}

/**
 * Cadastra um novo serviço no catálogo da clínica (restrito à administradora).
 */
export async function cadastrarNovoServico(
  input: unknown,
  user: UserContext,
  repo: ServicosRepository,
): Promise<ServicoModel> {
  validarPermissaoAdministradora(user);

  const parsed = servicoInputSchema.parse(input);
  const id =
    parsed.id && parsed.id.trim().length > 0
      ? parsed.id.trim()
      : `srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const existente = await repo.buscarPorId(id);
  if (existente) {
    throw new ServicoBusinessError('Já existe um serviço cadastrado com este identificador.', 409);
  }

  const precoEmCentavos = reaisParaCentavos(parsed.preco);
  const sinal =
    parsed.sinal !== undefined
      ? parsed.sinal
      : parsed.sinalPercentual !== undefined
        ? calcularSinal(parsed.preco, parsed.sinalPercentual)
        : calcularSinal(parsed.preco, PERCENTUAL_SINAL_PADRAO);

  const sinalPercentual =
    parsed.sinalPercentual !== undefined
      ? parsed.sinalPercentual
      : calcularPercentualSinal(parsed.preco, sinal);

  const sinalEmCentavos = reaisParaCentavos(sinal);
  const agora = new Date().toISOString();

  const novoServico: ServicoModel = {
    id,
    nome: parsed.nome,
    duracaoMinutos: parsed.duracaoMinutos,
    preco: parsed.preco,
    precoEmCentavos,
    sinal,
    sinalEmCentavos,
    sinalPercentual,
    descricao: parsed.descricao,
    ativo: parsed.ativo !== undefined ? parsed.ativo : true,
    categoria: parsed.categoria || 'Corporal',
    createdAt: agora,
    updatedAt: agora,
  };

  return repo.salvar(novoServico);
}

/**
 * Edita um serviço existente mantendo preservados e imutáveis todos os agendamentos antigos.
 * Restrito à administradora.
 */
export async function editarServicoExistente(
  input: unknown,
  user: UserContext,
  repo: ServicosRepository,
): Promise<ServicoModel> {
  validarPermissaoAdministradora(user);

  const parsed = editarServicoInputSchema.parse(input);
  const servicoAtual = await repo.buscarPorId(parsed.id);

  if (!servicoAtual) {
    throw new ServicoBusinessError('Serviço não encontrado para alteração.', 404);
  }

  const precoEmCentavos = reaisParaCentavos(parsed.preco);
  const sinal =
    parsed.sinal !== undefined
      ? parsed.sinal
      : parsed.sinalPercentual !== undefined
        ? calcularSinal(parsed.preco, parsed.sinalPercentual)
        : calcularSinal(parsed.preco, servicoAtual.sinalPercentual || PERCENTUAL_SINAL_PADRAO);

  const sinalPercentual =
    parsed.sinalPercentual !== undefined
      ? parsed.sinalPercentual
      : calcularPercentualSinal(parsed.preco, sinal);

  const sinalEmCentavos = reaisParaCentavos(sinal);
  const agora = new Date().toISOString();

  const servicoAtualizado: ServicoModel = {
    id: servicoAtual.id,
    nome: parsed.nome,
    duracaoMinutos: parsed.duracaoMinutos,
    preco: parsed.preco,
    precoEmCentavos,
    sinal,
    sinalEmCentavos,
    sinalPercentual,
    descricao: parsed.descricao,
    ativo: parsed.ativo !== undefined ? parsed.ativo : servicoAtual.ativo,
    categoria: parsed.categoria || servicoAtual.categoria,
    imageSrc: servicoAtual.imageSrc,
    imageAlt: servicoAtual.imageAlt,
    createdAt: servicoAtual.createdAt || agora,
    updatedAt: agora,
  };

  return repo.atualizar(servicoAtualizado);
}

/**
 * Desativa um serviço (soft delete).
 * O serviço não é excluído do banco para garantir que o histórico de agendamentos passados
 * permaneça consistente e intacto, mas deixará de aceitar novos agendamentos no catálogo público.
 */
export async function desativarServicoExistente(
  servicoId: string,
  user: UserContext,
  repo: ServicosRepository,
): Promise<ServicoModel> {
  validarPermissaoAdministradora(user);

  if (!servicoId || typeof servicoId !== 'string' || servicoId.trim().length === 0) {
    throw new ServicoBusinessError('O identificador do serviço é obrigatório.', 400);
  }

  const idSanitizado = servicoId.trim();
  const servico = await repo.buscarPorId(idSanitizado);
  if (!servico) {
    throw new ServicoBusinessError('Serviço não encontrado para desativação.', 404);
  }

  const agora = new Date().toISOString();
  const desativado: ServicoModel = {
    ...servico,
    ativo: false,
    updatedAt: agora,
  };

  return repo.atualizar(desativado);
}

/**
 * Reativa um serviço previamente desativado (restrito à administradora).
 */
export async function reativarServicoExistente(
  servicoId: string,
  user: UserContext,
  repo: ServicosRepository,
): Promise<ServicoModel> {
  validarPermissaoAdministradora(user);

  if (!servicoId || typeof servicoId !== 'string' || servicoId.trim().length === 0) {
    throw new ServicoBusinessError('O identificador do serviço é obrigatório.', 400);
  }

  const idSanitizado = servicoId.trim();
  const servico = await repo.buscarPorId(idSanitizado);
  if (!servico) {
    throw new ServicoBusinessError('Serviço não encontrado para reativação.', 404);
  }

  const agora = new Date().toISOString();
  const reativado: ServicoModel = {
    ...servico,
    ativo: true,
    updatedAt: agora,
  };

  return repo.atualizar(reativado);
}

/**
 * Exclui fisicamente um serviço apenas se NÃO houver histórico de agendamentos vinculado.
 * Caso haja agendamentos antigos ou vigentes que utilizem este serviço, a exclusão física é bloqueada
 * e a administradora é instruída a realizar a desativação lógica.
 */
export async function excluirServicoComProtecaoHistorico(
  servicoId: string,
  user: UserContext,
  repo: ServicosRepository,
  agendamentosRepo: AgendamentosRepository,
): Promise<void> {
  validarPermissaoAdministradora(user);

  if (!servicoId || typeof servicoId !== 'string' || servicoId.trim().length === 0) {
    throw new ServicoBusinessError('O identificador do serviço é obrigatório.', 400);
  }

  const idSanitizado = servicoId.trim();
  const servico = await repo.buscarPorId(idSanitizado);
  if (!servico) {
    throw new ServicoBusinessError('Serviço não encontrado para exclusão.', 404);
  }

  const agendamentosVinculados = await agendamentosRepo.listarPorServico(servico.id);
  if (agendamentosVinculados.length > 0) {
    throw new ServicoBusinessError(
      'Não é possível excluir o serviço pois existem agendamentos históricos vinculados a ele. Para removê-lo de novas seleções sem corromper o histórico, desative o serviço.',
      409,
    );
  }

  await repo.excluir(servico.id);
}

/**
 * Consulta a lista de serviços do catálogo.
 * Clientes e visitantes visualizam estritamente serviços com `ativo: true`.
 * A administradora pode listar todos (ativos e inativos).
 */
export async function listarServicosCatalog(
  user: UserContext | null,
  apenasAtivos: boolean = false,
  repo: ServicosRepository,
): Promise<ServicoModel[]> {
  const isAdmin = user?.isAdmin === true;
  // Usuários sem privilégio administrativo só podem visualizar procedimentos ativos
  const filtrarApenasAtivos = !isAdmin || apenasAtivos;
  return repo.listar(filtrarApenasAtivos);
}

/**
 * Consulta um serviço específico por ID
 */
export async function obterDetalhesServico(
  servicoId: string,
  repo: ServicosRepository,
): Promise<ServicoModel> {
  const servico = await repo.buscarPorId(servicoId);
  if (!servico) {
    throw new ServicoBusinessError('Serviço não encontrado.', 404);
  }
  return servico;
}
