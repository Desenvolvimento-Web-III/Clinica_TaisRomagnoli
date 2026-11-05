import type { ClinicSettings } from '../types/clinic-settings.js';
import type { Professional } from '../types/professional.js';
import type { UserProfile } from '../types/user-profile.js';
import type { ServicoModel } from '../schemas/servico.js';

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
 * Serviços padrão iniciais da clínica com valores de sinal de pagamento configurados (30% padrão).
 */
export const DEFAULT_INITIAL_SERVICES: ServicoModel[] = [
  {
    id: 'massagem-relaxante',
    nome: 'Massagem Relaxante',
    duracaoMinutos: 60,
    preco: 170,
    precoEmCentavos: 17000,
    sinal: 51,
    sinalEmCentavos: 5100,
    sinalPercentual: 30,
    descricao:
      'Massagem realizada com movimentos suaves, contínuos e envolventes, geralmente com óleo ou creme, destinada a diminuir tensões musculares e proporcionar relaxamento e bem-estar.',
    ativo: true,
    categoria: 'Corporal',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'massagem-terapeutica',
    nome: 'Massagem Terapêutica',
    duracaoMinutos: 60,
    preco: 190,
    precoEmCentavos: 19000,
    sinal: 57,
    sinalEmCentavos: 5700,
    sinalPercentual: 30,
    descricao:
      'Atendimento personalizado que utiliza diferentes manobras e técnicas de massoterapia de acordo com as regiões de tensão ou desconforto, buscando promover relaxamento muscular e bem-estar.',
    ativo: true,
    categoria: 'Corporal',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'massagem-pedras-quentes',
    nome: 'Massagem com Pedras Quentes',
    duracaoMinutos: 60,
    preco: 230,
    precoEmCentavos: 23000,
    sinal: 69,
    sinalEmCentavos: 6900,
    sinalPercentual: 30,
    descricao:
      'Utiliza pedras aquecidas, geralmente vulcânicas, associadas a manobras de deslizamento e pressão. O calor auxilia no relaxamento muscular e torna a massagem mais profunda e acolhedora.',
    ativo: true,
    categoria: 'Termoterapia',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'massagem-aromatica',
    nome: 'Massagem Aromática',
    duracaoMinutos: 60,
    preco: 230,
    precoEmCentavos: 23000,
    sinal: 69,
    sinalEmCentavos: 6900,
    sinalPercentual: 30,
    descricao:
      'Combina técnicas de massagem com óleos vegetais e óleos essenciais, associando o toque aos aromas para proporcionar relaxamento, conforto e uma experiência sensorial.',
    ativo: true,
    categoria: 'Sensorial',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'massagem-desportiva',
    nome: 'Massagem Desportiva',
    duracaoMinutos: 60,
    preco: 190,
    precoEmCentavos: 19000,
    sinal: 57,
    sinalEmCentavos: 5700,
    sinalPercentual: 30,
    descricao:
      'Técnica direcionada a pessoas fisicamente ativas, utilizando manobras mais específicas e profundas para trabalhar a musculatura, aliviar tensões e auxiliar na recuperação após atividades físicas.',
    ativo: true,
    categoria: 'Corporal',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'shiatsu',
    nome: 'Shiatsu',
    duracaoMinutos: 60,
    preco: 170,
    precoEmCentavos: 17000,
    sinal: 51,
    sinalEmCentavos: 5100,
    sinalPercentual: 30,
    descricao:
      'Técnica japonesa que utiliza pressões firmes e ritmadas com dedos, palmas e outras partes das mãos sobre pontos e regiões de tensão, buscando promover relaxamento e equilíbrio corporal.',
    ativo: true,
    categoria: 'Integrativa',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'reiki',
    nome: 'Reiki',
    duracaoMinutos: 40,
    preco: 130,
    precoEmCentavos: 13000,
    sinal: 39,
    sinalEmCentavos: 3900,
    sinalPercentual: 30,
    descricao:
      'Prática integrativa realizada por meio da imposição das mãos sobre ou próximo ao corpo, buscando proporcionar relaxamento e uma experiência de equilíbrio e bem-estar.',
    ativo: true,
    categoria: 'Integrativa',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'spa-pes-maos',
    nome: 'Spa dos pés e mãos',
    duracaoMinutos: 40,
    preco: 200,
    precoEmCentavos: 20000,
    sinal: 60,
    sinalEmCentavos: 6000,
    sinalPercentual: 30,
    descricao:
      'Ritual de cuidados que pode incluir higienização, imersão ou escalda-pés, esfoliação, hidratação e massagem relaxante nos pés e mãos.',
    ativo: true,
    categoria: 'Relaxamento',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'reflexologia-podal',
    nome: 'Reflexologia Podal',
    duracaoMinutos: 30,
    preco: 130,
    precoEmCentavos: 13000,
    sinal: 39,
    sinalEmCentavos: 3900,
    sinalPercentual: 30,
    descricao:
      'Técnica realizada nos pés por meio de pressões e estímulos em pontos específicos, proporcionando relaxamento e percepção de bem-estar corporal.',
    ativo: true,
    categoria: 'Integrativa',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'relaxante-pes',
    nome: 'Relaxante para os Pés',
    duracaoMinutos: 30,
    preco: 100,
    precoEmCentavos: 10000,
    sinal: 30,
    sinalEmCentavos: 3000,
    sinalPercentual: 30,
    descricao:
      'Massagem direcionada aos pés, utilizando movimentos suaves de deslizamento, amassamento e pressão para aliviar a sensação de cansaço e proporcionar relaxamento.',
    ativo: true,
    categoria: 'Relaxamento',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'massagem-facial',
    nome: 'Massagem Facial',
    duracaoMinutos: 30,
    preco: 100,
    precoEmCentavos: 10000,
    sinal: 30,
    sinalEmCentavos: 3000,
    sinalPercentual: 30,
    descricao:
      'Massagem delicada realizada no rosto, podendo envolver movimentos de deslizamento, pressão e drenagem suave, promovendo relaxamento da musculatura facial e sensação de bem-estar.',
    ativo: true,
    categoria: 'Facial',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'massagem-capilar',
    nome: 'Massagem Capilar',
    duracaoMinutos: 30,
    preco: 100,
    precoEmCentavos: 10000,
    sinal: 30,
    sinalEmCentavos: 3000,
    sinalPercentual: 30,
    descricao:
      'Massagem realizada no couro cabeludo, com movimentos de pressão, fricção e deslizamento, proporcionando relaxamento e alívio das tensões da região da cabeça, pescoço e couro cabeludo.',
    ativo: true,
    categoria: 'Relaxamento',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'cromoterapia',
    nome: 'Cromoterapia',
    duracaoMinutos: 30,
    preco: 100,
    precoEmCentavos: 10000,
    sinal: 30,
    sinalEmCentavos: 3000,
    sinalPercentual: 30,
    descricao:
      'Prática que utiliza diferentes cores e estímulos luminosos como recurso complementar de relaxamento e bem-estar, escolhidos de acordo com a proposta da sessão.',
    ativo: true,
    categoria: 'Integrativa',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'auriculoterapia',
    nome: 'Auriculoterapia',
    duracaoMinutos: 30,
    preco: 100,
    precoEmCentavos: 10000,
    sinal: 30,
    sinalEmCentavos: 3000,
    sinalPercentual: 30,
    descricao:
      'Técnica que estimula pontos específicos do pavilhão auricular, normalmente com sementes, esferas ou outros estímulos, de acordo com a avaliação e o objetivo do atendimento.',
    ativo: true,
    categoria: 'Integrativa',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'ventosaterapia',
    nome: 'Ventosaterapia',
    duracaoMinutos: 30,
    preco: 100,
    precoEmCentavos: 10000,
    sinal: 30,
    sinalEmCentavos: 3000,
    sinalPercentual: 30,
    descricao:
      'Técnica que utiliza ventosas para criar uma pressão negativa sobre a pele, promovendo uma sucção controlada e estímulo local dos tecidos.',
    ativo: true,
    categoria: 'Corporal',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'terapia-ultrassom',
    nome: 'Terapia de Ultrassom',
    duracaoMinutos: 30,
    preco: 130,
    precoEmCentavos: 13000,
    sinal: 39,
    sinalEmCentavos: 3900,
    sinalPercentual: 30,
    descricao:
      'Procedimento que utiliza ondas ultrassônicas aplicadas sobre uma região específica do corpo por meio de um equipamento, conforme o objetivo terapêutico definido pelo profissional.',
    ativo: true,
    categoria: 'Especializada',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'drenagem-linfatica',
    nome: 'Drenagem Linfática',
    duracaoMinutos: 60,
    preco: 130,
    precoEmCentavos: 13000,
    sinal: 39,
    sinalEmCentavos: 3900,
    sinalPercentual: 30,
    descricao: 'Movimentos leves e ritmados realizados com cuidado e atenção ao seu conforto.',
    ativo: true,
    categoria: 'Corporal',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    id: 'liberacao-miofascial',
    nome: 'Liberação Miofascial',
    duracaoMinutos: 45,
    preco: 110,
    precoEmCentavos: 11000,
    sinal: 33,
    sinalEmCentavos: 3300,
    sinalPercentual: 30,
    descricao:
      'Técnica manual com pressão controlada, adaptada aos limites e objetivos de cada cliente.',
    ativo: true,
    categoria: 'Corporal',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
];
