export type StatusAgendamento =
  'pendente' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'falta';

export type MetodoPagamento = 'pix' | 'cartao' | 'boleto' | 'dinheiro' | 'presencial';

export type OrigemAgendamento = 'app_cliente' | 'presencial_admin';

/**
 * Classificação do cancelamento conforme a antecedência mínima estabelecida (3 horas).
 * - 'no_prazo': Solicitado com 3 horas ou mais de antecedência. Sinal liberado para reutilização em novo agendamento. Sem estorno em dinheiro.
 * - 'tardio': Solicitado com menos de 3 horas de antecedência ou após o início. Retenção e perda integral do sinal.
 */
export type ClassificacaoCancelamento = 'no_prazo' | 'tardio';

/**
 * Dimensão Cliente: Identificação e dados de contato do cliente no agendamento
 */
export interface AgendamentoClienteRef {
  /** Identificador único do cliente no Firebase Auth e Firestore (/clientes/{uid}) */
  clienteId: string;
  /** Nome completo do cliente */
  clienteNome: string;
  /** E-mail do cliente (opcional) */
  clienteEmail?: string;
  /** Telefone com DDD do cliente (opcional) */
  clienteTelefone?: string;
}

/**
 * Dimensão Profissional: Identificação da profissional responsável pelo atendimento
 */
export interface AgendamentoProfissionalRef {
  /** Identificador do profissional na clínica (ex: prof-tais-romagnoli) */
  profissionalId: string;
  /** Nome de exibição do profissional */
  profissionalNome: string;
}

/**
 * Dimensão Serviço: Dados do procedimento e tempo de duração contratados
 */
export interface AgendamentoServicoRef {
  /** Identificador único do serviço no catálogo da clínica */
  servicoId: string;
  /** Nome comercial do serviço */
  servicoNome: string;
  /** Duração da sessão em minutos (ex: 60) */
  duracaoMinutos: number;
}

/**
 * Dimensão Horário: Período de realização do atendimento e intervalo operacional
 */
export interface AgendamentoHorario {
  /** Data e hora de início no padrão ISO 8601 UTC */
  dataHoraInicio: string;
  /** Data e hora de término calculada no padrão ISO 8601 UTC */
  dataHoraFim: string;
  /** Intervalo obrigatório após a sessão em minutos (padrão de 30 min) */
  intervaloAposMinutos: number;
}

/**
 * Dimensão Valores: Valores monetários em centavos, sinal obrigatório e método de pagamento
 */
export interface AgendamentoValores {
  /** Valor total do atendimento em centavos (ex: 17000 para R$ 170,00) */
  valorTotalEmCentavos: number;
  /** Valor do sinal de 30% em centavos (ex: 5100 para R$ 51,00) */
  valorSinalEmCentavos: number;
  /** Saldo a ser pago presencialmente na clínica em centavos (ex: 11900) */
  saldoRestanteEmCentavos: number;
  /** Sinal isento (para agendamentos presenciais criados pela administradora) */
  sinalIsento: boolean;
  /** Método de pagamento utilizado ou previsto */
  metodoPagamento: MetodoPagamento;
}

/**
 * Modelo completo de Agendamento persistido no Cloud Firestore da Clínica Tais Romagnoli.
 * Consolida as dimensões: Cliente, Profissional, Serviço, Horário, Status e Valores.
 */
export interface Agendamento {
  /** Identificador único do agendamento (UUID ou chave do documento Firestore) */
  id: string;

  // Dimensão: Cliente
  clienteId: string;
  clienteNome: string;
  clienteEmail?: string;
  clienteTelefone?: string;

  // Dimensão: Profissional
  profissionalId: string;
  profissionalNome: string;

  // Dimensão: Serviço
  servicoId: string;
  servicoNome: string;
  duracaoMinutos: number;

  // Dimensão: Horário
  dataHoraInicio: string; // ISO 8601
  dataHoraFim: string; // ISO 8601
  intervaloAposMinutos: number; // Padrão da clínica (30 min)

  // Dimensão: Status
  status: StatusAgendamento;

  // Dimensão: Valores
  valorTotalEmCentavos: number;
  valorSinalEmCentavos: number;
  saldoRestanteEmCentavos: number;
  metodoPagamento: MetodoPagamento;
  sinalIsento: boolean;

  // Metadados de Origem e Ciclo de Vida
  origem: OrigemAgendamento;
  observacoes?: string;
  canceladoEm?: string;
  motivoCancelamento?: string;
  sinalRetido?: boolean;
  classificacaoCancelamento?: ClassificacaoCancelamento;
  tipoCancelamento?: ClassificacaoCancelamento;
  sinalDisponivelReagendamento?: boolean;
  antecedenciaCancelamentoHoras?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Parâmetros para criação estruturada de um modelo de agendamento
 */
export interface CriarModeloAgendamentoParams {
  id?: string;
  cliente: AgendamentoClienteRef;
  profissional?: Partial<AgendamentoProfissionalRef>;
  servico: AgendamentoServicoRef;
  dataHoraInicio: string;
  intervaloAposMinutos?: number;
  valorTotalEmCentavos: number;
  percentualSinal?: number;
  sinalIsento?: boolean;
  metodoPagamento: MetodoPagamento;
  origem?: OrigemAgendamento;
  status?: StatusAgendamento;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
}
