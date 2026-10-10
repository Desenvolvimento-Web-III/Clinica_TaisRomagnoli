import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppShell } from '@/components/ui/AppShell';
import { useOptionalAuth } from '@/features/auth/auth-context';
import {
  getAgendamentosStorage,
  saveAgendamentosStorage,
} from '@/features/agendamentos/data/agendamentos-storage';
import type { Agendamento } from '@/features/agendamentos/types/agendamento';

interface DiaDisponivel {
  isoDate: string;
  diaSemanaFormatado: string;
  dataCurta: string;
  isDisponivel: boolean;
  motivoIndisponivel?: string;
}

interface HorarioSlot {
  hora: string;
  isDisponivel: boolean;
}

const DATAS_OPCOES_EXEMPLO: DiaDisponivel[] = [
  {
    isoDate: '2026-10-21',
    diaSemanaFormatado: 'Quarta-feira',
    dataCurta: '21 Out',
    isDisponivel: true,
  },
  {
    isoDate: '2026-10-22',
    diaSemanaFormatado: 'Quinta-feira',
    dataCurta: '22 Out',
    isDisponivel: true,
  },
  {
    isoDate: '2026-10-23',
    diaSemanaFormatado: 'Sexta-feira',
    dataCurta: '23 Out',
    isDisponivel: true,
  },
  {
    isoDate: '2026-10-24',
    diaSemanaFormatado: 'Sábado',
    dataCurta: '24 Out',
    isDisponivel: true,
  },
  {
    isoDate: '2026-10-25',
    diaSemanaFormatado: 'Domingo',
    dataCurta: '25 Out',
    isDisponivel: false,
    motivoIndisponivel: 'Sem expediente',
  },
  {
    isoDate: '2026-10-26',
    diaSemanaFormatado: 'Segunda-feira',
    dataCurta: '26 Out',
    isDisponivel: true,
  },
  {
    isoDate: '2026-10-27',
    diaSemanaFormatado: 'Terça-feira',
    dataCurta: '27 Out',
    isDisponivel: false,
    motivoIndisponivel: 'Folga da profissional',
  },
];

const HORARIOS_POR_DATA: Record<string, HorarioSlot[]> = {
  '2026-10-21': [
    { hora: '09:00', isDisponivel: true },
    { hora: '10:30', isDisponivel: true },
    { hora: '14:00', isDisponivel: false },
    { hora: '15:30', isDisponivel: true },
    { hora: '17:00', isDisponivel: true },
  ],
  '2026-10-22': [
    { hora: '08:30', isDisponivel: true },
    { hora: '10:00', isDisponivel: true },
    { hora: '11:30', isDisponivel: true },
    { hora: '14:00', isDisponivel: true },
    { hora: '16:00', isDisponivel: false },
  ],
  '2026-10-23': [
    { hora: '09:00', isDisponivel: true },
    { hora: '11:00', isDisponivel: true },
    { hora: '13:30', isDisponivel: true },
    { hora: '15:00', isDisponivel: true },
    { hora: '16:30', isDisponivel: true },
  ],
  '2026-10-24': [
    { hora: '08:00', isDisponivel: true },
    { hora: '09:30', isDisponivel: true },
    { hora: '11:00', isDisponivel: true },
  ],
  '2026-10-26': [
    { hora: '10:00', isDisponivel: true },
    { hora: '11:30', isDisponivel: true },
    { hora: '14:30', isDisponivel: true },
    { hora: '16:00', isDisponivel: true },
  ],
};

export function ReagendamentoPage() {
  const auth = useOptionalAuth();
  const userId = auth?.currentUser?.uid ?? null;

  return <ReagendamentoPageContent key={userId ?? 'guest'} userId={userId} />;
}

interface ReagendamentoPageContentProps {
  userId: string | null;
}

function ReagendamentoPageContent({ userId }: ReagendamentoPageContentProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [agendamentosLocais, setAgendamentosLocais] = useState<Agendamento[]>(() =>
    getAgendamentosStorage(userId),
  );
  const [dataSelecionada, setDataSelecionada] = useState<string>('2026-10-22');
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('10:00');
  const [motivo, setMotivo] = useState<string>('');
  const [isSucesso, setIsSucesso] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const agendamentoAtual = useMemo(() => {
    if (!userId) return undefined;
    return agendamentosLocais.find((item) => item.id === id) || agendamentosLocais[0];
  }, [agendamentosLocais, id, userId]);

  if (!agendamentoAtual) {
    return (
      <AppShell
        activeTab="agendamentos"
        eyebrow="Agendamentos"
        title="Agendamento Não Encontrado"
        description="Não foi possível carregar as informações do agendamento solicitado."
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-base text-[var(--color-text-secondary)]">
            O agendamento procurado não existe ou foi removido.
          </p>
          <Link
            to="/agendamentos"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-deep)]"
          >
            Voltar para Agendamentos
          </Link>
        </div>
      </AppShell>
    );
  }

  const horariosDisponiveis = HORARIOS_POR_DATA[dataSelecionada] || [];
  const diaObjeto = DATAS_OPCOES_EXEMPLO.find((d) => d.isoDate === dataSelecionada);

  const handleConfirmarReagendamento = () => {
    setSubmitting(true);
    setTimeout(() => {
      const dataFormatadaNova = diaObjeto
        ? `${diaObjeto.diaSemanaFormatado.slice(0, 3)}, ${diaObjeto.dataCurta} de Outubro`
        : dataSelecionada;

      const [horaInicio] = horarioSelecionado.split(':');
      const horaFim = (parseInt(horaInicio ?? '10', 10) + 1).toString().padStart(2, '0');
      const horarioFormatadoNovo = `${horarioSelecionado} - ${horaFim}:00`;

      setAgendamentosLocais((prev) => {
        const atualizados = prev.map((item) =>
          item.id === agendamentoAtual.id
            ? {
                ...item,
                dataHoraIso: `${dataSelecionada}T${horarioSelecionado}:00`,
                dataFormatada: dataFormatadaNova,
                horarioFormatado: horarioFormatadoNovo,
                observacao: motivo ? `Reagendado. Motivo: ${motivo}` : item.observacao,
              }
            : item,
        );
        saveAgendamentosStorage(atualizados, userId);
        return atualizados;
      });

      setSubmitting(false);
      setIsSucesso(true);
    }, 400);
  };

  return (
    <AppShell
      activeTab="agendamentos"
      eyebrow="Reorganize sua agenda"
      title="Reagendar Atendimento"
      description="Escolha uma nova data e horário para a sua sessão sem perder o valor do sinal já pago."
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Botão Voltar */}
        <div>
          <button
            type="button"
            data-testid="voltar-agendamentos-btn"
            onClick={() => navigate('/agendamentos')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-deep)] transition-colors hover:underline"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para Meus Agendamentos
          </button>
        </div>

        {/* Sucesso */}
        {isSucesso ? (
          <div
            data-testid="reagendamento-sucesso-card"
            className="rounded-[var(--radius-xl)] border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-6 sm:p-8 text-center shadow-[var(--shadow-elevated)]"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-text)] text-white shadow-md">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-[var(--color-success-text)] sm:text-2xl">
              Consulta Reagendada com Sucesso!
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Seu horário para <strong>{agendamentoAtual.servicoNome}</strong> foi atualizado.
            </p>

            <div className="mt-6 mx-auto max-w-md rounded-xl border border-[var(--color-border-default)] bg-white p-4 text-left shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-3">
                <span className="text-xs font-semibold uppercase text-[var(--color-text-secondary)]">
                  Novo Horário Confirmado
                </span>
                <span className="rounded-full bg-[var(--color-success-bg)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-success-text)] border border-[var(--color-success-border)]">
                  Confirmado
                </span>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Serviço:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {agendamentoAtual.servicoNome}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Profissional:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {agendamentoAtual.profissionalNome}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Nova Data:</span>
                  <span className="font-semibold text-[var(--color-brand-deep)]">
                    {diaObjeto?.diaSemanaFormatado}, {diaObjeto?.dataCurta}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Novo Horário:</span>
                  <span className="font-semibold text-[var(--color-brand-deep)]">
                    {horarioSelecionado} ({agendamentoAtual.duracaoMinutos} min)
                  </span>
                </p>
                <p className="flex justify-between border-t border-[var(--color-border-default)] pt-2">
                  <span className="text-[var(--color-text-secondary)]">Sinal 30%:</span>
                  <span className="font-semibold text-[var(--color-success-text)]">
                    R$ {agendamentoAtual.sinalPago.toFixed(2).replace('.', ',')} (Reaproveitado)
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                data-testid="voltar-aposterior-btn"
                onClick={() => navigate('/agendamentos')}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[var(--color-brand-deep)]"
              >
                Ir para Meus Agendamentos
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Coluna Esquerda: Resumo do Agendamento Atual & Regra */}
            <div className="space-y-5 lg:col-span-1">
              {/* Card Agendamento Atual */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                <span className="inline-block rounded-lg bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-deep)]">
                  Agendamento Atual
                </span>
                <h3 className="mt-3 text-base font-bold text-[var(--color-text-primary)]">
                  {agendamentoAtual.servicoNome}
                </h3>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Com {agendamentoAtual.profissionalNome}
                </p>

                <div className="mt-4 space-y-2 rounded-xl bg-[var(--color-canvas-neutral)] p-3 text-xs text-[var(--color-text-secondary)] border border-[var(--color-border-default)]">
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-[var(--color-brand-deep)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{agendamentoAtual.dataFormatada}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-[var(--color-brand-deep)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      {agendamentoAtual.horarioFormatado} ({agendamentoAtual.duracaoMinutos} min)
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-[var(--color-border-default)] pt-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Valor total:</span>
                    <span className="font-semibold">
                      R$ {agendamentoAtual.valorTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Sinal de 30% pago:</span>
                    <span className="font-semibold text-[var(--color-success-text)]">
                      R$ {agendamentoAtual.sinalPago.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Regra de Antecedência */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 text-xs text-[var(--color-info-text)] shadow-sm">
                <div className="flex items-start gap-2.5">
                  <svg
                    className="h-5 w-5 shrink-0 text-[var(--color-info-text)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h4 className="font-semibold">Regra de Reagendamento</h4>
                    <p className="mt-1 leading-relaxed">
                      Reagendamentos solicitados com pelo menos{' '}
                      <strong>3 horas de antecedência</strong> mantêm 100% do sinal pago para o novo
                      horário.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Seleção de Data, Horário e Confirmação */}
            <div className="space-y-6 lg:col-span-2">
              {/* Etapa 1: Seleção de Data */}
              <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  1. Escolha a nova data
                </h3>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Selecione um dos dias com horários de atendimento disponíveis:
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                  {DATAS_OPCOES_EXEMPLO.map((dia) => {
                    const isSelected = dataSelecionada === dia.isoDate;
                    return (
                      <button
                        key={dia.isoDate}
                        type="button"
                        disabled={!dia.isDisponivel}
                        data-testid={`data-option-${dia.isoDate}`}
                        onClick={() => {
                          setDataSelecionada(dia.isoDate);
                          // Seleciona primeiro horário disponível da data
                          const disponiveis = (HORARIOS_POR_DATA[dia.isoDate] || []).filter(
                            (h) => h.isDisponivel,
                          );
                          if (disponiveis.length > 0 && disponiveis[0]) {
                            setHorarioSelecionado(disponiveis[0].hora);
                          }
                        }}
                        className={`flex min-h-16 flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                          !dia.isDisponivel
                            ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-50'
                            : isSelected
                              ? 'border-[var(--color-brand-strong)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] ring-2 ring-[var(--color-brand-strong)] font-bold'
                              : 'border-[var(--color-border-default)] bg-white hover:border-[var(--color-brand-primary)]'
                        }`}
                      >
                        <span className="text-xs font-semibold">
                          {dia.diaSemanaFormatado.slice(0, 3)}
                        </span>
                        <span className="text-sm font-bold">{dia.dataCurta}</span>
                        {!dia.isDisponivel && (
                          <span className="mt-0.5 text-[10px] text-red-600 font-medium truncate max-w-full">
                            {dia.motivoIndisponivel || 'Indisponível'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Etapa 2: Seleção de Horário */}
              <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  2. Escolha o novo horário
                </h3>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Horários disponíveis para {diaObjeto?.diaSemanaFormatado}, {diaObjeto?.dataCurta}:
                </p>

                {horariosDisponiveis.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-[var(--color-canvas-neutral)] p-4 text-center text-xs text-[var(--color-text-secondary)]">
                    Nenhum horário disponível para esta data. Por favor, escolha outro dia.
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {horariosDisponiveis.map((slot) => {
                      const isSelected = horarioSelecionado === slot.hora;
                      return (
                        <button
                          key={slot.hora}
                          type="button"
                          disabled={!slot.isDisponivel}
                          data-testid={`horario-option-${slot.hora}`}
                          onClick={() => setHorarioSelecionado(slot.hora)}
                          className={`inline-flex min-h-11 min-w-24 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                            !slot.isDisponivel
                              ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through'
                              : isSelected
                                ? 'border-[var(--color-brand-strong)] bg-[var(--color-brand-strong)] text-white shadow-sm'
                                : 'border-[var(--color-border-default)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-deep)]'
                          }`}
                        >
                          {slot.hora}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Etapa 3: Motivo Opcional */}
              <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                <label
                  htmlFor="motivo-reagendamento"
                  className="block text-base font-bold text-[var(--color-text-primary)]"
                >
                  3. Motivo da alteração{' '}
                  <span className="text-xs font-normal text-[var(--color-text-secondary)]">
                    (opcional)
                  </span>
                </label>
                <textarea
                  id="motivo-reagendamento"
                  data-testid="motivo-input"
                  rows={2}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Imprevisto pessoal ou incompatibilidade de agenda..."
                  className="mt-2 w-full rounded-xl border border-[var(--color-border-default)] bg-white p-3 text-sm focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)]"
                />
              </section>

              {/* Etapa 4: Resumo Final & Confirmação */}
              <section className="rounded-[var(--radius-xl)] border border-[var(--color-brand-primary)] bg-[var(--color-brand-soft)] p-5 sm:p-6 shadow-[var(--shadow-elevated)]">
                <h3 className="text-base font-bold text-[var(--color-brand-deep)]">
                  Resumo do Reagendamento
                </h3>

                <div className="mt-3 space-y-2 rounded-xl bg-white p-4 text-xs sm:text-sm border border-[var(--color-border-default)]">
                  <div className="flex justify-between border-b border-[var(--color-border-default)] pb-2">
                    <span className="text-[var(--color-text-secondary)]">Horário Anterior:</span>
                    <span className="font-medium text-gray-500 line-through">
                      {agendamentoAtual.dataFormatada} às{' '}
                      {agendamentoAtual.horarioFormatado.split(' ')[0]}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-border-default)] pb-2">
                    <span className="text-[var(--color-text-secondary)]">Novo Horário:</span>
                    <span className="font-bold text-[var(--color-brand-deep)]">
                      {diaObjeto?.diaSemanaFormatado}, {diaObjeto?.dataCurta} às{' '}
                      {horarioSelecionado}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-border-default)] pb-2">
                    <span className="text-[var(--color-text-secondary)]">
                      Sinal 30% Reaproveitado:
                    </span>
                    <span className="font-bold text-[var(--color-success-text)]">
                      R$ {agendamentoAtual.sinalPago.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      Restante no Atendimento:
                    </span>
                    <span className="font-bold text-[var(--color-brand-strong)] text-base">
                      R${' '}
                      {(agendamentoAtual.valorTotal - agendamentoAtual.sinalPago)
                        .toFixed(2)
                        .replace('.', ',')}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/agendamentos')}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-gray-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    data-testid="confirmar-reagendamento-btn"
                    disabled={submitting || !horarioSelecionado}
                    onClick={handleConfirmarReagendamento}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-strong)] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-brand-deep)] active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Processando...
                      </>
                    ) : (
                      'Confirmar Reagendamento'
                    )}
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
