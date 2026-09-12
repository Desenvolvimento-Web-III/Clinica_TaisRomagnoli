import React from 'react';
import type { Agendamento } from '../types/agendamento';

interface CancelModalProps {
  agendamento: Agendamento | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (agendamentoId: string) => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  agendamento,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !agendamento) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      data-testid="cancel-modal"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)] p-4 backdrop-blur-xs sm:items-center"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-elevated)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-error-bg)] text-[var(--color-error-text)]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3
              id="cancel-modal-title"
              className="text-lg font-semibold text-[var(--color-text-primary)]"
            >
              Cancelar agendamento?
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">{agendamento.servicoNome}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4 text-sm/5 text-[var(--color-warning-text)]">
          <p className="font-semibold">Atenção às regras de cancelamento:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              Cancelamento permitido com pelo menos <strong>3 horas de antecedência</strong>.
            </li>
            <li>Não há estorno do sinal em dinheiro.</li>
            <li>
              Se a antecedência for respeitada, o sinal de{' '}
              <strong>R$ {agendamento.sinalPago.toFixed(2).replace('.', ',')}</strong> fica
              acumulado como crédito para reagendamento.
            </li>
            <li>Cancelamentos com menos de 3 horas ou ausência implicam a perda do sinal.</li>
          </ul>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-[var(--color-brand-deep)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-brand-deep)] transition-colors hover:bg-[var(--color-brand-soft)]"
          >
            Voltar
          </button>
          <button
            type="button"
            data-testid="confirm-cancel-button"
            onClick={() => {
              onConfirm(agendamento.id);
              onClose();
            }}
            className="min-h-11 rounded-xl bg-[var(--color-error-text)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-90"
          >
            Confirmar cancelamento
          </button>
        </div>
      </div>
    </div>
  );
};
