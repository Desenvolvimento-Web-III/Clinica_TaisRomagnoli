import { BrandLogo } from '@/components/ui/BrandLogo';
import { getActiveServices, serviceCatalog } from '@/features/services/catalog';
import { ServiceCard } from '@/features/services/components/ServiceCard';
import type { Service } from '@/features/services/types';

type ServiceCatalogPageProps = {
  services?: readonly Service[];
};

export function ServiceCatalogPage({ services = serviceCatalog }: ServiceCatalogPageProps) {
  const activeServices = getActiveServices(services);

  return (
    <div className="relative min-h-dvh bg-[var(--color-brand-soft)] text-[var(--color-text-primary)]">
      <BrandLogo />
      <header className="bg-[var(--color-brand-strong)] text-white">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-32 sm:px-6 sm:pb-10 lg:px-8">
          <p className="text-sm/5 font-semibold">Tais Romagnoli — Massoterapia</p>
          <h1 className="mt-3 text-2xl/8 font-bold">Serviços</h1>
          <p className="mt-2 max-w-2xl text-sm/5 text-white sm:text-base/6">
            Conheça as sessões disponíveis e confira a duração e o valor antes de escolher.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section aria-labelledby="available-services-title">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2
                id="available-services-title"
                className="text-lg/7 font-semibold text-[var(--color-text-primary)]"
              >
                Serviços disponíveis
              </h2>
              <p className="mt-1 text-sm/5 text-[var(--color-text-secondary)]">
                Escolha com calma a sessão que combina com o seu momento.
              </p>
            </div>
            {activeServices.length > 0 && (
              <p className="hidden text-sm/5 font-medium text-[var(--color-text-secondary)] sm:block">
                {activeServices.length} {activeServices.length === 1 ? 'serviço' : 'serviços'}
              </p>
            )}
          </div>

          {activeServices.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {activeServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div
              role="status"
              className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface)] p-6 text-sm/5 text-[var(--color-text-secondary)] shadow-[var(--shadow-card)]"
            >
              Nenhum serviço está disponível no momento. Volte em breve para conferir novas opções.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
