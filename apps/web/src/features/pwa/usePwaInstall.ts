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

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [installed, setInstalled] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detectar modo standalone (aplicativo já instalado e aberto da tela inicial)
    const checkStandalone = () => {
      const isDisplayStandalone =
        typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;

      const isNavigatorStandalone =
        typeof window !== 'undefined' &&
        'standalone' in window.navigator &&
        Boolean((window.navigator as unknown as { standalone: boolean }).standalone);

      return Boolean(isDisplayStandalone || isNavigatorStandalone);
    };

    const standalone = checkStandalone();
    setIsStandalone(standalone);

    // 2. Detectar se é Safari no iOS (onde o beforeinstallprompt não existe)
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(ua);
      const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua);
      setIsIos(isIosDevice && isSafari);
    }

    // 3. Checar persistência de dispensa no localStorage
    try {
      const dismissedUntil = localStorage.getItem(STORAGE_KEY_DISMISSED_UNTIL);
      if (dismissedUntil) {
        const expiresAt = Number(dismissedUntil);
        if (Date.now() < expiresAt) {
          setIsDismissed(true);
        } else {
          localStorage.removeItem(STORAGE_KEY_DISMISSED_UNTIL);
          setIsDismissed(false);
        }
      } else {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }

    // 4. Capturar evento beforeinstallprompt do navegador
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 5. Escutar confirmação de instalação do app
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
