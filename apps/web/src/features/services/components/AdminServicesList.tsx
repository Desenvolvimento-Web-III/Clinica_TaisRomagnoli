import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Service } from '../types';

export interface AdminServicesListProps {
  services: Service[];
  onEditService: (service: Service) => void;
  onToggleStatus: (service: Service) => Promise<void> | void;
  onNewService: () => void;
}

type StatusFilter = 'todos' | 'ativos' | 'inativos';

export function AdminServicesList({
  services,
  onEditService,
  onToggleStatus,
  onNewService,
}: AdminServicesListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Contagens para os filtros
  const totalCount = services.length;
  const activeCount = useMemo(() => services.filter((s) => s.active).length, [services]);
  const inactiveCount = totalCount - activeCount;

  // Filtragem combinada por status e termo de busca
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // Filtro de status
      if (statusFilter === 'ativos' && !service.active) return false;
      if (statusFilter === 'inativos' && service.active) return false;

      // Filtro de busca
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const matchName = service.name.toLowerCase().includes(query);
      const matchCategory = (service.category || '').toLowerCase().includes(query);
      const matchDescription = (service.description || '').toLowerCase().includes(query);

      return matchName || matchCategory || matchDescription;
    });
  }, [services, statusFilter, searchQuery]);

  const handleToggle = async (service: Service) => {
    setTogglingId(service.id);
    try {
      await onToggleStatus(service);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-services-list-container">
      {/* Cabeçalho da Seção com Ações Primárias */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
            Serviços e Procedimentos
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Gerenciamento do catálogo da clínica: controle de serviços ativos e inativos, valores,
            durações e sinal de reserva.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            data-testid="novo-servico-btn"
            onClick={onNewService}
            className="inline-flex justify-center items-center gap-2 rounded-xl bg-[var(--color-brand-deep)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-brand-dark)]"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Novo Serviço</span>
          </button>

          <Link
            to="/servicos"
            className="inline-flex justify-center items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-white px-4 py-2.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-zinc-100 hover:text-zinc-950 hover:border-zinc-300"
          >
            <span>Visualizar como Cliente</span>
          </Link>
        </div>
      </div>

      {/* Cards de Métricas e Resumo Rápido */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">Total Cadastrado</p>
          <p
            data-testid="metric-total-services"
            className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]"
          >
            {totalCount}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
            Procedimentos no sistema
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-800">Serviços Ativos</p>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p
            data-testid="metric-active-services"
            className="mt-1 text-2xl font-bold text-emerald-900"
          >
            {activeCount}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-700">Disponíveis para agendamento</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-700">Serviços Inativos</p>
            <span className="flex h-2 w-2 rounded-full bg-zinc-400" />
          </div>
          <p
            data-testid="metric-inactive-services"
            className="mt-1 text-2xl font-bold text-zinc-900"
          >
            {inactiveCount}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-600">Ocultos no catálogo público</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Filtros de Status */}
        <div
          role="group"
          aria-label="Filtrar serviços por status"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            data-testid="filter-tab-todos"
            aria-pressed={statusFilter === 'todos'}
            onClick={() => setStatusFilter('todos')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              statusFilter === 'todos'
                ? 'bg-[var(--color-brand-deep)] text-white shadow-sm hover:bg-[var(--color-brand-dark)]'
                : 'bg-[var(--color-canvas-neutral)] text-[var(--color-text-secondary)] hover:bg-zinc-200/80 hover:text-zinc-950'
            }`}
          >
            <span>Todos</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                statusFilter === 'todos' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            data-testid="filter-tab-ativos"
            aria-pressed={statusFilter === 'ativos'}
            onClick={() => setStatusFilter('ativos')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              statusFilter === 'ativos'
                ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                : 'bg-[var(--color-canvas-neutral)] text-[var(--color-text-secondary)] hover:bg-zinc-200/80 hover:text-zinc-950'
            }`}
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Ativos</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                statusFilter === 'ativos' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            data-testid="filter-tab-inativos"
            aria-pressed={statusFilter === 'inativos'}
            onClick={() => setStatusFilter('inativos')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              statusFilter === 'inativos'
                ? 'bg-zinc-700 text-white shadow-sm hover:bg-zinc-800'
                : 'bg-[var(--color-canvas-neutral)] text-[var(--color-text-secondary)] hover:bg-zinc-200/80 hover:text-zinc-950'
            }`}
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-zinc-400" />
            <span>Inativos</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                statusFilter === 'inativos' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {inactiveCount}
            </span>
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full sm:w-72 md:w-80">
          <label htmlFor="busca-servicos-admin" className="sr-only">
            Buscar serviços por nome ou categoria
          </label>
          <input
            id="busca-servicos-admin"
            type="text"
            placeholder="Buscar por nome ou categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2 pl-9 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-icon-muted)] focus:border-[var(--color-brand-deep)] focus:outline-none"
          />
          <svg
            aria-hidden="true"
            className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-secondary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid de Serviços */}
      {filteredServices.length === 0 ? (
        <div
          data-testid="empty-services-state"
          className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-default)] bg-white p-8 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h2 className="mt-3 text-base font-bold text-[var(--color-text-primary)]">
            Nenhum serviço encontrado
          </h2>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {searchQuery
              ? `Não encontramos procedimentos para a busca "${searchQuery}".`
              : statusFilter === 'inativos'
                ? 'Todos os serviços cadastrados estão ativos no momento.'
                : 'Não existem procedimentos nesta seleção.'}
          </p>
          {(searchQuery || statusFilter !== 'todos') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('todos');
              }}
              className="mt-3 text-xs font-semibold text-[var(--color-brand-deep)] hover:underline"
            >
              Limpar filtros e busca
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="admin-services-grid">
          {filteredServices.map((servico) => {
            const precoEmReais = servico.priceInCents / 100;
            const sinalEmReais =
              (servico.sinalInCents ?? Math.round(servico.priceInCents * 0.3)) / 100;
            const percentualSinal =
              servico.sinalPercentual ??
              (precoEmReais > 0 ? Math.round((sinalEmReais / precoEmReais) * 100) : 30);

            const isToggling = togglingId === servico.id;

            return (
              <article
                key={servico.id}
                data-testid={`service-card-${servico.id}`}
                className={`flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
                  servico.active
                    ? 'border-[var(--color-border-default)] bg-white'
                    : 'border-zinc-200 bg-zinc-50/80 opacity-90'
                }`}
              >
                <div>
                  {/* Topo do Card: Categoria e Badge de Status */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-[var(--color-brand-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand-deep)]">
                      {servico.category || 'Corporal'}
                    </span>

                    {servico.active ? (
                      <span
                        data-testid={`badge-status-ativo-${servico.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Ativo
                      </span>
                    ) : (
                      <span
                        data-testid={`badge-status-inativo-${servico.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                        Inativo
                      </span>
                    )}
                  </div>

                  {/* Nome do Serviço */}
                  <h3 className="mt-3 font-bold text-[var(--color-text-primary)]">
                    {servico.name}
                  </h3>

                  {/* Descrição */}
                  {servico.description && (
                    <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                      {servico.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t border-[var(--color-border-default)] pt-3">
                  {/* Duração e Preço */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {servico.durationMinutes} min
                    </span>
                    <strong className="text-base text-[var(--color-brand-deep)]">
                      R$ {precoEmReais.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>

                  {/* Sinal de Reserva */}
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-[var(--color-canvas-neutral)] px-2.5 py-1.5 text-xs">
                    <span className="text-[var(--color-text-secondary)]">Sinal de reserva:</span>
                    <span className="font-semibold text-[var(--color-brand-deep)]">
                      R$ {sinalEmReais.toFixed(2).replace('.', ',')} ({percentualSinal}%)
                    </span>
                  </div>

                  {/* Ações de Gerenciamento */}
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-border-default)]/60 pt-3">
                    {/* Botão Ativar / Desativar */}
                    <button
                      type="button"
                      disabled={isToggling}
                      data-testid={`toggle-status-btn-${servico.id}`}
                      onClick={() => handleToggle(servico)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                        servico.active
                          ? 'text-zinc-700 hover:bg-zinc-200 hover:text-zinc-950'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-600 hover:text-white'
                      }`}
                      title={
                        servico.active
                          ? 'Desativar este serviço para ocultá-lo no agendamento'
                          : 'Ativar este serviço para disponibilizá-lo para clientes'
                      }
                    >
                      {isToggling ? (
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : servico.active ? (
                        <svg
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-zinc-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                      ) : (
                        <svg
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-emerald-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      <span>{servico.active ? 'Desativar' : 'Ativar'}</span>
                    </button>

                    {/* Botão Editar */}
                    <button
                      type="button"
                      data-testid={`edit-service-btn-${servico.id}`}
                      onClick={() => onEditService(servico)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-purple-50 hover:text-[#58418b] hover:border-purple-300"
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
