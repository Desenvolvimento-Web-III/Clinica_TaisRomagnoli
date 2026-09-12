import { useEffect, useState, type ReactNode } from 'react';
import { resolveAdministrativeAccess } from './admin-access';

type AccessState = 'loading' | 'allowed' | 'denied';

type AdminRouteProps = Readonly<{
  children: ReactNode;
  resolveAccess?: () => Promise<boolean>;
}>;

export function AdminRoute({
  children,
  resolveAccess = resolveAdministrativeAccess,
}: AdminRouteProps) {
  const [access, setAccess] = useState<AccessState>('loading');

  useEffect(() => {
    let active = true;

    resolveAccess()
      .then((allowed) => {
        if (active) setAccess(allowed ? 'allowed' : 'denied');
      })
      .catch(() => {
        if (active) setAccess('denied');
      });

    return () => {
      active = false;
    };
  }, [resolveAccess]);

  if (access === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--color-canvas-neutral)] px-4">
        <p role="status" className="text-sm text-[var(--color-text-secondary)]">
          Verificando acesso administrativo…
        </p>
      </main>
    );
  }

  if (access === 'denied') {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--color-brand-soft)] p-4 sm:p-8">
        <section className="w-full max-w-md rounded-[var(--radius-auth)] border border-[var(--color-border-default)] bg-white p-6 text-center shadow-[var(--shadow-elevated)] sm:p-8">
          <p className="text-sm font-semibold text-[var(--color-brand-deep)]">
            Área administrativa
          </p>
          <h1 className="mt-2 text-2xl font-bold">Acesso não autorizado</h1>
          <p className="mt-3 text-sm/5 text-[var(--color-text-secondary)]">
            Entre com uma conta administrativa autorizada para consultar dados de clientes.
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--color-brand-deep)]"
          >
            Ir para o login
          </a>
        </section>
      </main>
    );
  }

  return children;
}
