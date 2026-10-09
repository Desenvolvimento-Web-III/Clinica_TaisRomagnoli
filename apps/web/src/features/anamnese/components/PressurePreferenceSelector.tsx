import type { NivelPressao } from '../types/anamnese';

interface PressurePreferenceSelectorProps {
  value: NivelPressao;
  onChange: (level: NivelPressao) => void;
  disabled?: boolean;
}

const OPCOES_PRESSAO: ReadonlyArray<{
  id: NivelPressao;
  titulo: string;
  descricao: string;
  indicacao: string;
}> = [
  {
    id: 'suave',
    titulo: 'Suave',
    descricao: 'Toque delicado, relaxamento profundo e liberação sensorial.',
    indicacao: 'Ideal para alívio de estresse, sensibilidade ao toque e drenagem.',
  },
  {
    id: 'moderada',
    titulo: 'Moderada',
    descricao: 'Pressão equilibrada, firmeza confortável e alívio de tensões.',
    indicacao: 'Recomendada para a maioria dos tratamentos e dores do dia a dia.',
  },
  {
    id: 'firme',
    titulo: 'Firme / Forte',
    descricao: 'Pressão profunda, liberação miofascial e nós musculares.',
    indicacao: 'Ideal para esportistas e quem prefere massagem descontraturante.',
  },
];

export function PressurePreferenceSelector({
  value,
  onChange,
  disabled = false,
}: PressurePreferenceSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
        Preferência de intensidade da pressão da massagem
      </label>
      <div
        role="radiogroup"
        aria-label="Preferência de pressão da massagem"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {OPCOES_PRESSAO.map((opcao) => {
          const isSelected = value === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(opcao.id)}
              className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all min-h-24 ${
                isSelected
                  ? 'border-[var(--color-brand-strong)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] ring-2 ring-[var(--color-brand-strong)]/20 shadow-sm'
                  : 'border-[var(--color-border-default)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)]'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">{opcao.titulo}</span>
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? 'border-[var(--color-brand-strong)] bg-[var(--color-brand-strong)]'
                        : 'border-[var(--color-border-default)] bg-white'
                    }`}
                  >
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="mt-2 text-xs/5 text-[var(--color-text-secondary)]">
                  {opcao.descricao}
                </p>
              </div>
              <p className="mt-3 text-[11px] font-medium text-[var(--color-brand-deep)]">
                {opcao.indicacao}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
