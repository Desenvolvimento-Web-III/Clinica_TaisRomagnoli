import { z } from 'zod';
import type { ClientNotificationType } from '../types/client-notification.js';
import type { ClassificacaoCancelamento } from '../types/agendamento.js';

export const eventoNotificacaoAgendamentoSchema = z.enum([
  'confirmacao',
  'alteracao',
  'cancelamento',
  'lembrete',
]);

export type EventoNotificacaoAgendamento = z.infer<typeof eventoNotificacaoAgendamentoSchema>;

export const destinatarioTipoSchema = z.enum(['cliente', 'admin']);
export type DestinatarioTipo = z.infer<typeof destinatarioTipoSchema>;

export const notificacaoInternaSchema = z.object({
  id: z.string().min(1, 'ID da notificação é obrigatório.'),
  destinatarioId: z.string().min(1, 'ID do destinatário é obrigatório.'),
  destinatarioTipo: destinatarioTipoSchema,
  agendamentoId: z.string().optional(),
  evento: eventoNotificacaoAgendamentoSchema,
  tipo: z.enum(['agendamento', 'lembrete', 'sistema', 'comunicado']),
  titulo: z.string().min(1).max(150),
  mensagem: z.string().min(1).max(1000),
  lida: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  link: z.string().optional(),
  metadados: z.record(z.string(), z.unknown()).optional(),
});

export type NotificacaoInterna = z.infer<typeof notificacaoInternaSchema>;

export const alterarAgendamentoInputSchema = z.object({
  agendamentoId: z.string().min(1, 'ID do agendamento é obrigatório.'),
  novaDataHoraInicio: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Nova data e hora de início devem ser uma string ISO 8601 válida.',
  }),
  novoProfissionalId: z.string().optional(),
  novoProfissionalNome: z.string().optional(),
  motivo: z.string().max(300, 'Motivo não pode exceder 300 caracteres.').optional(),
});

export type AlterarAgendamentoInput = z.infer<typeof alterarAgendamentoInputSchema>;

export const marcarNotificacaoLidaInputSchema = z.object({
  notificacaoId: z.string().min(1, 'ID da notificação é obrigatório.'),
});

export type MarcarNotificacaoLidaInput = z.infer<typeof marcarNotificacaoLidaInputSchema>;

/**
 * Utilitário de formatação de data/hora em padrão brasileiro acolhedor
 */
export function formatarDataHoraNotificacao(isoString: string): string {
  try {
    const data = new Date(isoString);
    if (isNaN(data.getTime())) return isoString;

    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} às ${horas}:${minutos}`;
  } catch {
    return isoString;
  }
}

/**
 * Gera conteúdo acolhedor para aviso de Confirmação de agendamento
 */
export function gerarConteudoAvisoConfirmacao(params: {
  clienteNome: string;
  servicoNome: string;
  dataHoraInicio: string;
  profissionalNome?: string;
}): { titulo: string; mensagem: string; tipo: ClientNotificationType } {
  const dataFormatada = formatarDataHoraNotificacao(params.dataHoraInicio);
  const profissional = params.profissionalNome ? ` com ${params.profissionalNome}` : '';

  return {
    titulo: `Sessão Confirmada: ${params.servicoNome}`,
    mensagem: `Olá, ${params.clienteNome}! Seu agendamento de ${params.servicoNome}${profissional} está confirmado para ${dataFormatada}. Recomendamos chegar com 10 minutos de antecedência para desfrutar de sua experiência com tranquilidade.`,
    tipo: 'agendamento',
  };
}

/**
 * Gera conteúdo acolhedor para aviso de Alteração de agendamento
 */
export function gerarConteudoAvisoAlteracao(params: {
  clienteNome: string;
  servicoNome: string;
  novaDataHoraInicio: string;
  dataHoraAnterior?: string;
  profissionalNome?: string;
}): { titulo: string; mensagem: string; tipo: ClientNotificationType } {
  const novaDataFormatada = formatarDataHoraNotificacao(params.novaDataHoraInicio);
  const anteriorFormatada = params.dataHoraAnterior
    ? formatarDataHoraNotificacao(params.dataHoraAnterior)
    : undefined;
  const profissional = params.profissionalNome ? ` com ${params.profissionalNome}` : '';

  const detalheAnterior = anteriorFormatada ? ` (anteriormente em ${anteriorFormatada})` : '';

  return {
    titulo: `Agendamento Alterado: ${params.servicoNome}`,
    mensagem: `Olá, ${params.clienteNome}! O horário da sua sessão de ${params.servicoNome}${profissional} foi alterado para ${novaDataFormatada}${detalheAnterior}. Seu sinal de reserva e as preferências foram mantidos.`,
    tipo: 'agendamento',
  };
}

/**
 * Gera conteúdo acolhedor e informativo para aviso de Cancelamento com explicitação da regra do sinal
 * e classificação de antecedência (Brandbook Seção 12.4).
 */
export function gerarConteudoAvisoCancelamento(params: {
  clienteNome: string;
  servicoNome: string;
  dataHoraInicio: string;
  sinalRetido: boolean;
  motivo?: string;
  classificacao?: ClassificacaoCancelamento;
}): { titulo: string; mensagem: string; tipo: ClientNotificationType } {
  const dataFormatada = formatarDataHoraNotificacao(params.dataHoraInicio);
  const isTardio = params.classificacao === 'tardio' || params.sinalRetido;

  const explicacaoSinal = isTardio
    ? 'Como a solicitação ocorreu com menos de 3 horas de antecedência mínima, o cancelamento foi classificado como tardio e o sinal de 30% foi retido conforme a política da clínica. Como faltam menos de três horas para a sessão, o valor do sinal não poderá ser reutilizado.'
    : 'Como a antecedência mínima de 3 horas foi respeitada, o cancelamento foi classificado no prazo e o valor do seu sinal de 30% permanece disponível como crédito para reagendamento futuro. Você pode usar o valor do sinal em um novo agendamento.';

  const motivoTexto = params.motivo ? ` Motivo informado: "${params.motivo}".` : '';

  return {
    titulo: `Agendamento Cancelado: ${params.servicoNome}`,
    mensagem: `Olá, ${params.clienteNome}. Seu agendamento de ${params.servicoNome} previsto para ${dataFormatada} foi cancelado.${motivoTexto} ${explicacaoSinal}`,
    tipo: 'agendamento',
  };
}

/**
 * Gera conteúdo acolhedor para aviso de Lembrete prévio de sessão
 */
export function gerarConteudoAvisoLembrete(params: {
  clienteNome: string;
  servicoNome: string;
  dataHoraInicio: string;
  profissionalNome?: string;
}): { titulo: string; mensagem: string; tipo: ClientNotificationType } {
  const dataFormatada = formatarDataHoraNotificacao(params.dataHoraInicio);
  const profissional = params.profissionalNome ? ` com ${params.profissionalNome}` : '';

  return {
    titulo: `Lembrete de Sessão: ${params.servicoNome}`,
    mensagem: `Olá, ${params.clienteNome}! Lembramos que seu atendimento de ${params.servicoNome}${profissional} está agendado para ${dataFormatada}. Venha com roupas confortáveis e prepare-se para o seu momento de relaxamento e bem-estar.`,
    tipo: 'lembrete',
  };
}
