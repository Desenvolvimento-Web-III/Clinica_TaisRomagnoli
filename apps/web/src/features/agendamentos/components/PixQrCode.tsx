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
      className="flex flex-col items-center rounded-2xl border border-[var(--color-brand-primary)]/30 bg-white p-5 text-center shadow-sm sm:p-6"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
        <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-brand-primary)]" />
        <span>Pague com Pix • {valorFormatado}</span>
      </div>

      <div className="mt-4 w-full">
        <label
          htmlFor="pix-copia-cola"
          className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]"
        >
          Chave Pix (Código Copia e Cola)
        </label>
        <div className="mt-2 flex flex-col gap-2.5">
          <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-3 text-left font-mono text-xs text-[var(--color-text-secondary)] break-all select-all">
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

      <p className="mt-4 text-xs leading-relaxed text-[var(--color-text-secondary)]">
        Copie a chave Pix acima e utilize no aplicativo do seu banco para efetuar o pagamento do
        sinal.
      </p>
    </div>
  );
}
