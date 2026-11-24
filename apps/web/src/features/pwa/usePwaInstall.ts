import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const STORAGE_KEY_DISMISSED_UNTIL = 'clinica_pwa_install_dismissed_until';
export const DEFAULT_DISMISS_DAYS = 7;

function checkStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isDisplayStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
  const isNavigatorStandalone =
    'standalone' in window.navigator &&
    Boolean((window.navigator as unknown as { standalone: boolean }).standalone);
  return Boolean(isDisplayStandalone || isNavigatorStandalone);
}

function checkIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIosDevice = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua);
  return Boolean(isIosDevice && isSafari);
}

function checkDismissed(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const dismissedUntil = localStorage.getItem(STORAGE_KEY_DISMISSED_UNTIL);
    if (!dismissedUntil) return false;
    const expiresAt = Number(dismissedUntil);
    if (Date.now() < expiresAt) {
      return true;
    }
    localStorage.removeItem(STORAGE_KEY_DISMISSED_UNTIL);
    return false;
  } catch {
    return false;
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => checkStandalone());
  const [isIos] = useState<boolean>(() => checkIosSafari());
  const [isDismissed, setIsDismissed] = useState<boolean>(() => checkDismissed());
  const [installed, setInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Capturar evento beforeinstallprompt do navegador
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Escutar confirmação de instalação do app
    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Falha ao acionar instalação do PWA:', err);
      return false;
    }
  }, [deferredPrompt]);

  const dismissInstall = useCallback((days = DEFAULT_DISMISS_DAYS) => {
    try {
      const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY_DISMISSED_UNTIL, String(expiresAt));
    } catch {
      // Ignora erro se cookies/storage estiverem bloqueados
    }
    setIsDismissed(true);
  }, []);

  const canInstall =
    !isStandalone && !installed && !isDismissed && (Boolean(deferredPrompt) || isIos);

  return {
    canInstall,
    isStandalone,
    isIos,
    isDismissed,
    installed,
    hasPrompt: Boolean(deferredPrompt),
    installApp,
    dismissInstall,
  };
}
