import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatServiceDuration, formatServicePrice, calculateServiceSinal } from '../formatters';
import type { Service } from '../types';

export interface ServiceDetailsModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
  onAgendarClick?: (service: Service) => void;
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

export const ServiceDetailsModal: React.FC<ServiceDetailsModalProps> = ({
  service,
  isOpen,
  onClose,
  onAgendarClick,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !service) return null;

  const { sinalInCents, saldoInCents, percentual } = calculateServiceSinal(service);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="servico-detalhes-title"
      data-testid="servico-detalhes-modal"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)] p-4 backdrop-blur-xs sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-elevated)] sm:p-7">
        {/* Cabeçalho do Modal com Botão Fechar */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-default)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-deep)]">
                Detalhes do Serviço
              </p>
              <h2
                id="servico-detalhes-title"
                className="text-lg font-bold text-[var(--color-text-primary)]"
              >
                {service.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do serviço"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-text-primary)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Imagem do Serviço */}
        {service.imageSrc && (
          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)]">
            <img
              src={service.imageSrc}
              alt={service.imageAlt || service.name}
              className="aspect-video w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Descrição */}
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Sobre o atendimento
          </h3>
          <p className="mt-1 text-sm/6 text-[var(--color-text-primary)]">{service.description}</p>
        </div>

        {/* Valores, Duração e Sinal */}
        <div className="mt-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface)] p-4 shadow-xs">
          <dl className="grid grid-cols-2 gap-3 divide-y-0 text-sm">
            {/* Duração */}
            <div className="rounded-xl bg-[var(--color-canvas-neutral)] p-3">
              <dt className="text-xs font-medium text-[var(--color-text-secondary)]">
                Duração da sessão
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-bold text-[var(--color-brand-primary)]">
                <ClockIcon />
                <span>{formatServiceDuration(service.durationMinutes)}</span>
              </dd>
            </div>

            {/* Valor Total */}
            <div className="rounded-xl bg-[var(--color-canvas-neutral)] p-3">
              <dt className="text-xs font-medium text-[var(--color-text-secondary)]">
                Valor total
              </dt>
              <dd className="mt-1 font-bold text-[var(--color-brand-deep)]">
                {formatServicePrice(service.priceInCents)}
              </dd>
            </div>

            {/* Sinal de Reserva (30%) */}
            <div className="col-span-2 rounded-xl border border-[var(--color-brand-primary)] bg-[var(--color-brand-soft)] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs font-semibold text-[var(--color-brand-deep)]">
                  Sinal para reserva ({percentual}%)
                </dt>
                <dd className="text-base font-bold text-[var(--color-brand-deep)]">
                  {formatServicePrice(sinalInCents)}
                </dd>
              </div>
              <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
                O sinal garante a sua vaga na agenda da clínica. Saldo de{' '}
                <strong className="text-[var(--color-text-primary)]">
                  {formatServicePrice(saldoInCents)}
                </strong>{' '}
                será acertado presencialmente no dia do atendimento.
              </p>
            </div>
          </dl>
        </div>

        {/* Ações */}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-text-primary)]"
          >
            Voltar ao catálogo
          </button>

          {onAgendarClick ? (
            <button
              type="button"
              data-testid="modal-agendar-btn"
              onClick={() => onAgendarClick(service)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--color-brand-strong)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-brand-deep)] active:scale-[0.98]"
            >
              Agendar horário
            </button>
          ) : (
            <Link
              to={`/agendar/${service.id}`}
              data-testid="modal-agendar-btn"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--color-brand-strong)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-brand-deep)] active:scale-[0.98]"
            >
              Agendar horário
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
