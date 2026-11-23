import { useMemo, useState } from 'react';
import type { Agendamento } from '@clinica/shared';
import type { AdminClientListItem } from '../types';
import {
  montarTabelaRelatorio,
  serializarRelatorioCsv,
  type ReportCategory,
} from '../reports-data';

interface AdminRelatoriosSectionProps {
  clients: AdminClientListItem[];
  appointments: Agendamento[];
  isLoading?: boolean;
  error?: string | null;
}

const CATEGORIES: Array<{ id: ReportCategory; label: string }> = [
  { id: 'clientes', label: 'Clientes' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'recorrencia', label: 'Recorrência' },
  { id: 'pagamentos', label: 'Pagamentos' },
];

const APPOINTMENT_STATUS_OPTIONS = [
  ['pendente', 'Pendente'],
  ['confirmado', 'Confirmado'],
  ['em_andamento', 'Em andamento'],
  ['concluido', 'Concluído'],
  ['cancelado', 'Cancelado'],
  ['reagendado', 'Reagendado'],
  ['falta', 'Falta'],
];

function mesAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

export function AdminRelatoriosSection({
  clients,
  appointments,
  isLoading = false,
  error,
}: Readonly<AdminRelatoriosSectionProps>) {
  const [category, setCategory] = useState<ReportCategory>('agenda');
  const [month, setMonth] = useState(mesAtual);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');
  const report = useMemo(
    () => montarTabelaRelatorio(category, month, clients, appointments),
    [category, month, clients, appointments],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return report.rows.filter((row) => {
      const matchesSearch = !query || row.searchText.includes(query);
      const matchesStatus = status === 'todos' || row.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [report.rows, search, status]);

  const statusOptions =
    category === 'clientes'
      ? [
          ['ativo', 'Ativo'],
          ['inativo', 'Inativo'],
          ['pendente', 'Pendente'],
        ]
      : category === 'agenda'
        ? APPOINTMENT_STATUS_OPTIONS
        : category === 'pagamentos'
          ? [
              ['recebido', 'Recebido'],
              ['previsto', 'Previsto'],
              ['retido', 'Sinal retido'],
              ['outro', 'Sem valor classificado'],
            ]
          : [];

  const valoresRecebidos = filteredRows.reduce((total, row) => total + (row.receivedCents ?? 0), 0);
  const valoresPrevistos = filteredRows.reduce((total, row) => total + (row.expectedCents ?? 0), 0);
  const sinaisRetidos = filteredRows.reduce((total, row) => total + (row.retainedCents ?? 0), 0);

  const handleExportar = () => {
    const csv = `\uFEFF${serializarRelatorioCsv(report.headers, filteredRows)}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${category}-${month}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-5" aria-label="Relatórios detalhados">
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
              Mês de referência
              <input
                aria-label="Mês de referência do relatório"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-deep)] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
              Buscar nos dados
              <input
                aria-label="Buscar nos dados do relatório"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, serviço, e-mail..."
                className="rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-brand-deep)] focus:outline-none"
              />
            </label>
            {statusOptions.length > 0 && (
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                {category === 'clientes' ? 'Status do cliente' : 'Status'}
                <select
                  aria-label={category === 'clientes' ? 'Status do cliente' : 'Status do relatório'}
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-deep)] focus:outline-none"
                >
                  <option value="todos">Todos</option>
                  {statusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button
            type="button"
            onClick={handleExportar}
            disabled={isLoading || filteredRows.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-deep)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
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
                d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3"
              />
            </svg>
            Exportar CSV ({filteredRows.length})
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Categoria do relatório">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={category === item.id}
              onClick={() => {
                setCategory(item.id);
                setStatus('todos');
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                category === item.id
                  ? 'bg-[var(--color-brand-deep)] text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {category === 'pagamentos' && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Recebidos pelo status do agendamento', valoresRecebidos],
            ['Previstos', valoresPrevistos],
            ['Sinais retidos', sinaisRetidos],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm"
            >
              <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
              <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">
                {((Number(value) || 0) / 100).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-4 py-3">
          <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
            {CATEGORIES.find((item) => item.id === category)?.label} — {month}
          </h2>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {isLoading ? 'Carregando...' : `${filteredRows.length} registro(s)`}
          </span>
        </div>
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
            Carregando dados para o relatório...
          </p>
        ) : filteredRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
            Nenhum dado encontrado com os filtros selecionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border-default)] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  {report.headers.map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 font-semibold"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="text-[var(--color-text-primary)] hover:bg-zinc-50">
                    {row.values.map((value, index) => (
                      <td key={`${row.id}-${index}`} className="whitespace-nowrap px-4 py-3">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {category === 'pagamentos' && (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Valores calculados a partir do status dos agendamentos: concluídos como recebidos;
          pendentes, confirmados, reagendados e em andamento como previstos; faltas e cancelamentos
          tardios pelo sinal retido.
        </p>
      )}
    </section>
  );
}
