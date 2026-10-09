import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { getHealthStatus } from './core/health-status.js';
import { obterHorarios, salvarHorarios } from './modules/horarios/horarios-service.js';
import {
  solicitarNovoAgendamento,
  cancelarAgendamentoExistente,
  listarAgendamentos,
  AgendamentoBusinessError,
} from './modules/agendamentos/agendamentos-service.js';
import { FirestoreAgendamentosRepository } from './modules/agendamentos/agendamentos-repository.js';

initializeApp();

export { obterHorarios, salvarHorarios } from './modules/horarios/horarios-service.js';
export {
  solicitarNovoAgendamento,
  cancelarAgendamentoExistente,
  listarAgendamentos,
} from './modules/agendamentos/agendamentos-service.js';
export {
  FirestoreAgendamentosRepository,
  InMemoryAgendamentosRepository,
} from './modules/agendamentos/agendamentos-repository.js';

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

    const agendamento = await solicitarNovoAgendamento(request.body, user, repo);
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
 * Endpoint para cancelar um agendamento aplicando a regra de antecedência mínima
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

    const agendamento = await cancelarAgendamentoExistente(request.body, user, repo);
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
