import React from 'react';
import type { IndicadoresOperacionais } from '@clinica/shared';

export interface AdminIndicadoresOperacionaisProps {
  indicadores: IndicadoresOperacionais;
  isLoading?: boolean;
}

export const AdminIndicadoresOperacionais: React.FC<AdminIndicadoresOperacionaisProps> = ({
  indicadores,
  isLoading = false,
}) => {
  const { agendamentosDoDia, atendimentosRealizadosMes, cancelamentosEFaltas, ocupacaoAgenda } =
    indicadores;

  const totalHorasAtendimento = Math.round((atendimentosRealizadosMes.totalMinutos / 60) * 10) / 10;
  const taxaOcupacao = Math.min(100, Math.max(0, ocupacaoAgenda.taxaOcupacaoPercentual));

  if (isLoading) {
    return (
      <div
        data-testid="indicadores-operacionais-loading"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-busy="true"
        aria-label="Carregando indicadores operacionais"
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm"
          >
            <div className="h-4 w-28 rounded bg-zinc-200" />
            <div className="mt-3 h-8 w-16 rounded bg-zinc-200" />
            <div className="mt-2 h-3 w-36 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-testid="indicadores-operacionais"
      aria-label="Painel de Indicadores Operacionais"
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Indicadores Operacionais
        </h2>
        <span className="text-xs text-[var(--color-text-secondary)]">Métricas em tempo real</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Agendamentos do Dia */}
        <div
          className="flex flex-col justify-between rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-all hover:border-[var(--color-brand-deep)]/40"
          data-testid="indicador-agendamentos-dia"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Agendamentos do Dia
              </span>
              <span className="inline-flex items-center rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-brand-deep)]">
                Hoje
              </span>
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
              {agendamentosDoDia.total}
            </p>
          </div>

          <div className="mt-4 border-t border-[var(--color-border-default)]/60 pt-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {agendamentosDoDia.concluidos} concluído
                {agendamentosDoDia.concluidos !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {agendamentosDoDia.pendentes} pendente{agendamentosDoDia.pendentes !== 1 ? 's' : ''}
              </span>
              {agendamentosDoDia.cancelados > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 font-medium text-red-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {agendamentosDoDia.cancelados} cancelado
                  {agendamentosDoDia.cancelados !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Atendimentos do Mês */}
        <div
          className="flex flex-col justify-between rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-all hover:border-[var(--color-brand-deep)]/40"
          data-testid="indicador-atendimentos-mes"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Atendimentos no Mês
              </span>
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                Mês Atual
              </span>
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
              {atendimentosRealizadosMes.total}
            </p>
          </div>

          <div className="mt-4 border-t border-[var(--color-border-default)]/60 pt-3">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
              Volume total:{' '}
              <span className="font-bold text-[var(--color-text-primary)]">
                {totalHorasAtendimento}h
              </span>{' '}
              ({atendimentosRealizadosMes.totalMinutos} min)
            </p>
          </div>
        </div>

        {/* 3. Cancelamentos e Faltas */}
        <div
          className="flex flex-col justify-between rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-all hover:border-[var(--color-brand-deep)]/40"
          data-testid="indicador-cancelamentos-faltas"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Cancelamentos e Faltas
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  cancelamentosEFaltas.taxaCancelamentoPercentual > 10
                    ? 'bg-red-50 text-red-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {cancelamentosEFaltas.taxaCancelamentoPercentual}% taxa
              </span>
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight text-amber-600">
              {cancelamentosEFaltas.totalCancelamentos + cancelamentosEFaltas.faltas}
            </p>
          </div>

          <div className="mt-4 border-t border-[var(--color-border-default)]/60 pt-3">
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span>Com aviso (≥ 3h):</span>
                <span className="font-semibold text-emerald-600">
                  {cancelamentosEFaltas.cancelamentosNoPrazo}
                </span>
              </div>
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span>Tardios / Faltas:</span>
                <span className="font-semibold text-rose-600">
                  {cancelamentosEFaltas.cancelamentosTardios + cancelamentosEFaltas.faltas}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Ocupação da Agenda */}
        <div
          className="flex flex-col justify-between rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-all hover:border-[var(--color-brand-deep)]/40"
          data-testid="indicador-ocupacao-agenda"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Ocupação da Agenda
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  ocupacaoAgenda.metaSuperada
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {ocupacaoAgenda.metaSuperada ? 'Meta Superada' : 'Abaixo da Meta'}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
                {ocupacaoAgenda.taxaOcupacaoPercentual}%
              </p>
              <span className="text-xs text-[var(--color-text-secondary)]">
                (Meta: {ocupacaoAgenda.metaOcupacaoPercentual}%)
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-[var(--color-border-default)]/60 pt-3">
            {/* Barra de Progresso da Ocupação */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  ocupacaoAgenda.metaSuperada ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${taxaOcupacao}%` }}
              />
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">
                {ocupacaoAgenda.slotsOcupados}
              </span>{' '}
              de {ocupacaoAgenda.slotsDisponiveis} slots mensais
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
