import { MOCK_AGENDAMENTOS } from './mockAgendamentos';
import {
  addAgendamentoStorage,
  getAgendamentosStorage,
  getAgendamentosStorageKey,
  saveAgendamentosStorage,
} from './agendamentos-storage';

describe('agendamentos-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna chave nula e lista vazia quando não há usuário autenticado', () => {
    expect(getAgendamentosStorageKey(null)).toBeNull();
    expect(getAgendamentosStorageKey(undefined)).toBeNull();
    expect(getAgendamentosStorageKey('   ')).toBeNull();

    expect(getAgendamentosStorage(null)).toEqual([]);
    expect(getAgendamentosStorage(undefined)).toEqual([]);
    expect(getAgendamentosStorage('')).toEqual([]);
  });

  it('retorna lista vazia para usuário autenticado sem agendamentos prévios', () => {
    expect(getAgendamentosStorage('cliente-novo')).toEqual([]);
  });

  it('isola o armazenamento de agendamentos entre diferentes clientes autenticados', () => {
    const primeiroAgendamento = MOCK_AGENDAMENTOS[0]!;
    const segundoAgendamento = MOCK_AGENDAMENTOS[1]!;

    addAgendamentoStorage(primeiroAgendamento, 'user-1');
    addAgendamentoStorage(segundoAgendamento, 'user-2');

    const listaUser1 = getAgendamentosStorage('user-1');
    const listaUser2 = getAgendamentosStorage('user-2');

    expect(listaUser1).toHaveLength(1);
    expect(listaUser1[0]?.id).toBe(primeiroAgendamento.id);
    expect(listaUser1[0]?.clienteId).toBe('user-1');

    expect(listaUser2).toHaveLength(1);
    expect(listaUser2[0]?.id).toBe(segundoAgendamento.id);
    expect(listaUser2[0]?.clienteId).toBe('user-2');

    // Visitante deslogado continua vendo lista vazia
    expect(getAgendamentosStorage(null)).toEqual([]);
  });

  it('não persiste agendamento quando não há userId válido', () => {
    const agendamento = MOCK_AGENDAMENTOS[0]!;
    addAgendamentoStorage(agendamento, null);
    saveAgendamentosStorage([agendamento], undefined);

    expect(localStorage.length).toBe(0);
    expect(getAgendamentosStorage(null)).toEqual([]);
  });
});
