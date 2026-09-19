import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { getHealthStatus } from './core/health-status.js';
import { obterHorarios, salvarHorarios } from './modules/horarios/horarios-service.js';

initializeApp();

export { obterHorarios, salvarHorarios } from './modules/horarios/horarios-service.js';

export const healthCheck = onRequest({ cors: false }, (_request, response) => {
  response.status(200).json(getHealthStatus());
});

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

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Acesso não autenticado. Forneça o token Bearer.' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      response.status(401).json({ error: 'Token de autenticação ausente.' });
      return;
    }

    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      const isAdmin = decoded['admin'] === true || decoded['role'] === 'admin';

      if (!isAdmin) {
        response.status(403).json({
          error:
            'Acesso negado. Apenas a administradora possui permissão para alterar os horários.',
        });
        return;
      }

      const firestore = getFirestore();
      const resultado = await salvarHorarios(firestore, request.body, decoded.uid);
      response.status(200).json({
        mensagem: 'Horários de funcionamento atualizados com sucesso.',
        dados: resultado,
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        response.status(400).json({ error: 'Dados inválidos.', detalhes: error });
        return;
      }
      console.error('Erro ao atualizar horários de funcionamento:', error);
      response.status(500).json({ error: 'Erro interno ao salvar horários de funcionamento.' });
    }
  },
);
