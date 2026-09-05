import { BrandLogo } from '@/components/ui/BrandLogo';
import { BottomNav } from '@/features/agendamentos/components/BottomNav';
import { getActiveServices, serviceCatalog } from '@/features/services/catalog';
import { ServiceCard } from '@/features/services/components/ServiceCard';
import type { Service } from '@/features/services/types';
import { useAuth } from '@/features/auth/AuthContext';

type ServiceCatalogPageProps = {
  services?: readonly Service[];
};

export function ServiceCatalogPage({ services = serviceCatalog }: ServiceCatalogPageProps) {
  const activeServices = getActiveServices(services);
  const { user, isAuthenticated, signOutUser } = useAuth();

  return (
    <div className="relative min-h-dvh bg-[var(--color-brand-soft)] pb-20 text-[var(--color-text-primary)]">
      <BrandLogo />
      <header className="bg-[var(--color-brand-strong)] text-white">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-32 sm:px-6 sm:pb-10 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-4 mb-4">
            <p className="text-sm font-semibold tracking-wide">Tais Romagnoli — Massoterapia</p>
            <nav aria-label="Acesso à conta" className="flex items-center gap-3 text-xs sm:text-sm">
              {isAuthenticated && user ? (
                <>
                  <span className="hidden text-white/80 sm:inline">
                    Conectado como <strong className="text-white">{user.email}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => signOutUser()}
                    className="rounded-lg bg-white/10 px-3 py-1.5 font-medium text-white hover:bg-white/20 transition-colors"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    className="rounded-lg bg-white/10 px-3 py-1.5 font-medium text-white hover:bg-white/20 transition-colors"
                  >
                    Entrar
                  </a>
                  <a
                    href="/cadastro"
                    className="rounded-lg bg-white px-3 py-1.5 font-semibold text-[var(--color-brand-strong)] shadow-xs hover:bg-white/90 transition-colors"
                  >
                    Criar conta
                  </a>
                </>
              )}
            </nav>
          </div>

          <div>
            <h1 className="text-2xl/8 font-bold sm:text-3xl/9">Serviços</h1>
            <p className="mt-2 max-w-2xl text-sm/5 text-white/90 sm:text-base/6">
              Conheça as sessões disponíveis e confira a duração e o valor antes de escolher.
            </p>
          </div>
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
      <BottomNav activeTab="inicio" />
    </div>
  );
}
