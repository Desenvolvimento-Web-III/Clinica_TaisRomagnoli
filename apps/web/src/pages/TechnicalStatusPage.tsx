import { workspaceStatus, type WorkspaceStatus } from '@clinica/shared';
import { BrandLogo } from '@/components/ui/BrandLogo';

const status: WorkspaceStatus = workspaceStatus;

export function TechnicalStatusPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-brand-soft)] p-4 sm:p-8">
      <section className="w-full max-w-2xl rounded-[var(--radius-auth)] border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-elevated)] sm:p-10">
        <BrandLogo />
        <p className="mt-8 text-sm font-semibold text-[var(--color-success-text)]">
          Status técnico: {status.state}
        </p>
        <h1 className="mt-3 text-2xl/8 font-bold tracking-tight sm:text-3xl/10">
          Ambiente configurado
        </h1>
        <p className="mt-4 text-sm/6 text-[var(--color-text-secondary)] sm:text-base/7">
          A fundação do frontend está pronta para receber as próximas tarefas. Esta página é somente
          um smoke test e não representa a interface final da clínica.
        </p>
      </section>
    </main>
  );
}
