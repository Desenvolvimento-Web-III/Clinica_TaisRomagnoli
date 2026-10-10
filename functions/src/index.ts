import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { marcarNotificacaoLidaInputSchema, type Agendamento } from '@clinica/shared';
import { getHealthStatus } from './core/health-status.js';
import { obterHorarios, salvarHorarios } from './modules/horarios/horarios-service.js';
import {
  solicitarNovoAgendamento,
  alterarAgendamentoExistente,
  cancelarAgendamentoExistente,
  listarAgendamentos,
  AgendamentoBusinessError,
} from './modules/agendamentos/agendamentos-service.js';
import { FirestoreAgendamentosRepository } from './modules/agendamentos/agendamentos-repository.js';
import { FirestoreNotificacoesRepository } from './modules/notificacoes/notificacoes-repository.js';
import {
  processarLembretesAgendamentos,
  listarNotificacoesDoCliente,
  marcarNotificacaoComoLida,
  NotificacaoBusinessError,
} from './modules/notificacoes/notificacoes-service.js';
import { FirestoreServicosRepository } from './modules/servicos/servicos-repository.js';
import {
  cadastrarNovoServico,
  editarServicoExistente,
  desativarServicoExistente,
  reativarServicoExistente,
  excluirServicoComProtecaoHistorico,
  listarServicosCatalog,
  obterDetalhesServico,
  ServicoBusinessError,
} from './modules/servicos/servicos-service.js';
import { FirestoreClientesRepository } from './modules/clientes/clientes-repository.js';
import {
  registrarPerfilCliente,
  obterPerfilCliente,
  ClienteBusinessError,
} from './modules/clientes/clientes-service.js';

initializeApp();

export { obterHorarios, salvarHorarios } from './modules/horarios/horarios-service.js';
export {
  solicitarNovoAgendamento,
  alterarAgendamentoExistente,
  cancelarAgendamentoExistente,
  listarAgendamentos,
} from './modules/agendamentos/agendamentos-service.js';
export {
  FirestoreAgendamentosRepository,
  InMemoryAgendamentosRepository,
} from './modules/agendamentos/agendamentos-repository.js';
export {
  FirestoreNotificacoesRepository,
  InMemoryNotificacoesRepository,
} from './modules/notificacoes/notificacoes-repository.js';
export {
  criarNotificacaoConfirmacao,
  criarNotificacaoAlteracao,
  criarNotificacaoCancelamento,
  criarNotificacaoLembrete,
  processarLembretesAgendamentos,
  listarNotificacoesDoCliente,
  marcarNotificacaoComoLida,
} from './modules/notificacoes/notificacoes-service.js';
export {
  FirestoreServicosRepository,
  InMemoryServicosRepository,
} from './modules/servicos/servicos-repository.js';
export {
  cadastrarNovoServico,
  editarServicoExistente,
  desativarServicoExistente,
  reativarServicoExistente,
  excluirServicoComProtecaoHistorico,
  listarServicosCatalog,
  obterDetalhesServico,
  ServicoBusinessError,
} from './modules/servicos/servicos-service.js';
export {
  FirestoreClientesRepository,
  InMemoryClientesRepository,
} from './modules/clientes/clientes-repository.js';
export {
  registrarPerfilCliente,
  obterPerfilCliente,
  ClienteBusinessError,
} from './modules/clientes/clientes-service.js';

export const healthCheck = onRequest({ cors: false }, (_request, response) => {
  response.status(200).json(getHealthStatus());
});

/**
 * Helper para extrair e validar token de autenticação
 */
async function extrairUsuarioAutenticado(authorizationHeader?: string) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new AgendamentoBusinessError('Acesso não autenticado. Forneça o token Bearer.', 401);
  }

  const idToken = authorizationHeader.split('Bearer ')[1];
  if (!idToken) {
    throw new AgendamentoBusinessError('Token de autenticação ausente.', 401);
  }

  const decoded = await getAuth().verifyIdToken(idToken);
  const isAdmin = decoded['admin'] === true || decoded['role'] === 'admin';

  return {
    uid: decoded.uid,
    nome: (decoded['name'] as string) || (decoded['email'] as string) || 'Cliente',
    email: decoded.email,
    telefone: (decoded['phone_number'] as string) || undefined,
    isAdmin,
  };
}

/**
 * Consulta os horários de funcionamento e intervalos da clínica.
 * Endpoint público para consulta de disponibilidade de agenda.
 */
export const obterHorariosFuncionamento = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const professionalId =
      typeof request.query['professionalId'] === 'string'
        ? request.query['professionalId']
        : undefined;
    const firestore = getFirestore();
    const horarios = await obterHorarios(firestore, professionalId);
    response.status(200).json(horarios);
  } catch (error) {
    console.error('Erro ao obter horários de funcionamento:', error);
    response.status(500).json({ error: 'Erro interno ao consultar horários de funcionamento.' });
  }
});

/**
 * Cadastra ou altera os dias, horários e intervalos de atendimento da clínica.
 * Operação privilegiada restrita a administradores autenticados com claim de admin.
 */
export const atualizarHorariosFuncionamento = onRequest(
  { cors: true },
  async (request, response) => {
    if (request.method !== 'POST' && request.method !== 'PUT') {
      response.status(405).json({ error: 'Método não permitido. Use POST ou PUT.' });
      return;
    }

    try {
      const user = await extrairUsuarioAutenticado(request.headers.authorization);
      if (!user.isAdmin) {
        response.status(403).json({
          error:
            'Acesso negado. Apenas a administradora possui permissão para alterar os horários.',
        });
        return;
      }

      const firestore = getFirestore();
      const resultado = await salvarHorarios(firestore, request.body, user.uid);
      response.status(200).json({
        mensagem: 'Horários de funcionamento atualizados com sucesso.',
        dados: resultado,
      });
    } catch (error: unknown) {
      if (error instanceof AgendamentoBusinessError) {
        response.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        response.status(400).json({ error: 'Dados inválidos.', detalhes: error });
        return;
      }
      console.error('Erro ao atualizar horários de funcionamento:', error);
      response.status(500).json({ error: 'Erro interno ao salvar horários de funcionamento.' });
    }
  },
);

/**
 * Endpoint para solicitar um novo agendamento com validação de regras de negócio e cálculo de sinal
 * gerando automaticamente notificação interna de confirmação
 */
export const solicitarAgendamento = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const firestore = getFirestore();
    const repo = new FirestoreAgendamentosRepository(firestore);
    const notifRepo = new FirestoreNotificacoesRepository(firestore);
    const servicosRepo = new FirestoreServicosRepository(firestore);

    const agendamento = await solicitarNovoAgendamento(
      request.body,
      user,
      repo,
      notifRepo,
      servicosRepo,
    );
    response.status(201).json({
      mensagem: 'Agendamento solicitado com sucesso.',
      dados: agendamento,
    });
  } catch (error: unknown) {
    if (error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados da requisição inválidos.', detalhes: error });
      return;
    }
    console.error('Erro ao processar agendamento:', error);
    response.status(500).json({ error: 'Erro interno ao processar agendamento.' });
  }
});

/**
 * Endpoint para alterar ou reagendar um agendamento existente
 * gerando automaticamente notificação interna de alteração
 */
export const alterarAgendamento = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const firestore = getFirestore();
    const repo = new FirestoreAgendamentosRepository(firestore);
    const notifRepo = new FirestoreNotificacoesRepository(firestore);

    const agendamento = await alterarAgendamentoExistente(request.body, user, repo, notifRepo);
    response.status(200).json({
      mensagem: 'Agendamento alterado com sucesso.',
      dados: agendamento,
    });
  } catch (error: unknown) {
    if (error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados da requisição inválidos.', detalhes: error });
      return;
    }
    console.error('Erro ao alterar agendamento:', error);
    response.status(500).json({ error: 'Erro interno ao alterar agendamento.' });
  }
});

/**
 * Endpoint para cancelar um agendamento aplicando a regra de antecedência mínima
 * gerando automaticamente notificação interna de cancelamento com status do sinal
 */
export const cancelarAgendamento = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const firestore = getFirestore();
    const repo = new FirestoreAgendamentosRepository(firestore);
    const notifRepo = new FirestoreNotificacoesRepository(firestore);

    const agendamento = await cancelarAgendamentoExistente(request.body, user, repo, notifRepo);
    response.status(200).json({
      mensagem: 'Agendamento cancelado com sucesso.',
      dados: agendamento,
    });
  } catch (error: unknown) {
    if (error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados da requisição inválidos.', detalhes: error });
      return;
    }
    console.error('Erro ao cancelar agendamento:', error);
    response.status(500).json({ error: 'Erro interno ao cancelar agendamento.' });
  }
});

/**
 * Endpoint para listar agendamentos do cliente autenticado
 */
export const listarMeusAgendamentos = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const clienteIdFiltro =
      typeof request.query['clienteId'] === 'string' ? request.query['clienteId'] : undefined;

    const firestore = getFirestore();
    const repo = new FirestoreAgendamentosRepository(firestore);

    const lista = await listarAgendamentos(user, clienteIdFiltro, repo);
    response.status(200).json({ dados: lista });
  } catch (error: unknown) {
    if (error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Erro ao listar agendamentos:', error);
    response.status(500).json({ error: 'Erro interno ao listar agendamentos.' });
  }
});

/**
 * Endpoint para consultar as notificações internas do cliente autenticado
 */
export const listarMinhasNotificacoes = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const apenasNaoLidas = request.query['apenasNaoLidas'] === 'true';
    const limite =
      typeof request.query['limite'] === 'string'
        ? parseInt(request.query['limite'], 10) || undefined
        : undefined;

    const firestore = getFirestore();
    const notifRepo = new FirestoreNotificacoesRepository(firestore);

    const notificacoes = await listarNotificacoesDoCliente(
      user.uid,
      { apenasNaoLidas, limite },
      notifRepo,
    );
    response.status(200).json({ dados: notificacoes });
  } catch (error: unknown) {
    if (error instanceof AgendamentoBusinessError || error instanceof NotificacaoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Erro ao listar notificações:', error);
    response.status(500).json({ error: 'Erro interno ao consultar notificações.' });
  }
});

/**
 * Endpoint para marcar uma notificação como lida
 */
export const marcarNotificacaoLida = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST' && request.method !== 'PATCH') {
    response.status(405).json({ error: 'Método não permitido. Use POST ou PATCH.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const parsed = marcarNotificacaoLidaInputSchema.parse(request.body);

    const firestore = getFirestore();
    const notifRepo = new FirestoreNotificacoesRepository(firestore);

    const atualizada = await marcarNotificacaoComoLida(parsed.notificacaoId, user.uid, notifRepo);
    response.status(200).json({
      mensagem: 'Notificação marcada como lida.',
      dados: atualizada,
    });
  } catch (error: unknown) {
    if (error instanceof AgendamentoBusinessError || error instanceof NotificacaoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados da requisição inválidos.', detalhes: error });
      return;
    }
    console.error('Erro ao marcar notificação como lida:', error);
    response.status(500).json({ error: 'Erro interno ao marcar notificação como lida.' });
  }
});

/**
 * Endpoint administrativo para processar lembretes de sessões próximas
 */
export const processarLembretes = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    if (!user.isAdmin) {
      response.status(403).json({
        error: 'Acesso negado. Apenas a administração pode disparar o processamento de lembretes.',
      });
      return;
    }

    const firestore = getFirestore();
    const agendamentosSnapshot = await firestore.collection('agendamentos').get();
    const agendamentos = agendamentosSnapshot.docs.map((doc) => doc.data() as Agendamento);

    const notifRepo = new FirestoreNotificacoesRepository(firestore);
    const geradas = await processarLembretesAgendamentos(agendamentos, notifRepo, 24);

    response.status(200).json({
      mensagem: `Processamento de lembretes concluído com sucesso. ${geradas.length} lembrete(s) gerado(s).`,
      dados: geradas,
    });
  } catch (error: unknown) {
    if (error instanceof AgendamentoBusinessError || error instanceof NotificacaoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Erro ao processar lembretes:', error);
    response.status(500).json({ error: 'Erro interno ao processar lembretes.' });
  }
});

/**
 * Helper para extrair usuário opcionalmente (para rotas com visualização diferenciada de catálogo)
 */
async function extrairUsuarioOpcional(authorizationHeader?: string) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }
  try {
    return await extrairUsuarioAutenticado(authorizationHeader);
  } catch {
    return null;
  }
}

/**
 * Cadastra um novo serviço no catálogo da clínica (restrito à administradora)
 */
export const cadastrarServico = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const firestore = getFirestore();
    const repo = new FirestoreServicosRepository(firestore);

    const novo = await cadastrarNovoServico(request.body, user, repo);
    response.status(201).json({
      mensagem: 'Serviço cadastrado com sucesso.',
      dados: novo,
    });
  } catch (error: unknown) {
    if (error instanceof ServicoBusinessError || error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados do serviço inválidos.', detalhes: error });
      return;
    }
    console.error('Erro ao cadastrar serviço:', error);
    response.status(500).json({ error: 'Erro interno ao cadastrar serviço.' });
  }
});

/**
 * Edita dados de um serviço existente preservando agendamentos passados (restrito à administradora)
 */
export const editarServico = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST' && request.method !== 'PUT') {
    response.status(405).json({ error: 'Método não permitido. Use POST ou PUT.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const firestore = getFirestore();
    const repo = new FirestoreServicosRepository(firestore);

    const atualizado = await editarServicoExistente(request.body, user, repo);
    response.status(200).json({
      mensagem: 'Serviço atualizado com sucesso.',
      dados: atualizado,
    });
  } catch (error: unknown) {
    if (error instanceof ServicoBusinessError || error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados do serviço inválidos.', detalhes: error });
      return;
    }
    console.error('Erro ao editar serviço:', error);
    response.status(500).json({ error: 'Erro interno ao editar serviço.' });
  }
});

/**
 * Desativa um serviço (soft delete) mantendo dados históricos de agendamentos (restrito à administradora)
 */
export const desativarServico = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST' && request.method !== 'PATCH') {
    response.status(405).json({ error: 'Método não permitido. Use POST ou PATCH.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const firestore = getFirestore();
    const repo = new FirestoreServicosRepository(firestore);

    const id = (request.body?.id ||
      request.body?.servicoId ||
      request.query['id'] ||
      request.query['servicoId']) as string;

    const desativado = await desativarServicoExistente(id, user, repo);
    response.status(200).json({
      mensagem: 'Serviço desativado com sucesso.',
      dados: desativado,
    });
  } catch (error: unknown) {
    if (error instanceof ServicoBusinessError || error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Erro ao desativar serviço:', error);
    response.status(500).json({ error: 'Erro interno ao desativar serviço.' });
  }
});

/**
 * Reativa um serviço previamente desativado (restrito à administradora)
 */
export const reativarServico = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST' && request.method !== 'PATCH') {
    response.status(405).json({ error: 'Método não permitido. Use POST ou PATCH.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const firestore = getFirestore();
    const repo = new FirestoreServicosRepository(firestore);

    const id = (request.body?.id ||
      request.body?.servicoId ||
      request.query['id'] ||
      request.query['servicoId']) as string;

    const reativado = await reativarServicoExistente(id, user, repo);
    response.status(200).json({
      mensagem: 'Serviço reativado com sucesso.',
      dados: reativado,
    });
  } catch (error: unknown) {
    if (error instanceof ServicoBusinessError || error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Erro ao reativar serviço:', error);
    response.status(500).json({ error: 'Erro interno ao reativar serviço.' });
  }
});

/**
 * Exclui fisicamente um serviço se e somente se NÃO houver agendamentos associados
 */
export const excluirServico = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    response.status(405).json({ error: 'Método não permitido. Use POST ou DELETE.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const firestore = getFirestore();
    const repo = new FirestoreServicosRepository(firestore);
    const agendamentosRepo = new FirestoreAgendamentosRepository(firestore);

    const id = (request.body?.id ||
      request.body?.servicoId ||
      request.query['id'] ||
      request.query['servicoId']) as string;

    await excluirServicoComProtecaoHistorico(id, user, repo, agendamentosRepo);
    response.status(200).json({
      mensagem: 'Serviço excluído com sucesso.',
    });
  } catch (error: unknown) {
    if (error instanceof ServicoBusinessError || error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Erro ao excluir serviço:', error);
    response.status(500).json({ error: 'Erro interno ao excluir serviço.' });
  }
});

/**
 * Consulta catálogo de serviços.
 * Clientes e visitantes visualizam apenas serviços ativos.
 * Administradora pode consultar todos através do parâmetro `todos=true`.
 */
export const obterServicos = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const user = await extrairUsuarioOpcional(request.headers.authorization);
    const apenasAtivos = request.query['todos'] !== 'true';

    const firestore = getFirestore();
    const repo = new FirestoreServicosRepository(firestore);

    const servicos = await listarServicosCatalog(user, apenasAtivos, repo);
    response.status(200).json({ dados: servicos });
  } catch (error: unknown) {
    if (error instanceof ServicoBusinessError || error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Erro ao obter serviços:', error);
    response.status(500).json({ error: 'Erro interno ao consultar catálogo de serviços.' });
  }
});

/**
 * Consulta detalhes de um serviço específico
 */
export const obterServico = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const id = (request.query['id'] || request.query['servicoId']) as string;
    if (!id) {
      response.status(400).json({ error: 'O identificador do serviço (id) é obrigatório.' });
      return;
    }

    const firestore = getFirestore();
    const repo = new FirestoreServicosRepository(firestore);

    const servico = await obterDetalhesServico(id, repo);
    response.status(200).json({ dados: servico });
  } catch (error: unknown) {
    if (error instanceof ServicoBusinessError || error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Erro ao obter serviço:', error);
    response.status(500).json({ error: 'Erro interno ao obter serviço.' });
  }
});

/**
 * Registra o perfil básico do cliente após o cadastro no Firebase Auth.
 * Operação autenticada que vincula nome, telefone, email e preferências ao UID.
 */
export const criarPerfil = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const firestore = getFirestore();
    const repo = new FirestoreClientesRepository(firestore);
    const notifRepo = new FirestoreNotificacoesRepository(firestore);

    const perfil = await registrarPerfilCliente(request.body, user, repo, notifRepo);
    response.status(201).json({
      mensagem: 'Perfil do cliente registrado com sucesso.',
      dados: perfil,
    });
  } catch (error: unknown) {
    if (error instanceof ClienteBusinessError || error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados do perfil inválidos.', detalhes: error });
      return;
    }
    console.error('Erro ao registrar perfil do cliente:', error);
    response.status(500).json({ error: 'Erro interno ao registrar perfil do cliente.' });
  }
});

/**
 * Consulta o perfil básico de um cliente.
 * Clientes podem consultar apenas seu próprio perfil; administradores podem consultar qualquer UID.
 */
export const obterPerfil = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const targetUid = (request.query['uid'] as string) || user.uid;

    const firestore = getFirestore();
    const repo = new FirestoreClientesRepository(firestore);

    const perfil = await obterPerfilCliente(targetUid, user, repo);
    response.status(200).json({ dados: perfil });
  } catch (error: unknown) {
    if (error instanceof ClienteBusinessError || error instanceof AgendamentoBusinessError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Erro ao consultar perfil do cliente:', error);
    response.status(500).json({ error: 'Erro interno ao consultar perfil do cliente.' });
  }
});
