import { Link } from 'react-router-dom';
import { formatServiceDuration, formatServicePrice } from '../formatters';
import type { Service } from '../types';

type ServiceCardProps = {
  service: Service;
  onSelect?: (service: Service) => void;
};

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

export function ServiceCard({ service, onSelect }: ServiceCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:shadow-[var(--shadow-elevated)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-canvas-neutral)] sm:aspect-[4/3]">
        <img
          src={service.imageSrc}
          alt={service.imageAlt}
          width="1024"
          height="768"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105 motion-reduce:transition-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-base/6 font-bold text-[var(--color-text-primary)] sm:text-lg/7">
          {service.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-xs/5 text-[var(--color-text-secondary)] sm:text-sm/5">
          {service.description}
        </p>

        <dl className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--color-border-default)] pt-3 text-xs sm:text-sm">
          <div>
            <dt className="sr-only">Duração</dt>
            <dd className="flex items-center gap-1.5 font-medium text-[var(--color-brand-primary)]">
              <ClockIcon />
              {formatServiceDuration(service.durationMinutes)}
            </dd>
          </div>
          <div className="text-right">
            <dt className="sr-only">Valor da sessão</dt>
            <dd className="font-bold text-[var(--color-brand-deep)] sm:text-base">
              {formatServicePrice(service.priceInCents)}
            </dd>
          </div>
        </dl>

        <div className="mt-3.5 pt-1">
          {onSelect ? (
            <button
              type="button"
              data-testid={`selecionar-servico-${service.id}`}
              onClick={() => onSelect(service)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--color-brand-strong)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-brand-deep)] active:scale-[0.98] sm:text-sm"
            >
              Selecionar
            </button>
          ) : (
            <Link
              to={`/agendar/${service.id}`}
              data-testid={`selecionar-servico-${service.id}`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--color-brand-strong)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-brand-deep)] active:scale-[0.98] sm:text-sm"
            >
              Selecionar
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
