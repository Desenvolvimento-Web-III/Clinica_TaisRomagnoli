import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { z } from 'zod';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { auth } from '@/lib/firebase';
import { getFirebaseErrorCode } from '@/lib/firebase-error';

const loginSchema = z.object({
  email: z.string().min(1, 'O e-mail é obrigatório').email('Insira um e-mail válido'),
  senha: z
    .string()
    .min(1, 'A senha é obrigatória')
    .min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function FieldIcon({ kind }: Readonly<{ kind: 'email' | 'password' }>) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {kind === 'email' ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 7.5 10.9 13a2 2 0 0 0 2.2 0L21 7.5M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z"
        />
      )}
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({ email: '', senha: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name as keyof LoginFormData]) {
      setErrors((current) => ({ ...current, [name]: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setGeneralError(null);
    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof LoginFormData;
        fieldErrors[path] ??= issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    if (!auth) {
      setGeneralError('Firebase não configurado neste ambiente.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = formData.email.trim();
      await signInWithEmailAndPassword(auth, cleanEmail, formData.senha);
      navigate('/agendamentos', { replace: true });
    } catch (error: unknown) {
      const errorCode = getFirebaseErrorCode(error);
      if (
        errorCode === 'auth/invalid-credential' ||
        errorCode === 'auth/wrong-password' ||
        errorCode === 'auth/user-not-found' ||
        errorCode === 'auth/invalid-email'
      ) {
        setGeneralError('E-mail ou senha incorretos.');
      } else if (errorCode === 'auth/too-many-requests') {
        setGeneralError(
          'Muitas tentativas sem sucesso. Aguarde alguns instantes e tente novamente.',
        );
      } else if (errorCode === 'auth/user-disabled') {
        setGeneralError('Esta conta foi desativada. Entre em contato com a clínica.');
      } else if (errorCode === 'auth/network-request-failed') {
        setGeneralError(
          'Falha de conexão com o servidor. Verifique sua conexão com a internet e tente novamente.',
        );
      } else {
        setGeneralError('Ocorreu um erro ao tentar entrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `min-h-11 w-full rounded-xl border bg-white py-2.5 pl-11 pr-3 text-sm text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-icon-muted)] disabled:bg-[var(--color-canvas-neutral)] ${
      hasError
        ? 'border-[var(--color-error-border)]'
        : 'border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]'
    }`;

  return (
    <AuthLayout
      title="Entre na sua conta"
      description="Consulte seus horários e acompanhe cada sessão com tranquilidade."
    >
      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {generalError && (
          <div
            role="alert"
            className="rounded-xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-4 text-sm font-medium text-[var(--color-error-text)]"
          >
            {generalError}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            E-mail
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-icon-muted)]">
              <FieldIcon kind="email" />
            </span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              disabled={loading}
              value={formData.email}
              onChange={handleChange}
              placeholder="nome@exemplo.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={inputClass(Boolean(errors.email))}
            />
          </div>
          {errors.email && (
            <p
              id="email-error"
              role="alert"
              className="mt-2 text-xs font-medium text-[var(--color-error-text)]"
            >
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <label
              htmlFor="senha"
              className="text-sm font-medium text-[var(--color-text-secondary)]"
            >
              Senha
            </label>
            <span className="text-xs text-[var(--color-text-secondary)]">
              Mínimo de 6 caracteres
            </span>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-icon-muted)]">
              <FieldIcon kind="password" />
            </span>
            <input
              id="senha"
              name="senha"
              type={showSenha ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={loading}
              value={formData.senha}
              onChange={handleChange}
              placeholder="Digite sua senha"
              aria-invalid={Boolean(errors.senha)}
              aria-describedby={errors.senha ? 'senha-error' : undefined}
              className={`${inputClass(Boolean(errors.senha))} pr-14`}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowSenha((current) => !current)}
              aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-[var(--color-brand-deep)]"
            >
              <span className="text-xs font-semibold">{showSenha ? 'Ocultar' : 'Ver'}</span>
            </button>
          </div>
          {errors.senha && (
            <p
              id="senha-error"
              role="alert"
              className="mt-2 text-xs font-medium text-[var(--color-error-text)]"
            >
              {errors.senha}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-deep)] disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Ainda não possui uma conta?{' '}
          <Link
            to="/cadastro"
            className="font-semibold text-[var(--color-brand-deep)] underline-offset-4 hover:underline"
          >
            Cadastre-se
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
