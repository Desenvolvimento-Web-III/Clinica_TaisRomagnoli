import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { marcarNotificacaoLidaInputSchema, type Agendamento } from '@clinica/shared';
import { getHealthStatus } from './core/health-status.js';
import {
  obterHorarios,
  salvarHorarios,
  consultarGradeHorariosDisponiveis,
  HorariosBusinessError,
} from './modules/horarios/horarios-service.js';
import {
  solicitarNovoAgendamento,
  alterarAgendamentoExistente,
  cancelarAgendamentoExistente,
  atualizarStatusAgendamento as atualizarStatusAgendamentoService,
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
  calcularRecorrenciaMensalCliente,
  listarClientes as listarClientesService,
  ClienteBusinessError,
} from './modules/clientes/clientes-service.js';
import {
  FirestoreProfissionaisRepository,
  InMemoryProfissionaisRepository,
  type ProfissionaisRepository,
} from './modules/profissionais/profissionais-repository.js';
import {
  ProfissionalBusinessError,
  listarProfissionais,
  obterProfissionalPorId,
  cadastrarProfissional as cadastrarProfissionalService,
  atualizarProfissional as atualizarProfissionalService,
  vincularProfissionalAoServico as vincularProfissionalAoServicoService,
} from './modules/profissionais/profissionais-service.js';
import { listarServicosCatalogPorProfissional } from './modules/servicos/servicos-service.js';
import { FirestoreAnamneseRepository } from './modules/anamnese/anamnese-repository.js';
import {
  AnamneseBusinessError,
  salvarFichaAnamneseService,
  obterFichaAnamneseService,
  registrarLiberacaoMedicaService,
} from './modules/anamnese/anamnese-service.js';

initializeApp();

export {
  obterHorarios,
  salvarHorarios,
  consultarGradeHorariosDisponiveis,
  HorariosBusinessError,
} from './modules/horarios/horarios-service.js';
export {
  solicitarNovoAgendamento,
  alterarAgendamentoExistente,
  cancelarAgendamentoExistente,
  atualizarStatusAgendamento as atualizarStatusAgendamentoService,
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
  calcularRecorrenciaMensalCliente,
  listarClientes,
  ClienteBusinessError,
} from './modules/clientes/clientes-service.js';
export {
  FirestoreAnamneseRepository,
  InMemoryAnamneseRepository,
} from './modules/anamnese/anamnese-repository.js';
export {
  AnamneseBusinessError,
  salvarFichaAnamneseService,
  obterFichaAnamneseService,
  registrarLiberacaoMedicaService,
} from './modules/anamnese/anamnese-service.js';
export type { AnamneseRepository } from './modules/anamnese/anamnese-repository.js';
import {
  atribuirFuncaoAdministrativa as atribuirFuncaoAdministrativaService,
  definirAdministradoraInicial,
  consultarClaimsUsuario,
  CustomClaimsBusinessError,
  aplicarClaimsPerfil,
  definirClaimsCliente,
} from './modules/admin/custom-claims-service.js';
import {
  SessaoBusinessError,
  revogarSessoesUsuario,
  aplicarPoliticaSessaoUnica,
  consultarStatusSessao,
  type SessoesAuthAdapter,
  type SessoesFirestoreAdapter,
  type StatusSessaoResult,
} from './modules/auth/sessoes-service.js';
import {
  FirestoreBloqueiosRepository,
  InMemoryBloqueiosRepository,
  type BloqueiosRepository,
  BLOQUEIOS_AGENDA_COLLECTION,
} from './modules/agenda/bloqueios-repository.js';
import {
  FirestoreHorariosFixosRepository,
  InMemoryHorariosFixosRepository,
  type HorariosFixosRepository,
  HORARIOS_FIXOS_COLLECTION,
} from './modules/agenda/horarios-fixos-repository.js';
import {
  AgendaBloqueiosBusinessError,
  criarBloqueioAgenda as criarBloqueioAgendaService,
  listarBloqueiosAgenda as listarBloqueiosAgendaService,
  removerBloqueioAgenda as removerBloqueioAgendaService,
  alternarStatusBloqueioAgenda as alternarStatusBloqueioAgendaService,
  criarHorarioFixoCliente as criarHorarioFixoClienteService,
  listarHorariosFixosClientes as listarHorariosFixosClientesService,
  removerHorarioFixoCliente as removerHorarioFixoClienteService,
  atualizarHorarioFixoCliente as atualizarHorarioFixoClienteService,
  verificarDisponibilidadeAgenda,
} from './modules/agenda/agenda-bloqueios-service.js';
import {
  AuthError,
  extrairUsuarioAutenticado,
  extrairUsuarioOpcional,
  exigirAdministrador,
  exigirCliente,
  autenticarMiddleware,
  comAutenticacao,
  validarIdToken,
  extrairBearerToken,
  type UserContext,
  type AuthenticatedRequest,
  type OptionalAuthenticatedRequest,
  type AuthTokenVerifier,
} from './middlewares/auth-middleware.js';

export {
  atribuirFuncaoAdministrativaService,
  definirAdministradoraInicial,
  consultarClaimsUsuario,
  CustomClaimsBusinessError,
  aplicarClaimsPerfil,
  definirClaimsCliente,
  SessaoBusinessError,
  revogarSessoesUsuario,
  aplicarPoliticaSessaoUnica,
  consultarStatusSessao,
  type SessoesAuthAdapter,
  type SessoesFirestoreAdapter,
  type StatusSessaoResult,
  AuthError,
  extrairUsuarioAutenticado,
  extrairUsuarioOpcional,
  exigirAdministrador,
  exigirCliente,
  autenticarMiddleware,
  comAutenticacao,
  validarIdToken,
  extrairBearerToken,
  type UserContext,
  type AuthenticatedRequest,
  type OptionalAuthenticatedRequest,
  type AuthTokenVerifier,
  FirestoreProfissionaisRepository,
  InMemoryProfissionaisRepository,
  type ProfissionaisRepository,
  ProfissionalBusinessError,
  listarProfissionais,
  obterProfissionalPorId,
  cadastrarProfissionalService,
  atualizarProfissionalService,
  vincularProfissionalAoServicoService,
  listarServicosCatalogPorProfissional,
};

export const healthCheck = onRequest({ cors: false }, (_request, response) => {
  response.status(200).json(getHealthStatus());
});

/**
 * Responde erros de regras de negócio ou de autenticação padronizados com o código HTTP adequado.
 */
function responderErroNegocio(
  response: { status: (code: number) => { json: (data: unknown) => void } },
  error: unknown,
): boolean {
  if (
    error instanceof AuthError ||
    error instanceof AgendamentoBusinessError ||
    error instanceof NotificacaoBusinessError ||
    error instanceof ServicoBusinessError ||
    error instanceof ClienteBusinessError ||
    error instanceof CustomClaimsBusinessError ||
    error instanceof SessaoBusinessError ||
    error instanceof AgendaBloqueiosBusinessError ||
    error instanceof HorariosBusinessError ||
    error instanceof ProfissionalBusinessError ||
    error instanceof AnamneseBusinessError
  ) {
    response.status(error.statusCode).json({ error: error.message });
    return true;
  }
  return false;
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
      exigirAdministrador(
        user,
        'Acesso negado. Apenas a administradora possui permissão para alterar os horários.',
      );

      const firestore = getFirestore();
      const resultado = await salvarHorarios(firestore, request.body, user.uid);
      response.status(200).json({
        mensagem: 'Horários de funcionamento atualizados com sucesso.',
        dados: resultado,
      });
    } catch (error: unknown) {
      if (responderErroNegocio(response, error)) {
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
    const bloqueiosRepo = new FirestoreBloqueiosRepository(firestore);
    const horariosFixosRepo = new FirestoreHorariosFixosRepository(firestore);
    const profissionaisRepo = new FirestoreProfissionaisRepository(firestore);
    const anamneseRepo = new FirestoreAnamneseRepository(firestore);

    const agendamento = await solicitarNovoAgendamento(
      request.body,
      user,
      repo,
      notifRepo,
      servicosRepo,
      bloqueiosRepo,
      horariosFixosRepo,
      undefined,
      profissionaisRepo,
      anamneseRepo,
    );
    response.status(201).json({
      mensagem: 'Agendamento solicitado com sucesso.',
      dados: agendamento,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
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
    const bloqueiosRepo = new FirestoreBloqueiosRepository(firestore);
    const horariosFixosRepo = new FirestoreHorariosFixosRepository(firestore);
    const profissionaisRepo = new FirestoreProfissionaisRepository(firestore);
    const servicosRepo = new FirestoreServicosRepository(firestore);

    const agendamento = await alterarAgendamentoExistente(
      request.body,
      user,
      repo,
      notifRepo,
      undefined,
      bloqueiosRepo,
      horariosFixosRepo,
      undefined,
      profissionaisRepo,
      servicosRepo,
    );
    response.status(200).json({
      mensagem: 'Agendamento alterado com sucesso.',
      dados: agendamento,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
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
    if (responderErroNegocio(response, error)) {
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
 * Endpoint para atualizar o status de um agendamento existente conforme a máquina de estados.
 * Operação restrita à administradora autenticada.
 * Suporta transições para: pendente, confirmado, em_andamento, concluido, cancelado, reagendado, falta.
 */
export const atualizarStatusAgendamento = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST' && request.method !== 'PATCH') {
    response.status(405).json({ error: 'Método não permitido. Use POST ou PATCH.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    exigirAdministrador(user);

    const firestore = getFirestore();
    const repo = new FirestoreAgendamentosRepository(firestore);
    const notifRepo = new FirestoreNotificacoesRepository(firestore);
    const anamneseRepo = new FirestoreAnamneseRepository(firestore);
    const clientesRepo = new FirestoreClientesRepository(firestore);

    const agendamento = await atualizarStatusAgendamentoService(
      request.body,
      user,
      repo,
      notifRepo,
      undefined,
      anamneseRepo,
      clientesRepo,
    );

    response.status(200).json({
      mensagem: `Status do agendamento atualizado para '${agendamento.status}' com sucesso.`,
      dados: agendamento,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados da requisição inválidos.', detalhes: error });
      return;
    }
    console.error('Erro ao atualizar status do agendamento:', error);
    response.status(500).json({ error: 'Erro interno ao atualizar status do agendamento.' });
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
    if (responderErroNegocio(response, error)) {
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
    if (responderErroNegocio(response, error)) {
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
    if (responderErroNegocio(response, error)) {
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
    exigirAdministrador(
      user,
      'Acesso negado. Apenas a administração pode disparar o processamento de lembretes.',
    );

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
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao processar lembretes:', error);
    response.status(500).json({ error: 'Erro interno ao processar lembretes.' });
  }
});

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
    exigirAdministrador(user);
    const firestore = getFirestore();
    const repo = new FirestoreServicosRepository(firestore);

    const novo = await cadastrarNovoServico(request.body, user, repo);
    response.status(201).json({
      mensagem: 'Serviço cadastrado com sucesso.',
      dados: novo,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
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
    exigirAdministrador(user);
    const firestore = getFirestore();
    const repo = new FirestoreServicosRepository(firestore);

    const atualizado = await editarServicoExistente(request.body, user, repo);
    response.status(200).json({
      mensagem: 'Serviço atualizado com sucesso.',
      dados: atualizado,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
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
    exigirAdministrador(user);
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
    if (responderErroNegocio(response, error)) {
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
    exigirAdministrador(user);
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
    if (responderErroNegocio(response, error)) {
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
    exigirAdministrador(user);
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
    if (responderErroNegocio(response, error)) {
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
    if (responderErroNegocio(response, error)) {
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
    if (responderErroNegocio(response, error)) {
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
    const auth = getAuth();
    const repo = new FirestoreClientesRepository(firestore);
    const notifRepo = new FirestoreNotificacoesRepository(firestore);

    const perfil = await registrarPerfilCliente(request.body, user, repo, notifRepo, auth);
    response.status(201).json({
      mensagem: 'Perfil do cliente registrado com sucesso.',
      dados: perfil,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
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
    const agendamentosRepo = new FirestoreAgendamentosRepository(firestore);

    const perfil = await obterPerfilCliente(targetUid, user, repo, agendamentosRepo);
    response.status(200).json({ dados: perfil });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao consultar perfil do cliente:', error);
    response.status(500).json({ error: 'Erro interno ao consultar perfil do cliente.' });
  }
});

/**
 * Endpoint para cálculo e consulta da recorrência mensal do cliente.
 * Marca como recorrente quem concluir pelo menos duas sessões no mês.
 * Clientes podem consultar sua própria recorrência; administradores podem consultar qualquer cliente.
 */
export const calcularRecorrenciaCliente = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use GET ou POST.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const targetUid =
      (request.query['uid'] as string) ||
      (request.body && typeof request.body === 'object' && 'uid' in request.body
        ? String(request.body.uid)
        : user.uid);

    if (targetUid !== user.uid && !user.isAdmin) {
      response.status(403).json({
        error:
          'Acesso negado. Você só tem permissão para calcular a recorrência da sua própria conta.',
      });
      return;
    }

    const mesReferencia =
      (request.query['mesReferencia'] as string) ||
      (request.body && typeof request.body === 'object' && 'mesReferencia' in request.body
        ? String(request.body.mesReferencia)
        : undefined);

    const firestore = getFirestore();
    const clientesRepo = new FirestoreClientesRepository(firestore);
    const agendamentosRepo = new FirestoreAgendamentosRepository(firestore);

    const recorrencia = await calcularRecorrenciaMensalCliente(
      targetUid,
      clientesRepo,
      agendamentosRepo,
      mesReferencia,
    );

    response.status(200).json({
      sucesso: true,
      dados: recorrencia,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao calcular recorrência do cliente:', error);
    response.status(500).json({ error: 'Erro interno ao calcular recorrência do cliente.' });
  }
});

/**
 * Endpoint administrativo para listar todos os clientes cadastrados com busca textual.
 * Exclusivo para administradoras autenticadas.
 */
export const listarClientesEndpoint = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    const termoBusca =
      typeof request.query['termoBusca'] === 'string'
        ? request.query['termoBusca']
        : typeof request.query['q'] === 'string'
          ? request.query['q']
          : undefined;

    const firestore = getFirestore();
    const repo = new FirestoreClientesRepository(firestore);

    const clientes = await listarClientesService(user, repo, termoBusca);
    response.status(200).json({ dados: clientes });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao listar clientes:', error);
    response.status(500).json({ error: 'Erro interno ao listar clientes.' });
  }
});

/**
 * Atribui a função administrativa a uma conta de usuário via Custom Claims no Firebase Admin SDK.
 * Bloqueia estritamente autoatribuição por clientes comuns (HTTP 403).
 */
export const atribuirFuncaoAdministrativa = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    const auth = getAuth();
    const firestore = getFirestore();

    const resultado = await atribuirFuncaoAdministrativaService(
      request.body,
      caller,
      auth,
      firestore,
    );

    response.status(200).json({
      sucesso: true,
      mensagem: resultado.mensagem,
      dados: resultado,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response
        .status(400)
        .json({ error: 'Dados inválidos para atribuição de claims.', detalhes: error });
      return;
    }
    console.error('Erro ao atribuir função administrativa:', error);
    response
      .status(500)
      .json({ error: 'Erro interno ao processar atribuição de função administrativa.' });
  }
});

/**
 * Consulta as Custom Claims de um usuário pelo Firebase Admin SDK.
 */
export const consultarCustomClaims = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    const targetUid = (request.query['uid'] as string) || caller.uid;
    const auth = getAuth();

    const claims = await consultarClaimsUsuario(targetUid, caller, auth);
    response.status(200).json({ dados: claims });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao consultar custom claims:', error);
    response.status(500).json({ error: 'Erro interno ao consultar custom claims.' });
  }
});

/**
 * Endpoint de bootstrap para inicializar as Custom Claims da administradora da clínica via Firebase Admin SDK.
 */
export const inicializarContaAdministradora = onRequest(
  { cors: true },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Método não permitido. Use POST.' });
      return;
    }

    try {
      const caller = await extrairUsuarioAutenticado(request.headers.authorization);
      if (!caller.isAdmin && caller.email !== 'admin@clinicataisromagnoli.com.br') {
        response.status(403).json({
          error: 'Acesso negado. Apenas a administradora autorizada pode inicializar a conta.',
        });
        return;
      }

      const auth = getAuth();
      const firestore = getFirestore();
      const resultado = await definirAdministradoraInicial(auth, firestore);

      response.status(200).json({
        sucesso: true,
        mensagem: resultado.mensagem,
        dados: resultado,
      });
    } catch (error: unknown) {
      if (responderErroNegocio(response, error)) {
        return;
      }
      console.error('Erro ao inicializar conta administradora:', error);
      response.status(500).json({ error: 'Erro interno ao inicializar conta da administradora.' });
    }
  },
);

/**
 * Endpoint para revogar sessões (refresh tokens) de um usuário no Firebase Authentication.
 * Permite ao próprio usuário invalidar suas sessões antigas ou à administradora revogar sessões de terceiros.
 */
export const revogarSessoes = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    const auth = getAuth();
    const firestore = getFirestore();

    const resultado = await revogarSessoesUsuario(request.body, caller, auth, firestore);
    response.status(200).json({
      sucesso: true,
      mensagem: resultado.mensagem,
      dados: resultado,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response
        .status(400)
        .json({ error: 'Dados inválidos para revogação de sessão.', detalhes: error });
      return;
    }
    console.error('Erro ao revogar sessões:', error);
    response.status(500).json({ error: 'Erro interno ao processar revogação de sessões.' });
  }
});

/**
 * Endpoint para aplicar política de sessão única ao iniciar nova sessão.
 * Revoga todos os refresh tokens anteriores do usuário autenticado.
 */
export const iniciarSessaoUnica = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    const auth = getAuth();
    const firestore = getFirestore();

    const motivo =
      (request.body?.motivo as string) || 'Início de nova sessão sob política de sessão única';
    const resultado = await aplicarPoliticaSessaoUnica(caller, auth, firestore, motivo);

    response.status(200).json({
      sucesso: true,
      mensagem: resultado.mensagem,
      dados: resultado,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao aplicar política de sessão única:', error);
    response.status(500).json({ error: 'Erro interno ao aplicar política de sessão única.' });
  }
});

/**
 * Consulta metadados de sessão do usuário (ex: tokensValidAfterTime).
 */
export const consultarSessao = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    const targetUid = (request.query['uid'] as string) || caller.uid;
    const auth = getAuth();

    const resultado = await consultarStatusSessao(targetUid, caller, auth);
    response.status(200).json({ dados: resultado });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao consultar status da sessão:', error);
    response.status(500).json({ error: 'Erro interno ao consultar status da sessão.' });
  }
});

export {
  FirestoreBloqueiosRepository,
  InMemoryBloqueiosRepository,
  type BloqueiosRepository,
  BLOQUEIOS_AGENDA_COLLECTION,
  FirestoreHorariosFixosRepository,
  InMemoryHorariosFixosRepository,
  type HorariosFixosRepository,
  HORARIOS_FIXOS_COLLECTION,
  AgendaBloqueiosBusinessError,
  criarBloqueioAgendaService,
  listarBloqueiosAgendaService,
  removerBloqueioAgendaService,
  alternarStatusBloqueioAgendaService,
  criarHorarioFixoClienteService,
  listarHorariosFixosClientesService,
  removerHorarioFixoClienteService,
  atualizarHorarioFixoClienteService,
  verificarDisponibilidadeAgenda,
};

/**
 * Endpoint para criar bloqueio pontual ou recorrente na agenda.
 * Operação restrita à administradora.
 */
export const criarBloqueioAgenda = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    exigirAdministrador(caller);
    const firestore = getFirestore();
    const repo = new FirestoreBloqueiosRepository(firestore);

    const bloqueio = await criarBloqueioAgendaService(request.body, caller, repo);
    response.status(201).json({
      sucesso: true,
      mensagem: 'Bloqueio de agenda criado com sucesso.',
      dados: bloqueio,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados do bloqueio inválidos.', detalhes: error });
      return;
    }
    console.error('Erro ao criar bloqueio de agenda:', error);
    response.status(500).json({ error: 'Erro interno ao criar bloqueio de agenda.' });
  }
});

/**
 * Endpoint para listar bloqueios cadastrados na agenda.
 */
export const listarBloqueiosAgenda = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    const apenasAtivos = request.query['apenasAtivos'] !== 'false';
    const profissionalId =
      typeof request.query['profissionalId'] === 'string'
        ? request.query['profissionalId']
        : undefined;

    const firestore = getFirestore();
    const repo = new FirestoreBloqueiosRepository(firestore);

    const bloqueios = await listarBloqueiosAgendaService(
      caller,
      repo,
      apenasAtivos,
      profissionalId,
    );
    response.status(200).json({ dados: bloqueios });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao listar bloqueios de agenda:', error);
    response.status(500).json({ error: 'Erro interno ao consultar bloqueios.' });
  }
});

/**
 * Endpoint para remover um bloqueio de agenda pelo ID.
 * Operação restrita à administradora.
 */
export const removerBloqueioAgenda = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'DELETE' && request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use DELETE ou POST.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    exigirAdministrador(caller);
    const id = (request.query['id'] as string) || (request.body?.id as string);

    const firestore = getFirestore();
    const repo = new FirestoreBloqueiosRepository(firestore);

    const resultado = await removerBloqueioAgendaService(id, caller, repo);
    response.status(200).json({
      sucesso: true,
      mensagem: 'Bloqueio de agenda excluído com sucesso.',
      dados: resultado,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao remover bloqueio de agenda:', error);
    response.status(500).json({ error: 'Erro interno ao remover bloqueio de agenda.' });
  }
});

/**
 * Endpoint para alternar o status ativo/inativo de um bloqueio.
 */
export const alternarStatusBloqueioAgenda = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'PATCH' && request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use PATCH ou POST.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    exigirAdministrador(caller);
    const id = request.body?.id as string;
    const ativo = Boolean(request.body?.ativo);

    const firestore = getFirestore();
    const repo = new FirestoreBloqueiosRepository(firestore);

    const atualizado = await alternarStatusBloqueioAgendaService(id, ativo, caller, repo);
    response.status(200).json({
      sucesso: true,
      mensagem: `Status do bloqueio atualizado para ${ativo ? 'ativo' : 'inativo'}.`,
      dados: atualizado,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao alterar status de bloqueio:', error);
    response.status(500).json({ error: 'Erro interno ao alterar status de bloqueio.' });
  }
});

/**
 * Endpoint para cadastrar uma reserva de horário fixo semanal/quinzenal para cliente.
 * Restrito à administradora.
 */
export const criarHorarioFixoCliente = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    exigirAdministrador(caller);
    const firestore = getFirestore();
    const repo = new FirestoreHorariosFixosRepository(firestore);

    const horarioFixo = await criarHorarioFixoClienteService(request.body, caller, repo);
    response.status(201).json({
      sucesso: true,
      mensagem: 'Reserva de horário fixo criada com sucesso.',
      dados: horarioFixo,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados do horário fixo inválidos.', detalhes: error });
      return;
    }
    console.error('Erro ao criar horário fixo:', error);
    response.status(500).json({ error: 'Erro interno ao criar horário fixo de cliente.' });
  }
});

/**
 * Endpoint para consultar horários fixos de clientes.
 */
export const listarHorariosFixosClientes = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    const clienteIdFiltro =
      typeof request.query['clienteId'] === 'string' ? request.query['clienteId'] : undefined;
    const profissionalId =
      typeof request.query['profissionalId'] === 'string'
        ? request.query['profissionalId']
        : undefined;

    const firestore = getFirestore();
    const repo = new FirestoreHorariosFixosRepository(firestore);

    const horariosFixos = await listarHorariosFixosClientesService(
      caller,
      repo,
      clienteIdFiltro,
      profissionalId,
    );
    response.status(200).json({ dados: horariosFixos });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao listar horários fixos:', error);
    response.status(500).json({ error: 'Erro interno ao listar horários fixos.' });
  }
});

/**
 * Endpoint para remover uma reserva de horário fixo.
 */
export const removerHorarioFixoCliente = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'DELETE' && request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use DELETE ou POST.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    exigirAdministrador(caller);
    const id = (request.query['id'] as string) || (request.body?.id as string);

    const firestore = getFirestore();
    const repo = new FirestoreHorariosFixosRepository(firestore);

    const resultado = await removerHorarioFixoClienteService(id, caller, repo);
    response.status(200).json({
      sucesso: true,
      mensagem: 'Horário fixo removido com sucesso.',
      dados: resultado,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao remover horário fixo:', error);
    response.status(500).json({ error: 'Erro interno ao remover horário fixo.' });
  }
});

/**
 * Endpoint para atualizar uma reserva de horário fixo.
 */
export const atualizarHorarioFixoCliente = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'PUT' && request.method !== 'PATCH' && request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use PUT, PATCH ou POST.' });
    return;
  }

  try {
    const caller = await extrairUsuarioAutenticado(request.headers.authorization);
    exigirAdministrador(caller);
    const firestore = getFirestore();
    const repo = new FirestoreHorariosFixosRepository(firestore);

    const atualizado = await atualizarHorarioFixoClienteService(request.body, caller, repo);
    response.status(200).json({
      sucesso: true,
      mensagem: 'Horário fixo atualizado com sucesso.',
      dados: atualizado,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados inválidos para horário fixo.', detalhes: error });
      return;
    }
    console.error('Erro ao atualizar horário fixo:', error);
    response.status(500).json({ error: 'Erro interno ao atualizar horário fixo.' });
  }
});

/**
 * Endpoint para checar disponibilidade de horário considerando bloqueios e clientes fixos.
 */
export const verificarDisponibilidadeHorario = onRequest(
  { cors: true },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Método não permitido. Use POST.' });
      return;
    }

    try {
      const caller = await extrairUsuarioOpcional(request.headers.authorization);
      const { dataHoraInicioIso, dataHoraFimIso, profissionalId } = request.body || {};

      if (!dataHoraInicioIso || !dataHoraFimIso) {
        response
          .status(400)
          .json({ error: 'dataHoraInicioIso e dataHoraFimIso são obrigatórios.' });
        return;
      }

      const firestore = getFirestore();
      const bloqueiosRepo = new FirestoreBloqueiosRepository(firestore);
      const horariosFixosRepo = new FirestoreHorariosFixosRepository(firestore);

      const resultado = await verificarDisponibilidadeAgenda(
        {
          dataHoraInicioIso,
          dataHoraFimIso,
          clienteIdSolicitante: caller?.uid,
          profissionalId,
        },
        bloqueiosRepo,
        horariosFixosRepo,
      );

      response.status(200).json({ dados: resultado });
    } catch (error: unknown) {
      if (responderErroNegocio(response, error)) {
        return;
      }
      console.error('Erro ao verificar disponibilidade de horário:', error);
      response.status(500).json({ error: 'Erro interno ao consultar disponibilidade.' });
    }
  },
);

/**
 * Endpoint para consultar a grade de horários disponíveis para um determinado serviço/duração em uma data.
 * Aplica a duração do serviço e os 30 minutos de organização entre sessões.
 * Leitura pública/autenticada.
 */
export const obterHorariosDisponiveis = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use GET ou POST.' });
    return;
  }

  try {
    const caller = await extrairUsuarioOpcional(request.headers.authorization);
    const firestore = getFirestore();

    const agendamentosRepo = new FirestoreAgendamentosRepository(firestore);
    const bloqueiosRepo = new FirestoreBloqueiosRepository(firestore);
    const horariosFixosRepo = new FirestoreHorariosFixosRepository(firestore);
    const servicosRepo = new FirestoreServicosRepository(firestore);
    const profissionaisRepo = new FirestoreProfissionaisRepository(firestore);

    const params = request.method === 'GET' ? request.query : request.body;

    const resultado = await consultarGradeHorariosDisponiveis(
      params,
      firestore,
      agendamentosRepo,
      bloqueiosRepo,
      horariosFixosRepo,
      servicosRepo,
      caller?.uid,
      profissionaisRepo,
    );

    response.status(200).json({
      sucesso: true,
      dados: resultado,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({
        error: 'Parâmetros de consulta de horários disponíveis inválidos.',
        detalhes: error,
      });
      return;
    }
    console.error('Erro ao consultar horários disponíveis:', error);
    response.status(500).json({ error: 'Erro interno ao consultar horários disponíveis.' });
  }
});

/**
 * Consulta a lista de profissionais da clínica.
 * Endpoint com leitura liberada para clientes e visitantes selecionarem na agenda.
 */
export const obterProfissionais = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const caller = await extrairUsuarioOpcional(request.headers.authorization);
    const firestore = getFirestore();
    const repo = new FirestoreProfissionaisRepository(firestore);

    // Administradora pode consultar inativos com ?apenasAtivos=false; clientes sempre recebem apenas ativos
    const filtrarApenasAtivos = caller?.isAdmin ? request.query['apenasAtivos'] === 'true' : true;
    const lista = await listarProfissionais(repo, filtrarApenasAtivos);

    response.status(200).json({
      sucesso: true,
      dados: lista,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao obter profissionais:', error);
    response.status(500).json({ error: 'Erro interno ao consultar profissionais.' });
  }
});

/**
 * Consulta os detalhes de um profissional específico por ID.
 */
export const obterProfissional = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const id = (request.query['id'] as string) || (request.query['profissionalId'] as string) || '';
    const firestore = getFirestore();
    const repo = new FirestoreProfissionaisRepository(firestore);

    const profissional = await obterProfissionalPorId(id, repo);

    response.status(200).json({
      sucesso: true,
      dados: profissional,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao obter profissional por ID:', error);
    response.status(500).json({ error: 'Erro interno ao consultar profissional.' });
  }
});

/**
 * Cadastra um novo profissional na clínica.
 * Operação restrita à administradora autenticada.
 */
export const cadastrarProfissional = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    exigirAdministrador(user);
    const firestore = getFirestore();
    const repo = new FirestoreProfissionaisRepository(firestore);

    const criado = await cadastrarProfissionalService(request.body, user, repo);

    response.status(201).json({
      sucesso: true,
      mensagem: 'Profissional cadastrado com sucesso.',
      dados: criado,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({ error: 'Dados do profissional inválidos.', detalhes: error });
      return;
    }
    console.error('Erro ao cadastrar profissional:', error);
    response.status(500).json({ error: 'Erro interno ao cadastrar profissional.' });
  }
});

/**
 * Atualiza os dados de um profissional existente.
 * Operação restrita à administradora autenticada.
 */
export const atualizarProfissional = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'PUT' && request.method !== 'PATCH' && request.method !== 'POST') {
    response.status(405).json({ error: 'Método não permitido. Use PUT, PATCH ou POST.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    exigirAdministrador(user);
    const firestore = getFirestore();
    const repo = new FirestoreProfissionaisRepository(firestore);

    const atualizado = await atualizarProfissionalService(request.body, user, repo);

    response.status(200).json({
      sucesso: true,
      mensagem: 'Profissional atualizado com sucesso.',
      dados: atualizado,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      response.status(400).json({
        error: 'Dados de atualização do profissional inválidos.',
        detalhes: error,
      });
      return;
    }
    console.error('Erro ao atualizar profissional:', error);
    response.status(500).json({ error: 'Erro interno ao atualizar profissional.' });
  }
});

/**
 * Vincula ou desvincula um profissional a um procedimento/serviço da clínica.
 * Operação restrita à administradora autenticada.
 */
export const vincularProfissionalAoServicoEndpoint = onRequest(
  { cors: true },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Método não permitido. Use POST.' });
      return;
    }

    try {
      const user = await extrairUsuarioAutenticado(request.headers.authorization);
      exigirAdministrador(user);
      const firestore = getFirestore();
      const servicosRepo = new FirestoreServicosRepository(firestore);
      const profissionaisRepo = new FirestoreProfissionaisRepository(firestore);

      const servicoAtualizado = await vincularProfissionalAoServicoService(
        request.body,
        user,
        servicosRepo,
        profissionaisRepo,
      );

      response.status(200).json({
        sucesso: true,
        mensagem: 'Vínculo do profissional com o serviço atualizado com sucesso.',
        dados: servicoAtualizado,
      });
    } catch (error: unknown) {
      if (responderErroNegocio(response, error)) {
        return;
      }
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        response.status(400).json({ error: 'Parâmetros de vínculo inválidos.', detalhes: error });
        return;
      }
      console.error('Erro ao vincular profissional com serviço:', error);
      response.status(500).json({ error: 'Erro interno ao vincular profissional com serviço.' });
    }
  },
);

/**
 * Lista serviços associados a um determinado profissional.
 * Leitura pública/autenticada.
 */
export const listarServicosProfissional = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const caller = await extrairUsuarioOpcional(request.headers.authorization);
    const profissionalId =
      (request.query['profissionalId'] as string) ||
      (request.query['id'] as string) ||
      'prof-tais-romagnoli';
    const firestore = getFirestore();
    const servicosRepo = new FirestoreServicosRepository(firestore);

    const servicos = await listarServicosCatalogPorProfissional(
      profissionalId,
      caller,
      request.query['apenasAtivos'] === 'true',
      servicosRepo,
    );

    response.status(200).json({
      sucesso: true,
      dados: servicos,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao listar serviços do profissional:', error);
    response.status(500).json({ error: 'Erro interno ao listar serviços do profissional.' });
  }
});

/**
 * Endpoint para salvar ou atualizar a ficha de anamnese do cliente.
 * Apenas o próprio cliente titular ou a administradora têm permissão de acesso.
 */
export const salvarFichaAnamnese = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST' && request.method !== 'PUT') {
    response.status(405).json({ error: 'Método não permitido. Use POST ou PUT.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);

    const firestore = getFirestore();
    const repo = new FirestoreAnamneseRepository(firestore);
    const notifRepo = new FirestoreNotificacoesRepository(firestore);

    const payload = request.body || {};
    const clienteId = payload.clienteId || (!user.isAdmin ? user.uid : undefined);
    const dados = payload.dados || payload;

    const fichaSalva = await salvarFichaAnamneseService({
      input: {
        clienteId,
        dados,
        ...(typeof payload.exigeLiberacaoMedica === 'boolean'
          ? { exigeLiberacaoMedica: payload.exigeLiberacaoMedica }
          : {}),
        ...(typeof payload.liberacaoMedicaAprovada === 'boolean'
          ? { liberacaoMedicaAprovada: payload.liberacaoMedicaAprovada }
          : {}),
        ...(typeof payload.liberacaoMedicaObservacoes === 'string'
          ? { liberacaoMedicaObservacoes: payload.liberacaoMedicaObservacoes }
          : {}),
      },
      usuarioAutenticado: user,
      repo,
      notifRepo,
    });

    response.status(200).json({
      sucesso: true,
      mensagem: 'Ficha de anamnese salva com sucesso.',
      dados: fichaSalva,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao salvar ficha de anamnese:', error);
    response.status(500).json({ error: 'Erro interno ao salvar ficha de anamnese.' });
  }
});

/**
 * Endpoint administrativo para registrar ou revogar a liberação médica na ficha de anamnese.
 * Operação restrita exclusivamente à administradora autenticada.
 */
export const atualizarLiberacaoMedica = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'POST' && request.method !== 'PATCH') {
    response.status(405).json({ error: 'Método não permitido. Use POST ou PATCH.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);
    exigirAdministrador(user);

    const firestore = getFirestore();
    const repo = new FirestoreAnamneseRepository(firestore);

    const fichaAtualizada = await registrarLiberacaoMedicaService({
      input: request.body,
      usuarioAutenticado: user,
      repo,
    });

    response.status(200).json({
      sucesso: true,
      mensagem: fichaAtualizada.liberacaoMedicaAprovada
        ? 'Liberação médica registrada com sucesso.'
        : 'Status de liberação médica atualizado com sucesso.',
      dados: fichaAtualizada,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao atualizar liberação médica:', error);
    response.status(500).json({ error: 'Erro interno ao atualizar liberação médica.' });
  }
});

/**
 * Endpoint para consultar a ficha de anamnese de um cliente.
 * Apenas o próprio cliente titular ou a administradora têm permissão de acesso.
 */
export const obterFichaAnamnese = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization);

    const clienteId =
      (request.query['clienteId'] as string) ||
      (request.query['uid'] as string) ||
      (!user.isAdmin ? user.uid : '');

    if (!clienteId) {
      response
        .status(400)
        .json({ error: 'O parâmetro clienteId é obrigatório para administradores.' });
      return;
    }

    const firestore = getFirestore();
    const repo = new FirestoreAnamneseRepository(firestore);

    const ficha = await obterFichaAnamneseService({
      clienteId,
      usuarioAutenticado: user,
      repo,
    });

    if (!ficha) {
      response
        .status(404)
        .json({ error: 'Ficha de anamnese não encontrada para o cliente informado.' });
      return;
    }

    response.status(200).json({
      sucesso: true,
      dados: ficha,
    });
  } catch (error: unknown) {
    if (responderErroNegocio(response, error)) {
      return;
    }
    console.error('Erro ao consultar ficha de anamnese:', error);
    response.status(500).json({ error: 'Erro interno ao consultar ficha de anamnese.' });
  }
});
