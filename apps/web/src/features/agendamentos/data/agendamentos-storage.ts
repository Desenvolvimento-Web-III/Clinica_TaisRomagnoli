import type { Agendamento } from '../types/agendamento';

const STORAGE_KEY_PREFIX = 'clinica_tais_agendamentos_v1';

function normalizeUserId(userId?: string | null): string | null {
  const trimmed = userId?.trim();
  return trimmed ? trimmed : null;
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
  } catch {
    // Fallback silencioso
  }
}

export function addAgendamentoStorage(novoAgendamento: Agendamento, userId?: string | null): void {
  const targetUserId = normalizeUserId(userId ?? novoAgendamento.clienteId);
  if (!targetUserId) {
    return;
  }

  const atuais = getAgendamentosStorage(targetUserId);
  const agendamentoVinculado: Agendamento = {
    ...novoAgendamento,
    clienteId: targetUserId,
  };
  const atualizados = [
    agendamentoVinculado,
    ...atuais.filter((item) => item.id !== novoAgendamento.id),
  ];
  saveAgendamentosStorage(atualizados, targetUserId);
}
