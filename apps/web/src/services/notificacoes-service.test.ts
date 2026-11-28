import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  mapNotificacaoInternaToClientNotification,
  mesclarNotificacoes,
  listarNotificacoesBackend,
  marcarNotificacaoLidaBackend,
  buscarNotificacoesRemotas,
  ouvirNotificacoesClienteEmTempoReal,
} from './notificacoes-service';
import type { ClientNotification, NotificacaoInterna } from '@clinica/shared';

const {
  mockGetDocs,
  mockOnSnapshot,
  mockCollection,
  mockQuery,
  mockDoc,
  mockUpdateDoc,
  mockOrderBy,
  mockLimit,
  mockWhere,
  mockAuth,
} = vi.hoisted(() => ({
  mockGetDocs: vi.fn(),
  mockOnSnapshot: vi.fn(),
  mockCollection: vi.fn(),
  mockQuery: vi.fn(),
  mockDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockOrderBy: vi.fn(),
  mockLimit: vi.fn(),
  mockWhere: vi.fn(),
  mockAuth: { currentUser: { uid: 'user-1' } as { uid: string } | null },
}));

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}));

const mockGetAuthToken = vi.fn();
vi.mock('./agendamentos-service', () => ({
  getAuthToken: () => mockGetAuthToken(),
  getApiBaseUrl: () => 'https://api.clinica.test',
}));

vi.mock('@/lib/firebase', () => ({
  auth: mockAuth,
  db: { app: {} },
}));

describe('notificacoes-service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetAuthToken.mockResolvedValue(null);
    mockAuth.currentUser = { uid: 'user-1' };
  });

  describe('mapNotificacaoInternaToClientNotification', () => {
    it('converte notificação interna completa para o formato da UI', () => {
      const interna: NotificacaoInterna = {
        id: 'notif-1',
        destinatarioId: 'cliente-123',
        destinatarioTipo: 'cliente',
        evento: 'confirmacao',
        tipo: 'agendamento',
        titulo: 'Sessão Confirmada',
        mensagem: 'Sua sessão foi confirmada pela terapeuta.',
        lida: true,
        link: '/agendamentos',
        createdAt: '2026-10-20T10:00:00.000Z',
      };

      const resultado = mapNotificacaoInternaToClientNotification(interna);

      expect(resultado).toEqual({
        id: 'notif-1',
        tipo: 'agendamento',
        titulo: 'Sessão Confirmada',
        mensagem: 'Sua sessão foi confirmada pela terapeuta.',
        lida: true,
        link: '/agendamentos',
        createdAt: '2026-10-20T10:00:00.000Z',
      });
    });

    it('aplica valores padrão seguros quando campos opcionais estão ausentes', () => {
      const resultado = mapNotificacaoInternaToClientNotification({ id: 'notif-parcial' });

      expect(resultado.id).toBe('notif-parcial');
      expect(resultado.tipo).toBe('sistema');
      expect(resultado.titulo).toBe('Notificação da clínica');
      expect(resultado.mensagem).toBe('');
      expect(resultado.lida).toBe(false);
      expect(typeof resultado.createdAt).toBe('string');
      expect(resultado.link).toBeUndefined();
    });
  });

  describe('mesclarNotificacoes', () => {
    it('mescla notificações locais e remotas sem duplicação e dando precedência à remota', () => {
      const locais: ClientNotification[] = [
        {
          id: 'n-1',
          tipo: 'lembrete',
          titulo: 'Preencha sua Ficha',
          mensagem: 'Versão local',
          lida: false,
          createdAt: '2026-10-10T10:00:00.000Z',
        },
        {
          id: 'n-local-only',
          tipo: 'sistema',
          titulo: 'Bem-vindo',
          mensagem: 'Exclusiva local',
          lida: false,
          createdAt: '2026-10-09T10:00:00.000Z',
        },
      ];

      const remotas: ClientNotification[] = [
        {
          id: 'n-1',
          tipo: 'lembrete',
          titulo: 'Preencha sua Ficha',
          mensagem: 'Versão remota atualizada',
          lida: true, // remota já lida
          createdAt: '2026-10-10T10:00:00.000Z',
        },
        {
          id: 'n-remota-nova',
          tipo: 'agendamento',
          titulo: 'Agendamento Confirmado',
          mensagem: 'Sessão confirmada',
          lida: false,
          createdAt: '2026-10-12T10:00:00.000Z',
        },
      ];

      const resultado = mesclarNotificacoes(locais, remotas);

      expect(resultado).toHaveLength(3);
      // Ordenação decrescente de data
      expect(resultado[0]?.id).toBe('n-remota-nova');
      expect(resultado[1]?.id).toBe('n-1');
      expect(resultado[1]?.lida).toBe(true);
      expect(resultado[1]?.mensagem).toBe('Versão remota atualizada');
      expect(resultado[2]?.id).toBe('n-local-only');
    });
  });

  describe('listarNotificacoesBackend', () => {
    it('retorna erro se usuário não estiver autenticado e nenhum token for fornecido', async () => {
      mockGetAuthToken.mockResolvedValue(null);
      mockAuth.currentUser = null;

      const res = await listarNotificacoesBackend(null);

      expect(res.sucesso).toBe(false);
      expect(res.erro).toContain('não autenticado');
      expect(res.dados).toEqual([]);
      mockAuth.currentUser = { uid: 'user-1' };
    });

    it('consulta as notificações no Firestore respeitando filtros e limite', async () => {
      const mockNotifs: NotificacaoInterna[] = [
        {
          id: 'notif-100',
          destinatarioId: 'cliente-1',
          destinatarioTipo: 'cliente',
          evento: 'lembrete',
          tipo: 'comunicado',
          titulo: 'Feriado de Carnaval',
          mensagem: 'Não haverá expediente na terça.',
          lida: false,
          createdAt: '2026-02-15T10:00:00.000Z',
        },
      ];

      mockCollection.mockReturnValue({});
      mockOrderBy.mockReturnValue({});
      mockLimit.mockReturnValue({});
      mockWhere.mockReturnValue({});
      mockQuery.mockReturnValue({});
      mockGetDocs.mockResolvedValue({
        docs: mockNotifs.map((item) => ({ id: item.id, data: () => item })),
      });

      const res = await listarNotificacoesBackend('token-abc', true, 5);

      expect(res.sucesso).toBe(true);
      expect(res.dados).toHaveLength(1);
      expect(res.dados[0]?.id).toBe('notif-100');
      expect(res.dados[0]?.tipo).toBe('comunicado');

      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        'clientes',
        'user-1',
        'notificacoes',
      );
      expect(mockWhere).toHaveBeenCalledWith('lida', '==', false);
      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it('retorna erro quando o Firestore falha', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore indisponível'));
      const res = await listarNotificacoesBackend('token-qualquer');
      expect(res.sucesso).toBe(false);
      expect(res.erro).toBe('Firestore indisponível');
    });
  });

  describe('marcarNotificacaoLidaBackend', () => {
    it('atualiza a notificação diretamente no Firestore do usuário autenticado', async () => {
      mockDoc.mockReturnValue({ id: 'doc-ref' });
      mockUpdateDoc.mockResolvedValue(undefined);

      const res = await marcarNotificacaoLidaBackend('notif-2', 'user-1');

      expect(res.sucesso).toBe(true);
      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'clientes',
        'user-1',
        'notificacoes',
        'notif-2',
      );
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lida: true,
          updatedAt: expect.any(String),
        }),
      );
    });
  });

  describe('buscarNotificacoesRemotas', () => {
    it('retorna lista vazia se userUid for vazio', async () => {
      const res = await buscarNotificacoesRemotas('');
      expect(res).toEqual([]);
    });

    it('consulta as notificações remotas diretamente no Firestore', async () => {
      mockCollection.mockReturnValue({});
      mockOrderBy.mockReturnValue({});
      mockLimit.mockReturnValue({});
      mockQuery.mockReturnValue({});
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'notif-firestore',
            data: () => ({
              tipo: 'lembrete',
              titulo: 'Lembrete do Firestore',
              mensagem: 'Via snapshot fallback',
              lida: false,
              createdAt: '2026-10-01T12:00:00.000Z',
            }),
          },
        ],
      });

      const res = await buscarNotificacoesRemotas('user-1');

      expect(res).toHaveLength(1);
      expect(res[0]?.id).toBe('notif-firestore');
      expect(res[0]?.titulo).toBe('Lembrete do Firestore');
    });
  });

  describe('ouvirNotificacoesClienteEmTempoReal', () => {
    it('configura o listener do Firestore e invoca o callback ao receber novos documentos', () => {
      const unsubscribeMock = vi.fn();
      mockCollection.mockReturnValue({});
      mockOrderBy.mockReturnValue({});
      mockLimit.mockReturnValue({});
      mockQuery.mockReturnValue({});

      mockOnSnapshot.mockImplementation((_query, onNext) => {
        onNext({
          empty: false,
          docs: [
            {
              id: 'notif-realtime',
              data: () => ({
                tipo: 'comunicado',
                titulo: 'Aviso em tempo real',
                mensagem: 'Chegou agora',
                lida: false,
                createdAt: '2026-10-25T15:00:00.000Z',
              }),
            },
          ],
        });
        return unsubscribeMock;
      });

      const callback = vi.fn();
      const unsub = ouvirNotificacoesClienteEmTempoReal('user-live', callback);

      expect(unsub).toBe(unsubscribeMock);
      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'notif-realtime',
          titulo: 'Aviso em tempo real',
        }),
      ]);
    });
  });
});
