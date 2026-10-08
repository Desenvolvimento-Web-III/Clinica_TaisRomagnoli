import type { ChangeEvent } from 'react';
import type { CondicaoSaudeItem } from '../types/anamnese';

interface AnamneseRadioGroupProps {
  id: string;
  pergunta: string;
  descricaoAjuda?: string;
  placeholderDetalhes?: string;
  value: CondicaoSaudeItem;
  onChange: (newValue: CondicaoSaudeItem) => void;
  error?: string;
  disabled?: boolean;
}

export function AnamneseRadioGroup({
  id,
  pergunta,
  descricaoAjuda,
  placeholderDetalhes = 'Descreva aqui mais detalhes para o atendimento seguro...',
  value,
  onChange,
  error,
  disabled = false,
}: AnamneseRadioGroupProps) {
  const handleRadioChange = (resposta: boolean) => {
    onChange({
      resposta,
      detalhes: resposta ? value.detalhes : '',
    });
  };

  const handleDetalhesChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({
      resposta: true,
      detalhes: e.target.value,
    });
  };

  return (
    <fieldset
      className={`rounded-2xl border bg-white p-5 transition-colors sm:p-6 ${
        error
          ? 'border-[var(--color-error-border)] bg-[var(--color-error-bg)]/20'
          : value.resposta
            ? 'border-[var(--color-brand-primary)] ring-1 ring-[var(--color-brand-primary)]/20 shadow-sm'
            : 'border-[var(--color-border-default)]'
      }`}
    >
      <div className="flex flex-col gap-1">
        <legend className="text-base font-semibold text-[var(--color-text-primary)]">
          {pergunta}
        </legend>
        {descricaoAjuda && (
          <p className="text-xs/5 text-[var(--color-text-secondary)]">{descricaoAjuda}</p>
        )}
      </div>

      {/* Opções Sim / Não */}
      <div
        className="mt-4 flex flex-wrap items-center gap-3"
        role="radiogroup"
        aria-label={pergunta}
      >
        {/* Opção Não */}
        <label
          htmlFor={`${id}-nao`}
          className={`relative flex min-h-12 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
            !value.resposta
              ? 'border-[var(--color-brand-strong)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] ring-2 ring-[var(--color-brand-strong)]/20'
              : 'border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)]'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <input
            id={`${id}-nao`}
            type="radio"
            name={id}
            value="nao"
            disabled={disabled}
            checked={!value.resposta}
            onChange={() => handleRadioChange(false)}
            className="h-4 w-4 text-[var(--color-brand-strong)] focus:ring-[var(--color-brand-primary)]"
          />
          <span>Não</span>
        </label>

        {/* Opção Sim */}
        <label
          htmlFor={`${id}-sim`}
          className={`relative flex min-h-12 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
            value.resposta
              ? 'border-[var(--color-brand-strong)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] ring-2 ring-[var(--color-brand-strong)]/20'
              : 'border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)]'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <input
            id={`${id}-sim`}
            type="radio"
            name={id}
            value="sim"
            disabled={disabled}
            checked={value.resposta}
            onChange={() => handleRadioChange(true)}
            className="h-4 w-4 text-[var(--color-brand-strong)] focus:ring-[var(--color-brand-primary)]"
          />
          <span>Sim</span>
        </label>
      </div>

      {/* Campo condicional para detalhes quando Sim é selecionado */}
      {value.resposta && (
        <div className="mt-4 pt-3 border-t border-[var(--color-border-default)]">
          <label
            htmlFor={`${id}-detalhes`}
            className="mb-1.5 block text-xs font-semibold text-[var(--color-brand-deep)]"
          >
            Detalhes para a terapeuta{' '}
            <span className="text-[var(--color-text-secondary)] font-normal">
              (opcional ou recomendável)
            </span>
          </label>
          <textarea
            id={`${id}-detalhes`}
            rows={2}
            disabled={disabled}
            value={value.detalhes || ''}
            onChange={handleDetalhesChange}
            placeholder={placeholderDetalhes}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-icon-muted)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)] ${
              error ? 'border-[var(--color-error-border)]' : 'border-[var(--color-border-default)]'
            }`}
          />
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-xs font-medium text-[var(--color-error-text)]"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
