export type AnamneseSectionId = 'queixa' | 'saude' | 'habitos' | 'consentimento';

interface AnamneseStepIndicatorProps {
  currentSection: AnamneseSectionId;
  onSectionClick: (section: AnamneseSectionId) => void;
  completedSections: Set<AnamneseSectionId>;
}

const SECTIONS: ReadonlyArray<{ id: AnamneseSectionId; title: string; shortTitle: string }> = [
  { id: 'queixa', title: '1. Motivo & Queixa', shortTitle: 'Queixa' },
  { id: 'saude', title: '2. Histórico de Saúde', shortTitle: 'Saúde' },
  { id: 'habitos', title: '3. Preferências & Hábitos', shortTitle: 'Preferências' },
  { id: 'consentimento', title: '4. Consentimento', shortTitle: 'Termos' },
];

export function AnamneseStepIndicator({
  currentSection,
  onSectionClick,
  completedSections,
}: AnamneseStepIndicatorProps) {
  return (
    <nav aria-label="Progresso da ficha de anamnese" className="mb-6">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {SECTIONS.map((section, idx) => {
          const isActive = currentSection === section.id;
          const isCompleted = completedSections.has(section.id);

          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSectionClick(section.id)}
                aria-current={isActive ? 'step' : undefined}
                className={`flex w-full min-h-12 flex-col justify-center rounded-xl border p-2.5 text-left transition-all sm:p-3 ${
                  isActive
                    ? 'border-[var(--color-brand-strong)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] ring-2 ring-[var(--color-brand-strong)]/20 shadow-sm'
                    : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                      : 'border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-deep)]">
                    Etapa {idx + 1}
                  </span>
                  {isCompleted && (
                    <span aria-label="Etapa preenchida" className="text-emerald-600">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  )}
                </div>
                <span className="mt-0.5 truncate text-xs font-bold sm:text-sm">
                  {section.shortTitle}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
