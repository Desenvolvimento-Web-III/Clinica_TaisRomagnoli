import React, { useState } from 'react';
import { MOCK_AGENDAMENTOS } from '../features/agendamentos/data/mockAgendamentos';
import type { Agendamento, StatusAgendamento } from '../features/agendamentos/types/agendamento';
import { AgendamentoCard } from '../features/agendamentos/components/AgendamentoCard';
import { CancelModal } from '../features/agendamentos/components/CancelModal';
import { BottomNav } from '../features/agendamentos/components/BottomNav';

type FiltroTab = 'todos' | StatusAgendamento;

export function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(MOCK_AGENDAMENTOS);
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroTab>('todos');
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState<Agendamento | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mostrarToast = (mensagem: string) => {
    setToastMessage(mensagem);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleCancelarClick = (agendamento: Agendamento) => {
    setAgendamentoParaCancelar(agendamento);
    setModalOpen(true);
  };

  const handleConfirmarCancelamento = (agendamentoId: string) => {
    setAgendamentos((prev) =>
      prev.map((ag) => (ag.id === agendamentoId ? { ...ag, status: 'cancelado' } : ag)),
    );
    mostrarToast('Agendamento cancelado com sucesso.');
  };

  const handleReagendarClick = (agendamento: Agendamento) => {
    mostrarToast(`Iniciando reagendamento para ${agendamento.servicoNome}...`);
  };

  const agendamentosFiltrados = agendamentos.filter((item) => {
    if (filtroAtivo === 'todos') return true;
    return item.status === filtroAtivo;
  });

  const contarPorStatus = (status: FiltroTab) => {
    if (status === 'todos') return agendamentos.length;
    return agendamentos.filter((a) => a.status === status).length;
  };

  const TABS: { id: FiltroTab; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'confirmado', label: 'Confirmados' },
    { id: 'pendente', label: 'Pendentes' },
    { id: 'concluido', label: 'Concluídos' },
    { id: 'cancelado', label: 'Cancelados' },
  ];

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 pb-24">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          data-testid="toast-feedback"
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-xs border border-slate-800 transition-all animate-bounce"
        >
          {toastMessage}
        </div>
      )}

      {/* Frame Mobile Container */}
      <div className="mx-auto max-w-xl min-h-dvh bg-white shadow-xl flex flex-col">
        {/* Header Superior */}
        <header className="sticky top-0 z-30 border-b border-purple-100 bg-white/95 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-bold text-sm shadow-md ring-2 ring-purple-100">
                CR
              </div>
              <div>
                <p className="text-[11px] font-medium tracking-wide uppercase text-purple-600">
                  Tais Romagnoli
                </p>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                  Meus Agendamentos
                </h1>
              </div>
            </div>

            <button
              type="button"
              aria-label="Notificações"
              className="relative rounded-full p-2 text-slate-500 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
          </div>

          {/* Abas de Filtro */}
          <nav
            aria-label="Filtro de agendamentos"
            className="mt-4 flex gap-1.5 overflow-x-auto no-scrollbar pb-1"
          >
            {TABS.map((tab) => {
              const count = contarPorStatus(tab.id);
              const isActive = filtroAtivo === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`tab-${tab.id}`}
                  onClick={() => setFiltroAtivo(tab.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-purple-50/70 text-purple-900 hover:bg-purple-100/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isActive ? 'bg-purple-700/80 text-white' : 'bg-purple-200/60 text-purple-800'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Conteúdo Principal / Lista de Agendamentos */}
        <main className="flex-1 px-4 py-5 sm:px-6 space-y-4">
          {agendamentosFiltrados.length === 0 ? (
            <div
              data-testid="empty-agendamentos-state"
              className="my-12 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 p-8"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-600 mb-3">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                Nenhum agendamento encontrado
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">
                Não existem atendimentos na categoria selecionada no momento.
              </p>
            </div>
          ) : (
            <div data-testid="agendamentos-list" className="space-y-4">
              {agendamentosFiltrados.map((agendamento) => (
                <AgendamentoCard
                  key={agendamento.id}
                  agendamento={agendamento}
                  onCancelarClick={handleCancelarClick}
                  onReagendarClick={handleReagendarClick}
                />
              ))}
            </div>
          )}
        </main>

        {/* Botão Flutuante (FAB) para Novo Agendamento */}
        <div className="fixed bottom-20 right-4 sm:right-[calc(50%-17rem)] z-30">
          <button
            type="button"
            data-testid="novo-agendamento-fab"
            onClick={() => mostrarToast('Navegando para seleção de serviços...')}
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:shadow-xl focus:ring-4 focus:ring-purple-300 focus:outline-hidden"
          >
            <svg
              className="h-5 w-5 transition-transform group-hover:rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Novo Agendamento</span>
          </button>
        </div>

        {/* Barra de Navegação Inferior */}
        <BottomNav activeTab="agendamentos" />

        {/* Modal de Cancelamento */}
        <CancelModal
          agendamento={agendamentoParaCancelar}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirmarCancelamento}
        />
      </div>
    </div>
  );
}
