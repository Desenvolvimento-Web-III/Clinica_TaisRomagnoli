import { useState } from 'react';

interface PixQrCodeProps {
  valorFormatado: string;
  pixPayload?: string;
}

export function PixQrCode({
  valorFormatado,
  pixPayload = '00020126580014BR.GOV.BCB.PIX0136apoiovestibular@projeta.com.5204000053039865802BR5925Projeto MedVet0009Sao Paulo62070503***6304ABCD',
}: PixQrCodeProps) {
  const [copiado, setCopiado] = useState(false);

  const handleCopiar = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(pixPayload);
      }
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 3000);
    } catch {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 3000);
    }
  };

  return (
    <div
      data-testid="pix-qrcode-container"
      className="flex flex-col items-center rounded-2xl border border-[var(--color-brand-primary)]/30 bg-white p-5 text-center shadow-sm"
    >
      <div className="relative flex h-52 w-52 items-center justify-center rounded-2xl border border-[var(--color-border-default)] bg-white p-3 shadow-inner">
        {/* QR Code SVG Representation */}
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          shapeRendering="crispEdges"
          aria-label="Código QR para pagamento via PIX"
        >
          {/* Top-Left Position Detection Pattern */}
          <rect x="0" y="0" width="28" height="28" fill="#000000" rx="3" />
          <rect x="4" y="4" width="20" height="20" fill="#ffffff" rx="2" />
          <rect x="8" y="8" width="12" height="12" fill="#000000" rx="1.5" />

          {/* Top-Right Position Detection Pattern */}
          <rect x="72" y="0" width="28" height="28" fill="#000000" rx="3" />
          <rect x="76" y="4" width="20" height="20" fill="#ffffff" rx="2" />
          <rect x="80" y="8" width="12" height="12" fill="#000000" rx="1.5" />

          {/* Bottom-Left Position Detection Pattern */}
          <rect x="0" y="72" width="28" height="28" fill="#000000" rx="3" />
          <rect x="4" y="76" width="20" height="20" fill="#ffffff" rx="2" />
          <rect x="8" y="80" width="12" height="12" fill="#000000" rx="1.5" />

          {/* Data Modules Grid Patterns */}
          <rect x="32" y="4" width="4" height="4" fill="#000000" />
          <rect x="40" y="4" width="4" height="4" fill="#000000" />
          <rect x="48" y="4" width="4" height="4" fill="#000000" />
          <rect x="60" y="4" width="4" height="4" fill="#000000" />
          <rect x="36" y="8" width="4" height="4" fill="#000000" />
          <rect x="52" y="8" width="4" height="4" fill="#000000" />
          <rect x="64" y="8" width="4" height="4" fill="#000000" />
          <rect x="32" y="12" width="4" height="4" fill="#000000" />
          <rect x="44" y="12" width="4" height="4" fill="#000000" />
          <rect x="56" y="12" width="4" height="4" fill="#000000" />
          <rect x="36" y="16" width="4" height="4" fill="#000000" />
          <rect x="48" y="16" width="4" height="4" fill="#000000" />
          <rect x="60" y="16" width="4" height="4" fill="#000000" />
          <rect x="32" y="20" width="4" height="4" fill="#000000" />
          <rect x="40" y="20" width="4" height="4" fill="#000000" />
          <rect x="52" y="20" width="4" height="4" fill="#000000" />
          <rect x="64" y="20" width="4" height="4" fill="#000000" />

          {/* Middle Left & Right Patterns */}
          <rect x="4" y="32" width="4" height="4" fill="#000000" />
          <rect x="12" y="32" width="4" height="4" fill="#000000" />
          <rect x="20" y="32" width="4" height="4" fill="#000000" />
          <rect x="76" y="32" width="4" height="4" fill="#000000" />
          <rect x="88" y="32" width="4" height="4" fill="#000000" />
          <rect x="8" y="36" width="4" height="4" fill="#000000" />
          <rect x="16" y="36" width="4" height="4" fill="#000000" />
          <rect x="72" y="36" width="4" height="4" fill="#000000" />
          <rect x="84" y="36" width="4" height="4" fill="#000000" />
          <rect x="92" y="36" width="4" height="4" fill="#000000" />
          <rect x="4" y="44" width="4" height="4" fill="#000000" />
          <rect x="16" y="44" width="4" height="4" fill="#000000" />
          <rect x="24" y="44" width="4" height="4" fill="#000000" />
          <rect x="76" y="44" width="4" height="4" fill="#000000" />
          <rect x="88" y="44" width="4" height="4" fill="#000000" />
          <rect x="8" y="52" width="4" height="4" fill="#000000" />
          <rect x="20" y="52" width="4" height="4" fill="#000000" />
          <rect x="72" y="52" width="4" height="4" fill="#000000" />
          <rect x="80" y="52" width="4" height="4" fill="#000000" />
          <rect x="92" y="52" width="4" height="4" fill="#000000" />
          <rect x="4" y="60" width="4" height="4" fill="#000000" />
          <rect x="12" y="60" width="4" height="4" fill="#000000" />
          <rect x="24" y="60" width="4" height="4" fill="#000000" />
          <rect x="76" y="60" width="4" height="4" fill="#000000" />
          <rect x="84" y="60" width="4" height="4" fill="#000000" />

          {/* Bottom Right Patterns */}
          <rect x="32" y="72" width="4" height="4" fill="#000000" />
          <rect x="44" y="72" width="4" height="4" fill="#000000" />
          <rect x="56" y="72" width="4" height="4" fill="#000000" />
          <rect x="72" y="72" width="4" height="4" fill="#000000" />
          <rect x="84" y="72" width="4" height="4" fill="#000000" />
          <rect x="36" y="76" width="4" height="4" fill="#000000" />
          <rect x="48" y="76" width="4" height="4" fill="#000000" />
          <rect x="64" y="76" width="4" height="4" fill="#000000" />
          <rect x="76" y="76" width="4" height="4" fill="#000000" />
          <rect x="92" y="76" width="4" height="4" fill="#000000" />
          <rect x="32" y="80" width="4" height="4" fill="#000000" />
          <rect x="40" y="80" width="4" height="4" fill="#000000" />
          <rect x="52" y="80" width="4" height="4" fill="#000000" />
          <rect x="60" y="80" width="4" height="4" fill="#000000" />
          <rect x="72" y="80" width="4" height="4" fill="#000000" />
          <rect x="88" y="80" width="4" height="4" fill="#000000" />
          <rect x="36" y="88" width="4" height="4" fill="#000000" />
          <rect x="44" y="88" width="4" height="4" fill="#000000" />
          <rect x="56" y="88" width="4" height="4" fill="#000000" />
          <rect x="68" y="88" width="4" height="4" fill="#000000" />
          <rect x="80" y="88" width="4" height="4" fill="#000000" />
          <rect x="92" y="88" width="4" height="4" fill="#000000" />
          <rect x="32" y="92" width="4" height="4" fill="#000000" />
          <rect x="48" y="92" width="4" height="4" fill="#000000" />
          <rect x="64" y="92" width="4" height="4" fill="#000000" />
          <rect x="76" y="92" width="4" height="4" fill="#000000" />
          <rect x="84" y="92" width="4" height="4" fill="#000000" />
        </svg>

        {/* Center Emblem Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#7A60B8] p-1.5 shadow-md">
            <svg
              className="h-full w-full text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9 9 0 100-18 9 9 0 000 18z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
        <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-brand-primary)]" />
        <span>Pague com Pix • {valorFormatado}</span>
      </div>

      <div className="mt-3 w-full">
        <label
          htmlFor="pix-copia-cola"
          className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]"
        >
          Chave Pix (Código Copia e Cola)
        </label>
        <div className="mt-1.5 flex flex-col gap-2">
          <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-2.5 text-left font-mono text-[11px] text-[var(--color-text-secondary)] break-all select-all">
            {pixPayload}
          </div>
          <button
            type="button"
            data-testid="copiar-pix-btn"
            onClick={handleCopiar}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] ${
              copiado
                ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success-border)]'
                : 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] hover:bg-[var(--color-brand-primary)] hover:text-white'
            }`}
          >
            {copiado ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Código Pix Copiado!
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copiar código Pix
              </>
            )}
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        Escaneie o QR Code com o app do seu banco ou copie o código acima para efetuar o pagamento
        do sinal.
      </p>
    </div>
  );
}
