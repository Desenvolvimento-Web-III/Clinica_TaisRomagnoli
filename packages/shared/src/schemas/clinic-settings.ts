import { z } from 'zod';
import type { ClinicSettings, DayOfWeek } from '../types/clinic-settings.js';
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

export function validateClinicSettings(data: unknown): data is ClinicSettings {
  if (!data || typeof data !== 'object') return false;
  const result = clinicSettingsSchema.safeParse(data);
  return result.success;
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
