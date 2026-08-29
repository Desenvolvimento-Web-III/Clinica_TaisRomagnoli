import { formatServiceDuration, formatServicePrice } from '../formatters';
import type { Service } from '../types';

type ServiceCardProps = {
  service: Service;
};

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
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

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-elevated)]">
      <div className="aspect-[4/3] overflow-hidden bg-[var(--color-canvas-neutral)]">
        <img
          src={service.imageSrc}
          alt={service.imageAlt}
          width="1024"
          height="768"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02] motion-reduce:transition-none"
        />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg/7 font-semibold text-[var(--color-text-primary)]">{service.name}</h3>
        <p className="mt-2 flex-1 text-sm/5 text-[var(--color-text-secondary)]">
          {service.description}
        </p>

        <dl className="mt-6 flex items-end justify-between gap-4 border-t border-[var(--color-border-default)] pt-4">
          <div>
            <dt className="sr-only">Duração</dt>
            <dd className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
              <ClockIcon />
              {formatServiceDuration(service.durationMinutes)}
            </dd>
          </div>
          <div className="text-right">
            <dt className="text-xs/4 font-medium text-[var(--color-text-secondary)]">
              Valor da sessão
            </dt>
            <dd className="mt-1 text-lg/7 font-bold text-[var(--color-brand-deep)]">
              {formatServicePrice(service.priceInCents)}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
