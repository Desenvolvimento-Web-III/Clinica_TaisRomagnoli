import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  usePwaInstall,
  STORAGE_KEY_DISMISSED_UNTIL,
  type BeforeInstallPromptEvent,
} from './usePwaInstall';

describe('usePwaInstall hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('inicializa com canInstall = false quando não há evento beforeinstallprompt e não é iOS', () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canInstall).toBe(false);
    expect(result.current.hasPrompt).toBe(false);
    expect(result.current.isStandalone).toBe(false);
  });

  it('permite instalação quando evento beforeinstallprompt é disparado', () => {
    const { result } = renderHook(() => usePwaInstall());

    const mockPromptEvent = new Event('beforeinstallprompt') as unknown as BeforeInstallPromptEvent;
    Object.assign(mockPromptEvent, {
      platforms: ['android'],
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'android' }),
      prompt: vi.fn().mockResolvedValue(undefined),
    });

    act(() => {
      window.dispatchEvent(mockPromptEvent as unknown as Event);
    });

    expect(result.current.canInstall).toBe(true);
    expect(result.current.hasPrompt).toBe(true);
  });

  it('aciona prompt() e atualiza estado ao chamar installApp com aceite do usuário', async () => {
    const { result } = renderHook(() => usePwaInstall());

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const mockPromptEvent = new Event('beforeinstallprompt') as unknown as BeforeInstallPromptEvent;
    Object.assign(mockPromptEvent, {
      platforms: ['android'],
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'android' }),
      prompt: mockPrompt,
    });

    act(() => {
      window.dispatchEvent(mockPromptEvent as unknown as Event);
    });

    let success = false;
    await act(async () => {
      success = await result.current.installApp();
    });

    expect(mockPrompt).toHaveBeenCalledTimes(1);
    expect(success).toBe(true);
    expect(result.current.installed).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('permite dispensar a instalação e salva timestamp no localStorage', () => {
    const { result } = renderHook(() => usePwaInstall());

    const mockPromptEvent = new Event('beforeinstallprompt') as unknown as BeforeInstallPromptEvent;
    Object.assign(mockPromptEvent, {
      platforms: ['android'],
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'android' }),
      prompt: vi.fn(),
    });

    act(() => {
      window.dispatchEvent(mockPromptEvent as unknown as Event);
    });

    expect(result.current.canInstall).toBe(true);

    act(() => {
      result.current.dismissInstall(7);
    });

    expect(result.current.isDismissed).toBe(true);
    expect(result.current.canInstall).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY_DISMISSED_UNTIL)).toBeDefined();
  });

  it('marca standalone e remove prompt quando evento appinstalled é disparado', () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isStandalone).toBe(true);
    expect(result.current.installed).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });
});
