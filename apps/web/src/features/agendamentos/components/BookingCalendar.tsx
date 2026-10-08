import { useState, useMemo } from 'react';
import { CONFIGURACAO_HORARIOS_PADRAO } from '@clinica/shared';

interface BookingCalendarProps {
  dataSelecionada: string; // ISO 'YYYY-MM-DD'
  horarioSelecionado: string; // 'HH:mm'
  onSelectData: (isoDate: string) => void;
  onSelectHorario: (hora: string) => void;
  onConfirmar: () => void;
  onVoltar?: () => void;
}

const MESES_NOMES = [
  { valor: 0, label: 'Jan', extenso: 'Janeiro' },
  { valor: 1, label: 'Fev', extenso: 'Fevereiro' },
  { valor: 2, label: 'Mar', extenso: 'Março' },
  { valor: 3, label: 'Abr', extenso: 'Abril' },
  { valor: 4, label: 'Mai', extenso: 'Maio' },
  { valor: 5, label: 'Jun', extenso: 'Junho' },
  { valor: 6, label: 'Jul', extenso: 'Julho' },
  { valor: 7, label: 'Ago', extenso: 'Agosto' },
  { valor: 8, label: 'Set', extenso: 'Setembro' },
  { valor: 9, label: 'Out', extenso: 'Outubro' },
  { valor: 10, label: 'Nov', extenso: 'Novembro' },
  { valor: 11, label: 'Dez', extenso: 'Dezembro' },
];

const ANOS_OPCOES = [2025, 2026, 2027];

const HORARIOS_DISPONIVEIS_PADRAO = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
];

export function BookingCalendar({
  dataSelecionada,
  horarioSelecionado,
  onSelectData,
  onSelectHorario,
  onConfirmar,
  onVoltar,
}: BookingCalendarProps) {
  // Inicializa ano e mês a partir da dataSelecionada (ex: '2026-10-22')
  const initialDate = useMemo(() => {
    const parts = dataSelecionada.split('-').map(Number);
    const ano = parts[0] || 2026;
    const mes = (parts[1] || 10) - 1;
    return { ano, mes };
  }, [dataSelecionada]);

  const [anoAtual, setAnoAtual] = useState<number>(initialDate.ano);
  const [mesAtual, setMesAtual] = useState<number>(initialDate.mes);
  const [horariosAbertos, setHorariosAbertos] = useState<boolean>(true);

  // Navegação de mês
  const handleMesAnterior = () => {
    if (mesAtual === 0) {
      setMesAtual(11);
      setAnoAtual((a) => a - 1);
    } else {
      setMesAtual((m) => m - 1);
    }
  };

  const handleProximoMes = () => {
    if (mesAtual === 11) {
      setMesAtual(0);
      setAnoAtual((a) => a + 1);
    } else {
      setMesAtual((m) => m + 1);
    }
  };

  // Dias inativos na clínica (folgas padrão: 0 = Domingo, 2 = Terça)
  const diasInativosClinica = useMemo(() => {
    const inativos = new Set<number>();
    CONFIGURACAO_HORARIOS_PADRAO.dias.forEach((d) => {
      if (!d.ativo) {
        inativos.add(d.dia);
      }
    });
    return inativos;
  }, []);

  // Montagem da grade do calendário
  const diasGrade = useMemo(() => {
    const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay(); // 0 = Domingo
    const totalDiasMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const totalDiasMesAnterior = new Date(anoAtual, mesAtual, 0).getDate();

    const grid = [];

    // Dias do mês anterior
    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
      grid.push({
        dia: totalDiasMesAnterior - i,
        mes: mesAtual === 0 ? 11 : mesAtual - 1,
        ano: mesAtual === 0 ? anoAtual - 1 : anoAtual,
        isCurrentMonth: false,
        isDisponivel: false,
        isoDate: '',
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= totalDiasMes; d++) {
      const dayOfWeek = new Date(anoAtual, mesAtual, d).getDay();
      const isFolga = diasInativosClinica.has(dayOfWeek);
      const isoDate = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      grid.push({
        dia: d,
        mes: mesAtual,
        ano: anoAtual,
        isCurrentMonth: true,
        isDisponivel: !isFolga,
        isoDate,
      });
    }

    // Dias do próximo mês para completar grade múltipla de 7
    const totalRestante = (7 - (grid.length % 7)) % 7;
    for (let d = 1; d <= totalRestante; d++) {
      grid.push({
        dia: d,
        mes: mesAtual === 11 ? 0 : mesAtual + 1,
        ano: mesAtual === 11 ? anoAtual + 1 : anoAtual,
        isCurrentMonth: false,
        isDisponivel: false,
        isoDate: '',
      });
    }

    return grid;
  }, [anoAtual, mesAtual, diasInativosClinica]);

  // Verifica se o dia selecionado é válido
  const diaSelecionadoValido = useMemo(() => {
    const parts = dataSelecionada.split('-').map(Number);
    const ano = parts[0] || 2026;
    const mes = (parts[1] || 10) - 1;
    const dia = parts[2] || 1;
    const dayOfWeek = new Date(ano, mes, dia).getDay();
    return !diasInativosClinica.has(dayOfWeek);
  }, [dataSelecionada, diasInativosClinica]);

  // Data formatada para visualização
  const dataFormatadaAmigavel = useMemo(() => {
    const parts = dataSelecionada.split('-').map(Number);
    const ano = parts[0] || 2026;
    const mes = (parts[1] || 10) - 1;
    const dia = parts[2] || 1;
    const dateObj = new Date(ano, mes, dia);
    const nomesSemana = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    const diaSemana = nomesSemana[dateObj.getDay()] || '';
    const mesExtenso = MESES_NOMES[mes]?.extenso || '';
    return `${dia} de ${mesExtenso} de ${ano} (${diaSemana})`;
  }, [dataSelecionada]);

  return (
    <div
      data-testid="booking-calendar-container"
      className="min-h-dvh bg-[var(--color-canvas-neutral)] pb-16 text-[var(--color-text-primary)]"
    >
      {/* Cabeçalho Roxo Curvo e Responsivo */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-[#8F75D0] to-[#7A60B8] py-4 text-white shadow-md backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6">
          {onVoltar ? (
            <button
              type="button"
              data-testid="voltar-calendario-btn"
              onClick={onVoltar}
              aria-label="Voltar para serviços"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all hover:bg-white/30"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          ) : (
            <div className="w-10" />
          )}

          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Calendário</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Conteúdo Principal Responsivo (1 Coluna em Mobile, 2 Colunas em Desktop/Tablet) */}
      <main className="mx-auto mt-6 max-w-5xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
          {/* Coluna Esquerda: Legendas + Grade do Mês */}
          <div className="space-y-4 lg:col-span-7">
            {/* Cartões de Legenda */}
            <div className="grid grid-cols-2 gap-3">
              <div
                data-testid="legenda-disponivel"
                className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-border-default)] bg-white p-3.5 shadow-sm"
              >
                <div className="h-5 w-5 rounded-md border-2 border-slate-300 bg-white shadow-inner" />
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Dia disponível
                </span>
              </div>

              <div
                data-testid="legenda-indisponivel"
                className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-border-default)] bg-white p-3.5 shadow-sm"
              >
                <div className="h-5 w-5 rounded-md bg-[#6B7280] shadow-inner" />
                <span className="text-xs font-bold text-[var(--color-text-primary)]">
                  Dia indisponível
                </span>
              </div>
            </div>

            {/* Card do Calendário Mensal */}
            <div className="rounded-3xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-6">
              {/* Navegação Mês e Ano */}
              <div className="flex items-center justify-between pb-4">
                <button
                  type="button"
                  data-testid="mes-anterior-btn"
                  onClick={handleMesAnterior}
                  aria-label="Mês anterior"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] shadow-sm transition hover:bg-[var(--color-canvas-neutral)]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  <label htmlFor="select-mes" className="sr-only">
                    Mês
                  </label>
                  <select
                    id="select-mes"
                    data-testid="select-mes"
                    value={mesAtual}
                    onChange={(e) => setMesAtual(Number(e.target.value))}
                    className="rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-text-primary)] shadow-sm focus:border-[var(--color-brand-primary)] focus:outline-none"
                  >
                    {MESES_NOMES.map((m) => (
                      <option key={m.valor} value={m.valor}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="select-ano" className="sr-only">
                    Ano
                  </label>
                  <select
                    id="select-ano"
                    data-testid="select-ano"
                    value={anoAtual}
                    onChange={(e) => setAnoAtual(Number(e.target.value))}
                    className="rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-text-primary)] shadow-sm focus:border-[var(--color-brand-primary)] focus:outline-none"
                  >
                    {ANOS_OPCOES.map((ano) => (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  data-testid="proximo-mes-btn"
                  onClick={handleProximoMes}
                  aria-label="Próximo mês"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] shadow-sm transition hover:bg-[var(--color-canvas-neutral)]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              {/* Cabeçalho dos Dias da Semana */}
              <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-bold text-[var(--color-text-secondary)]">
                <span>Su</span>
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
              </div>

              {/* Grade de Dias */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                {diasGrade.map((item, index) => {
                  if (!item.isCurrentMonth) {
                    return (
                      <div
                        key={`other-${index}`}
                        className="flex h-10 items-center justify-center text-slate-300"
                      >
                        {item.dia}
                      </div>
                    );
                  }

                  const isSelected = item.isoDate === dataSelecionada;

                  if (!item.isDisponivel) {
                    return (
                      <div
                        key={`indisp-${item.isoDate}`}
                        data-testid={`dia-indisponivel-${item.isoDate}`}
                        title="Dia indisponível (Folga da clínica)"
                        className="flex h-10 items-center justify-center rounded-xl bg-[#6B7280] font-bold text-white shadow-sm"
                      >
                        {item.dia}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={`disp-${item.isoDate}`}
                      type="button"
                      data-testid={`dia-disponivel-${item.isoDate}`}
                      onClick={() => onSelectData(item.isoDate)}
                      className={`flex h-10 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[var(--color-brand-strong)] text-white shadow-md ring-2 ring-[var(--color-brand-primary)]'
                          : 'bg-white text-[var(--color-text-primary)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]'
                      }`}
                    >
                      {item.dia}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Horários + Resumo + Botão de Ação */}
          <div className="space-y-4 lg:col-span-5">
            {/* Seletor de Horários */}
            <div className="rounded-3xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-6">
              <button
                type="button"
                data-testid="toggle-horarios-btn"
                onClick={() => setHorariosAbertos((prev) => !prev)}
                className="flex w-full items-center justify-between text-left text-xs font-bold text-[var(--color-text-primary)] sm:text-sm"
              >
                <span>
                  Selecione um horário disponível:{' '}
                  {diaSelecionadoValido ? `(${horarioSelecionado})` : ''}
                </span>
                <svg
                  className={`h-4 w-4 text-[var(--color-brand-deep)] transition-transform duration-200 ${
                    horariosAbertos ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {horariosAbertos && (
                <div className="mt-4 border-t border-[var(--color-border-default)] pt-4">
                  {diaSelecionadoValido ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {HORARIOS_DISPONIVEIS_PADRAO.map((hora) => {
                        const isSelected = hora === horarioSelecionado;
                        return (
                          <button
                            key={hora}
                            type="button"
                            data-testid={`slot-hora-${hora}`}
                            onClick={() => onSelectHorario(hora)}
                            className={`inline-flex min-h-10 items-center justify-center rounded-xl px-2 py-1 text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-[var(--color-brand-strong)] text-white shadow-sm'
                                : 'bg-[var(--color-canvas-neutral)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-deep)]'
                            }`}
                          >
                            {hora}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[var(--color-error-bg)] p-3 text-center text-xs font-medium text-[var(--color-error-text)] border border-[var(--color-error-border)]">
                      O dia selecionado é uma folga da clínica. Escolha um dia disponível para
                      visualizar os horários.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card de Resumo Selecionado (Desktop & Mobile) */}
            <div className="rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-brand-soft)] p-4 sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
                Data e Horário Selecionados
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
                {dataFormatadaAmigavel}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[var(--color-brand-deep)]">
                Horário: {horarioSelecionado}
              </p>

              {/* Nota Informativa */}
              <p className="mt-3 border-t border-[#DDD6FE] pt-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Intervalos de 30 minutos são reservados automaticamente entre atendimentos.
              </p>
            </div>

            {/* Botão Confirmar Agendamento */}
            <div className="pt-2">
              <button
                type="button"
                data-testid="confirmar-agendamento-btn"
                disabled={!diaSelecionadoValido}
                onClick={onConfirmar}
                className={`inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all ${
                  diaSelecionadoValido
                    ? 'bg-[var(--color-brand-strong)] hover:bg-[var(--color-brand-deep)] active:scale-[0.98]'
                    : 'cursor-not-allowed bg-slate-300 opacity-60'
                }`}
              >
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
