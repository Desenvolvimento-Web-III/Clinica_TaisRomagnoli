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
