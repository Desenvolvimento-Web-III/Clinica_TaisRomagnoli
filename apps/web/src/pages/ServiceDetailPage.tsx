import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/ui/AppShell';
import { serviceCatalog } from '@/features/services/catalog';
import {
  formatServiceDuration,
  formatServicePrice,
  calculateServiceSinal,
} from '@/features/services/formatters';
import { subscribeToServicesFromFirestore } from '@/features/services/service-firestore-repository';
import type { Service } from '@/features/services/types';

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

export function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [firestoreServices, setFirestoreServices] = useState<readonly Service[] | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToServicesFromFirestore((updatedServices) => {
      setFirestoreServices(updatedServices);
    });

    return () => unsubscribe();
  }, []);

  const allServices = firestoreServices ?? serviceCatalog;
  const service = useMemo(() => {
    return allServices.find((s) => s.id === serviceId);
  }, [allServices, serviceId]);

  if (!service) {
    return (
      <AppShell
        activeTab="inicio"
        eyebrow="Tais Romagnoli — Massoterapia"
        title="Serviço não encontrado"
        description="O serviço solicitado não foi localizado no catálogo da clínica."
      >
        <div className="mx-auto max-w-lg rounded-2xl border border-[var(--color-border-default)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <p className="text-base text-[var(--color-text-secondary)]">
            O serviço pode ter sido desativado ou o endereço digitado está incorreto.
          </p>
          <div className="mt-6">
            <Link
              to="/servicos"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-brand-strong)] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[var(--color-brand-deep)]"
            >
              Voltar ao catálogo de serviços
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const { sinalInCents, saldoInCents, percentual } = calculateServiceSinal(service);

  return (
    <AppShell
      activeTab="inicio"
      eyebrow="Tais Romagnoli — Massoterapia"
      title={service.name}
      description="Confira todas as informações da sessão antes de realizar o seu agendamento."
      headerAside={
        <button
          type="button"
          onClick={() => navigate('/servicos')}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white hover:text-[var(--color-brand-deep)]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Voltar aos serviços</span>
        </button>
      }
    >
      <div className="mx-auto max-w-3xl">
        <article
          data-testid="service-detail-container"
          className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-elevated)]"
        >
          {/* Imagem do Serviço */}
          {service.imageSrc && (
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-canvas-neutral)] sm:aspect-[21/9]">
              <img
                src={service.imageSrc}
                alt={service.imageAlt || service.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-deep)]">
                  Sessão de Massoterapia
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
                  {service.name}
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-soft)] px-3.5 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                <ClockIcon />
                <span>{formatServiceDuration(service.durationMinutes)}</span>
              </span>
            </div>

            {/* Descrição */}
            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Descrição do serviço
              </h2>
              <p className="mt-2 text-base/7 text-[var(--color-text-primary)]">
                {service.description}
              </p>
            </div>

            {/* Detalhamento de Valores e Sinal */}
            <div className="mt-8 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Valores e Condições de Reserva
              </h2>

              <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-4 shadow-2xs">
                  <dt className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Valor total da sessão
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-[var(--color-brand-deep)]">
                    {formatServicePrice(service.priceInCents)}
                  </dd>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-2xs">
                  <dt className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Duração estimada
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-xl font-bold text-[var(--color-brand-primary)]">
                    <ClockIcon />
                    <span>{formatServiceDuration(service.durationMinutes)}</span>
                  </dd>
                </div>

                <div className="rounded-xl border border-[var(--color-brand-primary)] bg-[var(--color-brand-soft)] p-4 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-sm font-semibold text-[var(--color-brand-deep)]">
                      Sinal para reserva ({percentual}%)
                    </dt>
                    <dd className="text-xl font-bold text-[var(--color-brand-deep)]">
                      {formatServicePrice(sinalInCents)}
                    </dd>
                  </div>
                  <p className="mt-2 text-xs/5 text-[var(--color-text-secondary)]">
                    Conforme as regras da clínica, o sinal de reserva garante o seu horário
                    reservado com exclusividade na agenda. O saldo restante de{' '}
                    <strong className="text-[var(--color-text-primary)]">
                      {formatServicePrice(saldoInCents)}
                    </strong>{' '}
                    será acertado presencialmente no dia do atendimento.
                  </p>
                </div>
              </dl>
            </div>

            {/* Ações */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/servicos"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-text-primary)]"
              >
                Voltar aos serviços
              </Link>

              <Link
                to={`/agendar/${service.id}`}
                data-testid="agendar-servico-btn"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[var(--color-brand-strong)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-brand-deep)] active:scale-[0.98]"
              >
                Agendar este serviço
              </Link>
            </div>
          </div>
        </article>
      </div>
    </AppShell>
  );
}
