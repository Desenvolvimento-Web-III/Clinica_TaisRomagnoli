import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as notificacoesService from '@/services/notificacoes-service';
import {
  ANAMNESE_NOTIFICATION_ID,
  addClientNotification,
  createInitialProfileNotifications,
  initializeProfileNotifications,
  loadClientNotifications,
  markClientNotificationAsRead,
  saveClientNotifications,
  useClientNotifications,
} from './notifications-store';

vi.mock('@/services/notificacoes-service', () => ({
  buscarNotificacoesRemotas: vi.fn().mockResolvedValue([]),
  marcarNotificacaoLidaBackend: vi.fn().mockResolvedValue({ sucesso: true }),
  mesclarNotificacoes: (locais: unknown[], remotas: unknown[]) => [...remotas, ...locais],
  ouvirNotificacoesClienteEmTempoReal: vi.fn().mockReturnValue(() => {}),
}));

describe('notifications-store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('não cria notificações locais iniciais para um perfil novo', () => {
    expect(createInitialProfileNotifications('Marina Costa')).toEqual([]);
  });

  it('retorna lista vazia quando não há usuário autenticado', () => {
    expect(loadClientNotifications(null)).toEqual([]);
    expect(loadClientNotifications(undefined)).toEqual([]);
    expect(loadClientNotifications('   ')).toEqual([]);
  });

  it('não cria nem persiste notificações locais ao inicializar um usuário', () => {
    const listaNovoPerfil = initializeProfileNotifications('user-novo', 'Carlos');

    expect(listaNovoPerfil).toEqual([]);
    expect(loadClientNotifications('user-novo')).toEqual([]);
  });

  it('não permite adicionar notificações apenas no estado local', () => {
    initializeProfileNotifications('user-1', 'Ana');

    const criada = addClientNotification('user-1', {
      id: 'notif-agendamento-1',
      tipo: 'agendamento',
      titulo: 'Agendamento Solicitado',
      mensagem: 'Sua sessão de Drenagem Linfática foi registrada.',
      link: '/agendamentos',
    });

    expect(criada).toBeNull();
    expect(loadClientNotifications('user-1')).toEqual([]);
    expect(loadClientNotifications('user-2')).toEqual([]);
  });

  it('solicita ao backend que marque uma notificação como lida', () => {
    initializeProfileNotifications('user-1', 'Beatriz');

    markClientNotificationAsRead('user-1', ANAMNESE_NOTIFICATION_ID);

    expect(notificacoesService.marcarNotificacaoLidaBackend).toHaveBeenCalledWith(
      ANAMNESE_NOTIFICATION_ID,
      'user-1',
    );
  });

  it('não grava notificações no armazenamento local', () => {
    initializeProfileNotifications('user-1', 'Beatriz');
    saveClientNotifications('user-1', [{
      id: 'local', tipo: 'sistema', titulo: 'Local', mensagem: 'Local', lida: false,
      createdAt: '2026-11-25T10:00:00.000Z',
    }]);

    expect(loadClientNotifications('user-1')).toEqual([]);
    expect(localStorage.length).toBe(0);
  });

  it('markClientNotificationAsRead aciona a sincronização com o backend', () => {
    initializeProfileNotifications('user-sync', 'Fernanda');

    markClientNotificationAsRead('user-sync', ANAMNESE_NOTIFICATION_ID);

    expect(notificacoesService.marcarNotificacaoLidaBackend).toHaveBeenCalledWith(
      ANAMNESE_NOTIFICATION_ID,
      'user-sync',
    );
  });

  it('useClientNotifications escuta em tempo real e sincroniza notificações remotas', async () => {
    const mockRemotas = [
      {
        id: 'notif-remota-1',
        tipo: 'agendamento' as const,
        titulo: 'Sessão Confirmada',
        mensagem: 'Terapeuta confirmou.',
        lida: false,
        createdAt: '2026-10-25T10:00:00.000Z',
      },
    ];

    vi.mocked(notificacoesService.buscarNotificacoesRemotas).mockResolvedValue(mockRemotas);

    const { result } = renderHook(() => useClientNotifications('user-hook'));

    expect(notificacoesService.ouvirNotificacoesClienteEmTempoReal).toHaveBeenCalledWith(
      'user-hook',
      expect.any(Function),
    );

    await act(async () => {
      await result.current.sync();
    });

    expect(result.current.notifications.some((item) => item.id === 'notif-remota-1')).toBe(true);
  });
});
