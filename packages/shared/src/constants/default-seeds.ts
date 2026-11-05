import type { Agendamento } from '../types/agendamento.js';
import type { ClinicSettings } from '../types/clinic-settings.js';
import type { Professional } from '../types/professional.js';
import type { UserProfile } from '../types/user-profile.js';

/**
 * Configurações padrão iniciais da clínica conforme regras registradas em docs/PRODUCT_RULES.md e BRANDBOOK.md
 */
export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
  percentualSinal: 30, // 30% de sinal exigido para agendamento de clientes
  intervaloMinutos: 30, // 30 minutos de intervalo padrão entre atendimentos
  diasFolga: [0, 2], // 0 = Domingo, 2 = Terça-feira (configuráveis, não fixos no código)
  antecedenciaMinimaCancelamentoHoras: 3, // Mínimo de 3 horas de antecedência para cancelamento
  criterioClienteRecorrenteAtendimentosMes: 2, // Pelo menos 2 atendimentos no mesmo mês
  updatedAt: '2026-09-05T00:00:00.000Z',

  contatos: {
    telefone: '(11) 98765-4321',
    whatsapp: '(11) 98765-4321',
    email: 'contato@clinicataisromagnoli.com.br',
    endereco: 'Rua das Palmeiras, 450 - Sala 302, São Paulo - SP',
  },

  politicas: {
    politicaCancelamento:
      'Cancelamentos devem ser solicitados com pelo menos 3 horas de antecedência do horário agendado. Não realizamos estorno em dinheiro; o valor do sinal poderá ser reaproveitado em um novo agendamento quando o cancelamento for solicitado no prazo.',
    politicaReagendamento:
      'Reagendamentos devem ser solicitados com no mínimo 3 horas de antecedência em relação ao horário original.',
    toleranciaAtrasoMinutos: 15,
  },

  lembretes: {
    lembreteAtivo: true,
    antecedenciaHoras: 24,
    canais: {
      whatsapp: true,
      email: true,
      notificacaoApp: true,
    },
  },

  prazos: {
    antecedenciaMinimaAgendamentoHoras: 2,
    antecedenciaMinimaCancelamentoHoras: 3,
    intervaloMinutos: 30,
    criterioClienteRecorrenteAtendimentosMes: 2,
  },
};

/**
 * Profissional inicial da clínica (Tais Romagnoli)
 */
export const DEFAULT_INITIAL_PROFESSIONAL: Professional = {
  id: 'prof-tais-romagnoli',
  nome: 'Tais Romagnoli',
  especialidade: 'Massoterapeuta',
  ativo: true,
  diasFolga: [0, 2],
  intervaloMinutos: 30,
  createdAt: '2026-09-05T00:00:00.000Z',
};

/**
 * Administradora inicial da clínica
 */
export const DEFAULT_INITIAL_ADMIN: UserProfile = {
  uid: 'admin-tais-romagnoli',
  nome: 'Tais Romagnoli',
  email: 'admin@clinicataisromagnoli.com.br',
  telefone: '(11)99999-9999',
  role: 'admin',
  status: 'ativo',
  createdAt: '2026-09-05T00:00:00.000Z',
};

/**
 * Exemplares de modelagem de agendamentos no Firestore da Clínica Tais Romagnoli.
 * Cobrem as seis dimensões obrigatórias:
 * 1. Cliente: clienteId, clienteNome, clienteEmail, clienteTelefone
 * 2. Profissional: profissionalId, profissionalNome
 * 3. Serviço: servicoId, servicoNome, duracaoMinutos
 * 4. Horário: dataHoraInicio, dataHoraFim, intervaloAposMinutos
 * 5. Status: status ('confirmado', 'pendente', 'concluido', 'cancelado', etc.)
 * 6. Valores: valorTotalEmCentavos, valorSinalEmCentavos, saldoRestanteEmCentavos, metodoPagamento, sinalIsento
 */
export const DEFAULT_INITIAL_AGENDAMENTOS: Agendamento[] = [
  {
    id: 'agendamento-seed-confirmado',
    clienteId: 'cliente-joao',
    clienteNome: 'João Silva',
    clienteEmail: 'joao@exemplo.com',
    clienteTelefone: '(11)99999-1111',
    servicoId: 'massagem-relaxante',
    servicoNome: 'Massagem Relaxante',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 17000,
    valorSinalEmCentavos: 5100, // 30% do sinal obrigatório
    saldoRestanteEmCentavos: 11900,
    dataHoraInicio: '2026-11-10T14:00:00.000Z',
    dataHoraFim: '2026-11-10T15:00:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-tais-romagnoli',
    profissionalNome: 'Tais Romagnoli',
    status: 'confirmado',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    observacoes: 'Preferência por aromaterapia com óleo de lavanda.',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'agendamento-seed-pendente',
    clienteId: 'cliente-maria',
    clienteNome: 'Maria Souza',
    clienteEmail: 'maria@exemplo.com',
    clienteTelefone: '(11)98888-2222',
    servicoId: 'drenagem-linfatica',
    servicoNome: 'Drenagem Linfática',
    duracaoMinutos: 50,
    valorTotalEmCentavos: 19000,
    valorSinalEmCentavos: 5700, // 30% aguardando pagamento
    saldoRestanteEmCentavos: 13300,
    dataHoraInicio: '2026-11-11T10:00:00.000Z',
    dataHoraFim: '2026-11-11T10:50:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-tais-romagnoli',
    profissionalNome: 'Tais Romagnoli',
    status: 'pendente',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-10-02T11:00:00.000Z',
    updatedAt: '2026-10-02T11:00:00.000Z',
  },
  {
    id: 'agendamento-seed-presencial-isento',
    clienteId: 'cliente-joao',
    clienteNome: 'João Silva',
    clienteEmail: 'joao@exemplo.com',
    clienteTelefone: '(11)99999-1111',
    servicoId: 'massagem-terapeutica',
    servicoNome: 'Massagem Terapêutica',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 18000,
    valorSinalEmCentavos: 0, // Isento de sinal por ser agendamento presencial criado pela administradora
    saldoRestanteEmCentavos: 18000,
    dataHoraInicio: '2026-11-12T16:00:00.000Z',
    dataHoraFim: '2026-11-12T17:00:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-tais-romagnoli',
    profissionalNome: 'Tais Romagnoli',
    status: 'confirmado',
    metodoPagamento: 'presencial',
    origem: 'presencial_admin',
    sinalIsento: true,
    observacoes: 'Agendamento presencial no balcão sem cobrança prévia de sinal.',
    createdAt: '2026-10-03T15:00:00.000Z',
    updatedAt: '2026-10-03T15:00:00.000Z',
  },
  {
    id: 'agendamento-seed-concluido',
    clienteId: 'cliente-maria',
    clienteNome: 'Maria Souza',
    clienteEmail: 'maria@exemplo.com',
    clienteTelefone: '(11)98888-2222',
    servicoId: 'pedras-quentes',
    servicoNome: 'Massagem com Pedras Quentes',
    duracaoMinutos: 75,
    valorTotalEmCentavos: 22000,
    valorSinalEmCentavos: 6600,
    saldoRestanteEmCentavos: 15400,
    dataHoraInicio: '2026-10-20T14:00:00.000Z',
    dataHoraFim: '2026-10-20T15:15:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-tais-romagnoli',
    profissionalNome: 'Tais Romagnoli',
    status: 'concluido',
    metodoPagamento: 'cartao',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-10-20T15:20:00.000Z',
  },
  {
    id: 'agendamento-seed-cancelado-no-prazo',
    clienteId: 'cliente-joao',
    clienteNome: 'João Silva',
    clienteEmail: 'joao@exemplo.com',
    clienteTelefone: '(11)99999-1111',
    servicoId: 'ventosaterapia',
    servicoNome: 'Ventosaterapia',
    duracaoMinutos: 45,
    valorTotalEmCentavos: 15000,
    valorSinalEmCentavos: 4500,
    saldoRestanteEmCentavos: 10500,
    dataHoraInicio: '2026-10-25T11:00:00.000Z',
    dataHoraFim: '2026-10-25T11:45:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-tais-romagnoli',
    profissionalNome: 'Tais Romagnoli',
    status: 'cancelado',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    canceladoEm: '2026-10-24T18:00:00.000Z',
    motivoCancelamento: 'Compromisso imprevisto',
    classificacaoCancelamento: 'no_prazo',
    tipoCancelamento: 'no_prazo',
    sinalRetido: false,
    sinalDisponivelReagendamento: true,
    antecedenciaCancelamentoHoras: 17,
    createdAt: '2026-10-18T10:00:00.000Z',
    updatedAt: '2026-10-24T18:00:00.000Z',
  },
];
