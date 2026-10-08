import { REGIOES_CORPO_OPCOES } from '../data/initial-anamnese';
import type { RegiaoCorpo } from '../types/anamnese';

interface BodyRegionSelectorProps {
  selectedRegions: RegiaoCorpo[];
  onChange: (regions: RegiaoCorpo[]) => void;
  error?: string;
  disabled?: boolean;
}

export function BodyRegionSelector({
  selectedRegions,
  onChange,
  error,
  disabled = false,
}: BodyRegionSelectorProps) {
  const handleToggle = (regionId: RegiaoCorpo) => {
    if (selectedRegions.includes(regionId)) {
      onChange(selectedRegions.filter((id) => id !== regionId));
    } else {
      onChange([...selectedRegions, regionId]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
          Regiões de maior desconforto ou foco principal
        </label>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {selectedRegions.length} selecionada(s)
        </span>
      </div>

      <div
        role="group"
        aria-label="Regiões do corpo para foco da massagem"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {REGIOES_CORPO_OPCOES.map((opcao) => {
          const isSelected = selectedRegions.includes(opcao.id);
          return (
            <button
              key={opcao.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => handleToggle(opcao.id)}
              className={`flex min-h-14 flex-col justify-center rounded-xl border p-3.5 text-left transition-all ${
                isSelected
                  ? 'border-[var(--color-brand-strong)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] ring-2 ring-[var(--color-brand-strong)]/20 shadow-sm'
                  : 'border-[var(--color-border-default)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-canvas-neutral)]'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{opcao.label}</span>
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    isSelected
                      ? 'border-[var(--color-brand-strong)] bg-[var(--color-brand-strong)] text-white'
                      : 'border-[var(--color-border-default)] bg-white'
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
              </div>
              <span className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {opcao.descricao}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-[var(--color-error-text)]">
          {error}
        </p>
      )}
    </div>
  );
}
