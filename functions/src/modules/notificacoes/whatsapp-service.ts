import {
  gerarMensagemAssistidaWhatsappInputSchema,
  montarMensagemAssistidaWhatsappCompleta,
  type GerarMensagemAssistidaWhatsappInput,
  type ResultadoMensagemAssistidaWhatsapp,
} from '@clinica/shared';
import type { AgendamentosRepository } from '../agendamentos/agendamentos-repository.js';

export class WhatsappBusinessError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'WhatsappBusinessError';
  }
}

export interface GerarMensagemAssistidaContext {
  agendamentosRepo?: AgendamentosRepository;
  requesterId?: string;
  requesterIsAdmin?: boolean;
}

/**
 * Serviço de Backend para geração de mensagens assistidas do WhatsApp
 * Monta texto acolhedor e link seguro wa.me com cliente, serviço, data e horário.
 */
export async function gerarMensagemAssistidaWhatsappService(
  input: Partial<GerarMensagemAssistidaWhatsappInput> & { agendamentoId?: string },
  context?: GerarMensagemAssistidaContext,
): Promise<ResultadoMensagemAssistidaWhatsapp> {
  let clienteNome = input.clienteNome;
  let clienteTelefone = input.clienteTelefone;
  let servicoNome = input.servicoNome;
  let dataHoraInicio = input.dataHoraInicio;
  let profissionalNome = input.profissionalNome;
  const tipo = input.tipo ?? 'lembrete';

  // Se agendamentoId foi fornecido e há repositório disponível, preenche dados do agendamento
  if (input.agendamentoId && context?.agendamentosRepo) {
    const agendamento = await context.agendamentosRepo.buscarPorId(input.agendamentoId);
    if (!agendamento) {
      throw new WhatsappBusinessError('Agendamento não encontrado.', 404);
    }

    // Verificação de titularidade (clientes só podem gerar para seus próprios agendamentos)
    if (
      context.requesterId &&
      !context.requesterIsAdmin &&
      agendamento.clienteId !== context.requesterId
    ) {
      throw new WhatsappBusinessError('Acesso negado para gerar mensagem deste agendamento.', 403);
    }

    clienteNome = clienteNome || agendamento.clienteNome || 'Cliente';
    clienteTelefone = clienteTelefone || agendamento.clienteTelefone || '11999999999';
    servicoNome = servicoNome || agendamento.servicoNome;
    dataHoraInicio = dataHoraInicio || agendamento.dataHoraInicio;
    profissionalNome = profissionalNome || agendamento.profissionalNome;
  }

  if (!clienteNome) {
    throw new WhatsappBusinessError('Nome do cliente é obrigatório.', 400);
  }
  if (!clienteTelefone) {
    throw new WhatsappBusinessError('Telefone do cliente é obrigatório.', 400);
  }
  if (!servicoNome) {
    throw new WhatsappBusinessError('Nome do serviço é obrigatório.', 400);
  }
  if (!dataHoraInicio) {
    throw new WhatsappBusinessError('Data e horário do atendimento são obrigatórios.', 400);
  }

  const payloadCompleto: GerarMensagemAssistidaWhatsappInput = {
    clienteNome,
    clienteTelefone,
    servicoNome,
    dataHoraInicio,
    profissionalNome,
    tipo,
    agendamentoId: input.agendamentoId,
  };

  const validado = gerarMensagemAssistidaWhatsappInputSchema.safeParse(payloadCompleto);
  if (!validado.success) {
    const msg = validado.error.issues.map((i) => i.message).join('; ');
    throw new WhatsappBusinessError(msg, 400);
  }

  return montarMensagemAssistidaWhatsappCompleta(validado.data);
}
