import { describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import type { Agendamento } from '@clinica/shared';
import { FirestoreAgendamentosRepository } from '../src/modules/agendamentos/agendamentos-repository.js';

describe('FirestoreAgendamentosRepository', () => {
  it('persiste um novo agendamento na coleção raiz do Firestore', async () => {
    const salvarDocumento = vi.fn().mockResolvedValue(undefined);
    const selecionarDocumento = vi.fn(() => ({ set: salvarDocumento }));
    const selecionarColecao = vi.fn(() => ({ doc: selecionarDocumento }));
    const firestore = { collection: selecionarColecao } as unknown as Firestore;
    const repositorio = new FirestoreAgendamentosRepository(firestore);
    const agendamento = { id: 'agendamento-teste' } as Agendamento;

    await expect(repositorio.salvar(agendamento)).resolves.toBe(agendamento);

    expect(selecionarColecao).toHaveBeenCalledWith('agendamentos');
    expect(selecionarDocumento).toHaveBeenCalledWith('agendamento-teste');
    expect(salvarDocumento).toHaveBeenCalledWith(agendamento);
  });
});
