import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAuth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  alterarAgendamentoInputSchema,
  atualizarStatusAgendamentoInputSchema,
  cancelarAgendamentoInputSchema,
  solicitarAgendamentoInputSchema,
} from '@clinica/shared';
import { AuthError, extrairUsuarioAutenticado } from './middlewares/auth-middleware.js';
import { FirestoreAgendamentosRepository } from './modules/agendamentos/agendamentos-repository.js';
import {
  alterarAgendamentoExistente,
  atualizarStatusAgendamento,
  cancelarAgendamentoExistente,
  solicitarNovoAgendamento,
} from './modules/agendamentos/agendamentos-service.js';
import { FirestoreAnamneseRepository } from './modules/anamnese/anamnese-repository.js';
import {
  AnamneseBusinessError,
  registrarLiberacaoMedicaService,
} from './modules/anamnese/anamnese-service.js';
import { FirestoreAuditoriaRepository } from './modules/auditoria/auditoria-repository.js';
import { listarLogsAuditoria, registrarAuditoria } from './modules/auditoria/auditoria-service.js';
import { FirestoreClientesRepository } from './modules/clientes/clientes-repository.js';
import { calcularRecorrenciaMensalCliente } from './modules/clientes/clientes-service.js';
import { FirestoreBloqueiosRepository } from './modules/agenda/bloqueios-repository.js';
import { FirestoreHorariosFixosRepository } from './modules/agenda/horarios-fixos-repository.js';
import { calcularOitoIndicadoresPainel } from './modules/indicadores/indicadores-service.js';
import { aplicarPoliticaSessaoUnica } from './modules/auth/sessoes-service.js';
import { FirestoreNotificacoesRepository } from './modules/notificacoes/notificacoes-repository.js';
import { FirestoreProfissionaisRepository } from './modules/profissionais/profissionais-repository.js';
import { FirestoreServicosRepository } from './modules/servicos/servicos-repository.js';
import { obterHorarios } from './modules/horarios/horarios-service.js';

const applicationRoutes = new Set([
  '/solicitarAgendamento',
  '/alterarAgendamento',
  '/cancelarAgendamento',
  '/atualizarStatusAgendamento',
  '/atualizarLiberacaoMedica',
  '/iniciarSessaoUnica',
  '/calcularRecorrenciaCliente',
  '/obterPainelIndicadoresAdmin',
  '/listarAuditoriaAdmin',
]);

class RequestBodyError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

export async function handleCoolifyApplicationRoute(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  firestore: Firestore,
): Promise<boolean> {
  if (!applicationRoutes.has(url.pathname)) return false;
  const methods = allowedMethods(url.pathname).split(', ');
  if (!methods.includes(request.method ?? '')) {
    response.setHeader('Allow', allowedMethods(url.pathname));
    sendJson(response, 405, { error: `Método não permitido. Use ${allowedMethods(url.pathname)}.` });
    return true;
  }

  try {
    const user = await extrairUsuarioAutenticado(request.headers.authorization, getAuth());
    const body = request.method === 'GET' ? {} : await readJsonBody(request);

    if (url.pathname === '/solicitarAgendamento' && request.method === 'POST') {
      const parsed = solicitarAgendamentoInputSchema.parse(body);
      const agendamento = await solicitarNovoAgendamento(
        parsed,
        user,
        new FirestoreAgendamentosRepository(firestore),
        new FirestoreNotificacoesRepository(firestore),
        new FirestoreServicosRepository(firestore),
        new FirestoreBloqueiosRepository(firestore),
        new FirestoreHorariosFixosRepository(firestore),
        undefined,
        new FirestoreProfissionaisRepository(firestore),
        new FirestoreAnamneseRepository(firestore),
        new Date(),
        new FirestoreClientesRepository(firestore),
      );
      await writeAudit(request, user, 'agendamento.solicitado', 'agendamentos', agendamento.id, {
        clienteId: agendamento.clienteId,
        servicoId: agendamento.servicoId,
        dataHoraInicio: agendamento.dataHoraInicio,
        status: agendamento.status,
      });
      sendJson(response, 201, { mensagem: 'Agendamento solicitado com sucesso.', dados: agendamento });
      return true;
    }

    if (url.pathname === '/alterarAgendamento' && request.method === 'POST') {
      const parsed = alterarAgendamentoInputSchema.parse(body);
      const agendamentosRepo = new FirestoreAgendamentosRepository(firestore);
      const atual = await agendamentosRepo.buscarPorId(parsed.agendamentoId);
      const agendamento = await alterarAgendamentoExistente(
        parsed,
        user,
        agendamentosRepo,
        new FirestoreNotificacoesRepository(firestore),
        new Date(),
        new FirestoreBloqueiosRepository(firestore),
        new FirestoreHorariosFixosRepository(firestore),
        await obterHorarios(firestore, atual?.profissionalId),
        new FirestoreProfissionaisRepository(firestore),
        new FirestoreServicosRepository(firestore),
      );
      await writeAudit(request, user, 'agendamento.reagendado', 'agendamentos', agendamento.id, {
        dataHoraInicio: agendamento.dataHoraInicio,
        dataHoraFim: agendamento.dataHoraFim,
        status: agendamento.status,
      });
      sendJson(response, 200, { mensagem: 'Agendamento alterado com sucesso.', dados: agendamento });
      return true;
    }

    if (url.pathname === '/cancelarAgendamento' && request.method === 'POST') {
      const parsed = cancelarAgendamentoInputSchema.parse(body);
      const agendamento = await cancelarAgendamentoExistente(
        parsed,
        user,
        new FirestoreAgendamentosRepository(firestore),
        new FirestoreNotificacoesRepository(firestore),
      );
      await writeAudit(
        request,
        user,
        'agendamento.cancelado',
        'agendamentos',
        agendamento.id,
        {
          classificacaoCancelamento: agendamento.classificacaoCancelamento,
          motivoCancelamento: agendamento.motivoCancelamento,
          status: agendamento.status,
        },
      );
      sendJson(response, 200, { mensagem: 'Agendamento cancelado com sucesso.', dados: agendamento });
      return true;
    }

    if (url.pathname === '/atualizarStatusAgendamento' && request.method === 'POST') {
      exigirAdmin(user);
      const parsed = atualizarStatusAgendamentoInputSchema.parse(body);
      const agendamento = await atualizarStatusAgendamento(
        parsed,
        user,
        new FirestoreAgendamentosRepository(firestore),
        new FirestoreNotificacoesRepository(firestore),
        undefined,
        new FirestoreAnamneseRepository(firestore),
        new FirestoreClientesRepository(firestore),
      );
      await writeAudit(request, user, 'agendamento.status_atualizado', 'agendamentos', agendamento.id, {
        status: agendamento.status,
        observacoes: parsed.observacoes,
      });
      sendJson(response, 200, { mensagem: `Status atualizado para '${agendamento.status}'.`, dados: agendamento });
      return true;
    }

    if (url.pathname === '/atualizarLiberacaoMedica' && request.method === 'POST') {
      exigirAdmin(user);
      const ficha = await registrarLiberacaoMedicaService({
        input: body,
        usuarioAutenticado: user,
        repo: new FirestoreAnamneseRepository(firestore),
      });
      await writeAudit(request, user, 'anamnese.liberacao_medica_atualizada', 'anamneses', ficha.clienteId, {
        clienteId: ficha.clienteId,
        liberacaoMedicaAprovada: ficha.liberacaoMedicaAprovada,
        observacoes: ficha.liberacaoMedicaObservacoes,
      });
      sendJson(response, 200, {
        sucesso: true,
        mensagem: ficha.liberacaoMedicaAprovada
          ? 'Liberação médica registrada com sucesso.'
          : 'Status de liberação médica atualizado com sucesso.',
        dados: ficha,
      });
      return true;
    }

    if (url.pathname === '/iniciarSessaoUnica' && request.method === 'POST') {
      const motivo = typeof body['motivo'] === 'string'
        ? body['motivo']
        : 'Início de nova sessão sob política de sessão única';
      const sessionId = typeof body['sessionId'] === 'string' ? body['sessionId'] : undefined;
      const resultado = await aplicarPoliticaSessaoUnica(user, getAuth(), firestore, motivo, sessionId);
      await writeAudit(request, user, 'auth.sessao_unica_iniciada', 'sessoes', user.uid, {
        sessionId,
        motivo,
      });
      sendJson(response, 200, { sucesso: true, mensagem: resultado.mensagem, dados: resultado });
      return true;
    }

    if (url.pathname === '/calcularRecorrenciaCliente' && request.method === 'GET') {
      const targetUid = url.searchParams.get('uid') || user.uid;
      if (targetUid !== user.uid && !user.isAdmin) {
        sendJson(response, 403, { error: 'Você só pode consultar a recorrência da sua própria conta.' });
        return true;
      }
      const recorrencia = await calcularRecorrenciaMensalCliente(
        targetUid,
        new FirestoreClientesRepository(firestore),
        new FirestoreAgendamentosRepository(firestore),
        url.searchParams.get('mesReferencia') ?? undefined,
      );
      sendJson(response, 200, { sucesso: true, dados: recorrencia });
      return true;
    }

    if (url.pathname === '/obterPainelIndicadoresAdmin' && request.method === 'GET') {
      exigirAdmin(user);
      const painel = await calcularOitoIndicadoresPainel(
        new FirestoreAgendamentosRepository(firestore),
        new FirestoreClientesRepository(firestore),
        new FirestoreServicosRepository(firestore),
        {
          dataReferencia: url.searchParams.get('dataReferencia') ?? undefined,
          mesReferencia: url.searchParams.get('mesReferencia') ?? undefined,
          configuracaoHorarios: await obterHorarios(firestore),
        },
      );
      sendJson(response, 200, { sucesso: true, dados: painel });
      return true;
    }

    if (url.pathname === '/listarAuditoriaAdmin' && request.method === 'GET') {
      exigirAdmin(user);
      const limiteRaw = url.searchParams.get('limite');
      const limite = limiteRaw ? Number.parseInt(limiteRaw, 10) : undefined;
      const logs = await listarLogsAuditoria(
        {
          usuarioId: url.searchParams.get('usuarioId') ?? undefined,
          acao: url.searchParams.get('acao') ?? undefined,
          recurso: url.searchParams.get('recurso') ?? undefined,
          recursoId: url.searchParams.get('recursoId') ?? undefined,
          dataInicio: url.searchParams.get('dataInicio') ?? undefined,
          dataFim: url.searchParams.get('dataFim') ?? undefined,
          limite: Number.isInteger(limite) ? limite : undefined,
        },
        new FirestoreAuditoriaRepository(firestore),
      );
      sendJson(response, 200, { sucesso: true, dados: logs });
      return true;
    }

    return false;
  } catch (error) {
    if (error instanceof AuthError || error instanceof AnamneseBusinessError) {
      sendJson(response, error.statusCode, { error: error.message });
      return true;
    }
    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as Error & { statusCode: number }).statusCode;
      if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
        sendJson(response, statusCode, { error: error.message });
        return true;
      }
    }
    if (error instanceof Error && error.name === 'ZodError') {
      sendJson(response, 400, { error: 'Dados da requisição inválidos.' });
      return true;
    }
    if (error instanceof RequestBodyError) {
      sendJson(response, error.statusCode, { error: error.message });
      return true;
    }
    if (error instanceof SyntaxError) {
      sendJson(response, 400, { error: 'O corpo da requisição não contém JSON válido.' });
      return true;
    }
    console.error(`Erro na rota Coolify ${url.pathname}:`, error);
    sendJson(response, 500, { error: 'Erro interno ao processar a solicitação.' });
    return true;
  }
}

function exigirAdmin(user: { isAdmin: boolean }): void {
  if (!user.isAdmin) {
    const error = new Error('Acesso negado. Apenas a administradora pode executar esta operação.') as Error & { statusCode: number };
    error.statusCode = 403;
    throw error;
  }
}

function allowedMethods(path: string): string {
  return path === '/calcularRecorrenciaCliente' ||
    path === '/obterPainelIndicadoresAdmin' ||
    path === '/listarAuditoriaAdmin'
    ? 'GET, OPTIONS'
    : 'POST, OPTIONS';
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > 1_000_000) {
      throw new RequestBodyError('Corpo da requisição excede o limite permitido.', 413);
    }
    chunks.push(buffer);
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SyntaxError('O corpo deve ser um objeto JSON.');
  }
  return parsed as Record<string, unknown>;
}

async function writeAudit(
  request: IncomingMessage,
  user: { uid: string; email?: string; isAdmin: boolean },
  acao: string,
  recurso: string,
  recursoId: string,
  dadosAfetados: Record<string, unknown>,
): Promise<void> {
  try {
    await registrarAuditoria(
      {
        usuarioId: user.uid,
        usuarioEmail: user.email ?? null,
        usuarioRole: user.isAdmin ? 'admin' : 'cliente',
        acao,
        recurso,
        recursoId,
        dadosAfetados,
        ip: request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ?? null,
        userAgent: request.headers['user-agent'] ?? null,
      },
      new FirestoreAuditoriaRepository(),
    );
  } catch (error) {
    console.error('Erro ao gravar auditoria no serviço Coolify:', error);
  }
}
