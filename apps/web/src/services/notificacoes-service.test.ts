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

const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
}));

const mockGetAuthToken = vi.fn();
vi.mock('./agendamentos-service', () => ({
  getAuthToken: () => mockGetAuthToken(),
  getFunctionsBaseUrl: () => 'http://127.0.0.1:5001/clinica-tais-romagnoli/us-central1',
}));

vi.mock('@/lib/firebase', () => ({
  auth: null,
  db: { app: {} },
}));

describe('notificacoes-service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetAuthToken.mockResolvedValue(null);
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

      const res = await listarNotificacoesBackend(null);

      expect(res.sucesso).toBe(false);
      expect(res.erro).toContain('não autenticado');
      expect(res.dados).toEqual([]);
    });

    it('faz requisição com os parâmetros de consulta e headers corretos', async () => {
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

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sucesso: true, dados: mockNotifs }),
      } as Response);

      const res = await listarNotificacoesBackend('token-abc', true, 5);

      expect(res.sucesso).toBe(true);
      expect(res.dados).toHaveLength(1);
      expect(res.dados[0]?.id).toBe('notif-100');
      expect(res.dados[0]?.tipo).toBe('comunicado');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('listarMinhasNotificacoes?apenasNaoLidas=true&limite=5'),
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer token-abc' },
        }),
      );
    });

    it('trata resposta com erro da Cloud Function', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Acesso negado' }),
      } as Response);

      const res = await listarNotificacoesBackend('token-invalido');

      expect(res.sucesso).toBe(false);
      expect(res.erro).toBe('Acesso negado');
      expect(res.statusCode).toBe(403);
    });

    it('trata falha de rede/exceção', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const res = await listarNotificacoesBackend('token-qualquer');

      expect(res.sucesso).toBe(false);
      expect(res.erro).toBe('Network error');
    });
  });

  describe('marcarNotificacaoLidaBackend', () => {
    it('executa chamada à Cloud Function com sucesso', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sucesso: true }),
      } as Response);

      const res = await marcarNotificacaoLidaBackend('notif-1', 'user-1', 'token-valido');

      expect(res.sucesso).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/marcarNotificacaoLida'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-valido',
          }),
          body: JSON.stringify({ notificacaoId: 'notif-1' }),
        }),
      );
    });

    it('usa fallback no Firestore quando a Cloud Function falha', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      mockDoc.mockReturnValue({ id: 'doc-ref' });
      mockUpdateDoc.mockResolvedValue(undefined);

      const res = await marcarNotificacaoLidaBackend('notif-2', 'user-2', 'token-invalido');

      expect(res.sucesso).toBe(true);
      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'clientes',
        'user-2',
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

    it('retorna notificações do backend quando a função responder com dados', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sucesso: true,
          dados: [
            {
              id: 'notif-remota',
              tipo: 'sistema',
              titulo: 'Aviso',
              mensagem: 'Mensagem remota',
              lida: false,
              createdAt: '2026-10-10T10:00:00.000Z',
            },
          ],
        }),
      } as Response);

      const res = await buscarNotificacoesRemotas('user-1', 'token-valido');

      expect(res).toHaveLength(1);
      expect(res[0]?.id).toBe('notif-remota');
    });

    it('faz fallback para Firestore getDocs quando a função retorna vazio', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sucesso: true, dados: [] }),
      } as Response);

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

      const res = await buscarNotificacoesRemotas('user-1', 'token-valido');

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
