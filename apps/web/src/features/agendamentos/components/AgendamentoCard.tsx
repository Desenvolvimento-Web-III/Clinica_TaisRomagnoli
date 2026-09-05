import React from 'react';
import type { Agendamento, StatusAgendamento } from '../types/agendamento';

interface AgendamentoCardProps {
  agendamento: Agendamento;
  onCancelarClick: (agendamento: Agendamento) => void;
  onReagendarClick: (agendamento: Agendamento) => void;
}

const STATUS_CONFIG: Record<
  StatusAgendamento,
  { label: string; bgClass: string; textClass: string; borderClass: string; icon: React.ReactNode }
> = {
  confirmado: {
    label: 'Confirmado',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    icon: (
      <svg
        className="w-3.5 h-3.5 mr-1 text-emerald-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  pendente: {
    label: 'Aguardando Sinal',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    icon: (
      <svg
        className="w-3.5 h-3.5 mr-1 text-amber-600 animate-pulse"
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
    ),
  },
  concluido: {
    label: 'Concluído',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    icon: (
      <svg
        className="w-3.5 h-3.5 mr-1 text-purple-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
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
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
    icon: (
      <svg
        className="w-3.5 h-3.5 mr-1 text-rose-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
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

export const AgendamentoCard: React.FC<AgendamentoCardProps> = ({
  agendamento,
  onCancelarClick,
  onReagendarClick,
}) => {
  const statusInfo = STATUS_CONFIG[agendamento.status];
  const podeCancelar = agendamento.status === 'confirmado' || agendamento.status === 'pendente';
  const podeReagendar = agendamento.status === 'confirmado' || agendamento.status === 'pendente';

  const gerarWhatsappUrl = () => {
    const mensagem = encodeURIComponent(
      `Olá Tais! Gostaria de tirar uma dúvida sobre meu agendamento de ${agendamento.servicoNome} no dia ${agendamento.dataFormatada} às ${agendamento.horarioFormatado}.`,
    );
    return `https://wa.me/5511999999999?text=${mensagem}`;
  };

  return (
    <article
      data-testid={`agendamento-card-${agendamento.id}`}
      className="group relative overflow-hidden rounded-2xl border border-purple-100/80 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-purple-200 hover:shadow-md"
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Imagem do Serviço */}
        <div className="relative h-36 w-full sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden rounded-xl bg-purple-50">
          {agendamento.imagemUrl ? (
            <img
              src={agendamento.imagemUrl}
              alt={agendamento.servicoNome}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-purple-100 text-purple-600">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          )}
          <span className="absolute top-2 left-2 rounded-md bg-purple-900/75 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
            {agendamento.servicoCategoria}
          </span>
        </div>

        {/* Informações Principais */}
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900 leading-snug">
                {agendamento.servicoNome}
              </h3>
              {/* Badge de Status */}
              <span
                data-testid={`status-badge-${agendamento.id}`}
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.bgClass} ${statusInfo.textClass} ${statusInfo.borderClass}`}
              >
                {statusInfo.icon}
                {statusInfo.label}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Profissional:{' '}
              <span className="font-medium text-slate-700">{agendamento.profissionalNome}</span>
            </p>

            {/* Data e Hora */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-700 bg-purple-50/60 rounded-lg p-2 border border-purple-100/50">
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-purple-600"
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
                <span>{agendamento.dataFormatada}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-purple-600"
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
                  {agendamento.horarioFormatado} ({agendamento.duracaoMinutos} min)
                </span>
              </div>
            </div>
          </div>

          {/* Valores e Sinal */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
            <div>
              <span className="text-slate-500">Valor Total: </span>
              <span className="font-semibold text-slate-900">
                R$ {agendamento.valorTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Sinal 30%: </span>
              <span
                className={`font-semibold ${agendamento.sinalPago > 0 ? 'text-emerald-600' : 'text-amber-600'}`}
              >
                {agendamento.sinalPago > 0
                  ? `R$ ${agendamento.sinalPago.toFixed(2).replace('.', ',')} (Pago)`
                  : 'Pendente'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <a
          href={gerarWhatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Falar no WhatsApp sobre agendamento de ${agendamento.servicoNome}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
        >
          <svg className="w-4 h-4 fill-emerald-600" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.099 4.019 4.043-1.056z" />
          </svg>
          <span>WhatsApp</span>
        </a>

        <div className="flex items-center gap-2">
          {podeReagendar && (
            <button
              type="button"
              onClick={() => onReagendarClick(agendamento)}
              className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            >
              Reagendar
            </button>
          )}

          {podeCancelar && (
            <button
              type="button"
              onClick={() => onCancelarClick(agendamento)}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
