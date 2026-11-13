import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  avaliarBloqueioContraindicacao,
  MENSAGEM_BLOQUEIO_CONTRAINDICACAO,
  type FichaAnamneseRecord,
  type RegistrarLiberacaoMedicaInput,
} from '@clinica/shared';
import { AppShell } from '@/components/ui/AppShell';
import { demoAdministrativeClientProfile } from '@/features/admin-client-profile/demo-profile';
import { getRecurrenceSummary } from '@/features/admin-client-profile/recurrence';
import type {
  AdministrativeClientProfile,
  AppointmentStatus,
  PaymentStatus,
} from '@/features/admin-client-profile/types';
import { atualizarLiberacaoMedicaApi } from '@/services/anamnese-service';
import { atualizarStatusAgendamentoBackend } from '@/services/agendamentos-service';
import {
  buscarPerfilClienteAdmin,
  mapFichaAnamneseToAdminView,
} from '@/services/clientes-admin-service';

type AtualizarLiberacaoHandler = (input: RegistrarLiberacaoMedicaInput) => Promise<{
  sucesso: boolean;
  dados?: FichaAnamneseRecord;
  erro?: string;
  statusCode?: number;
}>;

type AdminClientProfilePageProps = Readonly<{
  profile?: AdministrativeClientProfile;
  onAtualizarLiberacaoMedica?: AtualizarLiberacaoHandler;
}>;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const appointmentLabels: Record<AppointmentStatus, string> = {
  agendado: 'Agendado',
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  reagendado: 'Reagendado',
  falta: 'Falta',
};

const paymentLabels: Record<PaymentStatus, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  credito: 'Crédito para reagendamento',
  perdido: 'Sinal perdido',
};

function formatDate(value: string) {
  const normalizedValue = value.length === 10 ? `${value}T12:00:00` : value;
  return dateFormatter.format(new Date(normalizedValue));
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function getReferenceMonth(profile: AdministrativeClientProfile) {
  return (
    profile.appointments
      .filter((appointment) => appointment.status === 'concluido')
      .map((appointment) => appointment.startsAt.slice(0, 7))
      .sort()
      .at(-1) ?? new Date().toISOString().slice(0, 7)
  );
}

function Section({
  title,
  description,
  children,
}: Readonly<{ title: string; description?: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="border-b border-[var(--color-border-default)] pb-4">
        <h2 className="text-lg/7 font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm/5 text-[var(--color-text-secondary)]">{description}</p>
        ) : null}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

export function AdminClientProfilePage({
  profile,
  onAtualizarLiberacaoMedica,
}: AdminClientProfilePageProps) {
  const { clientId } = useParams<{ clientId?: string }>();
  const [loadedProfileState, setLoadedProfileState] = useState<{
    clientId: string;
    profile: AdministrativeClientProfile;
  } | null>(null);
  const [editedProfileState, setEditedProfileState] = useState<{
    sourceProfile: AdministrativeClientProfile;
    profile: AdministrativeClientProfile;
  } | null>(null);
  const [observacoesDraft, setObservacoesDraft] = useState<{
    sourceProfile: AdministrativeClientProfile;
    value: string;
  } | null>(null);
  const [savingLiberacao, setSavingLiberacao] = useState(false);
  const [liberacaoFeedback, setLiberacaoFeedback] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState<string | null>(null);
  const [appointmentFeedback, setAppointmentFeedback] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  useEffect(() => {
    if (profile || !clientId) {
      return;
    }

    let ativo = true;
    void buscarPerfilClienteAdmin(clientId)
      .then((loaded) => {
        if (!ativo) return;
        setLoadedProfileState({ clientId, profile: loaded });
      })
      .catch(() => {
        if (!ativo) return;
        setLoadedProfileState({ clientId, profile: demoAdministrativeClientProfile });
      });

    return () => {
      ativo = false;
    };
  }, [clientId, profile]);

  const loadedForClient =
    !profile && clientId && loadedProfileState?.clientId === clientId
      ? loadedProfileState.profile
      : null;
  const loadingProfile = Boolean(!profile && clientId && loadedProfileState?.clientId !== clientId);
  const baseProfile = profile ?? loadedForClient ?? demoAdministrativeClientProfile;
  const activeProfile =
    editedProfileState?.sourceProfile === baseProfile ? editedProfileState.profile : baseProfile;
  const observacoesLiberacao =
    observacoesDraft?.sourceProfile === baseProfile
      ? observacoesDraft.value
      : (activeProfile.anamnesis?.liberacaoMedicaObservacoes ?? '');

  const referenceMonth = getReferenceMonth(activeProfile);
  const recurrence = getRecurrenceSummary(activeProfile.appointments, referenceMonth);
  const completedAppointments = activeProfile.appointments.filter(
    (appointment) => appointment.status === 'concluido',
  ).length;
  const receivedInCents = activeProfile.payments
    .filter((payment) => payment.status === 'pago')
    .reduce((total, payment) => total + payment.amountInCents, 0);

  const avaliacaoContraindicacao = activeProfile.anamnesis
    ? avaliarBloqueioContraindicacao({
        exigeLiberacaoMedica: activeProfile.anamnesis.exigeLiberacaoMedica,
        contraindicacoes: activeProfile.anamnesis.contraindicacoes
          ? [...activeProfile.anamnesis.contraindicacoes]
          : undefined,
        liberacaoMedicaAprovada: activeProfile.anamnesis.liberacaoMedicaAprovada,
      })
    : null;

  const isDemoNotice = !profile && (!clientId || clientId === demoAdministrativeClientProfile.id);

  const handleAtualizarLiberacao = async (aprovada: boolean, exigeLiberacaoMedica?: boolean) => {
    setLiberacaoFeedback(null);
    setSavingLiberacao(true);

    try {
      const payload: RegistrarLiberacaoMedicaInput = {
        clienteId: activeProfile.id,
        aprovada,
        observacoes: observacoesLiberacao.trim() || undefined,
        ...(typeof exigeLiberacaoMedica === 'boolean' ? { exigeLiberacaoMedica } : {}),
      };

      const res = onAtualizarLiberacaoMedica
        ? await onAtualizarLiberacaoMedica(payload)
        : await atualizarLiberacaoMedicaApi(payload);

      if (!res.sucesso) {
        setLiberacaoFeedback({
          tipo: 'erro',
          texto: res.erro || 'Não foi possível atualizar a liberação médica.',
        });
        return;
      }

      if (res.dados) {
        const anamnesisAtualizada = mapFichaAnamneseToAdminView(res.dados);
        setEditedProfileState((prev) => {
          const current = prev?.sourceProfile === baseProfile ? prev.profile : baseProfile;
          return {
            sourceProfile: baseProfile,
            profile: {
              ...current,
              anamnesis: anamnesisAtualizada,
            },
          };
        });
        setObservacoesDraft({
          sourceProfile: baseProfile,
          value: anamnesisAtualizada.liberacaoMedicaObservacoes ?? '',
        });
      } else if (activeProfile.anamnesis) {
        setEditedProfileState((prev) => {
          const current = prev?.sourceProfile === baseProfile ? prev.profile : baseProfile;
          return {
            sourceProfile: baseProfile,
            profile: {
              ...current,
              anamnesis: current.anamnesis
                ? {
                    ...current.anamnesis,
                    exigeLiberacaoMedica:
                      typeof exigeLiberacaoMedica === 'boolean'
                        ? exigeLiberacaoMedica ||
                          (current.anamnesis.contraindicacoes?.length ?? 0) > 0
                        : current.anamnesis.exigeLiberacaoMedica,
                    liberacaoMedicaAprovada: aprovada,
                    liberacaoMedicaObservacoes: observacoesLiberacao.trim() || undefined,
                    liberacaoMedicaAprovadaEm: aprovada ? new Date().toISOString() : undefined,
                  }
                : null,
            },
          };
        });
      }

      setLiberacaoFeedback({
        tipo: 'sucesso',
        texto: aprovada
          ? 'Liberação médica aprovada na ficha do cliente.'
          : exigeLiberacaoMedica === true
            ? 'Exigência de liberação médica registrada na ficha.'
            : 'Liberação médica revogada na ficha do cliente.',
      });
    } finally {
      setSavingLiberacao(false);
    }
  };

  const handleConfirmarAgendamento = async (appointmentId: string) => {
    setAppointmentFeedback(null);

    if (avaliacaoContraindicacao?.bloqueado) {
      setAppointmentFeedback({
        tipo: 'erro',
        texto: avaliacaoContraindicacao.motivoBloqueio || MENSAGEM_BLOQUEIO_CONTRAINDICACAO,
      });
      return;
    }

    setConfirmingAppointmentId(appointmentId);
    try {
      const res = await atualizarStatusAgendamentoBackend({
        agendamentoId: appointmentId,
        novoStatus: 'confirmado',
      });

      if (!res.sucesso) {
        setAppointmentFeedback({
          tipo: 'erro',
          texto: res.erro || 'Não foi possível confirmar o agendamento.',
        });
        return;
      }

      setEditedProfileState((prev) => {
        const current = prev?.sourceProfile === baseProfile ? prev.profile : baseProfile;
        return {
          sourceProfile: baseProfile,
          profile: {
            ...current,
            appointments: current.appointments.map((apt) =>
              apt.id === appointmentId ? { ...apt, status: 'confirmado' } : apt,
            ),
          },
        };
      });
      setAppointmentFeedback({
        tipo: 'sucesso',
        texto: 'Agendamento confirmado com sucesso.',
      });
    } finally {
      setConfirmingAppointmentId(null);
    }
  };

  return (
    <AppShell
      activeTab="perfil"
      eyebrow="Perfil administrativo do cliente"
      title={activeProfile.fullName}
      description="Visão consolidada do cadastro, histórico, recorrência, pagamentos e anamnese."
      headerAside={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/clientes"
            className="inline-flex min-h-11 items-center rounded-full border border-white/40 bg-white/15 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/25"
          >
            ← Voltar para clientes
          </Link>
          <span className="w-fit rounded-full border border-white/40 bg-white/15 px-4 py-2 text-sm font-semibold">
            Cadastro {activeProfile.status}
          </span>
        </div>
      }
    >
      {loadingProfile ? (
        <div
          role="status"
          data-testid="admin-client-profile-loading"
          className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--color-border-default)] bg-white p-4 text-sm text-[var(--color-text-secondary)]"
        >
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent" />
          <span>Carregando perfil completo do cliente…</span>
        </div>
      ) : null}

      {isDemoNotice && (
        <aside
          aria-label="Aviso sobre dados demonstrativos"
          className="mb-6 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 text-sm/5 text-[var(--color-info-text)]"
        >
          Esta tela usa dados fictícios para validação local. Nenhum dado real de cliente está sendo
          consultado.
        </aside>
      )}

      <section aria-label="Resumo do cliente" className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Atendimentos concluídos</p>
          <p className="mt-2 text-2xl font-bold">{completedAppointments}</p>
        </article>
        <article className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Recorrência</p>
          <p className="mt-2 text-lg font-bold">
            {recurrence.recurring ? 'Cliente recorrente' : 'Não recorrente'}
          </p>
          <p className="mt-1 text-xs/4 text-[var(--color-text-secondary)]">
            {recurrence.completedAppointments} concluídos em{' '}
            {monthFormatter.format(new Date(`${referenceMonth}-01T12:00:00`))}
          </p>
        </article>
        <article className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Valores recebidos</p>
          <p className="mt-2 text-2xl font-bold">
            {currencyFormatter.format(receivedInCents / 100)}
          </p>
        </article>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-6">
          <Section title="Cadastro" description="Dados de identificação e contato do cliente.">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">Nome completo</dt>
                <dd className="mt-1">{activeProfile.fullName}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">E-mail</dt>
                <dd className="mt-1 break-all">{activeProfile.email}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">Telefone</dt>
                <dd className="mt-1">{activeProfile.phone}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">
                  Data de nascimento
                </dt>
                <dd className="mt-1">{formatDate(activeProfile.birthDate)}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">Cliente desde</dt>
                <dd className="mt-1">{formatDate(activeProfile.registeredAt)}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Anamnese">
            {activeProfile.anamnesis ? (
              <div className="space-y-5 text-sm/5">
                <div>
                  <h3 className="font-semibold">Pontos de atenção</h3>
                  {activeProfile.anamnesis.attentionPoints.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {activeProfile.anamnesis.attentionPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[var(--color-text-secondary)]">
                      Nenhum ponto de atenção informado.
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Observações</h3>
                  <p className="mt-2 text-[var(--color-text-secondary)]">
                    {activeProfile.anamnesis.notes}
                  </p>
                </div>

                {/* Bloco de Liberação Médica e Contraindicações */}
                <div
                  data-testid="anamnese-liberacao-medica-section"
                  className="space-y-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">
                      Liberação médica e contraindicações
                    </h3>
                    {avaliacaoContraindicacao?.bloqueado ? (
                      <span
                        data-testid="status-liberacao-medica"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-warning-text)]"
                      >
                        <svg
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        Bloqueado — aguarda liberação médica
                      </span>
                    ) : avaliacaoContraindicacao?.exigeLiberacaoMedica &&
                      avaliacaoContraindicacao.liberacaoMedicaAprovada ? (
                      <span
                        data-testid="status-liberacao-medica"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-success-text)]"
                      >
                        <svg
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Liberação médica aprovada
                      </span>
                    ) : (
                      <span
                        data-testid="status-liberacao-medica"
                        className="inline-flex items-center rounded-full border border-[var(--color-border-default)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]"
                      >
                        Sem exigência de liberação médica
                      </span>
                    )}
                  </div>

                  {avaliacaoContraindicacao &&
                  avaliacaoContraindicacao.contraindicacoes.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-warning-text)]">
                        Contraindicações identificadas:
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-[var(--color-text-primary)]">
                        {avaliacaoContraindicacao.contraindicacoes.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {activeProfile.anamnesis.liberacaoMedicaAprovada &&
                  activeProfile.anamnesis.liberacaoMedicaAprovadaEm ? (
                    <p className="text-xs text-[var(--color-success-text)]">
                      Aprovada em{' '}
                      {formatDateTime(activeProfile.anamnesis.liberacaoMedicaAprovadaEm)}
                      {activeProfile.anamnesis.liberacaoMedicaAprovadaPor
                        ? ` · Responsável: ${activeProfile.anamnesis.liberacaoMedicaAprovadaPor}`
                        : ''}
                    </p>
                  ) : null}

                  <div>
                    <label
                      htmlFor="liberacao-medica-observacoes"
                      className="block text-xs font-semibold text-[var(--color-text-primary)]"
                    >
                      Observações da liberação médica
                    </label>
                    <textarea
                      id="liberacao-medica-observacoes"
                      rows={2}
                      disabled={savingLiberacao}
                      value={observacoesLiberacao}
                      onChange={(e) =>
                        setObservacoesDraft({
                          sourceProfile: baseProfile,
                          value: e.target.value,
                        })
                      }
                      placeholder="Ex: Atestado médico apresentado para drenagem leve e liberação clínica."
                      className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-icon-muted)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                    />
                  </div>

                  {liberacaoFeedback && (
                    <div
                      role={liberacaoFeedback.tipo === 'erro' ? 'alert' : 'status'}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                        liberacaoFeedback.tipo === 'erro'
                          ? 'border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]'
                          : 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
                      }`}
                    >
                      {liberacaoFeedback.texto}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {avaliacaoContraindicacao?.exigeLiberacaoMedica ? (
                      avaliacaoContraindicacao.liberacaoMedicaAprovada ? (
                        <button
                          type="button"
                          disabled={savingLiberacao}
                          onClick={() => void handleAtualizarLiberacao(false)}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-4 py-2 text-xs font-semibold text-[var(--color-error-text)] transition-colors hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
                        >
                          {savingLiberacao ? 'Salvando…' : 'Revogar liberação médica'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={savingLiberacao}
                          onClick={() => void handleAtualizarLiberacao(true, true)}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-deep)] disabled:cursor-wait disabled:opacity-60"
                        >
                          {savingLiberacao ? 'Salvando…' : 'Aprovar liberação médica'}
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled={savingLiberacao}
                        onClick={() => void handleAtualizarLiberacao(false, true)}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-2 text-xs font-semibold text-[var(--color-warning-text)] transition-colors hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
                      >
                        {savingLiberacao ? 'Salvando…' : 'Exigir liberação médica'}
                      </button>
                    )}
                  </div>
                </div>

                <dl className="grid gap-3 border-t border-[var(--color-border-default)] pt-4">
                  <div>
                    <dt className="font-medium">Consentimento</dt>
                    <dd className="text-[var(--color-text-secondary)]">
                      {activeProfile.anamnesis.consentConfirmed ? 'Confirmado' : 'Não confirmado'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Última atualização</dt>
                    <dd className="text-[var(--color-text-secondary)]">
                      {formatDateTime(activeProfile.anamnesis.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p role="status" className="text-sm text-[var(--color-text-secondary)]">
                O cliente ainda não preencheu a ficha de anamnese.
              </p>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section
            title="Histórico de atendimentos"
            description="Sessões anteriores e próximos horários do cliente."
          >
            {appointmentFeedback && (
              <div
                role={appointmentFeedback.tipo === 'erro' ? 'alert' : 'status'}
                className={`mb-4 rounded-xl border px-3.5 py-2.5 text-xs/5 font-medium ${
                  appointmentFeedback.tipo === 'erro'
                    ? 'border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]'
                    : 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
                }`}
              >
                {appointmentFeedback.texto}
              </div>
            )}

            {activeProfile.appointments.length > 0 ? (
              <ol className="divide-y divide-[var(--color-border-default)]">
                {activeProfile.appointments.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-semibold">{appointment.serviceName}</h3>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {formatDateTime(appointment.startsAt)} · {appointment.durationMinutes} min
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {appointment.status === 'pendente' && (
                        <button
                          type="button"
                          disabled={confirmingAppointmentId === appointment.id}
                          onClick={() => void handleConfirmarAgendamento(appointment.id)}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-deep)] disabled:cursor-wait disabled:opacity-60"
                        >
                          {confirmingAppointmentId === appointment.id
                            ? 'Confirmando…'
                            : 'Confirmar agendamento'}
                        </button>
                      )}
                      <span className="w-fit rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-deep)]">
                        {appointmentLabels[appointment.status]}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p role="status" className="text-sm text-[var(--color-text-secondary)]">
                Nenhum atendimento registrado para este cliente.
              </p>
            )}
          </Section>

          <Section
            title="Pagamentos"
            description="Situação dos valores vinculados aos agendamentos."
          >
            {activeProfile.payments.length > 0 ? (
              <ol className="divide-y divide-[var(--color-border-default)]">
                {activeProfile.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-semibold">{payment.description}</h3>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        Vencimento em {formatDate(payment.dueAt)}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm font-bold">
                        {currencyFormatter.format(payment.amountInCents / 100)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                        {paymentLabels[payment.status]}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p role="status" className="text-sm text-[var(--color-text-secondary)]">
                Nenhum pagamento registrado para este cliente.
              </p>
            )}
          </Section>
        </div>
      </div>
    </AppShell>
  );
}
