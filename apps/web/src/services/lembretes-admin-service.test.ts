import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CLINIC_SETTINGS } from '@clinica/shared';

const { getDocMock, getDocsMock, setDocMock, authState, dbState } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  getDocsMock: vi.fn(),
  setDocMock: vi.fn(),
  authState: { currentUser: { uid: 'admin-1' } as { uid: string } | null },
  dbState: { value: { name: 'firestore' } as object | null },
}));

vi.mock('@/lib/firebase', () => ({ auth: authState, db: dbState.value }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  doc: (_db: unknown, name: string, id: string) => ({ collection: name, id }),
  documentId: () => '__name__',
  getDoc: getDocMock,
  getDocs: getDocsMock,
  query: (collection: { name: string }, ...constraints: unknown[]) => ({
    collection: collection.name,
    constraints,
  }),
  where: (...args: unknown[]) => args,
  setDoc: setDocMock,
}));

import { gerarFilaLembretesAdmin, salvarEstadoLembreteAdmin } from './lembretes-admin-service';

const now = new Date('2026-11-25T10:00:00.000Z');
const makeAppointment = (id: string, start: string, status = 'confirmado') => ({
  id,
  clienteId: `cliente-${id}`,
  clienteNome: `Cliente ${id}`,
  clienteTelefone: '',
  servicoNome: 'Massagem',
  duracaoMinutos: 60,
  dataHoraInicio: start,
  dataHoraFim: new Date(Date.parse(start) + 3600000).toISOString(),
  status,
  profissionalNome: 'Tais',
});
const docSnapshot = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });

describe('lembretes-admin-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.currentUser = { uid: 'admin-1' };
    getDocMock.mockResolvedValue({ exists: () => false });
    getDocsMock.mockImplementation(async (ref: { collection: string }) => {
      if (ref.collection === 'agendamentos') {
        return {
          docs: [
            docSnapshot('soon', makeAppointment('soon', '2026-11-25T11:00:00.000Z')),
            docSnapshot('opt-out', makeAppointment('opt-out', '2026-11-25T11:30:00.000Z')),
            docSnapshot('late', makeAppointment('late', '2026-11-26T11:00:00.000Z')),
            docSnapshot(
              'cancelled',
              makeAppointment('cancelled', '2026-11-25T11:45:00.000Z', 'cancelado'),
            ),
          ],
        };
      }
      if (ref.collection === 'clientes')
        return {
          docs: [
            docSnapshot('cliente-soon', { telefone: '11999998888' }),
            docSnapshot('cliente-opt-out', {
              telefone: '11888887777',
              preferenciasContato: { lembretesAgendamento: false },
            }),
          ],
        };
      return { docs: [] };
    });
    setDocMock.mockResolvedValue(undefined);
  });

  it('seleciona apenas agendamentos confirmados/pendentes dentro da antecedência e respeita preferência de contato', async () => {
    const fila = await gerarFilaLembretesAdmin(now);
    expect(fila.map((item) => item.id)).toEqual(['soon']);
    expect(fila[0]?.clienteTelefone).toBe('11999998888');
  });

  it('não consulta agendamentos quando lembretes ou canal WhatsApp estão desligados', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        ...DEFAULT_CLINIC_SETTINGS,
        lembretes: {
          ...DEFAULT_CLINIC_SETTINGS.lembretes!,
          lembreteAtivo: false,
        },
      }),
    });
    expect(await gerarFilaLembretesAdmin(now)).toEqual([]);
    expect(getDocsMock).not.toHaveBeenCalled();
  });

  it('exige uma sessão autenticada para acessar a fila', async () => {
    authState.currentUser = null;
    await expect(gerarFilaLembretesAdmin(now)).rejects.toThrow(
      /entre com a conta da administradora/i,
    );
  });

  it('grava o estado no documento cujo ID corresponde ao agendamento sem duplicar dados pessoais', async () => {
    await salvarEstadoLembreteAdmin({
      agendamentoId: 'ag-1',
      dataHoraInicio: '2026-11-25T11:00:00.000Z',
      status: 'enviado',
      mensagemPersonalizada: 'Oi!',
    });
    expect(setDocMock).toHaveBeenCalledWith(
      { collection: 'fila_lembretes', id: 'ag-1' },
      expect.objectContaining({
        agendamentoId: 'ag-1',
        status: 'enviado',
        mensagemPersonalizada: 'Oi!',
      }),
    );
    expect(JSON.stringify(setDocMock.mock.calls[0]?.[1])).not.toContain('telefone');
  });
});
