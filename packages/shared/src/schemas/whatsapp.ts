import { z } from 'zod';
import { formatarDataHoraNotificacao } from './notificacao.js';

export const tipoMensagemAssistidaWhatsappSchema = z.enum(['lembrete', 'duvida', 'confirmacao']);
export type TipoMensagemAssistidaWhatsapp = z.infer<typeof tipoMensagemAssistidaWhatsappSchema>;

export const gerarMensagemAssistidaWhatsappInputSchema = z.object({
  clienteNome: z.string().trim().min(1, 'Nome do cliente é obrigatório.'),
  clienteTelefone: z.string().trim().min(8, 'Telefone deve conter no mínimo 8 dígitos.'),
  servicoNome: z.string().trim().min(1, 'Nome do procedimento é obrigatório.'),
  dataHoraInicio: z.string().trim().min(1, 'Data e horário de início são obrigatórios.'),
  profissionalNome: z.string().trim().optional(),
  tipo: tipoMensagemAssistidaWhatsappSchema.default('lembrete'),
  agendamentoId: z.string().trim().optional(),
});

export type GerarMensagemAssistidaWhatsappInput = z.infer<
  typeof gerarMensagemAssistidaWhatsappInputSchema
>;

export const resultadoMensagemAssistidaWhatsappSchema = z.object({
  texto: z.string().min(1),
  link: z.string().url(),
  telefoneFormatado: z.string().min(8),
  clienteNome: z.string(),
  servicoNome: z.string(),
  dataHoraFormatada: z.string(),
  tipo: tipoMensagemAssistidaWhatsappSchema,
});

export type ResultadoMensagemAssistidaWhatsapp = z.infer<
  typeof resultadoMensagemAssistidaWhatsappSchema
>;

/**
 * Normaliza número de telefone para formato internacional exigido pelo WhatsApp (wa.me)
 * Adiciona DDI 55 do Brasil caso não esteja presente.
 */
export function formatarTelefoneWhatsapp(telefone: string): string {
  if (!telefone) return '';
  const digits = telefone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

/**
 * Gera URL segura wa.me para abertura direta do WhatsApp
 */
export function gerarLinkWhatsapp(telefone: string, mensagem: string): string {
  const foneLimpo = formatarTelefoneWhatsapp(telefone);
  if (!foneLimpo) return '';
  return `https://wa.me/${foneLimpo}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * Monta texto da mensagem pronta para envio assistido conforme o tipo
 * e as diretrizes acolhedoras do Brandbook da clínica.
 */
export function montarTextoMensagemAssistida(params: {
  clienteNome: string;
  servicoNome: string;
  dataHoraInicio: string;
  profissionalNome?: string;
  tipo?: TipoMensagemAssistidaWhatsapp;
}): { texto: string; dataHoraFormatada: string } {
  const dataHoraFormatada = formatarDataHoraNotificacao(params.dataHoraInicio);
  const profissional = params.profissionalNome ? ` com ${params.profissionalNome}` : '';
  const tipo = params.tipo ?? 'lembrete';

  let texto = '';

  switch (tipo) {
    case 'confirmacao':
      texto =
        `Olá, ${params.clienteNome}! ` +
        `Confirmamos com alegria seu agendamento de ${params.servicoNome}${profissional} para ${dataHoraFormatada} ` +
        `na Clínica Taís Romagnoli.\n\n` +
        `Seu sinal de reserva foi recebido. Venha com roupas confortáveis e chegue com 10 minutos de antecedência ` +
        `para aproveitar ao máximo sua experiência. Esperamos por você!`;
      break;

    case 'duvida':
      texto =
        `Olá Taís! Gostaria de tirar uma dúvida sobre o meu agendamento de ${params.servicoNome} ` +
        `marcado para ${dataHoraFormatada}.`;
      break;

    case 'lembrete':
    default:
      texto =
        `Olá, ${params.clienteNome}! ` +
        `Lembramos que seu atendimento de ${params.servicoNome}${profissional} está agendado para ${dataHoraFormatada} ` +
        `na Clínica Taís Romagnoli.\n\n` +
        `🌸 Recomendação: venha com roupas confortáveis para desfrutar do seu momento de relaxamento e autocuidado com tranquilidade.\n\n` +
        `⏱️ Política de reagendamento: caso necessite alterar seu horário, solicitamos aviso prévio com no mínimo 3 horas de antecedência.\n\n` +
        `Qualquer dúvida, estamos à disposição. Esperamos por você!`;
      break;
  }

  return { texto, dataHoraFormatada };
}

/**
 * Função utilitária completa para gerar a mensagem assistida com texto, link e telefone
 */
export function montarMensagemAssistidaWhatsappCompleta(
  input: GerarMensagemAssistidaWhatsappInput,
): ResultadoMensagemAssistidaWhatsapp {
  const validado = gerarMensagemAssistidaWhatsappInputSchema.parse(input);
  const { texto, dataHoraFormatada } = montarTextoMensagemAssistida(validado);
  const telefoneFormatado = formatarTelefoneWhatsapp(validado.clienteTelefone);
  const link = gerarLinkWhatsapp(validado.clienteTelefone, texto);

  return {
    texto,
    link,
    telefoneFormatado,
    clienteNome: validado.clienteNome,
    servicoNome: validado.servicoNome,
    dataHoraFormatada,
    tipo: validado.tipo,
  };
}
