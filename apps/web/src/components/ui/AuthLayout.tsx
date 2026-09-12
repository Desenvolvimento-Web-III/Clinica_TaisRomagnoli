import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';

type AuthLayoutProps = Readonly<{
  title: string;
  description: string;
  children: ReactNode;
}>;

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <main className="min-h-dvh bg-[var(--color-brand-soft)] p-4 sm:p-6 lg:grid lg:grid-cols-[minmax(320px,0.9fr)_minmax(520px,1.1fr)] lg:gap-6 lg:p-8">
      <section className="mx-auto flex w-full max-w-xl flex-col justify-between px-2 py-4 sm:px-4 lg:max-w-none lg:rounded-[var(--radius-auth)] lg:bg-[var(--color-brand-strong)] lg:p-10 lg:text-white lg:shadow-[var(--shadow-elevated)]">
        <Link
          to="/servicos"
          aria-label="Ir para serviços"
          className="w-fit rounded-xl bg-white px-4 py-2"
        >
          <BrandLogo />
        </Link>
        <div className="hidden max-w-lg lg:block">
          <p className="text-sm font-semibold text-white/80">Tais Romagnoli — Massoterapia</p>
          <h2 className="mt-3 text-3xl/10 font-bold">
            Cuidado e organização desde o primeiro contato.
          </h2>
          <p className="mt-4 text-base/7 text-white/85">
            Acesse seus agendamentos com tranquilidade e tenha as informações da sua sessão sempre
            por perto.
          </p>
        </div>
        <p className="hidden text-sm text-white/70 lg:block">
          Experiência segura, clara e acolhedora.
        </p>
      </section>

      <div className="mx-auto flex w-full max-w-xl items-center py-6 sm:py-8 lg:max-w-2xl lg:py-0">
        <section className="w-full rounded-[var(--radius-auth)] bg-white p-6 shadow-[var(--shadow-elevated)] sm:p-8 lg:p-10">
          <p className="text-sm font-semibold text-[var(--color-brand-deep)]">Bem-vindo</p>
          <h1 className="mt-2 text-2xl/8 font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm/6 text-[var(--color-text-secondary)]">{description}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
