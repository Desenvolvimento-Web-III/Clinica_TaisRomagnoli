import { useEffect, useState } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { getActiveServices, serviceCatalog } from '@/features/services/catalog';
import { ServiceCard } from '@/features/services/components/ServiceCard';
import { subscribeToServicesFromFirestore } from '@/features/services/service-firestore-repository';
import type { Service } from '@/features/services/types';

type ServiceCatalogPageProps = {
  services?: readonly Service[];
};

export function ServiceCatalogPage({ services }: ServiceCatalogPageProps) {
  const [firestoreServices, setFirestoreServices] = useState<readonly Service[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (services) return;

    const unsubscribe = subscribeToServicesFromFirestore((updatedServices) => {
      setFirestoreServices(updatedServices);
    });

    return () => unsubscribe();
  }, [services]);

  const currentServices = services ?? firestoreServices ?? serviceCatalog;
  const activeServices = getActiveServices(currentServices);

  const filteredServices = activeServices.filter((service) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      service.name.toLowerCase().includes(query) ||
      service.description.toLowerCase().includes(query)
    );
  });

  return (
    <AppShell
      activeTab="inicio"
      eyebrow="Tais Romagnoli — Massoterapia"
      title="Serviços"
      description="Conheça as sessões disponíveis e confira duração e valor com transparência antes de escolher."
      headerAside={
        <div className="flex w-full flex-col gap-3 md:w-auto">
          {/* Barra de Pesquisa inspirada na imagem */}
          <div className="relative w-full md:w-72">
            <label htmlFor="search-services-input" className="sr-only">
              Pesquisar serviços
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 text-white/70">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </span>
              <input
                id="search-services-input"
                type="text"
                data-testid="search-services-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquise"
                className="w-full rounded-full border border-white/30 bg-white/20 py-2.5 pl-10 pr-9 text-sm text-white placeholder-white/70 shadow-sm backdrop-blur-md transition-all focus:border-white focus:bg-white focus:text-[var(--color-text-primary)] focus:placeholder-[var(--color-text-secondary)] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  data-testid="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar pesquisa"
                  className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white focus:text-[var(--color-text-primary)]"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      }
    >
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
              {filteredServices.length}{' '}
              {filteredServices.length === 1 ? 'serviço encontrado' : 'serviços encontrados'}
            </p>
          )}
        </div>

        {activeServices.length === 0 ? (
          <div
            role="status"
            className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface)] p-6 text-sm/5 text-[var(--color-text-secondary)] shadow-[var(--shadow-card)]"
          >
            Nenhum serviço está disponível no momento. Volte em breve para conferir novas opções.
          </div>
        ) : filteredServices.length === 0 ? (
          <div
            role="status"
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface)] p-8 text-center"
          >
            <p className="text-base font-semibold text-[var(--color-text-primary)]">
              Nenhum serviço encontrado para &quot;{searchQuery}&quot;
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Tente buscar por outro termo ou limpe a pesquisa.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 inline-flex items-center rounded-full bg-[var(--color-brand-soft)] px-4 py-2 text-xs font-semibold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-primary)] hover:text-white"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {filteredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
