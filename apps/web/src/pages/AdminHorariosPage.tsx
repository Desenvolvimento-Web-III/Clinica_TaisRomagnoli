import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CONFIGURACAO_HORARIOS_PADRAO,
  NOMES_DIAS_SEMANA,
  salvarHorariosInputSchema,
  type DiaFuncionamento,
  type HorariosFuncionamento,
} from '@clinica/shared';
import {
  buscarHorariosFuncionamento,
  salvarHorariosFuncionamento,
} from '@/services/horarios-service';
import { auth } from '@/lib/firebase';

export function AdminHorariosPage() {
  const [config, setConfig] = useState<HorariosFuncionamento>(CONFIGURACAO_HORARIOS_PADRAO);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Carrega configuração inicial do banco ou padrão
  useEffect(() => {
    let isMounted = true;
    async function carregarDados() {
      try {
        setLoading(true);
        const dados = await buscarHorariosFuncionamento();
        if (isMounted) {
          setConfig(dados);
        }
      } catch (err) {
        console.error('Falha ao carregar horários:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    carregarDados();
    return () => {
      isMounted = false;
    };
  }, []);

  // Altera o intervalo padrão da clínica
  const handleIntervaloPadraoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = parseInt(e.target.value, 10);
    const novoValor = isNaN(valor) || valor < 0 ? 0 : valor;
    setConfig((prev) => ({
      ...prev,
      intervaloPadraoMinutos: novoValor,
    }));
  };

  // Alterna o status ativo/folga de um dia
  const handleToggleDiaAtivo = (diaIndex: number) => {
    setConfig((prev) => {
      const novosDias = prev.dias.map((d) => {
        if (d.dia === diaIndex) {
          const novoAtivo = !d.ativo;
          return {
            ...d,
            ativo: novoAtivo,
            // Se for ativado e não tiver turnos, adiciona um turno padrão das 08:00 às 18:00
            turnos:
              novoAtivo && d.turnos.length === 0 ? [{ inicio: '08:00', fim: '18:00' }] : d.turnos,
          };
        }
        return d;
      });
      return { ...prev, dias: novosDias };
    });
  };

  // Adiciona um turno a um dia específico
  const handleAddTurno = (diaIndex: number) => {
    setConfig((prev) => {
      const novosDias = prev.dias.map((d) => {
        if (d.dia === diaIndex) {
          return {
            ...d,
            turnos: [...d.turnos, { inicio: '14:00', fim: '18:00' }],
          };
        }
        return d;
      });
      return { ...prev, dias: novosDias };
    });
  };

  // Remove um turno de um dia
  const handleRemoveTurno = (diaIndex: number, turnoIndex: number) => {
    setConfig((prev) => {
      const novosDias = prev.dias.map((d) => {
        if (d.dia === diaIndex) {
          return {
            ...d,
            turnos: d.turnos.filter((_, idx) => idx !== turnoIndex),
          };
        }
        return d;
      });
      return { ...prev, dias: novosDias };
    });
  };

  // Atualiza horário de um turno
  const handleUpdateTurno = (
    diaIndex: number,
    turnoIndex: number,
    campo: 'inicio' | 'fim',
    valor: string,
  ) => {
    setConfig((prev) => {
      const novosDias = prev.dias.map((d) => {
        if (d.dia === diaIndex) {
          const novosTurnos = d.turnos.map((t, idx) => {
            if (idx === turnoIndex) {
              return { ...t, [campo]: valor };
            }
            return t;
          });
          return { ...d, turnos: novosTurnos };
        }
        return d;
      });
      return { ...prev, dias: novosDias };
    });
  };

  // Adiciona um intervalo de manutenção a um dia
  const handleAddManutencao = (diaIndex: number) => {
    setConfig((prev) => {
      const novosDias = prev.dias.map((d) => {
        if (d.dia === diaIndex) {
          const manutencoes = d.intervalosManutencao || [];
          return {
            ...d,
            intervalosManutencao: [
              ...manutencoes,
              {
                inicio: '12:00',
                fim: '13:00',
                descricao: 'Higienização e manutenção da sala',
              },
            ],
          };
        }
        return d;
      });
      return { ...prev, dias: novosDias };
    });
  };

  // Remove um intervalo de manutenção de um dia
  const handleRemoveManutencao = (diaIndex: number, manutencaoIndex: number) => {
    setConfig((prev) => {
      const novosDias = prev.dias.map((d) => {
        if (d.dia === diaIndex) {
          const manutencoes = d.intervalosManutencao || [];
          return {
            ...d,
            intervalosManutencao: manutencoes.filter((_, idx) => idx !== manutencaoIndex),
          };
        }
        return d;
      });
      return { ...prev, dias: novosDias };
    });
  };

  // Atualiza campo de um intervalo de manutenção
  const handleUpdateManutencao = (
    diaIndex: number,
    manutencaoIndex: number,
    campo: 'inicio' | 'fim' | 'descricao',
    valor: string,
  ) => {
    setConfig((prev) => {
      const novosDias = prev.dias.map((d) => {
        if (d.dia === diaIndex) {
          const manutencoes = (d.intervalosManutencao || []).map((m, idx) => {
            if (idx === manutencaoIndex) {
              return { ...m, [campo]: valor };
            }
            return m;
          });
          return { ...d, intervalosManutencao: manutencoes };
        }
        return d;
      });
      return { ...prev, dias: novosDias };
    });
  };

  // Altera o intervalo em minutos específico de um dia
  const handleIntervaloDiaChange = (diaIndex: number, minutos: number) => {
    setConfig((prev) => {
      const novosDias = prev.dias.map((d) => {
        if (d.dia === diaIndex) {
          return { ...d, intervaloMinutos: minutos >= 0 ? minutos : 0 };
        }
        return d;
      });
      return { ...prev, dias: novosDias };
    });
  };

  // Restaura os horários para o padrão da clínica
  const handleRestaurarPadrao = () => {
    if (
      window.confirm(
        'Deseja realmente restaurar os horários para a configuração padrão da clínica?',
      )
    ) {
      setConfig(CONFIGURACAO_HORARIOS_PADRAO);
      setSuccessMessage(
        'Configuração padrão restaurada. Clique em "Salvar alterações" para confirmar no sistema.',
      );
      setErrorMessage(null);
      setValidationErrors([]);
    }
  };

  // Submete as alterações com validação Zod
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);
    setValidationErrors([]);

    const validacao = salvarHorariosInputSchema.safeParse(config);

    if (!validacao.success) {
      const erros = validacao.error.issues.map((issue) => {
        const caminho = issue.path.join(' > ');
        return `${caminho ? `[${caminho}] ` : ''}${issue.message}`;
      });
      setValidationErrors(erros);
      setErrorMessage('Por favor, corrija os erros nos horários antes de salvar.');
      try {
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
      } catch {
        // Ignora em ambientes sem suporte a scrollTo (ex: jsdom)
      }
      return;
    }

    try {
      setSaving(true);
      const adminUid = auth?.currentUser?.uid || 'admin-local';
      await salvarHorariosFuncionamento(validacao.data, adminUid);
      setSuccessMessage('Horários de funcionamento e intervalos de manutenção salvos com sucesso!');
      try {
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
      } catch {
        // Ignora em ambientes sem suporte a scrollTo (ex: jsdom)
      }
    } catch (err: unknown) {
      console.error('Erro ao salvar horários:', err);
      setErrorMessage(
        'Não foi possível salvar os horários. Verifique a conexão e tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#EDE9FE] px-4 py-8 text-[#000000]">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7A60B8] border-t-transparent" />
          <p className="text-sm font-medium text-[#334155]">Carregando horários da clínica...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#EDE9FE] px-4 py-8 text-[#000000] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navegação de Retorno */}
        <div className="flex items-center justify-between">
          <Link
            to="/status"
            className="inline-flex items-center text-sm font-medium text-[#6C53A6] transition hover:text-[#7A60B8]"
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Voltar ao painel
          </Link>

          <span className="rounded-full bg-[#7A60B8]/10 px-3 py-1 text-xs font-semibold text-[#6C53A6]">
            Gestão Administrativa
          </span>
        </div>

        {/* Cabeçalho Principal */}
        <header className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#000000] sm:text-3xl">
                Horários de Funcionamento e Manutenção
              </h1>
              <p className="mt-1 text-sm text-[#334155]">
                Configure os dias de atendimento, os turnos da profissional e os intervalos de
                manutenção e higienização das salas.
              </p>
            </div>
          </div>
        </header>

        {/* Notificações de Sucesso ou Erro */}
        {successMessage && (
          <div
            role="status"
            className="rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] p-4 text-sm font-medium text-[#065F46] shadow-sm"
          >
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-2xl border border-[#EF4444] bg-[#FEF2F2] p-4 text-sm font-medium text-[#B91C1C] shadow-sm"
          >
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
            {validationErrors.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-1 pl-2 text-xs">
                {validationErrors.map((erro, idx) => (
                  <li key={idx}>{erro}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Formulário Principal */}
        <form onSubmit={handleSalvar} className="space-y-6">
          {/* Card: Intervalo Padrão da Clínica */}
          <section className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-[#000000]">Intervalo Padrão da Clínica</h2>
            <p className="mt-1 text-xs text-[#334155]">
              Tempo de intervalo padrão entre cada atendimento dedicado à higienização das macas,
              assepsia e organização do ambiente.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label
                htmlFor="intervalo-padrao"
                className="text-sm font-medium text-[#334155] sm:min-w-44"
              >
                Tempo de intervalo (minutos):
              </label>
              <div className="flex items-center space-x-3">
                <input
                  id="intervalo-padrao"
                  type="number"
                  min="0"
                  max="120"
                  step="5"
                  value={config.intervaloPadraoMinutos}
                  onChange={handleIntervaloPadraoChange}
                  className="w-28 rounded-xl border border-[#E2E8F0] px-3 py-2 text-center text-sm font-semibold text-[#000000] focus:border-[#7A60B8] focus:outline-none focus:ring-2 focus:ring-[#7A60B8]/20"
                />
                <span className="text-xs text-[#334155]">minutos recomendados (Padrão: 30)</span>
              </div>
            </div>
          </section>

          {/* Cards dos 7 Dias da Semana */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-bold text-[#000000]">Configuração por Dia da Semana</h2>
              <span className="text-xs text-[#334155]">Total de 7 dias configuráveis</span>
            </div>

            {config.dias.map((diaItem: DiaFuncionamento) => {
              const nomeDia: string = NOMES_DIAS_SEMANA[diaItem.dia] ?? `Dia ${diaItem.dia}`;
              const estaAtivo = diaItem.ativo;

              return (
                <article
                  key={diaItem.dia}
                  className={`rounded-[2rem] bg-white p-6 shadow-sm transition-all sm:p-8 ${
                    !estaAtivo ? 'opacity-80 border border-dashed border-[#E2E8F0]' : ''
                  }`}
                >
                  {/* Cabeçalho do Dia */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`h-3 w-3 rounded-full ${
                          estaAtivo ? 'bg-[#10B981]' : 'bg-[#94A3B8]'
                        }`}
                      />
                      <h3 className="text-lg font-bold text-[#000000]">{nomeDia}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          estaAtivo ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {estaAtivo ? 'Atendimento Ativo' : 'Folga da Clínica'}
                      </span>
                    </div>

                    {/* Switch Ativar/Desativar */}
                    <button
                      type="button"
                      onClick={() => handleToggleDiaAtivo(diaItem.dia)}
                      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold transition ${
                        estaAtivo
                          ? 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9]'
                          : 'bg-[#7A60B8] text-white hover:bg-[#6C53A6]'
                      }`}
                    >
                      {estaAtivo ? 'Marcar como Folga' : 'Ativar Atendimento'}
                    </button>
                  </div>

                  {/* Se o dia estiver em Folga */}
                  {!estaAtivo && (
                    <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4 text-xs text-[#64748B]">
                      A clínica permanece fechada neste dia. Ative o atendimento para cadastrar
                      turnos e manutenções.
                    </div>
                  )}

                  {/* Se o dia estiver Ativo */}
                  {estaAtivo && (
                    <div className="mt-6 space-y-6 divide-y divide-[#E2E8F0]">
                      {/* Seção 1: Turnos de Atendimento */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-[#000000]">
                              Turnos de Atendimento
                            </h4>
                            <p className="text-xs text-[#334155]">
                              Horários disponíveis para os clientes agendarem sessões.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddTurno(diaItem.dia)}
                            className="inline-flex items-center text-xs font-semibold text-[#6C53A6] hover:text-[#7A60B8]"
                          >
                            + Adicionar turno
                          </button>
                        </div>

                        {diaItem.turnos.length === 0 ? (
                          <p className="text-xs italic text-[#EF4444]">
                            Nenhum turno cadastrado. Adicione pelo menos um turno de atendimento.
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {diaItem.turnos.map((turno, tIdx) => (
                              <div
                                key={tIdx}
                                className="flex flex-wrap items-center gap-2 rounded-xl bg-[#F8FAFC] p-3 text-xs"
                              >
                                <span className="font-medium text-[#334155]">
                                  Turno {tIdx + 1}:
                                </span>
                                <div className="flex items-center space-x-2">
                                  <label
                                    htmlFor={`turno-inicio-${diaItem.dia}-${tIdx}`}
                                    className="sr-only"
                                  >
                                    Início
                                  </label>
                                  <input
                                    id={`turno-inicio-${diaItem.dia}-${tIdx}`}
                                    type="time"
                                    value={turno.inicio}
                                    onChange={(e) =>
                                      handleUpdateTurno(diaItem.dia, tIdx, 'inicio', e.target.value)
                                    }
                                    className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 font-mono text-xs text-[#000000] focus:border-[#7A60B8] focus:outline-none"
                                  />
                                  <span className="text-[#64748B]">às</span>
                                  <label
                                    htmlFor={`turno-fim-${diaItem.dia}-${tIdx}`}
                                    className="sr-only"
                                  >
                                    Término
                                  </label>
                                  <input
                                    id={`turno-fim-${diaItem.dia}-${tIdx}`}
                                    type="time"
                                    value={turno.fim}
                                    onChange={(e) =>
                                      handleUpdateTurno(diaItem.dia, tIdx, 'fim', e.target.value)
                                    }
                                    className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 font-mono text-xs text-[#000000] focus:border-[#7A60B8] focus:outline-none"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveTurno(diaItem.dia, tIdx)}
                                  className="ml-auto text-xs text-[#EF4444] transition hover:underline"
                                  title="Remover este turno"
                                >
                                  Remover
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Seção 2: Intervalos de Manutenção e Higienização */}
                      <div className="pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-[#000000]">
                              Intervalos de Manutenção e Pausas
                            </h4>
                            <p className="text-xs text-[#334155]">
                              Bloqueios para limpeza profunda, manutenção das salas ou almoço da
                              profissional.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddManutencao(diaItem.dia)}
                            className="inline-flex items-center text-xs font-semibold text-[#6C53A6] hover:text-[#7A60B8]"
                          >
                            + Adicionar manutenção
                          </button>
                        </div>

                        {!diaItem.intervalosManutencao ||
                        diaItem.intervalosManutencao.length === 0 ? (
                          <p className="text-xs italic text-[#64748B]">
                            Nenhum intervalo fixo de manutenção cadastrado para este dia.
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {diaItem.intervalosManutencao.map((manutencao, mIdx) => (
                              <div
                                key={mIdx}
                                className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFBEB]/40 p-3 text-xs sm:flex-row sm:items-center"
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-[#92400E]">
                                    Pausa {mIdx + 1}:
                                  </span>
                                  <input
                                    type="time"
                                    value={manutencao.inicio}
                                    onChange={(e) =>
                                      handleUpdateManutencao(
                                        diaItem.dia,
                                        mIdx,
                                        'inicio',
                                        e.target.value,
                                      )
                                    }
                                    className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 font-mono text-xs text-[#000000] focus:border-[#7A60B8] focus:outline-none"
                                  />
                                  <span className="text-[#64748B]">às</span>
                                  <input
                                    type="time"
                                    value={manutencao.fim}
                                    onChange={(e) =>
                                      handleUpdateManutencao(
                                        diaItem.dia,
                                        mIdx,
                                        'fim',
                                        e.target.value,
                                      )
                                    }
                                    className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 font-mono text-xs text-[#000000] focus:border-[#7A60B8] focus:outline-none"
                                  />
                                </div>

                                <div className="flex-1">
                                  <input
                                    type="text"
                                    placeholder="Descrição (ex: Almoço, Higienização de salas)"
                                    value={manutencao.descricao || ''}
                                    onChange={(e) =>
                                      handleUpdateManutencao(
                                        diaItem.dia,
                                        mIdx,
                                        'descricao',
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#000000] placeholder:text-[#94A3B8] focus:border-[#7A60B8] focus:outline-none"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveManutencao(diaItem.dia, mIdx)}
                                  className="text-xs text-[#EF4444] transition hover:underline sm:self-center"
                                  title="Remover esta manutenção"
                                >
                                  Remover
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Seção 3: Intervalo específico do dia */}
                      <div className="pt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label
                          htmlFor={`intervalo-dia-${diaItem.dia}`}
                          className="text-xs font-medium text-[#334155]"
                        >
                          Intervalo entre atendimentos neste dia:
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            id={`intervalo-dia-${diaItem.dia}`}
                            type="number"
                            min="0"
                            max="120"
                            step="5"
                            value={diaItem.intervaloMinutos}
                            onChange={(e) =>
                              handleIntervaloDiaChange(
                                diaItem.dia,
                                parseInt(e.target.value, 10) || 0,
                              )
                            }
                            className="w-20 rounded-lg border border-[#E2E8F0] px-2 py-1 text-center text-xs font-semibold text-[#000000] focus:border-[#7A60B8] focus:outline-none"
                          />
                          <span className="text-xs text-[#64748B]">minutos</span>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          {/* Botões de Ação do Rodapé */}
          <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-3 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleRestaurarPadrao}
              disabled={saving}
              className="rounded-xl border border-[#E2E8F0] px-5 py-2.5 text-xs font-semibold text-[#334155] transition hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              Restaurar Padrão da Clínica
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-[#7A60B8] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#6C53A6] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Salvando alterações...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
