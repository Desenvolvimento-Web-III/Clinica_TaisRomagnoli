import React, { useEffect } from 'react';
import type { Agendamento, StatusAgendamento } from '../types/agendamento';

interface AgendamentoDetalhesModalProps {
  agendamento: Agendamento | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelarClick?: (agendamento: Agendamento) => void;
  onReagendarClick?: (agendamento: Agendamento) => void;
}

const STATUS_DETAILS_CONFIG: Record<
  StatusAgendamento,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    descricao: string;
    icon: React.ReactNode;
  }
> = {
  confirmado: {
    label: 'Confirmado',
    badgeBg: 'bg-[var(--color-success-bg)]',
    badgeText: 'text-[var(--color-success-text)]',
    badgeBorder: 'border-[var(--color-success-border)]',
    descricao: 'Seu horário está confirmado na agenda. O sinal de 30% foi validado com sucesso.',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  pendente: {
    label: 'Aguardando Sinal',
    badgeBg: 'bg-[var(--color-warning-bg)]',
    badgeText: 'text-[var(--color-warning-text)]',
    badgeBorder: 'border-[var(--color-warning-border)]',
    descricao:
      'Aguardando confirmação do pagamento do sinal de 30% para garantir a vaga na agenda.',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  concluido: {
    label: 'Concluído',
    badgeBg: 'bg-[var(--color-brand-soft)]',
    badgeText: 'text-[var(--color-brand-deep)]',
    badgeBorder: 'border-[var(--color-brand-primary)]',
    descricao: 'Sessão de massoterapia realizada e finalizada com sucesso.',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  cancelado: {
    label: 'Cancelado',
    badgeBg: 'bg-[var(--color-error-bg)]',
    badgeText: 'text-[var(--color-error-text)]',
    badgeBorder: 'border-[var(--color-error-border)]',
    descricao: 'Este agendamento foi cancelado e o horário liberado na agenda.',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
  },
};

export const AgendamentoDetalhesModal: React.FC<AgendamentoDetalhesModalProps> = ({
  agendamento,
  isOpen,
  onClose,
  onCancelarClick,
  onReagendarClick,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !agendamento) return null;

  const statusInfo = STATUS_DETAILS_CONFIG[agendamento.status];
  const saldoRestante = Math.max(0, agendamento.valorTotal - agendamento.sinalPago);
  const podeAcoes = agendamento.status === 'confirmado' || agendamento.status === 'pendente';

  const gerarWhatsappUrl = () => {
    const mensagem = encodeURIComponent(
      `Olá Tais! Gostaria de conversar sobre os detalhes do meu agendamento de ${agendamento.servicoNome} no dia ${agendamento.dataFormatada} às ${agendamento.horarioFormatado}.`,
    );
    return `https://wa.me/5511999999999?text=${mensagem}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalhes-modal-title"
      data-testid="detalhes-agendamento-modal"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)] p-4 backdrop-blur-xs sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-elevated)] sm:p-7">
        {/* Cabeçalho do Modal com Botão Fechar */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-default)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-deep)]">
                Detalhes do Agendamento
              </p>
              <h2
                id="detalhes-modal-title"
                className="text-lg font-bold text-[var(--color-text-primary)]"
              >
                {agendamento.servicoNome}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do agendamento"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-text-primary)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 1. Situação Atual / Status */}
        <section
          aria-label="Situação Atual"
          className="mt-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Situação Atual
            </span>
            <span
              data-testid={`modal-status-badge-${agendamento.id}`}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.badgeBg} ${statusInfo.badgeText} ${statusInfo.badgeBorder}`}
            >
              {statusInfo.icon}
              {statusInfo.label}
            </span>
          </div>
          <p className="mt-2 text-xs/5 text-[var(--color-text-secondary)]">
            {statusInfo.descricao}
          </p>
        </section>

        {/* 2. Serviço e Profissional */}
        <section aria-label="Informações do Serviço" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-3.5">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">
                Serviço
              </span>
              <p className="mt-0.5 text-sm font-bold text-[var(--color-text-primary)]">
                {agendamento.servicoNome}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-brand-deep)]">
                <span className="rounded bg-[var(--color-brand-soft)] px-2 py-0.5 font-medium">
                  {agendamento.servicoCategoria}
                </span>
                <span>•</span>
                <span>{agendamento.duracaoMinutos} min</span>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-3.5">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">
                Profissional
              </span>
              <p className="mt-0.5 text-sm font-bold text-[var(--color-text-primary)]">
                {agendamento.profissionalNome}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Massoterapeuta Responsável
              </p>
            </div>
          </div>
        </section>

        {/* 3. Data e Horário */}
        <section
          aria-label="Data e Horário"
          className="mt-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-brand-soft)]/50 p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">
                  Data da Sessão
                </span>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">
                  {agendamento.dataFormatada}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase">
                  Horário
                </span>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">
                  {agendamento.horarioFormatado}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Pagamento e Saldo */}
        <section
          aria-label="Pagamento e Saldo"
          className="mt-3 rounded-xl border border-[var(--color-border-default)] bg-white p-4"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Financeiro do Atendimento
          </h3>
          <dl className="mt-3 divide-y divide-[var(--color-border-default)] text-xs/6">
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-[var(--color-text-secondary)]">Valor total do serviço:</dt>
              <dd className="font-bold text-[var(--color-text-primary)]">
                R$ {agendamento.valorTotal.toFixed(2).replace('.', ',')}
              </dd>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <dt className="text-[var(--color-text-secondary)]">Pagamento do sinal (30%):</dt>
              <dd className="font-semibold">
                {agendamento.sinalPago > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[var(--color-success-text)] font-bold">
                    <span>R$ {agendamento.sinalPago.toFixed(2).replace('.', ',')}</span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] uppercase font-bold text-emerald-800">
                      Pago
                    </span>
                  </span>
                ) : (
                  <span className="text-[var(--color-warning-text)] font-bold">
                    Pendente (R$ {(agendamento.valorTotal * 0.3).toFixed(2).replace('.', ',')})
                  </span>
                )}
              </dd>
            </div>

            <div className="flex items-center justify-between py-2 text-sm">
              <dt className="font-bold text-[var(--color-brand-deep)]">
                Saldo restante na clínica:
              </dt>
              <dd className="text-base font-extrabold text-[var(--color-brand-deep)]">
                R$ {saldoRestante.toFixed(2).replace('.', ',')}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-[var(--color-text-secondary)]">
            * O saldo restante pode ser pago presencialmente no dia da sessão via Pix, cartão ou
            dinheiro.
          </p>
        </section>

        {/* 5. Observação (se houver) */}
        {agendamento.observacao && (
          <div className="mt-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-3.5 text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">Observações: </span>
            <span>{agendamento.observacao}</span>
          </div>
        )}

        {/* Ações do Modal */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-4">
          <a
            href={gerarWhatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--color-success-text)] transition-colors hover:brightness-95"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.099 4.019 4.043-1.056z" />
            </svg>
            <span>Dúvida no WhatsApp</span>
          </a>

          <div className="flex flex-wrap items-center gap-2">
            {podeAcoes && onReagendarClick && (
              <button
                type="button"
                data-testid="modal-reagendar-button"
                onClick={() => {
                  onClose();
                  onReagendarClick(agendamento);
                }}
                className="min-h-11 rounded-xl border border-[var(--color-brand-primary)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-brand-deep)] transition-colors hover:bg-[var(--color-brand-soft)]"
              >
                Reagendar
              </button>
            )}

            {podeAcoes && onCancelarClick && (
              <button
                type="button"
                data-testid="modal-cancelar-button"
                onClick={() => {
                  onClose();
                  onCancelarClick(agendamento);
                }}
                className="min-h-11 rounded-xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-error-text)] transition-colors hover:brightness-95"
              >
                Cancelar
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl bg-[var(--color-brand-strong)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-deep)]"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
