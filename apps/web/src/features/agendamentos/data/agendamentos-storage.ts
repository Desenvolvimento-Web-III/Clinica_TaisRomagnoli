import type { Agendamento } from '../types/agendamento';

const STORAGE_KEY_PREFIX = 'clinica_tais_agendamentos_v1';
export const STORAGE_KEY_GLOBAL = 'clinica_tais_agendamentos_global_v1';

function normalizeUserId(userId?: string | null): string | null {
  const trimmed = userId?.trim();
  return trimmed ? trimmed : null;
}

export function getTodosAgendamentosStorage(): Agendamento[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GLOBAL);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed as Agendamento[];
      }
    }
  } catch {
    // Fallback silencioso
  }
  return [];
}

function syncToGlobalStorage(agendamentoOuLista: Agendamento | Agendamento[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const atuais = getTodosAgendamentosStorage();
    const novos = Array.isArray(agendamentoOuLista) ? agendamentoOuLista : [agendamentoOuLista];
    const map = new Map<string, Agendamento>();
    atuais.forEach((item) => map.set(item.id, item));
    novos.forEach((item) => map.set(item.id, item));
    localStorage.setItem(STORAGE_KEY_GLOBAL, JSON.stringify(Array.from(map.values())));
  } catch {
    // Fallback silencioso
  }
}

export function getAgendamentosStorageKey(userId?: string | null): string | null {
  const normalized = normalizeUserId(userId);
  if (!normalized) {
    return null;
  }
  return `${STORAGE_KEY_PREFIX}:${normalized}`;
}

export function getAgendamentosStorage(userId?: string | null): Agendamento[] {
  const normalizedUserId = normalizeUserId(userId);
  const storageKey = getAgendamentosStorageKey(normalizedUserId);

  if (!normalizedUserId || !storageKey || typeof window === 'undefined') {
    return [];
  }

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return (parsed as Agendamento[]).filter(
          (item) => !item.clienteId || item.clienteId === normalizedUserId,
        );
      }
    }
  } catch {
    // Fallback silencioso em ambientes sem suporte ao localStorage
  }

  return [];
}

export function saveAgendamentosStorage(agendamentos: Agendamento[], userId?: string | null): void {
  const normalizedUserId = normalizeUserId(userId);
  const storageKey = getAgendamentosStorageKey(normalizedUserId);

  if (!normalizedUserId || !storageKey || typeof window === 'undefined') {
    return;
  }

  try {
    const agendamentosComCliente = agendamentos.map((item) => ({
      ...item,
      clienteId: normalizedUserId,
    }));
    localStorage.setItem(storageKey, JSON.stringify(agendamentosComCliente));
    syncToGlobalStorage(agendamentosComCliente);
  } catch {
    // Fallback silencioso
  }
}

export function addAgendamentoStorage(novoAgendamento: Agendamento, userId?: string | null): void {
  const targetUserId = normalizeUserId(userId ?? novoAgendamento.clienteId);
  if (!targetUserId) {
    return;
  }

  const agendamentoVinculado: Agendamento = {
    ...novoAgendamento,
    clienteId: targetUserId,
  };
  syncToGlobalStorage(agendamentoVinculado);

  const atuais = getAgendamentosStorage(targetUserId);
  const atualizados = [
    agendamentoVinculado,
    ...atuais.filter((item) => item.id !== novoAgendamento.id),
  ];
  saveAgendamentosStorage(atualizados, targetUserId);
}
