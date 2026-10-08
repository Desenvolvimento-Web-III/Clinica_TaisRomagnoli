import { MOCK_AGENDAMENTOS } from './mockAgendamentos';
import type { Agendamento } from '../types/agendamento';

const STORAGE_KEY = 'clinica_tais_agendamentos_v1';

export function getAgendamentosStorage(): Agendamento[] {
  if (typeof window === 'undefined') {
    return MOCK_AGENDAMENTOS;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback silencioso em ambientes sem suporte ao localStorage
  }

  return MOCK_AGENDAMENTOS;
}

export function saveAgendamentosStorage(agendamentos: Agendamento[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agendamentos));
  } catch {
    // Fallback silencioso
  }
}

export function addAgendamentoStorage(novoAgendamento: Agendamento): void {
  const atuais = getAgendamentosStorage();
  const atualizados = [novoAgendamento, ...atuais.filter((item) => item.id !== novoAgendamento.id)];
  saveAgendamentosStorage(atualizados);
}
