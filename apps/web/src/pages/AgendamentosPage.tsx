import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/ui/AppShell';
import { AgendamentoCard } from '@/features/agendamentos/components/AgendamentoCard';
import { CancelModal } from '@/features/agendamentos/components/CancelModal';
import { MOCK_AGENDAMENTOS } from '@/features/agendamentos/data/mockAgendamentos';
import type { Agendamento, StatusAgendamento } from '@/features/agendamentos/types/agendamento';

type FiltroTab = 'todos' | StatusAgendamento;

const tabs: ReadonlyArray<{ id: FiltroTab; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'confirmado', label: 'Confirmados' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'concluido', label: 'Concluídos' },
  { id: 'cancelado', label: 'Cancelados' },
];

export function AgendamentosPage() {
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(MOCK_AGENDAMENTOS);
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroTab>('todos');
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState<Agendamento | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mostrarToast = (mensagem: string) => {
    setToastMessage(mensagem);
    window.setTimeout(() => setToastMessage(null), 4000);
  };

  const handleConfirmarCancelamento = (agendamentoId: string) => {
    setAgendamentos((current) =>
      current.map((item) => (item.id === agendamentoId ? { ...item, status: 'cancelado' } : item)),
    );
    mostrarToast('Agendamento cancelado com sucesso.');
  };

  const agendamentosFiltrados = agendamentos.filter(
    (item) => filtroAtivo === 'todos' || item.status === filtroAtivo,
  );

  const contarPorStatus = (status: FiltroTab) =>
    status === 'todos'
      ? agendamentos.length
      : agendamentos.filter((item) => item.status === status).length;

  return (
    <AppShell
      activeTab="agendamentos"
      eyebrow="Sua rotina de cuidado"
      title="Meus Agendamentos"
      description="Acompanhe horários, pagamentos e regras de cada sessão em um só lugar."
      headerAside={
        <button
          type="button"
          data-testid="novo-agendamento-fab"
          onClick={() => navigate('/servicos')}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[var(--color-brand-deep)] shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--color-brand-soft)] md:w-auto"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
          Novo agendamento
        </button>
      }
    >
      {toastMessage && (
        <div
          role="status"
          data-testid="toast-feedback"
          className="fixed left-1/2 top-24 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-4 py-3 text-center text-sm font-semibold text-[var(--color-success-text)] shadow-[var(--shadow-elevated)]"
        >
          {toastMessage}
        </div>
      )}

      <section aria-labelledby="appointment-filter-title">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="appointment-filter-title" className="text-lg/7 font-semibold">
              Seus horários
            </h2>
            <p className="mt-1 text-sm/5 text-[var(--color-text-secondary)]">
              Use os filtros para encontrar rapidamente cada atendimento.
            </p>
          </div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            {agendamentosFiltrados.length}{' '}
            {agendamentosFiltrados.length === 1 ? 'agendamento' : 'agendamentos'}
          </p>
        </div>

        <div
          aria-label="Filtro de agendamentos"
          role="group"
          className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {tabs.map((tab) => {
            const isActive = filtroAtivo === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`tab-${tab.id}`}
                aria-pressed={isActive}
                onClick={() => setFiltroAtivo(tab.id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-[var(--color-brand-strong)] bg-[var(--color-brand-strong)] text-white'
                    : 'border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-deep)]'
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-white/20' : 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]'}`}
                >
                  {contarPorStatus(tab.id)}
                </span>
              </button>
            );
          })}
        </div>

        {agendamentosFiltrados.length === 0 ? (
          <div
            data-testid="empty-agendamentos-state"
            className="flex min-h-64 flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-brand-primary)] bg-[var(--color-brand-soft)] p-8 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--color-brand-deep)] shadow-[var(--shadow-card)]">
              <svg
                aria-hidden="true"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-base/6 font-semibold">Nenhum agendamento encontrado</h3>
            <p className="mt-2 max-w-sm text-sm/5 text-[var(--color-text-secondary)]">
              Não existem atendimentos nesta categoria no momento.
            </p>
          </div>
        ) : (
          <div data-testid="agendamentos-list" className="grid gap-5 lg:grid-cols-2">
            {agendamentosFiltrados.map((agendamento) => (
              <AgendamentoCard
                key={agendamento.id}
                agendamento={agendamento}
                onCancelarClick={(item) => {
                  setAgendamentoParaCancelar(item);
                  setModalOpen(true);
                }}
                onReagendarClick={(item) =>
                  mostrarToast(`Iniciando reagendamento para ${item.servicoNome}...`)
                }
              />
            ))}
          </div>
        )}
      </section>

      <CancelModal
        agendamento={agendamentoParaCancelar}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmarCancelamento}
      />
    </AppShell>
  );
}
