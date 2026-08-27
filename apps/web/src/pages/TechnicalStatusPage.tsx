import { workspaceStatus, type WorkspaceStatus } from '@clinica/shared';

const status: WorkspaceStatus = workspaceStatus;

export function TechnicalStatusPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 px-6 py-12 text-slate-900">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Status técnico: {status.state}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Ambiente configurado</h1>
        <p className="mt-4 leading-7 text-slate-600">
          A fundação do frontend está pronta para receber as próximas tarefas. Esta página é somente
          um smoke test e não representa a interface final da clínica.
        </p>
      </section>
    </main>
  );
}
