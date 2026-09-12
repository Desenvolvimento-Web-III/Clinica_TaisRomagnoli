import { useEffect, useState, type ReactNode } from 'react';
import { resolveAdministrativeAccess, type AdminAccessResult } from './admin-access';

type AccessState = 'loading' | 'allowed' | 'unauthenticated' | 'unauthorized' | 'denied';

type AdminRouteProps = Readonly<{
  children: ReactNode;
  resolveAccess?: () => Promise<boolean | AdminAccessResult>;
}>;

export function AdminRoute({
  children,
  resolveAccess = resolveAdministrativeAccess,
}: AdminRouteProps) {
  const [access, setAccess] = useState<AccessState>('loading');

  useEffect(() => {
    let active = true;

    resolveAccess()
      .then((res) => {
        if (!active) return;
        if (typeof res === 'boolean') {
          setAccess(res ? 'allowed' : 'unauthorized');
        } else {
          setAccess(res);
        }
      })
      .catch(() => {
        if (active) setAccess('unauthorized');
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

  if (access !== 'allowed') {
    const isSessionExpiredOrUnauthenticated = access === 'unauthenticated';

    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--color-brand-soft)] p-4 sm:p-8">
        <section className="w-full max-w-md rounded-[var(--radius-auth)] border border-[var(--color-border-default)] bg-white p-6 text-center shadow-[var(--shadow-elevated)] sm:p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <p className="text-sm font-semibold text-[var(--color-brand-deep)]">
            Área restrita da clínica
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
            {isSessionExpiredOrUnauthenticated ? 'Sessão expirada' : 'Acesso não autorizado'}
          </h1>

          <p className="mt-3 text-sm/5 text-[var(--color-text-secondary)]">
            {isSessionExpiredOrUnauthenticated
              ? 'Sua sessão expirou ou você ainda não realizou login. Por favor, conecte-se com sua conta de administradora para continuar.'
              : 'Você não tem permissão para acessar esta área administrativa. Esta seção é reservada exclusivamente para a equipe autorizada da clínica.'}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <a
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-deep)]"
            >
              Ir para o login
            </a>

            <a
              href="/servicos"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-transparent px-5 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-brand-soft)]"
            >
              Voltar ao catálogo de serviços
            </a>
          </div>
        </section>
      </main>
    );
  }

  return children;
}
