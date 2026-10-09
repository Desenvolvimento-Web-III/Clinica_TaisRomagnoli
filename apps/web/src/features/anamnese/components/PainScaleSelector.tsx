import type { IntensidadeDor } from '../types/anamnese';

interface PainScaleSelectorProps {
  value: IntensidadeDor;
  onChange: (level: IntensidadeDor) => void;
  disabled?: boolean;
}

function getPainDescription(level: IntensidadeDor): { label: string; color: string } {
  if (level === 0) return { label: 'Sem dor ou desconforto', color: 'text-emerald-700' };
  if (level <= 3)
    return { label: 'Desconforto leve / cansaço muscular', color: 'text-emerald-800' };
  if (level <= 6)
    return { label: 'Dor moderada / nós de tensão incômodos', color: 'text-amber-800' };
  if (level <= 8) return { label: 'Dor intensa / rigidez acentuada', color: 'text-orange-800' };
  return { label: 'Dor muito intensa / quadro agudo', color: 'text-rose-800' };
}

export function PainScaleSelector({ value, onChange, disabled = false }: PainScaleSelectorProps) {
  const { label, color } = getPainDescription(value);

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
            Nível de dor ou desconforto atual
          </label>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Indique em uma escala de 0 (sem dor) a 10 (dor máxima)
          </p>
        </div>
        <div className="mt-1 flex items-center gap-2 sm:mt-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-base font-bold text-[var(--color-brand-deep)]">
            {value}
          </span>
          <span className={`text-xs font-semibold ${color}`}>{label}</span>
        </div>
      </div>

      {/* Grid com os botões numéricos de 0 a 10 */}
      <div
        role="radiogroup"
        aria-label="Escala de dor de 0 a 10"
        className="grid grid-cols-6 gap-1.5 sm:grid-cols-11 sm:gap-2"
      >
        {([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((num) => {
          const isSelected = value === num;
          return (
            <button
              key={num}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(num)}
              className={`flex min-h-11 min-w-10 items-center justify-center rounded-xl font-semibold transition-all ${
                isSelected
                  ? 'bg-[var(--color-brand-strong)] text-white ring-2 ring-[var(--color-brand-primary)] shadow-sm'
                  : 'border border-[var(--color-border-default)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-canvas-neutral)]'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
