import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { z } from 'zod';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { auth } from '@/lib/firebase';
import { getFirebaseErrorCode } from '@/lib/firebase-error';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'O e-mail é obrigatório').email('Insira um e-mail válido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5 10.9 13a2 2 0 0 0 2.2 0L21 7.5M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z"
      />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-8 w-8 text-emerald-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function ForgotPasswordPage() {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({ email: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ForgotPasswordFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name as keyof ForgotPasswordFormData]) {
      setErrors((current) => ({ ...current, [name]: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setGeneralError(null);
    const result = forgotPasswordSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ForgotPasswordFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof ForgotPasswordFormData;
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
      await sendPasswordResetEmail(auth, cleanEmail);
      setSentEmail(cleanEmail);
      setIsSuccess(true);
    } catch (error: unknown) {
      const errorCode = getFirebaseErrorCode(error);
      if (errorCode === 'auth/invalid-email') {
        setErrors({ email: 'Insira um e-mail válido' });
      } else if (errorCode === 'auth/user-not-found') {
        // Por proteção contra enumeração de e-mails, também exibe sucesso
        setSentEmail(formData.email.trim());
        setIsSuccess(true);
      } else if (errorCode === 'auth/too-many-requests') {
        setGeneralError(
          'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.',
        );
      } else if (errorCode === 'auth/network-request-failed') {
        setGeneralError(
          'Falha de conexão com o servidor. Verifique sua conexão com a internet e tente novamente.',
        );
      } else {
        setGeneralError('Ocorreu um erro ao enviar o e-mail de recuperação. Tente novamente.');
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
      title="Recupere sua senha"
      description="Informe seu e-mail cadastrado e enviaremos um link para criação de uma nova senha."
    >
      {isSuccess ? (
        <div className="mt-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
            <CheckCircleIcon />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              Instruções enviadas!
            </h2>
            <p className="text-sm/6 text-[var(--color-text-secondary)]">
              Se houver uma conta associada a{' '}
              <strong className="text-[var(--color-text-primary)]">{sentEmail}</strong>, enviamos um
              link com instruções para redefinir sua senha.
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Verifique sua caixa de entrada e também a pasta de spam ou lixo eletrônico.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link
              to="/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-deep)]"
            >
              Voltar para o login
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsSuccess(false);
                setFormData({ email: '' });
              }}
              className="text-xs font-semibold text-[var(--color-brand-deep)] hover:underline"
            >
              Enviar para outro e-mail
            </button>
          </div>
        </div>
      ) : (
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
              E-mail cadastrado
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-icon-muted)]">
                <MailIcon />
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

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-deep)] disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? 'Enviando instruções…' : 'Enviar link de recuperação'}
          </button>

          <p className="text-center text-sm text-[var(--color-text-secondary)]">
            Lembrou sua senha?{' '}
            <Link
              to="/login"
              className="font-semibold text-[var(--color-brand-deep)] underline-offset-4 hover:underline"
            >
              Fazer login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
