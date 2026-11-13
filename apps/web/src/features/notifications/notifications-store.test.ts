import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as notificacoesService from '@/services/notificacoes-service';
import {
  ANAMNESE_NOTIFICATION_ID,
  WELCOME_NOTIFICATION_ID,
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

  it('gera apenas as notificações iniciais de boas-vindas e ficha de anamnese para um novo perfil', () => {
    const iniciais = createInitialProfileNotifications('Marina Costa');

    expect(iniciais).toHaveLength(2);
    expect(iniciais.map((item) => item.id)).toEqual([
      ANAMNESE_NOTIFICATION_ID,
      WELCOME_NOTIFICATION_ID,
    ]);

    const notifAnamnese = iniciais.find((item) => item.id === ANAMNESE_NOTIFICATION_ID);
    expect(notifAnamnese?.titulo).toBe('Preencha sua Ficha de Anamnese');
    expect(notifAnamnese?.link).toBe('/anamnese');
    expect(notifAnamnese?.lida).toBe(false);

    const notifBoasVindas = iniciais.find((item) => item.id === WELCOME_NOTIFICATION_ID);
    expect(notifBoasVindas?.titulo).toBe('Bem-vindo(a) à Clínica!');
    expect(notifBoasVindas?.mensagem).toContain('Marina Costa');
    expect(notifBoasVindas?.link).toBe('/servicos');
    expect(notifBoasVindas?.lida).toBe(false);
  });

  it('retorna lista vazia quando não há usuário autenticado', () => {
    expect(loadClientNotifications(null)).toEqual([]);
    expect(loadClientNotifications(undefined)).toEqual([]);
    expect(loadClientNotifications('   ')).toEqual([]);
  });

  it('inicializa e isola as notificações por usuário autenticado sem incluir agendamentos mockados', () => {
    const listaNovoPerfil = initializeProfileNotifications('user-novo', 'Carlos');

    expect(listaNovoPerfil).toHaveLength(2);
    expect(listaNovoPerfil.some((item) => item.tipo === 'agendamento')).toBe(false);

    const carregadas = loadClientNotifications('user-novo');
    expect(carregadas).toHaveLength(2);
    expect(carregadas[0]?.id).toBe(ANAMNESE_NOTIFICATION_ID);
    expect(carregadas[1]?.id).toBe(WELCOME_NOTIFICATION_ID);
  });

  it('permite adicionar notificações dinâmicas de agendamento para o cliente autenticado', () => {
    initializeProfileNotifications('user-1', 'Ana');

    const criada = addClientNotification('user-1', {
      id: 'notif-agendamento-1',
      tipo: 'agendamento',
      titulo: 'Agendamento Solicitado',
      mensagem: 'Sua sessão de Drenagem Linfática foi registrada.',
      link: '/agendamentos',
    });

    expect(criada).not.toBeNull();

    const listaUser1 = loadClientNotifications('user-1');
    expect(listaUser1).toHaveLength(3);
    expect(listaUser1[0]?.id).toBe('notif-agendamento-1');

    // Outro usuário não recebe a notificação do user-1
    const listaUser2 = loadClientNotifications('user-2');
    expect(listaUser2).toHaveLength(2);
    expect(listaUser2.some((item) => item.id === 'notif-agendamento-1')).toBe(false);
  });

  it('marca a notificação da ficha de anamnese como lida quando solicitada', () => {
    initializeProfileNotifications('user-1', 'Beatriz');

    markClientNotificationAsRead('user-1', ANAMNESE_NOTIFICATION_ID);

    const lista = loadClientNotifications('user-1');
    const anamnese = lista.find((item) => item.id === ANAMNESE_NOTIFICATION_ID);
    expect(anamnese?.lida).toBe(true);
  });

  it('mantém lista vazia caso o cliente remova todas as notificações', () => {
    initializeProfileNotifications('user-1', 'Beatriz');
    saveClientNotifications('user-1', []);

    expect(loadClientNotifications('user-1')).toEqual([]);
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
