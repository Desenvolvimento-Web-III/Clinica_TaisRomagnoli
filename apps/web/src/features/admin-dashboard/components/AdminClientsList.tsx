import { useState, useMemo, useId } from 'react';
import { Link } from 'react-router-dom';
import type { AdminClientListItem } from '../types';

export interface AdminClientsListProps {
  clients: AdminClientListItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

type ClientFilter = 'todos' | 'recorrentes' | 'ativos' | 'inativos';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'CL';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  const first = parts[0][0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

export function AdminClientsList({ clients, isLoading = false, onRefresh }: AdminClientsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ClientFilter>('todos');
  const searchInputId = useId();

  // Métricas gerais
  const totalCount = clients.length;
  const recurrentCount = useMemo(
    () => clients.filter((c) => c.totalAtendimentosMes >= 2).length,
    [clients],
  );
  const activeCount = useMemo(
    () => clients.filter((c) => !c.status || c.status === 'ativo').length,
    [clients],
  );
  const inactiveCount = useMemo(
    () => clients.filter((c) => c.status === 'inativo').length,
    [clients],
  );

  // Filtragem combinada por busca textual e aba de filtro
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Filtro de status/recorrência
      if (filter === 'recorrentes' && client.totalAtendimentosMes < 2) return false;
      if (filter === 'ativos' && client.status && client.status !== 'ativo') return false;
      if (filter === 'inativos' && client.status !== 'inativo') return false;

      // Filtro de busca textual
      if (!searchQuery.trim()) return true;

      const query = searchQuery.trim().toLowerCase();
      const queryDigits = searchQuery.replace(/\D/g, '');

      const matchNome = client.nome.toLowerCase().includes(query);
      const matchEmail = client.email.toLowerCase().includes(query);
      const telefoneDigits = client.telefone.replace(/\D/g, '');
      const matchTelefone =
        client.telefone.toLowerCase().includes(query) ||
        (queryDigits.length > 0 && telefoneDigits.includes(queryDigits));

      return matchNome || matchEmail || matchTelefone;
    });
  }, [clients, filter, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setFilter('todos');
  };

  return (
    <div className="space-y-6" data-testid="admin-clients-list-container">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
            Gestão de Clientes
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Acesse dados cadastrais, histórico e fichas de avaliação de clientes cadastrados.
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm transition-colors hover:bg-zinc-50 hover:text-[var(--color-text-primary)]"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>Atualizar Lista</span>
          </button>
        )}
      </div>

      {/* Cards de Métricas Resumidas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">
            Total de Clientes
          </span>
          <p
            data-testid="metric-total-clients"
            className="mt-1 text-2xl font-black text-[var(--color-text-primary)] sm:text-3xl"
          >
            {totalCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">
            Clientes Recorrentes
          </span>
          <p
            data-testid="metric-recurrent-clients"
            className="mt-1 text-2xl font-black text-purple-700 sm:text-3xl"
          >
            {recurrentCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">
            Clientes Ativos
          </span>
          <p
            data-testid="metric-active-clients"
            className="mt-1 text-2xl font-black text-emerald-700 sm:text-3xl"
          >
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Inativos</span>
          <p
            data-testid="metric-inactive-clients"
            className="mt-1 text-2xl font-black text-zinc-500 sm:text-3xl"
          >
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Campo de Busca Textual */}
        <div className="relative flex-1">
          <label htmlFor={searchInputId} className="sr-only">
            Buscar clientes
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg
              aria-hidden="true"
              className="h-4 w-4 text-[var(--color-text-secondary)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <input
            id={searchInputId}
            data-testid="busca-cliente-input"
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)]/40 py-2.5 pl-10 pr-10 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] transition-colors focus:border-[var(--color-brand-deep)] focus:bg-white focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar termo de busca"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Botões de Filtro Rápido */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filtro de clientes"
        >
          <button
            type="button"
            onClick={() => setFilter('todos')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === 'todos'
                ? 'bg-[var(--color-brand-deep)] text-white shadow-sm'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Todos ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setFilter('recorrentes')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === 'recorrentes'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Recorrentes ({recurrentCount})
          </button>

          <button
            type="button"
            onClick={() => setFilter('ativos')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === 'ativos'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Ativos ({activeCount})
          </button>

          {inactiveCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('inativos')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === 'inativos'
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Inativos ({inactiveCount})
            </button>
          )}
        </div>
      </div>

      {/* Estado de Carregamento */}
      {isLoading && clients.length === 0 && (
        <div className="grid gap-4" data-testid="clients-loading-skeleton">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 animate-pulse rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm"
            />
          ))}
        </div>
      )}

      {/* Lista de Cards de Clientes */}
      {(!isLoading || clients.length > 0) && filteredClients.length > 0 && (
        <div className="grid gap-4" data-testid="clients-grid">
          {filteredClients.map((client) => {
            const isRecorrente = client.totalAtendimentosMes >= 2;
            const isAtivo = !client.status || client.status === 'ativo';

            return (
              <div
                key={client.id}
                data-testid={`client-card-${client.id}`}
                className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-all hover:border-[var(--color-brand-deep)]/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar com Iniciais */}
                  <div
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-sm font-bold text-[var(--color-brand-deep)] shadow-inner"
                  >
                    {getInitials(client.nome)}
                  </div>

                  {/* Informações Resumidas do Cliente */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-[var(--color-text-primary)] sm:text-base">
                        {client.nome}
                      </h3>

                      {isRecorrente && (
                        <span
                          data-testid={`badge-recorrente-${client.id}`}
                          className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800"
                        >
                          Cliente Recorrente
                        </span>
                      )}

                      <span
                        data-testid={`badge-status-${client.id}`}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          isAtivo ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {isAtivo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    {/* Dados de Contato */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-secondary)] sm:text-sm">
                      <span className="flex items-center gap-1">
                        <svg
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-zinc-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span>{client.email}</span>
                      </span>

                      <span className="hidden text-zinc-300 sm:inline">•</span>

                      <span className="flex items-center gap-1">
                        <svg
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-zinc-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        <span>{client.telefone}</span>
                      </span>
                    </div>

                    {/* Resumo de Atendimentos */}
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--color-text-secondary)]">
                      <span>
                        Atendimentos este mês:{' '}
                        <strong className="text-[var(--color-text-primary)]">
                          {client.totalAtendimentosMes}
                        </strong>
                      </span>

                      {client.ultimoAtendimento && (
                        <>
                          <span className="text-zinc-300">•</span>
                          <span>Último atendimento: {client.ultimoAtendimento}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ação Primária: Ver Ficha Completa */}
                <div className="flex items-center justify-end border-t border-[var(--color-border-default)] pt-3 sm:border-0 sm:pt-0">
                  <Link
                    to={`/admin/clientes/${client.id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-brand-deep)] bg-white px-4 py-2.5 text-xs font-bold text-[var(--color-brand-deep)] transition-all hover:bg-[var(--color-brand-deep)] hover:text-white active:scale-[0.98] sm:w-auto"
                  >
                    <span>Ver Ficha Completa</span>
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Estado Vazio de Pesquisa */}
      {(!isLoading || clients.length > 0) && filteredClients.length === 0 && (
        <div
          data-testid="empty-search-state"
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-default)] bg-white p-10 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>
          <h3 className="mt-3 text-base font-bold text-[var(--color-text-primary)]">
            Nenhum cliente encontrado
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)] sm:text-sm">
            {searchQuery
              ? `Não foram encontrados resultados para a busca "${searchQuery}".`
              : 'Nenhum cliente cadastrado nesta categoria de filtro.'}
          </p>
          <button
            type="button"
            onClick={handleClearSearch}
            className="mt-4 rounded-xl bg-[var(--color-brand-deep)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-dark)]"
          >
            Limpar filtros e busca
          </button>
        </div>
      )}
    </div>
  );
}
