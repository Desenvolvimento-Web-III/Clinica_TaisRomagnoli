import { AppShell } from '@/components/ui/AppShell';
import { demoAdministrativeClientProfile } from '@/features/admin-client-profile/demo-profile';
import { getRecurrenceSummary } from '@/features/admin-client-profile/recurrence';
import type {
  AdministrativeClientProfile,
  AppointmentStatus,
  PaymentStatus,
} from '@/features/admin-client-profile/types';

type AdminClientProfilePageProps = Readonly<{
  profile?: AdministrativeClientProfile;
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
  concluido: 'Concluído',
  cancelado: 'Cancelado',
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
}: Readonly<{ title: string; description: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="border-b border-[var(--color-border-default)] pb-4">
        <h2 className="text-lg/7 font-semibold">{title}</h2>
        <p className="mt-1 text-sm/5 text-[var(--color-text-secondary)]">{description}</p>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

export function AdminClientProfilePage({
  profile = demoAdministrativeClientProfile,
}: AdminClientProfilePageProps) {
  const referenceMonth = getReferenceMonth(profile);
  const recurrence = getRecurrenceSummary(profile.appointments, referenceMonth);
  const completedAppointments = profile.appointments.filter(
    (appointment) => appointment.status === 'concluido',
  ).length;
  const receivedInCents = profile.payments
    .filter((payment) => payment.status === 'pago')
    .reduce((total, payment) => total + payment.amountInCents, 0);

  return (
    <AppShell
      activeTab="perfil"
      eyebrow="Perfil administrativo do cliente"
      title={profile.fullName}
      description="Visão consolidada do cadastro, histórico, recorrência, pagamentos e anamnese."
      headerAside={
        <span className="w-fit rounded-full border border-white/40 bg-white/15 px-4 py-2 text-sm font-semibold">
          Cadastro {profile.status}
        </span>
      }
    >
      <aside
        aria-label="Aviso sobre dados demonstrativos"
        className="mb-6 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 text-sm/5 text-[var(--color-info-text)]"
      >
        Esta tela usa dados fictícios para validação local. Nenhum dado real de cliente está sendo
        consultado.
      </aside>

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
                <dd className="mt-1">{profile.fullName}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">E-mail</dt>
                <dd className="mt-1 break-all">{profile.email}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">Telefone</dt>
                <dd className="mt-1">{profile.phone}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">
                  Data de nascimento
                </dt>
                <dd className="mt-1">{formatDate(profile.birthDate)}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--color-text-secondary)]">Cliente desde</dt>
                <dd className="mt-1">{formatDate(profile.registeredAt)}</dd>
              </div>
            </dl>
          </Section>

          <Section
            title="Anamnese"
            description="Informação sensível, visível somente ao cliente e à administradora."
          >
            {profile.anamnesis ? (
              <div className="space-y-5 text-sm/5">
                <div className="rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-[var(--color-warning-text)]">
                  Acesso restrito. Consulte estes dados apenas quando necessário para o atendimento.
                </div>
                <div>
                  <h3 className="font-semibold">Pontos de atenção</h3>
                  {profile.anamnesis.attentionPoints.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {profile.anamnesis.attentionPoints.map((point) => (
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
                    {profile.anamnesis.notes}
                  </p>
                </div>
                <dl className="grid gap-3 border-t border-[var(--color-border-default)] pt-4">
                  <div>
                    <dt className="font-medium">Consentimento</dt>
                    <dd className="text-[var(--color-text-secondary)]">
                      {profile.anamnesis.consentConfirmed ? 'Confirmado' : 'Não confirmado'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Última atualização</dt>
                    <dd className="text-[var(--color-text-secondary)]">
                      {formatDateTime(profile.anamnesis.updatedAt)}
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
            {profile.appointments.length > 0 ? (
              <ol className="divide-y divide-[var(--color-border-default)]">
                {profile.appointments.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-semibold">{appointment.serviceName}</h3>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {formatDateTime(appointment.startsAt)} · {appointment.durationMinutes} min
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-deep)]">
                      {appointmentLabels[appointment.status]}
                    </span>
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
            {profile.payments.length > 0 ? (
              <ol className="divide-y divide-[var(--color-border-default)]">
                {profile.payments.map((payment) => (
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
