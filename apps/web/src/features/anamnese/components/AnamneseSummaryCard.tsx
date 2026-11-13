import { Link } from 'react-router-dom';
import { avaliarBloqueioContraindicacao, REGIOES_CORPO_OPCOES } from '../data/initial-anamnese';
import type { FichaAnamneseData } from '../types/anamnese';

interface AnamneseSummaryCardProps {
  data: FichaAnamneseData;
  pontosAtencao: string[];
  updatedAt?: string;
  exigeLiberacaoMedica?: boolean;
  contraindicacoes?: readonly string[];
  liberacaoMedicaAprovada?: boolean;
  liberacaoMedicaAprovadaEm?: string;
  liberacaoMedicaObservacoes?: string;
  onEdit: () => void;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function AnamneseSummaryCard({
  data,
  pontosAtencao,
  updatedAt,
  exigeLiberacaoMedica,
  contraindicacoes,
  liberacaoMedicaAprovada,
  liberacaoMedicaAprovadaEm,
  liberacaoMedicaObservacoes,
  onEdit,
}: AnamneseSummaryCardProps) {
  const avaliacao = avaliarBloqueioContraindicacao({
    ...data,
    exigeLiberacaoMedica,
    contraindicacoes: contraindicacoes ? [...contraindicacoes] : undefined,
    liberacaoMedicaAprovada,
  });

  const regioesNomes = data.regioesFoco
    .map((r) => REGIOES_CORPO_OPCOES.find((o) => o.id === r)?.label ?? r)
    .join(', ');

  const pressaoLabels: Record<string, string> = {
    suave: 'Suave (relaxamento delicado)',
    moderada: 'Moderada (equilíbrio e conforto)',
    firme: 'Firme / Forte (descontraturante e nós)',
  };

  return (
    <div className="space-y-6">
      {/* Banner de Confirmação e Sucesso */}
      <div
        role="status"
        className="flex items-start gap-3.5 rounded-2xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-5 text-[var(--color-success-text)] sm:p-6"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-success-text)] text-white">
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
              strokeWidth="2.5"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-[var(--color-success-text)]">
            Ficha de Anamnese preenchida com sucesso!
          </h2>
          <p className="mt-1 text-sm/6 text-[var(--color-success-text)]">
            Suas informações de saúde e preferências foram registradas de forma segura e serão
            consultadas pela terapeuta para a preparação do seu atendimento.
          </p>
          {updatedAt && (
            <p className="mt-2 text-xs font-semibold text-[var(--color-success-text)]">
              Registrado em {dateFormatter.format(new Date(updatedAt))}
            </p>
          )}
        </div>
      </div>

      {/* Status de Liberação Médica */}
      {avaliacao.bloqueado && (
        <div
          role="status"
          data-testid="anamnese-liberacao-pendente"
          className="flex items-start gap-3.5 rounded-2xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-5 text-[var(--color-warning-text)] sm:p-6"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-warning-text)] text-white">
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
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-bold text-[var(--color-warning-text)]">
              Aguardando liberação médica para confirmação
            </h3>
            <p className="text-xs/5 text-[var(--color-warning-text)] sm:text-sm/6">
              Sua ficha indica condições que requerem aval médico antes da confirmação de novos
              agendamentos. Após apresentar a liberação médica à clínica, a profissional registrará
              a aprovação na sua ficha.
            </p>
            {avaliacao.contraindicacoes.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-xs font-medium text-[var(--color-warning-text)]">
                {avaliacao.contraindicacoes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {avaliacao.exigeLiberacaoMedica && avaliacao.liberacaoMedicaAprovada && (
        <div
          role="status"
          data-testid="anamnese-liberacao-aprovada"
          className="flex items-start gap-3.5 rounded-2xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-5 text-[var(--color-success-text)] sm:p-6"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-success-text)] text-white">
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
                strokeWidth="2.5"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-bold text-[var(--color-success-text)]">
              Liberação médica aprovada
            </h3>
            <p className="text-xs/5 text-[var(--color-success-text)] sm:text-sm/6">
              Seus agendamentos estão liberados para confirmação pela clínica.
            </p>
            {liberacaoMedicaAprovadaEm && (
              <p className="text-xs font-semibold text-[var(--color-success-text)]">
                Aprovada em {dateFormatter.format(new Date(liberacaoMedicaAprovadaEm))}
              </p>
            )}
            {liberacaoMedicaObservacoes && (
              <p className="text-xs text-[var(--color-success-text)]">
                Observação clínica: {liberacaoMedicaObservacoes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Resumo Consolidado */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-7">
        <div className="flex flex-col gap-2 border-b border-[var(--color-border-default)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
              Resumo da Ficha de Avaliação
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Consulte abaixo os pontos principais que guiarão a sua massoterapia.
            </p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-brand-primary)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-brand-deep)] transition-colors hover:bg-[var(--color-brand-soft)]"
          >
            Editar Respostas
          </button>
        </div>

        {/* Pontos de Atenção / Alertas Clínicos */}
        <div className="mt-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Pontos de Atenção para a Terapeuta
            </h4>
            {pontosAtencao.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {pontosAtencao.map((ponto, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2.5 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3.5 py-2.5 text-xs/5 font-medium text-[var(--color-warning-text)]"
                  >
                    <svg
                      className="h-4 w-4 shrink-0 text-amber-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>{ponto}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
                Nenhuma contraindicação ou ponto crítico informado.
              </p>
            )}
          </div>

          {/* Dados de preferência e queixa */}
          <dl className="grid gap-4 rounded-xl bg-[var(--color-canvas-neutral)] p-4 text-xs/5 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-[var(--color-text-secondary)]">
                Objetivo da Massagem
              </dt>
              <dd className="mt-0.5 font-medium text-[var(--color-text-primary)]">
                {data.objetivoPrincipal}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--color-text-secondary)]">Regiões Foco</dt>
              <dd className="mt-0.5 font-medium text-[var(--color-text-primary)]">
                {regioesNomes || 'Não especificado'}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--color-text-secondary)]">
                Intensidade de Dor (0-10)
              </dt>
              <dd className="mt-0.5 font-bold text-[var(--color-brand-deep)]">
                Nível {data.intensidadeDor}/10
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--color-text-secondary)]">
                Preferência de Pressão
              </dt>
              <dd className="mt-0.5 font-medium text-[var(--color-text-primary)]">
                {pressaoLabels[data.preferenciaPressao]}
              </dd>
            </div>
            {data.descricaoQueixa && (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-[var(--color-text-secondary)]">
                  Descrição da Queixa
                </dt>
                <dd className="mt-0.5 text-[var(--color-text-primary)]">{data.descricaoQueixa}</dd>
              </div>
            )}
            {data.observacoesAdicionais && (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-[var(--color-text-secondary)]">
                  Observações Adicionais
                </dt>
                <dd className="mt-0.5 text-[var(--color-text-primary)]">
                  {data.observacoesAdicionais}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Ações de navegação */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          to="/perfil"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-canvas-neutral)]"
        >
          Voltar para Meu Perfil
        </Link>
        <Link
          to="/agendamentos"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-6 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-[var(--color-brand-deep)]"
        >
          Ver Meus Agendamentos
        </Link>
      </div>
    </div>
  );
}
