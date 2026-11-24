import {
  solicitarCobrancaSinalInputSchema,
  confirmarPagamentoSinalInputSchema,
  calcularCobrancaSinal,
  gerarDadosCobrancaSinal,
  type CobrancaSinal,
  type StatusPagamento,
} from '@clinica/shared';
import type { PagamentosRepository } from './pagamentos-repository.js';
import type { ServicosRepository } from '../servicos/servicos-repository.js';
import type { AgendamentosRepository } from '../agendamentos/agendamentos-repository.js';
import type { AuditoriaRepository } from '../auditoria/auditoria-repository.js';

export interface UserContext {
  uid: string;
  nome: string;
  email?: string;
  telefone?: string;
  isAdmin: boolean;
}

export class PagamentoBusinessError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'PagamentoBusinessError';
  }
}

/**
 * Cria a cobrança do sinal de 30% com base no valor do serviço solicitado.
 * Valida o catálogo de serviços, calcula o valor proporcional e gera as instruções simuladas de pagamento.
 */
export async function gerarCobrancaSinalService(
  input: unknown,
  user: UserContext,
  pagamentosRepo: PagamentosRepository,
  servicosRepo?: ServicosRepository,
  agendamentosRepo?: AgendamentosRepository,
  auditoriaRepo?: AuditoriaRepository,
): Promise<CobrancaSinal> {
  const parsed = solicitarCobrancaSinalInputSchema.parse(input);

  // 1. Controle de acesso: cliente comum só pode gerar cobrança em seu próprio nome
  if (parsed.clienteId && parsed.clienteId !== user.uid && !user.isAdmin) {
    throw new PagamentoBusinessError(
      'Acesso negado: apenas a administradora pode gerar cobrança para outro cliente.',
      403,
    );
  }

  const clienteIdAlvo = user.isAdmin && parsed.clienteId ? parsed.clienteId : user.uid;
  const clienteNomeAlvo =
    user.isAdmin && parsed.clienteId && parsed.clienteId !== user.uid
      ? parsed.clienteNome || 'Cliente presencial'
      : user.nome;
  const clienteEmailAlvo = clienteIdAlvo === user.uid ? user.email : parsed.clienteEmail;

  // 2. Validação do procedimento e obtenção do valor real do serviço
  let servicoNomeFinal = parsed.servicoNome || 'Procedimento da Clínica';
  let valorTotalEmCentavos = parsed.valorTotalEmCentavos || 0;

  if (servicosRepo) {
    const servico = await servicosRepo.buscarPorId(parsed.servicoId);
    if (!servico) {
      throw new PagamentoBusinessError('Procedimento selecionado não encontrado no catálogo.', 404);
    }
    if (!servico.ativo) {
      throw new PagamentoBusinessError(
        'O procedimento selecionado está inativo e não aceita novos pagamentos de sinal.',
        422,
      );
    }
    servicoNomeFinal = servico.nome;
    const precoOficialCentavos = servico.precoEmCentavos ?? Math.round(servico.preco * 100);
    valorTotalEmCentavos = precoOficialCentavos;
  } else if (!valorTotalEmCentavos || valorTotalEmCentavos < 100) {
    throw new PagamentoBusinessError(
      'Valor total do serviço é obrigatório e deve ser de pelo menos R$ 1,00.',
      400,
    );
  }

  // 3. Validação opcional de agendamento vinculado
  if (parsed.agendamentoId && agendamentosRepo) {
    const agendamento = await agendamentosRepo.buscarPorId(parsed.agendamentoId);
    if (!agendamento) {
      throw new PagamentoBusinessError('Agendamento vinculado não encontrado.', 404);
    }
    if (!user.isAdmin && agendamento.clienteId !== clienteIdAlvo) {
      throw new PagamentoBusinessError(
        'Acesso negado: o agendamento informado pertence a outro cliente.',
        403,
      );
    }
  }

  // 4. Cálculo do sinal de 30% com base no valor do serviço
  const calculo = calcularCobrancaSinal(valorTotalEmCentavos, 30);
  const cobrancaId = `cob-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 5. Geração de instruções e códigos de pagamento
  const dadosCobranca = gerarDadosCobrancaSinal({
    cobrancaId,
    metodoPagamento: parsed.metodoPagamento,
    valorSinalEmCentavos: calculo.valorSinalEmCentavos,
    servicoNome: servicoNomeFinal,
  });

  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + 24 * 60 * 60 * 1000); // 24h de validade padrão

  // Status inicial: se for cartão com simulação de autorização imediata, ou 'pendente' para pix/boleto
  const statusInicial: StatusPagamento = parsed.metodoPagamento === 'cartao' ? 'pago' : 'pendente';

  const cobranca: CobrancaSinal = {
    id: cobrancaId,
    clienteId: clienteIdAlvo,
    clienteNome: clienteNomeAlvo,
    clienteEmail: clienteEmailAlvo,
    servicoId: parsed.servicoId,
    servicoNome: servicoNomeFinal,
    agendamentoId: parsed.agendamentoId,
    valorTotalEmCentavos: calculo.valorTotalEmCentavos,
    percentualSinal: calculo.percentualSinal,
    valorSinalEmCentavos: calculo.valorSinalEmCentavos,
    saldoRestanteEmCentavos: calculo.saldoRestanteEmCentavos,
    metodoPagamento: parsed.metodoPagamento,
    status: statusInicial,
    dadosCobranca,
    expiraEmIso: expiraEm.toISOString(),
    createdAt: agora.toISOString(),
    updatedAt: agora.toISOString(),
    pagoEm: statusInicial === 'pago' ? agora.toISOString() : undefined,
    observacoes: parsed.observacoes,
  };

  const salvo = await pagamentosRepo.salvar(cobranca);

  // 6. Registro de auditoria administrativa se repositório fornecido
  if (auditoriaRepo) {
    try {
      await auditoriaRepo.salvar({
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        usuarioId: user.uid,
        usuarioEmail: user.email || 'sistema@clinicataisromagnoli.com.br',
        usuarioRole: user.isAdmin ? 'admin' : 'cliente',
        acao: 'pagamento.cobranca_gerada',
        recurso: 'pagamentos',
        recursoId: salvo.id,
        dadosAfetados: {
          detalhes: `Cobrança de sinal de 30% (R$ ${(salvo.valorSinalEmCentavos / 100).toFixed(2)}) gerada para ${salvo.servicoNome}`,
          servicoId: salvo.servicoId,
          valorTotalEmCentavos: salvo.valorTotalEmCentavos,
          valorSinalEmCentavos: salvo.valorSinalEmCentavos,
          metodoPagamento: salvo.metodoPagamento,
          status: salvo.status,
        },
        dataHora: agora.toISOString(),
      });
    } catch (auditoriaErr) {
      console.warn('Falha silenciosa ao registrar auditoria de cobrança:', auditoriaErr);
    }
  }

  return salvo;
}

/**
 * Consulta os detalhes de uma cobrança gerada por ID com verificação estrita de propriedade.
 */
export async function obterCobrancaSinalService(
  cobrancaId: string,
  user: UserContext,
  pagamentosRepo: PagamentosRepository,
): Promise<CobrancaSinal> {
  if (!cobrancaId) {
    throw new PagamentoBusinessError('Identificador da cobrança é obrigatório.', 400);
  }

  const cobranca = await pagamentosRepo.buscarPorId(cobrancaId);
  if (!cobranca) {
    throw new PagamentoBusinessError('Cobrança de sinal não encontrada.', 404);
  }

  if (!user.isAdmin && cobranca.clienteId !== user.uid) {
    throw new PagamentoBusinessError('Acesso negado para consultar esta cobrança.', 403);
  }

  return cobranca;
}

/**
 * Lista as cobranças e pagamentos de um cliente específico.
 * Apenas o próprio cliente ou a administradora têm permissão de consulta.
 */
export async function listarPagamentosClienteService(
  clienteIdAlvo: string,
  user: UserContext,
  pagamentosRepo: PagamentosRepository,
): Promise<CobrancaSinal[]> {
  if (!user.isAdmin && clienteIdAlvo !== user.uid) {
    throw new PagamentoBusinessError(
      'Acesso negado: você não tem permissão para listar pagamentos deste cliente.',
      403,
    );
  }

  return pagamentosRepo.listarPorCliente(clienteIdAlvo);
}

/**
 * Confirma o pagamento do sinal de 30% (ex: baixa manual pela administradora ou simulação de confirmação Pix).
 * Atualiza status para 'pago', preenche data de pagamento e se houver agendamento associado, pode atualizá-lo para confirmado.
 */
export async function confirmarPagamentoSinalService(
  input: unknown,
  user: UserContext,
  pagamentosRepo: PagamentosRepository,
  agendamentosRepo?: AgendamentosRepository,
  auditoriaRepo?: AuditoriaRepository,
): Promise<CobrancaSinal> {
  const parsed = confirmarPagamentoSinalInputSchema.parse(input);

  const cobranca = await pagamentosRepo.buscarPorId(parsed.cobrancaId);
  if (!cobranca) {
    throw new PagamentoBusinessError('Cobrança de sinal não encontrada.', 404);
  }

  // Apenas a administradora ou o titular (em modo simulação/confirmação)
  if (!user.isAdmin && cobranca.clienteId !== user.uid) {
    throw new PagamentoBusinessError(
      'Acesso negado para confirmar o pagamento desta cobrança.',
      403,
    );
  }

  if (cobranca.status === 'pago') {
    return cobranca; // Já estava pago
  }

  const agoraIso = new Date().toISOString();
  const atualizada: CobrancaSinal = {
    ...cobranca,
    status: 'pago',
    pagoEm: agoraIso,
    updatedAt: agoraIso,
    observacoes: parsed.observacoes || cobranca.observacoes,
  };

  const salva = await pagamentosRepo.salvar(atualizada);

  // Se agendamento vinculado estiver 'pendente', atualiza status para 'confirmado'
  if (salva.agendamentoId && agendamentosRepo) {
    const agendamento = await agendamentosRepo.buscarPorId(salva.agendamentoId);
    if (agendamento && agendamento.status === 'pendente') {
      await agendamentosRepo.salvar({
        ...agendamento,
        status: 'confirmado',
        updatedAt: agoraIso,
      });
    }
  }

  if (auditoriaRepo) {
    try {
      await auditoriaRepo.salvar({
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        usuarioId: user.uid,
        usuarioEmail: user.email || 'sistema@clinicataisromagnoli.com.br',
        usuarioRole: user.isAdmin ? 'admin' : 'cliente',
        acao: 'pagamento.sinal_confirmado',
        recurso: 'pagamentos',
        recursoId: salva.id,
        dadosAfetados: {
          detalhes: `Pagamento do sinal de 30% confirmado para ${salva.servicoNome} (R$ ${(salva.valorSinalEmCentavos / 100).toFixed(2)})`,
          cobrancaId: salva.id,
          agendamentoId: salva.agendamentoId,
          status: 'pago',
          pagoEm: agoraIso,
        },
        dataHora: agoraIso,
      });
    } catch {
      // Ignora falha em gravação de auditoria
    }
  }

  return salva;
}
