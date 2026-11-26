import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  alterarStatusBloqueioAdmin,
  criarBloqueioAdmin,
  listarBloqueiosAdmin,
} from './agenda-admin-service';

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn((db: unknown, name: string) => ({ db, name })),
  deleteDoc: vi.fn(),
  doc: vi.fn((...args: unknown[]) => ({ collectionRef: args[0], id: args.at(-1) })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  authState: { currentUser: { uid: 'admin-1' } as { uid: string } | null },
  firestoreDb: { name: 'test-firestore' },
}));

vi.mock('firebase/firestore', () => ({
  collection: firestoreMocks.collection,
  deleteDoc: firestoreMocks.deleteDoc,
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  setDoc: firestoreMocks.setDoc,
  updateDoc: firestoreMocks.updateDoc,
}));

vi.mock('@/lib/firebase', () => ({
  auth: firestoreMocks.authState,
  db: firestoreMocks.firestoreDb,
}));

describe('agenda-admin-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.authState.currentUser = { uid: 'admin-1' };
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: 'block-1',
          data: () => ({
            tipo: 'unico',
            data: '2026-12-01',
            horaInicio: '12:00',
            horaFim: '13:00',
            diaInteiro: false,
            motivo: 'Manutenção',
            ativo: true,
          }),
        },
      ],
    });
  });

  it('consulta os bloqueios diretamente na coleção do Firestore', async () => {
    await expect(listarBloqueiosAdmin()).resolves.toEqual([
      {
        id: 'block-1',
        tipo: 'unico',
        data: '2026-12-01',
        horaInicio: '12:00',
        horaFim: '13:00',
        diaInteiro: false,
        motivo: 'Manutenção',
        ativo: true,
      },
    ]);
    expect(firestoreMocks.collection).toHaveBeenCalledWith(
      firestoreMocks.firestoreDb,
      'bloqueios_agenda',
    );
  });

  it('grava bloqueios no Firestore com autoria administrativa', async () => {
    const input = {
      tipo: 'unico' as const,
      data: '2026-12-01',
      horaInicio: '12:00',
      horaFim: '13:00',
      diaInteiro: false,
      motivo: 'Manutenção',
      profissionalId: 'default',
    };

    const result = await criarBloqueioAdmin(input);

    expect(result).toMatchObject({ ...input, ativo: true, criadoPor: 'admin-1' });
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.stringMatching(/^bloq-/) }),
      expect.objectContaining({ ...input, ativo: true, criadoPor: 'admin-1' }),
    );
  });

  it('pausa bloqueio existente com atualização direta do documento Firestore', async () => {
    firestoreMocks.getDoc.mockResolvedValue({
      id: 'block-1',
      exists: () => true,
      data: () => ({
        tipo: 'unico',
        data: '2026-12-01',
        horaInicio: '12:00',
        horaFim: '13:00',
        diaInteiro: false,
        motivo: 'Manutenção',
        ativo: false,
      }),
    });

    await expect(alterarStatusBloqueioAdmin('block-1', false)).resolves.toMatchObject({
      id: 'block-1',
      ativo: false,
    });
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'block-1' }),
      expect.objectContaining({ ativo: false }),
    );
  });

  it('não inicia operações sem usuário autenticado', async () => {
    firestoreMocks.authState.currentUser = null;

    await expect(listarBloqueiosAdmin()).rejects.toThrow(/entre com uma conta administrativa/i);
    expect(firestoreMocks.getDocs).not.toHaveBeenCalled();
  });
});
