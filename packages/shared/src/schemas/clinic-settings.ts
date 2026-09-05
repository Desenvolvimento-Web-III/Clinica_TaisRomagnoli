import type { ClinicSettings, DayOfWeek } from '../types/clinic-settings.js';
import type { Professional } from '../types/professional.js';
import type { UserProfile } from '../types/user-profile.js';

export function isDayOfWeek(value: unknown): value is DayOfWeek {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

export function validateClinicSettings(data: unknown): data is ClinicSettings {
  if (!data || typeof data !== 'object') return false;
  const settings = data as Record<string, unknown>;

  const validPercentual =
    typeof settings.percentualSinal === 'number' &&
    settings.percentualSinal >= 0 &&
    settings.percentualSinal <= 100;

  const validIntervalo =
    typeof settings.intervaloMinutos === 'number' && settings.intervaloMinutos >= 0;

  const validDiasFolga =
    Array.isArray(settings.diasFolga) && settings.diasFolga.every(isDayOfWeek);

  const validCancelamento =
    typeof settings.antecedenciaMinimaCancelamentoHoras === 'number' &&
    settings.antecedenciaMinimaCancelamentoHoras >= 0;

  const validRecorrente =
    typeof settings.criterioClienteRecorrenteAtendimentosMes === 'number' &&
    settings.criterioClienteRecorrenteAtendimentosMes >= 1;

  const validUpdatedAt = typeof settings.updatedAt === 'string';

  return (
    validPercentual &&
    validIntervalo &&
    validDiasFolga &&
    validCancelamento &&
    validRecorrente &&
    validUpdatedAt
  );
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
