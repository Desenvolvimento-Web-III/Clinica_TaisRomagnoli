import { useState } from 'react';
import { usePwaInstall } from '../usePwaInstall';

export type PwaInstallBannerProps = Readonly<{
  className?: string;
}>;

export function PwaInstallBanner({ className = '' }: PwaInstallBannerProps) {
  const { canInstall, isIos, hasPrompt, installApp, dismissInstall } = usePwaInstall();
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!canInstall) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIos && !hasPrompt) {
      setShowIosInstructions((prev) => !prev);
      return;
    }

    setInstalling(true);
    try {
      await installApp();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <aside
      aria-label="Instalação do aplicativo"
      className={`mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-gradient-to-r from-white via-[var(--color-brand-surface)] to-[var(--color-brand-soft)]/40 p-4 shadow-sm transition-all sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <img
              src="/pwa-192x192.png"
              alt="Ícone do app Tais Romagnoli"
              className="h-12 w-12 rounded-xl object-contain shadow-xs border border-[var(--color-border-default)] shrink-0 sm:h-14 sm:w-14"
              width="56"
              height="56"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--color-brand-deep)] sm:text-base">
                  Instalar Tais Romagnoli
                </h2>
                <span className="rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-brand-deep)] uppercase tracking-wider">
                  App PWA
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] sm:text-sm">
                Acesse seus agendamentos e horários direto da tela inicial do seu celular.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => dismissInstall(7)}
              className="min-h-10 rounded-xl px-3 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--color-text-primary)] sm:min-h-11 sm:px-4 sm:text-sm"
            >
              Mais tarde
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installing}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-[var(--color-brand-deep)] active:scale-95 disabled:opacity-50 sm:min-h-11 sm:px-5 sm:text-sm"
            >
              {installing
                ? 'Instalando...'
                : isIos && !hasPrompt
                  ? 'Como instalar'
                  : 'Instalar agora'}
            </button>
          </div>
        </div>

        {/* Guia explicativo passo a passo para iOS / Safari */}
        {showIosInstructions && isIos && (
          <div
            role="region"
            aria-label="Instruções para iPhone e iPad"
            className="mt-3.5 rounded-xl border border-[var(--color-border-default)] bg-white/90 p-3.5 text-xs text-[var(--color-text-primary)] animate-fadeIn"
          >
            <p className="font-semibold text-[var(--color-brand-deep)] mb-1.5">
              Para instalar no iPhone ou iPad (Safari):
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[var(--color-text-secondary)]">
              <li>
                Toque no botão <strong>Compartilhar</strong> (ícone do quadrado com a seta para cima
                na barra do navegador).
              </li>
              <li>
                Role as opções e selecione <strong>"Adicionar à Tela de Início"</strong>.
              </li>
              <li>
                Confirme tocando em <strong>"Adicionar"</strong> no canto superior direito.
              </li>
            </ol>
          </div>
        )}
      </div>
    </aside>
  );
}
