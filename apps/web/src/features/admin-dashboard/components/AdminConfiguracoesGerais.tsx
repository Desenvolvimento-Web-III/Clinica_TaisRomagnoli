import { useEffect, useState, type FormEvent } from 'react';
import { DEFAULT_CLINIC_SETTINGS, type ClinicSettings } from '@clinica/shared';
import {
  buscarConfiguracoesGerais,
  salvarConfiguracoesGerais,
  restaurarConfiguracoesPadrao,
} from '@/services/clinic-settings-service';

export function AdminConfiguracoesGerais() {
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_CLINIC_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(
    null,
  );

  useEffect(() => {
    let montado = true;
    async function carregar() {
      try {
        const dados = await buscarConfiguracoesGerais();
        if (montado) {
          setSettings(dados);
        }
      } catch (err) {
        console.error('Erro ao carregar configurações gerais:', err);
      } finally {
        if (montado) setLoading(false);
      }
    }
    void carregar();
    return () => {
      montado = false;
    };
  }, []);

  const handleSalvar = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const salvas = await salvarConfiguracoesGerais(settings);
      setSettings(salvas);
      setFeedback({
        tipo: 'sucesso',
        mensagem: 'Configurações gerais da clínica atualizadas com sucesso!',
      });
    } catch (err) {
      console.error('Erro ao salvar configurações gerais:', err);
      setFeedback({
        tipo: 'erro',
        mensagem: 'Não foi possível salvar as alterações. Verifique os campos informados.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRestaurar = async () => {
    if (
      !window.confirm(
        'Tem certeza que deseja restaurar as configurações gerais para os valores padrão oficiais da clínica?',
      )
    ) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const padrao = await restaurarConfiguracoesPadrao();
      setSettings(padrao);
      setFeedback({
        tipo: 'sucesso',
        mensagem: 'Configurações restauradas com sucesso para os padrões oficiais!',
      });
    } catch (err) {
      console.error('Erro ao restaurar configurações padrão:', err);
      setFeedback({
        tipo: 'erro',
        mensagem: 'Falha ao restaurar valores padrão.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm font-medium text-[var(--color-text-secondary)]">
          <svg
            className="h-5 w-5 animate-spin text-[var(--color-brand-deep)]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSalvar} className="space-y-6">
      {/* Mensagem de Feedback */}
      {feedback && (
        <div
          role="alert"
          className={`flex items-start justify-between rounded-xl border p-4 text-sm font-medium transition-all ${
            feedback.tipo === 'sucesso'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.tipo === 'sucesso' ? (
              <svg
                className="h-5 w-5 text-emerald-600"
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
            ) : (
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <span>{feedback.mensagem}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-semibold uppercase tracking-wider ml-4 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* BLOCO 1: CONTATOS DA CLÍNICA */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-border-default)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              Contatos e Comunicação
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Canais oficiais exibidos para clientes e mensagens de confirmação
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="input-telefone"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Telefone Comercial
            </label>
            <input
              id="input-telefone"
              type="text"
              value={settings.contatos?.telefone || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  contatos: {
                    telefone: e.target.value,
                    whatsapp: settings.contatos?.whatsapp || '',
                    email: settings.contatos?.email || '',
                    endereco: settings.contatos?.endereco || '',
                  },
                })
              }
              placeholder="(11) 98765-4321"
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
            />
          </div>

          <div>
            <label
              htmlFor="input-whatsapp"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              WhatsApp Comercial
            </label>
            <input
              id="input-whatsapp"
              type="text"
              value={settings.contatos?.whatsapp || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  contatos: {
                    telefone: settings.contatos?.telefone || '',
                    whatsapp: e.target.value,
                    email: settings.contatos?.email || '',
                    endereco: settings.contatos?.endereco || '',
                  },
                })
              }
              placeholder="(11) 98765-4321"
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
            />
          </div>

          <div>
            <label
              htmlFor="input-email"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              E-mail de Contato
            </label>
            <input
              id="input-email"
              type="email"
              value={settings.contatos?.email || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  contatos: {
                    telefone: settings.contatos?.telefone || '',
                    whatsapp: settings.contatos?.whatsapp || '',
                    email: e.target.value,
                    endereco: settings.contatos?.endereco || '',
                  },
                })
              }
              placeholder="contato@clinicataisromagnoli.com.br"
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
            />
          </div>

          <div>
            <label
              htmlFor="input-endereco"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Endereço Físico da Clínica
            </label>
            <input
              id="input-endereco"
              type="text"
              value={settings.contatos?.endereco || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  contatos: {
                    telefone: settings.contatos?.telefone || '',
                    whatsapp: settings.contatos?.whatsapp || '',
                    email: settings.contatos?.email || '',
                    endereco: e.target.value,
                  },
                })
              }
              placeholder="Rua, número, sala, bairro e cidade"
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* BLOCO 2: POLÍTICAS DA CLÍNICA */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-border-default)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              Políticas de Atendimento e Cancelamento
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Regras e informativos legais apresentados durante o agendamento
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="input-politica-cancelamento"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Política de Cancelamento Oficial
            </label>
            <textarea
              id="input-politica-cancelamento"
              rows={3}
              value={settings.politicas?.politicaCancelamento || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  politicas: {
                    politicaCancelamento: e.target.value,
                    politicaReagendamento: settings.politicas?.politicaReagendamento || '',
                    toleranciaAtrasoMinutos: settings.politicas?.toleranciaAtrasoMinutos ?? 15,
                  },
                })
              }
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] p-3 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Dica: De acordo com o regulamento da clínica, cancelamentos com mais de 3 horas
              permitem reutilizar o sinal em novo agendamento, sem estorno em dinheiro.
            </p>
          </div>

          <div>
            <label
              htmlFor="input-politica-reagendamento"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Política de Reagendamento
            </label>
            <textarea
              id="input-politica-reagendamento"
              rows={2}
              value={settings.politicas?.politicaReagendamento || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  politicas: {
                    politicaCancelamento: settings.politicas?.politicaCancelamento || '',
                    politicaReagendamento: e.target.value,
                    toleranciaAtrasoMinutos: settings.politicas?.toleranciaAtrasoMinutos ?? 15,
                  },
                })
              }
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] p-3 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
            />
          </div>

          <div className="max-w-xs">
            <label
              htmlFor="input-tolerancia-atraso"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Tolerância de Atraso (minutos)
            </label>
            <input
              id="input-tolerancia-atraso"
              type="number"
              min={0}
              max={60}
              value={settings.politicas?.toleranciaAtrasoMinutos ?? 15}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  politicas: {
                    politicaCancelamento: settings.politicas?.politicaCancelamento || '',
                    politicaReagendamento: settings.politicas?.politicaReagendamento || '',
                    toleranciaAtrasoMinutos: parseInt(e.target.value, 10) || 0,
                  },
                })
              }
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* BLOCO 3: SINAL DE RESERVA */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-border-default)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              Sinal de Agendamento Online
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Garantia percentual obrigatória para confirmação de reservas realizadas pelo cliente
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 items-center">
          <div>
            <label
              htmlFor="input-percentual-sinal"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Percentual do Sinal (%)
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                id="input-percentual-sinal"
                type="number"
                min={0}
                max={100}
                value={settings.percentualSinal}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    percentualSinal: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                  })
                }
                required
                className="w-32 rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm font-bold text-[var(--color-brand-deep)] focus:border-[var(--color-brand-deep)] focus:outline-hidden"
              />
              <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                % do valor total
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
              Padrão da clínica: 30%. Agendamentos presenciais criados pela administradora
              permanecem isentos de sinal.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--color-brand-deep)]/20 bg-[var(--color-brand-soft)]/40 p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-deep)]">
              Exemplo de Aplicação
            </span>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Em uma sessão de{' '}
              <strong className="text-[var(--color-text-primary)]">R$ 150,00</strong>, o cliente
              pagará{' '}
              <strong className="text-[var(--color-brand-deep)]">
                R$ {((150 * settings.percentualSinal) / 100).toFixed(2).replace('.', ',')}
              </strong>{' '}
              como sinal no ato da reserva, e os{' '}
              <strong className="text-[var(--color-text-primary)]">
                R$ {(150 - (150 * settings.percentualSinal) / 100).toFixed(2).replace('.', ',')}
              </strong>{' '}
              restantes diretamente na clínica.
            </p>
          </div>
        </div>
      </div>

      {/* BLOCO 4: LEMBRETES AUTOMÁTICOS */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-border-default)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              Lembretes Automáticos de Sessão
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Configuração dos disparos prévios para redução de faltas e atrasos
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.lembretes?.lembreteAtivo ?? true}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  lembretes: {
                    lembreteAtivo: e.target.checked,
                    antecedenciaHoras: settings.lembretes?.antecedenciaHoras ?? 24,
                    canais: settings.lembretes?.canais ?? {
                      whatsapp: true,
                      email: true,
                      notificacaoApp: true,
                    },
                  },
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-[var(--color-brand-deep)] focus:ring-[var(--color-brand-deep)]"
            />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Habilitar envio automático de lembretes prévios
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div>
              <label
                htmlFor="input-antecedencia-lembrete"
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
              >
                Antecedência do Disparo (horas antes)
              </label>
              <input
                id="input-antecedencia-lembrete"
                type="number"
                min={1}
                max={168}
                value={settings.lembretes?.antecedenciaHoras ?? 24}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lembretes: {
                      lembreteAtivo: settings.lembretes?.lembreteAtivo ?? true,
                      antecedenciaHoras: parseInt(e.target.value, 10) || 24,
                      canais: settings.lembretes?.canais ?? {
                        whatsapp: true,
                        email: true,
                        notificacaoApp: true,
                      },
                    },
                  })
                }
                required
                className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
              />
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Recomendado: 24 horas antes do início da sessão.
              </p>
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                Canais Habilitados
              </span>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.lembretes?.canais.whatsapp ?? true}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lembretes: {
                          lembreteAtivo: settings.lembretes?.lembreteAtivo ?? true,
                          antecedenciaHoras: settings.lembretes?.antecedenciaHoras ?? 24,
                          canais: {
                            ...(settings.lembretes?.canais ?? {
                              whatsapp: true,
                              email: true,
                              notificacaoApp: true,
                            }),
                            whatsapp: e.target.checked,
                          },
                        },
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[var(--color-brand-deep)]"
                  />
                  <span>WhatsApp (Mensagem assistida)</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.lembretes?.canais.email ?? true}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lembretes: {
                          lembreteAtivo: settings.lembretes?.lembreteAtivo ?? true,
                          antecedenciaHoras: settings.lembretes?.antecedenciaHoras ?? 24,
                          canais: {
                            ...(settings.lembretes?.canais ?? {
                              whatsapp: true,
                              email: true,
                              notificacaoApp: true,
                            }),
                            email: e.target.checked,
                          },
                        },
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[var(--color-brand-deep)]"
                  />
                  <span>E-mail do Cliente</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.lembretes?.canais.notificacaoApp ?? true}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lembretes: {
                          lembreteAtivo: settings.lembretes?.lembreteAtivo ?? true,
                          antecedenciaHoras: settings.lembretes?.antecedenciaHoras ?? 24,
                          canais: {
                            ...(settings.lembretes?.canais ?? {
                              whatsapp: true,
                              email: true,
                              notificacaoApp: true,
                            }),
                            notificacaoApp: e.target.checked,
                          },
                        },
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[var(--color-brand-deep)]"
                  />
                  <span>Notificação Interna no App</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 5: PRAZOS E INTERVALOS */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-border-default)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              Prazos Operacionais e Intervalos
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Regras temporais de agendamento, cancelamento e manutenção da agenda
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="input-antecedencia-agendamento"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Antecedência Mínima para Agendar (horas)
            </label>
            <input
              id="input-antecedencia-agendamento"
              type="number"
              min={0}
              max={72}
              value={settings.prazos?.antecedenciaMinimaAgendamentoHoras ?? 2}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  prazos: {
                    antecedenciaMinimaAgendamentoHoras: parseInt(e.target.value, 10) || 0,
                    antecedenciaMinimaCancelamentoHoras:
                      settings.prazos?.antecedenciaMinimaCancelamentoHoras ??
                      settings.antecedenciaMinimaCancelamentoHoras,
                    intervaloMinutos:
                      settings.prazos?.intervaloMinutos ?? settings.intervaloMinutos,
                    criterioClienteRecorrenteAtendimentosMes:
                      settings.prazos?.criterioClienteRecorrenteAtendimentosMes ??
                      settings.criterioClienteRecorrenteAtendimentosMes,
                  },
                })
              }
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Tempo mínimo de antecedência exigido para o cliente marcar um horário online.
            </p>
          </div>

          <div>
            <label
              htmlFor="input-antecedencia-cancelamento"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Antecedência Mínima Cancelamento (horas)
            </label>
            <input
              id="input-antecedencia-cancelamento"
              type="number"
              min={0}
              max={72}
              value={settings.antecedenciaMinimaCancelamentoHoras}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 0;
                setSettings({
                  ...settings,
                  antecedenciaMinimaCancelamentoHoras: val,
                  prazos: {
                    antecedenciaMinimaAgendamentoHoras:
                      settings.prazos?.antecedenciaMinimaAgendamentoHoras ?? 2,
                    antecedenciaMinimaCancelamentoHoras: val,
                    intervaloMinutos:
                      settings.prazos?.intervaloMinutos ?? settings.intervaloMinutos,
                    criterioClienteRecorrenteAtendimentosMes:
                      settings.prazos?.criterioClienteRecorrenteAtendimentosMes ??
                      settings.criterioClienteRecorrenteAtendimentosMes,
                  },
                });
              }}
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Regra de ouro da clínica: 3 horas (abaixo disso, o sinal é retido integralmente).
            </p>
          </div>

          <div>
            <label
              htmlFor="input-intervalo-sessoes"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Intervalo entre Sessões (minutos)
            </label>
            <input
              id="input-intervalo-sessoes"
              type="number"
              min={0}
              max={120}
              step={5}
              value={settings.intervaloMinutos}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 0;
                setSettings({
                  ...settings,
                  intervaloMinutos: val,
                  prazos: {
                    antecedenciaMinimaAgendamentoHoras:
                      settings.prazos?.antecedenciaMinimaAgendamentoHoras ?? 2,
                    antecedenciaMinimaCancelamentoHoras:
                      settings.prazos?.antecedenciaMinimaCancelamentoHoras ??
                      settings.antecedenciaMinimaCancelamentoHoras,
                    intervaloMinutos: val,
                    criterioClienteRecorrenteAtendimentosMes:
                      settings.prazos?.criterioClienteRecorrenteAtendimentosMes ??
                      settings.criterioClienteRecorrenteAtendimentosMes,
                  },
                });
              }}
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Tempo reservado para higienização e preparo da sala (padrão: 30 minutos).
            </p>
          </div>

          <div>
            <label
              htmlFor="input-criterio-recorrente"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Atendimentos para Cliente Recorrente (mês)
            </label>
            <input
              id="input-criterio-recorrente"
              type="number"
              min={1}
              max={20}
              value={settings.criterioClienteRecorrenteAtendimentosMes}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 1;
                setSettings({
                  ...settings,
                  criterioClienteRecorrenteAtendimentosMes: val,
                  prazos: {
                    antecedenciaMinimaAgendamentoHoras:
                      settings.prazos?.antecedenciaMinimaAgendamentoHoras ?? 2,
                    antecedenciaMinimaCancelamentoHoras:
                      settings.prazos?.antecedenciaMinimaCancelamentoHoras ??
                      settings.antecedenciaMinimaCancelamentoHoras,
                    intervaloMinutos:
                      settings.prazos?.intervaloMinutos ?? settings.intervaloMinutos,
                    criterioClienteRecorrenteAtendimentosMes: val,
                  },
                });
              }}
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden"
            />
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Mínimo de sessões concluídas no mesmo mês para classificação de fidelidade (padrão:
              2).
            </p>
          </div>
        </div>
      </div>

      {/* BARRA DE BOTÕES DE AÇÃO */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--color-border-default)]">
        <button
          type="button"
          onClick={handleRestaurar}
          disabled={saving}
          className="w-full sm:w-auto rounded-xl border border-[var(--color-border-default)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          Restaurar Padrões Oficiais
        </button>

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-deep)] hover:bg-[var(--color-brand-dark)] active:bg-[var(--color-brand-darker)] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Salvando...</span>
            </>
          ) : (
            <span>Salvar Configurações</span>
          )}
        </button>
      </div>
    </form>
  );
}
