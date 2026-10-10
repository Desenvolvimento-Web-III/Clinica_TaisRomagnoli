import {
  gerarConteudoAvisoConfirmacao,
  gerarConteudoAvisoAlteracao,
  gerarConteudoAvisoCancelamento,
  gerarConteudoAvisoLembrete,
  type Agendamento,
  type NotificacaoInterna,
} from '@clinica/shared';
import type {
  NotificacoesRepository,
  ListarNotificacoesOptions,
} from './notificacoes-repository.js';

export class NotificacaoBusinessError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'NotificacaoBusinessError';
  }
}

/**
 * Cria e salva uma notificação de confirmação para o agendamento
 */
export async function criarNotificacaoConfirmacao(
  agendamento: Agendamento,
  repo: NotificacoesRepository,
): Promise<NotificacaoInterna> {
  const conteudo = gerarConteudoAvisoConfirmacao({
    clienteNome: agendamento.clienteNome,
    servicoNome: agendamento.servicoNome,
    dataHoraInicio: agendamento.dataHoraInicio,
    profissionalNome: agendamento.profissionalNome,
  });

  const agora = new Date().toISOString();
  const notificacao: NotificacaoInterna = {
    id: `notif-conf-${agendamento.id}-${Date.now()}`,
    destinatarioId: agendamento.clienteId,
    destinatarioTipo: 'cliente',
    agendamentoId: agendamento.id,
    evento: 'confirmacao',
    tipo: conteudo.tipo,
    titulo: conteudo.titulo,
    mensagem: conteudo.mensagem,
    lida: false,
    createdAt: agora,
    link: `/agendamentos`,
    metadados: {
      servicoId: agendamento.servicoId,
      dataHoraInicio: agendamento.dataHoraInicio,
      profissionalId: agendamento.profissionalId,
      valorTotalEmCentavos: agendamento.valorTotalEmCentavos,
      valorSinalEmCentavos: agendamento.valorSinalEmCentavos,
    },
  };

  return repo.salvar(notificacao);
}

/**
 * Cria e salva uma notificação de alteração / reagendamento
 */
export async function criarNotificacaoAlteracao(
  agendamento: Agendamento,
  dataHoraAnteriorIso: string,
  repo: NotificacoesRepository,
  motivo?: string,
): Promise<NotificacaoInterna> {
  const conteudo = gerarConteudoAvisoAlteracao({
    clienteNome: agendamento.clienteNome,
    servicoNome: agendamento.servicoNome,
    novaDataHoraInicio: agendamento.dataHoraInicio,
    dataHoraAnterior: dataHoraAnteriorIso,
    profissionalNome: agendamento.profissionalNome,
  });

  const agora = new Date().toISOString();
  const notificacao: NotificacaoInterna = {
    id: `notif-alt-${agendamento.id}-${Date.now()}`,
    destinatarioId: agendamento.clienteId,
    destinatarioTipo: 'cliente',
    agendamentoId: agendamento.id,
    evento: 'alteracao',
    tipo: conteudo.tipo,
    titulo: conteudo.titulo,
    mensagem: conteudo.mensagem,
    lida: false,
    createdAt: agora,
    link: `/agendamentos`,
    metadados: {
      novaDataHoraInicio: agendamento.dataHoraInicio,
      dataHoraAnterior: dataHoraAnteriorIso,
      motivo: motivo || undefined,
    },
  };

  return repo.salvar(notificacao);
}

/**
 * Cria e salva uma notificação de cancelamento com a regra do sinal aplicada
 */
export async function criarNotificacaoCancelamento(
  agendamento: Agendamento,
  sinalRetido: boolean,
  repo: NotificacoesRepository,
  motivo?: string,
): Promise<NotificacaoInterna> {
  const conteudo = gerarConteudoAvisoCancelamento({
    clienteNome: agendamento.clienteNome,
    servicoNome: agendamento.servicoNome,
    dataHoraInicio: agendamento.dataHoraInicio,
    sinalRetido,
    motivo,
  });

  const agora = new Date().toISOString();
  const notificacao: NotificacaoInterna = {
    id: `notif-canc-${agendamento.id}-${Date.now()}`,
    destinatarioId: agendamento.clienteId,
    destinatarioTipo: 'cliente',
    agendamentoId: agendamento.id,
    evento: 'cancelamento',
    tipo: conteudo.tipo,
    titulo: conteudo.titulo,
    mensagem: conteudo.mensagem,
    lida: false,
    createdAt: agora,
    link: `/agendamentos`,
    metadados: {
      sinalRetido,
      motivo: motivo || undefined,
      valorSinalEmCentavos: agendamento.valorSinalEmCentavos,
    },
  };

  return repo.salvar(notificacao);
}

/**
 * Cria e salva uma notificação de lembrete prévio de sessão
 */
export async function criarNotificacaoLembrete(
  agendamento: Agendamento,
  repo: NotificacoesRepository,
): Promise<NotificacaoInterna> {
  const conteudo = gerarConteudoAvisoLembrete({
    clienteNome: agendamento.clienteNome,
    servicoNome: agendamento.servicoNome,
    dataHoraInicio: agendamento.dataHoraInicio,
    profissionalNome: agendamento.profissionalNome,
  });

  const agora = new Date().toISOString();
  const notificacao: NotificacaoInterna = {
    id: `notif-lemb-${agendamento.id}-${Date.now()}`,
    destinatarioId: agendamento.clienteId,
    destinatarioTipo: 'cliente',
    agendamentoId: agendamento.id,
    evento: 'lembrete',
    tipo: conteudo.tipo,
    titulo: conteudo.titulo,
    mensagem: conteudo.mensagem,
    lida: false,
    createdAt: agora,
    link: `/agendamentos`,
    metadados: {
      dataHoraInicio: agendamento.dataHoraInicio,
      profissionalNome: agendamento.profissionalNome,
    },
  };

  return repo.salvar(notificacao);
}

/**
 * Processa agendamentos futuros para gerar lembretes automáticos para clientes
 * sem duplicidade de envio
 */
export async function processarLembretesAgendamentos(
  agendamentos: Agendamento[],
  repo: NotificacoesRepository,
  horasAntecedencia = 24,
  agora = new Date(),
): Promise<NotificacaoInterna[]> {
  const agoraMs = agora.getTime();
  const limiteMs = agoraMs + horasAntecedencia * 60 * 60 * 1000;
  const geradas: NotificacaoInterna[] = [];

  for (const agendamento of agendamentos) {
    // Processa apenas agendamentos confirmados ou pendentes
    if (agendamento.status === 'cancelado' || agendamento.status === 'concluido') {
      continue;
    }

    const inicioMs = new Date(agendamento.dataHoraInicio).getTime();
    // Se o agendamento ocorrer no futuro e dentro da janela de antecedência
    if (inicioMs > agoraMs && inicioMs <= limiteMs) {
      // Verifica se já existe lembrete enviado para este agendamento
      const existentes = await repo.listarPorAgendamentoEEvento(agendamento.id, 'lembrete');
      if (existentes.length === 0) {
        const lembrete = await criarNotificacaoLembrete(agendamento, repo);
        geradas.push(lembrete);
      }
    }
  }

  return geradas;
}

/**
 * Consulta as notificações do cliente autenticado
 */
export async function listarNotificacoesDoCliente(
  clienteId: string,
  options: ListarNotificacoesOptions,
  repo: NotificacoesRepository,
): Promise<NotificacaoInterna[]> {
  return repo.listarPorDestinatario(clienteId, options);
}

/**
 * Marca uma notificação como lida garantindo a titularidade
 */
export async function marcarNotificacaoComoLida(
  notificacaoId: string,
  clienteId: string,
  repo: NotificacoesRepository,
): Promise<NotificacaoInterna> {
  const notificacao = await repo.buscarPorId(notificacaoId, clienteId);
  if (!notificacao) {
    throw new NotificacaoBusinessError('Notificação não encontrada.', 404);
  }

  if (notificacao.destinatarioId !== clienteId) {
    throw new NotificacaoBusinessError('Acesso negado para modificar esta notificação.', 403);
  }

  const atualizada = await repo.marcarComoLida(notificacaoId, clienteId);
  if (!atualizada) {
    throw new NotificacaoBusinessError('Erro ao atualizar status da notificação.', 500);
  }

  return atualizada;
}
