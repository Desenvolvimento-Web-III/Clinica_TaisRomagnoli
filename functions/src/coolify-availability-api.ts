import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FirestoreAgendamentosRepository } from './modules/agendamentos/agendamentos-repository.js';
import { FirestoreBloqueiosRepository } from './modules/agenda/bloqueios-repository.js';
import { FirestoreHorariosFixosRepository } from './modules/agenda/horarios-fixos-repository.js';
import { FirestoreProfissionaisRepository } from './modules/profissionais/profissionais-repository.js';
import { FirestoreServicosRepository } from './modules/servicos/servicos-repository.js';
import {
  consultarGradeHorariosDisponiveis,
  HorariosBusinessError,
} from './modules/horarios/horarios-service.js';

interface ServiceAccountJson {
  project_id?: unknown;
  client_email?: unknown;
  private_key?: unknown;
}

function createFirestore() {
  if (process.env['FIRESTORE_EMULATOR_HOST']) {
    const projectId = process.env['GCLOUD_PROJECT'] ?? 'demo-clinica-local';
    return getFirestore(initializeApp({ projectId }));
  }

  const rawServiceAccount = process.env['FIREBASE_SERVICE_ACCOUNT_JSON'];
  if (!rawServiceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não foi configurada.');
  }

  let serviceAccount: ServiceAccountJson;
  try {
    serviceAccount = JSON.parse(rawServiceAccount) as ServiceAccountJson;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não contém um JSON válido.');
  }

  if (
    typeof serviceAccount.project_id !== 'string' ||
    typeof serviceAccount.client_email !== 'string' ||
    typeof serviceAccount.private_key !== 'string'
  ) {
    throw new Error('A credencial Firebase não contém os campos obrigatórios.');
  }

  const app = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    projectId: serviceAccount.project_id,
  });

  return getFirestore(app);
}

const firestore = createFirestore();
const allowedOrigins = new Set(
  (process.env['CORS_ALLOWED_ORIGINS'] ?? 'https://clinica.kndevs.tech,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

function applyCors(request: IncomingMessage, response: ServerResponse): boolean {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    sendJson(response, 403, { error: 'Origem não autorizada.' });
    return false;
  }

  response.setHeader('Vary', 'Origin');
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Max-Age', '3600');
  return true;
}

const server = createServer(async (request, response) => {
  if (!applyCors(request, response)) return;

  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }

  const url = new URL(request.url ?? '/', 'http://localhost');

  if (url.pathname === '/health' && request.method === 'GET') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (url.pathname !== '/obterHorariosDisponiveis') {
    sendJson(response, 404, { error: 'Rota não encontrada.' });
    return;
  }

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET, OPTIONS');
    sendJson(response, 405, { error: 'Método não permitido. Use GET.' });
    return;
  }

  try {
    const params = Object.fromEntries(url.searchParams.entries());
    const agendamentosRepo = new FirestoreAgendamentosRepository(firestore);
    const bloqueiosRepo = new FirestoreBloqueiosRepository(firestore);
    const horariosFixosRepo = new FirestoreHorariosFixosRepository(firestore);
    const servicosRepo = new FirestoreServicosRepository(firestore);
    const profissionaisRepo = new FirestoreProfissionaisRepository(firestore);

    const resultado = await consultarGradeHorariosDisponiveis(
      params,
      firestore,
      agendamentosRepo,
      bloqueiosRepo,
      horariosFixosRepo,
      servicosRepo,
      undefined,
      profissionaisRepo,
      new Date(),
    );

    sendJson(response, 200, { sucesso: true, dados: resultado });
  } catch (error) {
    if (error instanceof HorariosBusinessError) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }

    if (error instanceof Error && error.name === 'ZodError') {
      sendJson(response, 400, { error: 'Parâmetros de consulta de horários inválidos.' });
      return;
    }

    console.error('Erro ao consultar disponibilidade no serviço Coolify:', error);
    sendJson(response, 500, { error: 'Erro interno ao consultar disponibilidade.' });
  }
});

const port = Number(process.env['PORT'] ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser um número entre 1 e 65535.');
}

server.listen(port, '0.0.0.0', () => {
  console.info(`API de disponibilidade iniciada na porta ${port}.`);
});
