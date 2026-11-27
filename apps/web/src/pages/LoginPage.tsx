import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  getIdTokenResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  type UserCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { z } from 'zod';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { auth, db } from '@/lib/firebase';
import { obterFichaAnamneseApi } from '@/services/anamnese-service';
import { fichaAnamneseSchema } from '@/features/anamnese/schemas/anamnese-schema';
import { getFirebaseErrorCode } from '@/lib/firebase-error';
import { isAdministratorEmail } from '@/routes/admin-access';
import {
  clearSessionTerminatedReason,
  getSessionTerminatedReason,
  iniciarSessaoUnicaNoBackend,
  MENSAGEM_DESCONEXAO_OUTRO_DISPOSITIVO,
  MOTIVO_OUTRO_DISPOSITIVO,
} from '@/services/sessoes-service';

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
  const location = useLocation();
  const [formData, setFormData] = useState<LoginFormData>({ email: '', senha: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [sessionWarning] = useState<string | null>(() => {
    const reason = getSessionTerminatedReason();
    if (reason === MOTIVO_OUTRO_DISPOSITIVO) {
      clearSessionTerminatedReason();
      return MENSAGEM_DESCONEXAO_OUTRO_DISPOSITIVO;
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  const finishLogin = async (credential: UserCredential, fallbackEmail?: string) => {
    const user = credential?.user;
    const email = user?.email?.trim() || fallbackEmail?.trim() || '';

    if (user && typeof user.getIdToken === 'function') {
      try {
        const token = await user.getIdToken();
        await iniciarSessaoUnicaNoBackend(token);
      } catch (sessError) {
        console.warn('Aviso: falha não bloqueante ao registrar sessão única no login:', sessError);
      }
    }

    let isAdmin = isAdministratorEmail(email);
    if (user) {
      try {
        const tokenResult = await getIdTokenResult(user);
        isAdmin =
          tokenResult.claims.role === 'admin' || tokenResult.claims.admin === true || isAdmin;
      } catch {
        // Mantém a verificação existente baseada no e-mail quando não for possível ler as claims.
      }
    }

    // O perfil é necessário para que as regras permitam criar agendamentos. Contas admin
    // não são adicionadas à coleção de clientes.
    let requiresProfile = false;
    if (user && !isAdmin && db) {
      try {
        const clientRef = doc(db, 'clientes', user.uid);
        const clientSnapshot = await getDoc(clientRef);
        if (!clientSnapshot.exists()) {
          requiresProfile = true;
          await setDoc(clientRef, {
            uid: user.uid,
            nome: user.displayName?.trim() || 'Cliente Google',
            ...(email ? { email } : {}),
            role: 'cliente',
            status: 'ativo',
            createdAt: new Date().toISOString(),
          });
        } else {
          const clientData = clientSnapshot.data();
          requiresProfile = !String(clientData.telefone ?? '').replace(/\D/g, '').match(/^\d{10,11}$/);
        }

        const ficha = await obterFichaAnamneseApi(user.uid);
        requiresProfile ||= !(
          ficha.sucesso && ficha.dados && fichaAnamneseSchema.safeParse(ficha.dados).success
        );
      } catch {
        // Não invalida o login por uma falha temporária ao consultar o perfil.
        requiresProfile = true;
      }
    }

    const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
    const target = isAdmin
      ? fromPath && fromPath.startsWith('/admin')
        ? fromPath
        : '/admin'
      : requiresProfile
        ? '/perfil'
        : fromPath && fromPath !== '/login'
        ? fromPath
        : '/servicos';
    navigate(target, { replace: true });
  };

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
      const credential = await signInWithEmailAndPassword(auth, cleanEmail, formData.senha);
      await finishLogin(credential, cleanEmail);
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

  const handleGoogleSignIn = async () => {
    setGeneralError(null);
    setErrors({});
    if (!auth) {
      setGeneralError('Firebase não configurado neste ambiente.');
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      await finishLogin(credential);
    } catch (error: unknown) {
      const errorCode = getFirebaseErrorCode(error);
      if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      if (errorCode === 'auth/unauthorized-domain') {
        setGeneralError('Este domínio ainda não está autorizado no Firebase Authentication.');
      } else if (errorCode === 'auth/operation-not-allowed') {
        setGeneralError('O login com Google ainda não está ativado no Firebase Authentication.');
      } else if (errorCode === 'auth/account-exists-with-different-credential') {
        setGeneralError('Este e-mail já possui uma conta. Entre usando o método cadastrado.');
      } else if (errorCode === 'auth/popup-blocked') {
        setGeneralError(
          'O navegador bloqueou a janela do Google. Permita pop-ups e tente novamente.',
        );
      } else {
        setGeneralError('Não foi possível entrar com Google. Tente novamente.');
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
      {sessionWarning && (
        <div
          role="alert"
          data-testid="session-terminated-alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <svg
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <p className="font-semibold text-amber-900">Sessão desconectada</p>
            <p className="text-amber-800">{sessionWarning}</p>
          </div>
        </div>
      )}

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
            <Link
              to="/recuperar-senha"
              className="text-xs font-semibold text-[var(--color-brand-deep)] hover:underline"
            >
              Esqueceu a senha?
            </Link>
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

        <div
          className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]"
          aria-hidden="true"
        >
          <span className="h-px flex-1 bg-[var(--color-border-default)]" />
          <span>ou</span>
          <span className="h-px flex-1 bg-[var(--color-border-default)]" />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleGoogleSignIn()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border-default)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-canvas-neutral)] disabled:cursor-wait disabled:opacity-70"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 3.2 13.22l7.98 6.19C13.08 13.72 18.11 9.5 24 9.5Z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.64 5.92c4.46-4.12 7.13-10.18 7.13-17.57Z"
            />
            <path
              fill="#FBBC05"
              d="M11.18 28.59a14.4 14.4 0 0 1 0-9.18L3.2 13.22a24 24 0 0 0 0 21.56l7.98-6.19Z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.9-5.88l-7.64-5.92c-2.13 1.43-4.85 2.3-8.26 2.3-5.89 0-10.92-4.22-12.82-9.91L3.2 34.78C6.51 42.62 14.62 48 24 48Z"
            />
          </svg>
          {loading ? 'Conectando…' : 'Continuar com Google'}
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
