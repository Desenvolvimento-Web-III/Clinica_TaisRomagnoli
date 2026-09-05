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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs transition-opacity animate-fade-in"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-xl border border-slate-100 transition-all transform scale-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
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
            <h3 id="cancel-modal-title" className="text-lg font-bold text-slate-900">
              Cancelar Agendamento?
            </h3>
            <p className="text-xs text-slate-500">{agendamento.servicoNome}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600 border border-slate-200/70">
          <p className="font-semibold text-slate-800">Atenção às regras de cancelamento:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              Cancelamento permitido com pelo menos <strong>3 horas de antecedência</strong>.
            </li>
            <li>Não há estorno do sinal em dinheiro.</li>
            <li>
              Se a antecedência for respeitada, o sinal de{' '}
              <strong className="text-slate-900">
                R$ {agendamento.sinalPago.toFixed(2).replace('.', ',')}
              </strong>{' '}
              fica acumulado como crédito para reagendamento.
            </li>
            <li>Cancelamentos com menos de 3 horas ou ausência implicam a perda do sinal.</li>
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-slate-400 focus:outline-hidden"
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
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors focus:ring-2 focus:ring-rose-500 focus:outline-hidden shadow-xs"
          >
            Confirmar Cancelamento
          </button>
        </div>
      </div>
    </div>
  );
};
