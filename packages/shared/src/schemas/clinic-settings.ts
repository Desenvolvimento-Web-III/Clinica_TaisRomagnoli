import { z } from 'zod';
import type {
  ClinicSettings,
  CentralizedClinicSettings,
  ClinicContactsSettings,
  ClinicPoliciesSettings,
  ClinicRemindersSettings,
  ClinicDeadlinesSettings,
  DayOfWeek,
  ModelarConfiguracoesParams,
} from '../types/clinic-settings.js';
import type { Professional } from '../types/professional.js';
import type { UserProfile } from '../types/user-profile.js';

export function isDayOfWeek(value: unknown): value is DayOfWeek {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

export const dayOfWeekSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const clinicContactsSchema = z.object({
  telefone: z.string().trim().min(8, 'Telefone inválido'),
  whatsapp: z.string().trim().min(8, 'WhatsApp inválido'),
  email: z.string().trim().email('E-mail de contato inválido'),
  endereco: z.string().trim().min(5, 'Endereço da clínica é obrigatório'),
});

export const clinicPoliciesSchema = z.object({
  politicaCancelamento: z
    .string()
    .trim()
    .min(10, 'A política de cancelamento deve ter pelo menos 10 caracteres'),
  politicaReagendamento: z
    .string()
    .trim()
    .min(10, 'A política de reagendamento deve ter pelo menos 10 caracteres'),
  toleranciaAtrasoMinutos: z
    .number()
    .int()
    .min(0, 'A tolerância de atraso não pode ser negativa')
    .max(120, 'Tolerância excessiva'),
});

export const clinicRemindersSchema = z.object({
  lembreteAtivo: z.boolean(),
  antecedenciaHoras: z
    .number()
    .int()
    .min(1, 'A antecedência mínima para lembrete é de 1 hora')
    .max(168, 'A antecedência máxima é de 7 dias (168 horas)'),
  canais: z.object({
    whatsapp: z.boolean(),
    email: z.boolean(),
    notificacaoApp: z.boolean(),
  }),
});

export const clinicDeadlinesSchema = z.object({
  antecedenciaMinimaAgendamentoHoras: z
    .number()
    .min(0, 'Antecedência de agendamento não pode ser negativa'),
  antecedenciaMinimaCancelamentoHoras: z
    .number()
    .min(0, 'Antecedência de cancelamento não pode ser negativa'),
  intervaloMinutos: z.number().int().min(0, 'Intervalo não pode ser negativo'),
  criterioClienteRecorrenteAtendimentosMes: z
    .number()
    .int()
    .min(1, 'Critério de recorrência deve ser no mínimo 1 atendimento'),
});

/**
 * Validação do sinal financeiro obrigatório para agendamentos
 */
export const clinicSignalSchema = z.object({
  percentualSinal: z
    .number()
    .min(0, 'Percentual do sinal deve ser no mínimo 0%')
    .max(100, 'Percentual do sinal não pode exceder 100%'),
});

export const clinicSettingsSchema = z.object({
  percentualSinal: z
    .number()
    .min(0, 'Percentual do sinal deve ser no mínimo 0%')
    .max(100, 'Percentual do sinal não pode exceder 100%'),
  intervaloMinutos: z.number().int().min(0, 'Intervalo não pode ser negativo'),
  diasFolga: z.array(dayOfWeekSchema),
  antecedenciaMinimaCancelamentoHoras: z.number().min(0),
  criterioClienteRecorrenteAtendimentosMes: z.number().int().min(1),
  updatedAt: z.string(),
  contatos: clinicContactsSchema.optional(),
  politicas: clinicPoliciesSchema.optional(),
  lembretes: clinicRemindersSchema.optional(),
  prazos: clinicDeadlinesSchema.optional(),
});

/**
 * Schema estrito que valida o documento completo e centralizado de configurações
 * no Firestore (/configuracoes/geral), exigindo os cinco módulos principais:
 * 1. Contatos
 * 2. Sinal
 * 3. Prazos
 * 4. Lembretes
 * 5. Políticas
 */
export const centralizedClinicSettingsSchema = z.object({
  percentualSinal: z
    .number()
    .min(0, 'Percentual do sinal deve ser no mínimo 0%')
    .max(100, 'Percentual do sinal não pode exceder 100%'),
  intervaloMinutos: z.number().int().min(0, 'Intervalo não pode ser negativo'),
  diasFolga: z.array(dayOfWeekSchema),
  antecedenciaMinimaCancelamentoHoras: z.number().min(0),
  criterioClienteRecorrenteAtendimentosMes: z.number().int().min(1),
  updatedAt: z.string(),
  contatos: clinicContactsSchema,
  politicas: clinicPoliciesSchema,
  lembretes: clinicRemindersSchema,
  prazos: clinicDeadlinesSchema,
});

/**
 * Factory padronizada para modelar as configurações centralizadas da clínica no Firestore,
 * aplicando valores padrão oficiais para contatos, sinal, prazos, lembretes e políticas.
 */
export function modelarConfiguracoesClinica(
  params?: ModelarConfiguracoesParams,
): CentralizedClinicSettings {
  const agoraIso = new Date().toISOString();

  const contatos: ClinicContactsSettings = {
    telefone: params?.contatos?.telefone ?? '(11) 98765-4321',
    whatsapp: params?.contatos?.whatsapp ?? '(11) 98765-4321',
    email: params?.contatos?.email ?? 'contato@clinicataisromagnoli.com.br',
    endereco: params?.contatos?.endereco ?? 'Rua das Palmeiras, 450 - Sala 302, São Paulo - SP',
  };

  const politicas: ClinicPoliciesSettings = {
    politicaCancelamento:
      params?.politicas?.politicaCancelamento ??
      'Cancelamentos devem ser solicitados com pelo menos 3 horas de antecedência do horário agendado. Não realizamos estorno em dinheiro; o valor do sinal poderá ser reaproveitado em um novo agendamento quando o cancelamento for solicitado no prazo.',
    politicaReagendamento:
      params?.politicas?.politicaReagendamento ??
      'Reagendamentos devem ser solicitados com no mínimo 3 horas de antecedência em relação ao horário original.',
    toleranciaAtrasoMinutos: params?.politicas?.toleranciaAtrasoMinutos ?? 15,
  };

  const lembretes: ClinicRemindersSettings = {
    lembreteAtivo: params?.lembretes?.lembreteAtivo ?? true,
    antecedenciaHoras: params?.lembretes?.antecedenciaHoras ?? 24,
    canais: {
      whatsapp: params?.lembretes?.canais?.whatsapp ?? true,
      email: params?.lembretes?.canais?.email ?? true,
      notificacaoApp: params?.lembretes?.canais?.notificacaoApp ?? true,
    },
  };

  const prazos: ClinicDeadlinesSettings = {
    antecedenciaMinimaAgendamentoHoras: params?.prazos?.antecedenciaMinimaAgendamentoHoras ?? 2,
    antecedenciaMinimaCancelamentoHoras: params?.prazos?.antecedenciaMinimaCancelamentoHoras ?? 3,
    intervaloMinutos: params?.prazos?.intervaloMinutos ?? 30,
    criterioClienteRecorrenteAtendimentosMes:
      params?.prazos?.criterioClienteRecorrenteAtendimentosMes ?? 2,
  };

  const configuracoes: CentralizedClinicSettings = {
    percentualSinal: params?.percentualSinal ?? 30,
    intervaloMinutos: params?.intervaloMinutos ?? prazos.intervaloMinutos,
    diasFolga: params?.diasFolga ?? [0, 2],
    antecedenciaMinimaCancelamentoHoras:
      params?.antecedenciaMinimaCancelamentoHoras ?? prazos.antecedenciaMinimaCancelamentoHoras,
    criterioClienteRecorrenteAtendimentosMes:
      params?.criterioClienteRecorrenteAtendimentosMes ??
      prazos.criterioClienteRecorrenteAtendimentosMes,
    updatedAt: params?.updatedAt ?? agoraIso,
    contatos,
    politicas,
    lembretes,
    prazos,
  };

  return centralizedClinicSettingsSchema.parse(configuracoes);
}

export function validateClinicSettings(data: unknown): data is ClinicSettings {
  if (!data || typeof data !== 'object') return false;
  const result = clinicSettingsSchema.safeParse(data);
  return result.success;
}

export function validateClinicContacts(data: unknown): data is ClinicContactsSettings {
  if (!data || typeof data !== 'object') return false;
  return clinicContactsSchema.safeParse(data).success;
}

export function validateClinicPolicies(data: unknown): data is ClinicPoliciesSettings {
  if (!data || typeof data !== 'object') return false;
  return clinicPoliciesSchema.safeParse(data).success;
}

export function validateClinicReminders(data: unknown): data is ClinicRemindersSettings {
  if (!data || typeof data !== 'object') return false;
  return clinicRemindersSchema.safeParse(data).success;
}

export function validateClinicDeadlines(data: unknown): data is ClinicDeadlinesSettings {
  if (!data || typeof data !== 'object') return false;
  return clinicDeadlinesSchema.safeParse(data).success;
}

export function validateCentralizedClinicSettings(
  data: unknown,
): data is CentralizedClinicSettings {
  if (!data || typeof data !== 'object') return false;
  return centralizedClinicSettingsSchema.safeParse(data).success;
}

export function validateProfessional(data: unknown): data is Professional {
  if (!data || typeof data !== 'object') return false;
  const prof = data as Record<string, unknown>;

  return (
    typeof prof.id === 'string' &&
    prof.id.trim().length > 0 &&
    typeof prof.nome === 'string' &&
    prof.nome.trim().length > 0 &&
    typeof prof.especialidade === 'string' &&
    typeof prof.ativo === 'boolean' &&
    Array.isArray(prof.diasFolga) &&
    prof.diasFolga.every(isDayOfWeek) &&
    typeof prof.intervaloMinutos === 'number' &&
    prof.intervaloMinutos >= 0 &&
    typeof prof.createdAt === 'string'
  );
}

export function validateUserProfile(data: unknown): data is UserProfile {
  if (!data || typeof data !== 'object') return false;
  const user = data as Record<string, unknown>;

  const validRole = ['admin', 'client', 'professional', 'cliente'].includes(user.role as string);
  const validStatus = ['ativo', 'inativo', 'pendente'].includes(user.status as string);

  return (
    typeof user.uid === 'string' &&
    user.uid.trim().length > 0 &&
    typeof user.nome === 'string' &&
    user.nome.trim().length > 0 &&
    typeof user.email === 'string' &&
    user.email.includes('@') &&
    typeof user.telefone === 'string' &&
    validRole &&
    validStatus &&
    typeof user.createdAt === 'string'
  );
}
