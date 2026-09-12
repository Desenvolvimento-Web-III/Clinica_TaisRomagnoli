import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { z } from 'zod';
import { AuthLayout } from '@/components/ui/AuthLayout';
import { auth, db } from '@/lib/firebase';
import { getFirebaseErrorCode } from '@/lib/firebase-error';

const registerSchema = z
  .object({
    nome: z
      .string()
      .min(1, 'O nome é obrigatório')
      .min(3, 'O nome deve ter pelo menos 3 caracteres')
      .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, 'O nome deve conter apenas letras'),
    telefone: z
      .string()
      .min(1, 'O telefone é obrigatório')
      .regex(/^\(\d{2}\)\d{5}-\d{4}$/, 'Formato de telefone inválido. Use (XX)XXXXX-XXXX'),
    email: z.string().min(1, 'O e-mail é obrigatório').email('Insira um e-mail válido'),
    senha: z
      .string()
      .min(1, 'A senha é obrigatória')
      .min(6, 'A senha deve ter pelo menos 6 caracteres'),
    confirmarSenha: z.string().min(1, 'A confirmação da senha é obrigatória'),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const initialFormData: RegisterFormData = {
  nome: '',
  telefone: '',
  email: '',
  senha: '',
  confirmarSenha: '',
};

function formatTelefone(value: string) {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 2) return cleaned ? `(${cleaned}` : '';
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)})${cleaned.slice(2)}`;
  return `(${cleaned.slice(0, 2)})${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({ senha: false, confirmarSenha: false });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'telefone' ? formatTelefone(value) : value,
    }));
    if (errors[name as keyof RegisterFormData]) {
      setErrors((current) => ({ ...current, [name]: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setGeneralError(null);
    const result = registerSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof RegisterFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof RegisterFormData;
        fieldErrors[path] ??= issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    if (!auth || !db) {
      setGeneralError('Firebase não configurado neste ambiente.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.senha,
      );
      await updateProfile(userCredential.user, { displayName: formData.nome.trim() });
      await setDoc(doc(db, 'clientes', userCredential.user.uid), {
        uid: userCredential.user.uid,
        nome: formData.nome.trim(),
        telefone: formData.telefone,
        email: formData.email,
        role: 'cliente',
        status: 'ativo',
        createdAt: new Date().toISOString(),
      });
      navigate('/agendamentos', { replace: true });
    } catch (error: unknown) {
      const errorCode = getFirebaseErrorCode(error);
      if (errorCode === 'auth/email-already-in-use') {
        setErrors((current) => ({ ...current, email: 'Este e-mail já está em uso' }));
      } else if (errorCode === 'auth/invalid-email') {
        setErrors((current) => ({ ...current, email: 'Insira um e-mail válido' }));
      } else if (errorCode === 'auth/weak-password') {
        setErrors((current) => ({ ...current, senha: 'A senha é muito fraca' }));
      } else {
        setGeneralError('Ocorreu um erro ao realizar o cadastro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof RegisterFormData, password = false) =>
    `min-h-11 w-full rounded-xl border bg-white px-3 py-2.5 text-sm transition-colors placeholder:text-[var(--color-icon-muted)] disabled:bg-[var(--color-canvas-neutral)] ${password ? 'pr-16' : ''} ${
      errors[field]
        ? 'border-[var(--color-error-border)]'
        : 'border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]'
    }`;

  const renderError = (field: keyof RegisterFormData) =>
    errors[field] ? (
      <p
        id={`${field}-error`}
        role="alert"
        className="mt-2 text-xs font-medium text-[var(--color-error-text)]"
      >
        {errors[field]}
      </p>
    ) : null;

  return (
    <AuthLayout
      title="Crie sua conta"
      description="Preencha seus dados para começar a organizar seus agendamentos."
    >
      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-5 sm:grid-cols-2">
        {generalError && (
          <div
            role="alert"
            className="rounded-xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-4 text-sm font-medium text-[var(--color-error-text)] sm:col-span-2"
          >
            {generalError}
          </div>
        )}

        <div className="sm:col-span-2">
          <label
            htmlFor="nome"
            className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Nome completo
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            autoComplete="name"
            disabled={loading}
            value={formData.nome}
            onChange={handleChange}
            placeholder="Como você prefere ser chamado?"
            aria-invalid={Boolean(errors.nome)}
            aria-describedby={errors.nome ? 'nome-error' : undefined}
            className={inputClass('nome')}
          />
          {renderError('nome')}
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            E-mail
          </label>
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
            className={inputClass('email')}
          />
          {renderError('email')}
        </div>

        <div>
          <label
            htmlFor="telefone"
            className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            disabled={loading}
            value={formData.telefone}
            onChange={handleChange}
            placeholder="(00)00000-0000"
            aria-invalid={Boolean(errors.telefone)}
            aria-describedby={errors.telefone ? 'telefone-error' : undefined}
            className={inputClass('telefone')}
          />
          {renderError('telefone')}
        </div>

        {(['senha', 'confirmarSenha'] as const).map((field) => {
          const visible = visiblePasswords[field];
          const label = field === 'senha' ? 'Senha' : 'Confirmar senha';
          return (
            <div key={field}>
              <label
                htmlFor={field}
                className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                {label}
              </label>
              <div className="relative">
                <input
                  id={field}
                  name={field}
                  type={visible ? 'text' : 'password'}
                  autoComplete="new-password"
                  disabled={loading}
                  value={formData[field]}
                  onChange={handleChange}
                  placeholder="Mínimo de 6 caracteres"
                  aria-invalid={Boolean(errors[field])}
                  aria-describedby={errors[field] ? `${field}-error` : undefined}
                  className={inputClass(field, true)}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }))
                  }
                  aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLocaleLowerCase('pt-BR')}`}
                  className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center px-3 text-xs font-semibold text-[var(--color-brand-deep)]"
                >
                  {visible ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              {renderError(field)}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-deep)] disabled:cursor-wait disabled:opacity-70 sm:col-span-2"
        >
          {loading ? 'Criando conta…' : 'Criar conta'}
        </button>

        <p className="text-center text-sm text-[var(--color-text-secondary)] sm:col-span-2">
          Já possui uma conta?{' '}
          <Link
            to="/login"
            className="font-semibold text-[var(--color-brand-deep)] underline-offset-4 hover:underline"
          >
            Entre
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
