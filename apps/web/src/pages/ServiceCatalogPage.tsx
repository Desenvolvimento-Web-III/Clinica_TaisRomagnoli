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

  useEffect(() => {
    if (services) return;

    const unsubscribe = subscribeToServicesFromFirestore((updatedServices) => {
      setFirestoreServices(updatedServices);
    });

    return () => unsubscribe();
  }, [services]);

  const currentServices = services ?? firestoreServices ?? serviceCatalog;
  const activeServices = getActiveServices(currentServices);

  return (
    <AppShell
      activeTab="inicio"
      eyebrow="Tais Romagnoli — Massoterapia"
      title="Serviços"
      description="Conheça as sessões disponíveis e confira duração e valor com transparência antes de escolher."
      headerAside={
        <div className="grid w-full max-w-sm grid-cols-2 gap-3 md:w-auto">
          <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3">
            <p className="text-2xl font-bold">{activeServices.length}</p>
            <p className="text-xs text-white/80">sessões disponíveis</p>
          </div>
          <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3">
            <p className="text-2xl font-bold">30%</p>
            <p className="text-xs text-white/80">de sinal para reservar</p>
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
              {activeServices.length} {activeServices.length === 1 ? 'serviço' : 'serviços'}
            </p>
          )}
        </div>

        {activeServices.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
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
    </AppShell>
  );
}
