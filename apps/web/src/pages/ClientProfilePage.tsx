import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { z } from 'zod';
import { AppShell } from '@/components/ui/AppShell';
import { useOptionalAuth } from '@/features/auth/auth-context';
import { getUserDisplayName, getUserInitials } from '@/features/auth/user-display';
import { auth, db } from '@/lib/firebase';
import type { ContactPreferences } from '@clinica/shared';

const profileSchema = z.object({
  nome: z
    .string()
    .min(1, 'O nome é obrigatório')
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, 'O nome deve conter apenas letras'),
  telefone: z
    .string()
    .min(1, 'O telefone é obrigatório')
    .regex(/^\(\d{2}\)\d{5}-\d{4}$/, 'Formato de telefone inválido. Use (XX)XXXXX-XXXX'),
});

type ProfileErrors = Partial<Record<'nome' | 'telefone', string>>;

function formatTelefone(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 2) return cleaned ? `(${cleaned}` : '';
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)})${cleaned.slice(2)}`;
  return `(${cleaned.slice(0, 2)})${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
}

const defaultPreferences: ContactPreferences = {
  whatsapp: true,
  email: true,
  lembretesAgendamento: true,
};

export function ClientProfilePage() {
  const authContext = useOptionalAuth();
  const navigate = useNavigate();

  const currentUser = authContext?.currentUser ?? null;
  const isAuthReady = authContext?.isAuthReady ?? true;

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [preferencias, setPreferencias] = useState<ContactPreferences>(defaultPreferences);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady) return;

    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    let isMounted = true;

    async function loadClientData() {
      setLoadingDoc(true);
      const fallbackName = currentUser?.displayName || '';
      setNome(fallbackName);

      if (!db || !currentUser) {
        setLoadingDoc(false);
        return;
      }

      try {
        const clientDocRef = doc(db, 'clientes', currentUser.uid);
        const snapshot = await getDoc(clientDocRef);

        if (isMounted && snapshot.exists()) {
          const data = snapshot.data();
          if (data.nome) setNome(data.nome);
          if (data.telefone) setTelefone(formatTelefone(data.telefone));
          if (data.preferenciasContato) {
            setPreferencias({
              whatsapp: data.preferenciasContato.whatsapp ?? true,
              email: data.preferenciasContato.email ?? true,
              lembretesAgendamento: data.preferenciasContato.lembretesAgendamento ?? true,
            });
          }
        }
      } catch {
        // Usa dados de fallback
      } finally {
        if (isMounted) {
          setLoadingDoc(false);
        }
      }
    }

    void loadClientData();

    return () => {
      isMounted = false;
    };
  }, [currentUser, isAuthReady, navigate]);

  const handleTelefoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefone(e.target.value);
    setTelefone(formatted);
    if (errors.telefone) {
      setErrors((curr) => ({ ...curr, telefone: undefined }));
    }
  };

  const handleNomeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNome(e.target.value);
    if (errors.nome) {
      setErrors((curr) => ({ ...curr, nome: undefined }));
    }
  };

  const handlePreferenceToggle = (key: keyof ContactPreferences) => {
    setPreferencias((curr) => ({ ...curr, [key]: !curr[key] }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const result = profileSchema.safeParse({ nome, telefone });
    if (!result.success) {
      const fieldErrors: ProfileErrors = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof ProfileErrors;
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    if (!currentUser) {
      setErrorMessage('Sessão expirada. Faça login novamente.');
      return;
    }

    setSaving(true);
    try {
      const cleanNome = nome.trim();
      const cleanTelefone = telefone.trim();

      // Atualiza o perfil no Firebase Auth
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { displayName: cleanNome });
      }

      // Atualiza o cadastro do cliente no Firestore
      if (db) {
        const clientDocRef = doc(db, 'clientes', currentUser.uid);
        await setDoc(
          clientDocRef,
          {
            nome: cleanNome,
            telefone: cleanTelefone,
            preferenciasContato: preferencias,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      }

      setSuccessMessage('Perfil e preferências atualizados com sucesso!');
    } catch {
      setErrorMessage('Não foi possível salvar as alterações. Tente novamente mais tarde.');
    } finally {
      setSaving(false);
    }
  };

  const displayName = getUserDisplayName(currentUser);
  const initials = getUserInitials(displayName);

  return (
    <AppShell
      activeTab="perfil"
      eyebrow="Tais Romagnoli — Massoterapia"
      title="Meu Perfil"
      description="Consulte seus dados cadastrais e personalize como a clínica se comunica com você."
    >
      <div className="mx-auto max-w-2xl">
        {loadingDoc ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-brand-primary)] border-t-transparent" />
            <p className="mt-4 text-sm font-medium text-[var(--color-text-secondary)]">
              Carregando dados do perfil…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {successMessage && (
              <div
                role="status"
                className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
              >
                <svg
                  className="h-5 w-5 shrink-0 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-4 text-sm font-medium text-[var(--color-error-text)]"
              >
                <svg
                  className="h-5 w-5 shrink-0 text-[var(--color-error-text)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Card de Identificação */}
            <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-7">
              <div className="flex items-center gap-4">
                <div
                  aria-hidden="true"
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-xl font-bold text-[var(--color-brand-deep)]"
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold text-[var(--color-text-primary)]">
                    {displayName}
                  </h2>
                  <p className="truncate text-sm text-[var(--color-text-secondary)]">
                    {currentUser?.email}
                  </p>
                  <span className="mt-1.5 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Conta Ativa
                  </span>
                </div>
              </div>
            </section>

            {/* Card de Dados Pessoais */}
            <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-7">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Dados Pessoais
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Mantenha suas informações corretas para identificação nos atendimentos.
              </p>

              <div className="mt-5 space-y-4">
                {/* Nome Completo */}
                <div>
                  <label
                    htmlFor="profile-nome"
                    className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
                  >
                    Nome Completo
                  </label>
                  <input
                    id="profile-nome"
                    type="text"
                    disabled={saving}
                    value={nome}
                    onChange={handleNomeChange}
                    placeholder="Seu nome completo"
                    aria-invalid={Boolean(errors.nome)}
                    aria-describedby={errors.nome ? 'nome-error' : undefined}
                    className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-icon-muted)] disabled:bg-[var(--color-canvas-neutral)] ${
                      errors.nome
                        ? 'border-[var(--color-error-border)]'
                        : 'border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]'
                    }`}
                  />
                  {errors.nome && (
                    <p
                      id="nome-error"
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-[var(--color-error-text)]"
                    >
                      {errors.nome}
                    </p>
                  )}
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label
                    htmlFor="profile-telefone"
                    className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
                  >
                    Telefone / WhatsApp
                  </label>
                  <input
                    id="profile-telefone"
                    type="tel"
                    disabled={saving}
                    value={telefone}
                    onChange={handleTelefoneChange}
                    placeholder="(11)99999-9999"
                    aria-invalid={Boolean(errors.telefone)}
                    aria-describedby={errors.telefone ? 'telefone-error' : undefined}
                    className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-icon-muted)] disabled:bg-[var(--color-canvas-neutral)] ${
                      errors.telefone
                        ? 'border-[var(--color-error-border)]'
                        : 'border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)]'
                    }`}
                  />
                  {errors.telefone && (
                    <p
                      id="telefone-error"
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-[var(--color-error-text)]"
                    >
                      {errors.telefone}
                    </p>
                  )}
                </div>

                {/* E-mail (somente leitura) */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="profile-email"
                      className="block text-sm font-medium text-[var(--color-text-secondary)]"
                    >
                      E-mail de Login
                    </label>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      Somente leitura
                    </span>
                  </div>
                  <input
                    id="profile-email"
                    type="email"
                    disabled
                    value={currentUser?.email || ''}
                    className="min-h-11 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] px-3.5 py-2.5 text-sm text-[var(--color-text-secondary)]"
                  />
                </div>
              </div>
            </section>

            {/* Card de Preferências de Contato */}
            <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-7">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Preferências de Contato
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Escolha por quais canais você deseja receber comunicações e avisos da clínica.
              </p>

              <div className="mt-5 divide-y divide-[var(--color-border-default)]">
                {/* WhatsApp */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      WhatsApp
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Receber confirmações de horários e contato direto da terapeuta.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={preferencias.whatsapp}
                    disabled={saving}
                    onClick={() => handlePreferenceToggle('whatsapp')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] ${
                      preferencias.whatsapp ? 'bg-[var(--color-brand-strong)]' : 'bg-gray-200'
                    }`}
                  >
                    <span className="sr-only">Notificações por WhatsApp</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        preferencias.whatsapp ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* E-mail */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">E-mail</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Receber comprovantes de reservas, novidades e recibos.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={preferencias.email}
                    disabled={saving}
                    onClick={() => handlePreferenceToggle('email')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] ${
                      preferencias.email ? 'bg-[var(--color-brand-strong)]' : 'bg-gray-200'
                    }`}
                  >
                    <span className="sr-only">Notificações por E-mail</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        preferencias.email ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Lembretes de agendamento */}
                <div className="flex items-center justify-between py-3.5">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Lembretes de Sessão
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Avisos com antecedência para não esquecer de comparecer à sua massagem.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={preferencias.lembretesAgendamento}
                    disabled={saving}
                    onClick={() => handlePreferenceToggle('lembretesAgendamento')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] ${
                      preferencias.lembretesAgendamento
                        ? 'bg-[var(--color-brand-strong)]'
                        : 'bg-gray-200'
                    }`}
                  >
                    <span className="sr-only">Lembretes de sessão</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        preferencias.lembretesAgendamento ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>

            {/* Botão Salvar */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-6 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-[var(--color-brand-deep)] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
              >
                {saving ? 'Salvando alterações…' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
