import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/ui/AppShell';
import { useOptionalAuth } from '@/features/auth/auth-context';
import {
  ANAMNESE_NOTIFICATION_ID,
  markClientNotificationAsRead,
} from '@/features/notifications/notifications-store';
import { AnamneseRadioGroup } from '@/features/anamnese/components/AnamneseRadioGroup';
import { BodyRegionSelector } from '@/features/anamnese/components/BodyRegionSelector';
import { PainScaleSelector } from '@/features/anamnese/components/PainScaleSelector';
import { PressurePreferenceSelector } from '@/features/anamnese/components/PressurePreferenceSelector';
import {
  AnamneseStepIndicator,
  type AnamneseSectionId,
} from '@/features/anamnese/components/AnamneseStepIndicator';
import { AnamneseSummaryCard } from '@/features/anamnese/components/AnamneseSummaryCard';
import {
  INITIAL_ANAMNESE_DATA,
  OBJETIVOS_MASSAGEM,
  calcularPontosAtencao,
} from '@/features/anamnese/data/initial-anamnese';
import { fichaAnamneseSchema } from '@/features/anamnese/schemas/anamnese-schema';
import type {
  FichaAnamneseData,
  CondicaoSaudeItem,
  RegiaoCorpo,
  IntensidadeDor,
  NivelPressao,
  ExperienciaMassoterapia,
  FrequenciaAtividadeFisica,
} from '@/features/anamnese/types/anamnese';

const STORAGE_KEY_PREFIX = 'clinica_anamnese_data_';

function loadSavedAnamnese(uid?: string | null) {
  if (typeof window === 'undefined') {
    return { data: INITIAL_ANAMNESE_DATA, updatedAt: undefined, pontosAtencao: [] };
  }
  const storageKey = uid ? `${STORAGE_KEY_PREFIX}${uid}` : `${STORAGE_KEY_PREFIX}guest`;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          data: { ...INITIAL_ANAMNESE_DATA, ...parsed.data },
          updatedAt: parsed.updatedAt as string | undefined,
          pontosAtencao: (parsed.pontosAtencao as string[]) || [],
        };
      }
    }
  } catch {
    // fallback
  }
  return { data: INITIAL_ANAMNESE_DATA, updatedAt: undefined, pontosAtencao: [] };
}

export function FichaAnamnesePage() {
  const authContext = useOptionalAuth();
  const currentUser = authContext?.currentUser ?? null;

  const initialSaved = loadSavedAnamnese(currentUser?.uid);
  const [formData, setFormData] = useState<FichaAnamneseData>(initialSaved.data);
  const [currentSection, setCurrentSection] = useState<AnamneseSectionId>('queixa');
  const [completedSections, setCompletedSections] = useState<Set<AnamneseSectionId>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedUpdatedAt, setSavedUpdatedAt] = useState<string | undefined>(initialSaved.updatedAt);
  const [pontosAtencao, setPontosAtencao] = useState<string[]>(initialSaved.pontosAtencao);

  // Atualiza campo de condição de saúde
  const handleCondicaoChange = (campo: keyof FichaAnamneseData, valor: CondicaoSaudeItem) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
    if (errors[campo] || errors[`${campo}.detalhes`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[campo];
        delete next[`${campo}.detalhes`];
        return next;
      });
    }
  };

  const handleSubmissao = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = fichaAnamneseSchema.safeParse(formData);

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        formattedErrors[path] = issue.message;
      });
      setErrors(formattedErrors);

      // Redireciona para a seção do primeiro erro
      const firstErrorPath = Object.keys(formattedErrors)[0];
      if (firstErrorPath) {
        if (
          firstErrorPath.includes('objetivo') ||
          firstErrorPath.includes('regioes') ||
          firstErrorPath.includes('intensidade') ||
          firstErrorPath.includes('queixa')
        ) {
          setCurrentSection('queixa');
        } else if (
          firstErrorPath.includes('gestante') ||
          firstErrorPath.includes('Circulatorios') ||
          firstErrorPath.includes('Cardiacas') ||
          firstErrorPath.includes('lesoes') ||
          firstErrorPath.includes('alergias') ||
          firstErrorPath.includes('Pele') ||
          firstErrorPath.includes('Oncologico') ||
          firstErrorPath.includes('Medicamentos')
        ) {
          setCurrentSection('saude');
        } else if (
          firstErrorPath.includes('Pressao') ||
          firstErrorPath.includes('experiencia') ||
          firstErrorPath.includes('atividade')
        ) {
          setCurrentSection('habitos');
        } else if (firstErrorPath.includes('consentimento')) {
          setCurrentSection('consentimento');
        }
      }

      // Rola para o topo do formulário suavemente
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    try {
      // Calcula pontos de atenção para a profissional
      const pontos = calcularPontosAtencao(formData);
      setPontosAtencao(pontos);

      const now = new Date().toISOString();
      setSavedUpdatedAt(now);

      // Salva localmente
      const storageKey = currentUser
        ? `${STORAGE_KEY_PREFIX}${currentUser.uid}`
        : `${STORAGE_KEY_PREFIX}guest`;

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          data: formData,
          updatedAt: now,
          pontosAtencao: pontos,
        }),
      );

      markClientNotificationAsRead(currentUser?.uid, ANAMNESE_NOTIFICATION_ID);

      // Marca seções como concluídas
      setCompletedSections(new Set(['queixa', 'saude', 'habitos', 'consentimento']));
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErrors({ form: 'Não foi possível salvar os dados. Tente novamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      activeTab="perfil"
      eyebrow="Tais Romagnoli — Massoterapia"
      title="Ficha de Anamnese"
      description="Preencha suas informações de saúde e preferências para um atendimento personalizado, seguro e confidencial."
    >
      <div className="mx-auto max-w-3xl">
        {/* Aviso de Confidencialidade e LGPD */}
        <aside
          aria-label="Aviso de Privacidade e Sigilo"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 text-sm/6 text-[var(--color-info-text)]"
        >
          <svg
            className="h-5 w-5 shrink-0 text-[var(--color-info-text)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <span className="font-semibold">Privacidade e Cuidado:</span> Esta ficha ajuda a
            profissional a avaliar seu quadro e adaptar a massagem com segurança. Suas respostas são
            confidenciais e protegidas por sigilo profissional.
          </div>
        </aside>

        {isSuccess ? (
          <AnamneseSummaryCard
            data={formData}
            pontosAtencao={pontosAtencao}
            updatedAt={savedUpdatedAt}
            onEdit={() => {
              setIsSuccess(false);
              setCurrentSection('queixa');
            }}
          />
        ) : (
          <div>
            {/* Indicador de Etapas */}
            <AnamneseStepIndicator
              currentSection={currentSection}
              onSectionClick={(section) => setCurrentSection(section)}
              completedSections={completedSections}
            />

            {/* Erro Geral do Formulário */}
            {errors.form && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-4 text-sm font-medium text-[var(--color-error-text)]"
              >
                {errors.form}
              </div>
            )}

            <form onSubmit={handleSubmissao} noValidate className="space-y-6">
              {/* SEÇÃO 1: Motivo e Queixa */}
              {currentSection === 'queixa' && (
                <section
                  aria-labelledby="section-queixa-title"
                  className="space-y-6 rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-7"
                >
                  <div className="border-b border-[var(--color-border-default)] pb-4">
                    <h2
                      id="section-queixa-title"
                      className="text-lg font-bold text-[var(--color-text-primary)]"
                    >
                      1. Objetivo e Queixa Principal
                    </h2>
                    <p className="mt-1 text-xs/5 text-[var(--color-text-secondary)]">
                      Conte-nos o que você busca na massoterapia e quais regiões necessitam de mais
                      atenção.
                    </p>
                  </div>

                  {/* Objetivo Principal */}
                  <div className="space-y-2">
                    <label
                      htmlFor="objetivoPrincipal"
                      className="block text-sm font-semibold text-[var(--color-text-primary)]"
                    >
                      Objetivo principal do atendimento
                    </label>
                    <select
                      id="objetivoPrincipal"
                      value={formData.objetivoPrincipal}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, objetivoPrincipal: e.target.value }))
                      }
                      className="min-h-12 w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)]"
                    >
                      {OBJETIVOS_MASSAGEM.map((obj) => (
                        <option key={obj} value={obj}>
                          {obj}
                        </option>
                      ))}
                    </select>
                    {errors.objetivoPrincipal && (
                      <p
                        role="alert"
                        className="text-xs font-medium text-[var(--color-error-text)]"
                      >
                        {errors.objetivoPrincipal}
                      </p>
                    )}
                  </div>

                  {/* Regiões do Corpo */}
                  <BodyRegionSelector
                    selectedRegions={formData.regioesFoco}
                    onChange={(regioes: RegiaoCorpo[]) =>
                      setFormData((prev) => ({ ...prev, regioesFoco: regioes }))
                    }
                    error={errors.regioesFoco}
                  />

                  {/* Escala de Dor */}
                  <PainScaleSelector
                    value={formData.intensidadeDor}
                    onChange={(nivel: IntensidadeDor) =>
                      setFormData((prev) => ({ ...prev, intensidadeDor: nivel }))
                    }
                  />

                  {/* Descrição Detalhada da Queixa */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="descricaoQueixa"
                      className="block text-sm font-semibold text-[var(--color-text-primary)]"
                    >
                      Descreva seu desconforto ou dor{' '}
                      <span className="text-xs font-normal text-[var(--color-text-secondary)]">
                        (opcional)
                      </span>
                    </label>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Exemplo: Há quanto tempo sente, se piora ao sentar ou praticar exercícios,
                      etc.
                    </p>
                    <textarea
                      id="descricaoQueixa"
                      rows={3}
                      value={formData.descricaoQueixa || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, descricaoQueixa: e.target.value }))
                      }
                      placeholder="Descreva detalhes que possam auxiliar no atendimento..."
                      className="min-h-20 w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-icon-muted)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)]"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCompletedSections((prev) => new Set([...prev, 'queixa']));
                        setCurrentSection('saude');
                      }}
                      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-6 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-[var(--color-brand-deep)]"
                    >
                      Avançar para Histórico de Saúde →
                    </button>
                  </div>
                </section>
              )}

              {/* SEÇÃO 2: Histórico de Saúde */}
              {currentSection === 'saude' && (
                <section
                  aria-labelledby="section-saude-title"
                  className="space-y-6 rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-7"
                >
                  <div className="border-b border-[var(--color-border-default)] pb-4">
                    <h2
                      id="section-saude-title"
                      className="text-lg font-bold text-[var(--color-text-primary)]"
                    >
                      2. Histórico de Saúde e Condições Clínicas
                    </h2>
                    <p className="mt-1 text-xs/5 text-[var(--color-text-secondary)]">
                      Responda com sinceridade. Essas perguntas identificam contraindicações e
                      permitem adaptar manobras e produtos.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Gestação */}
                    <AnamneseRadioGroup
                      id="gestanteOuLactante"
                      pergunta="1. É gestante ou está em período de pós-parto recente?"
                      descricaoAjuda="A massagem em gestantes requer posicionamento lateral e técnicas adaptadas."
                      placeholderDetalhes="Informe as semanas de gestação ou meses de pós-parto..."
                      value={formData.gestanteOuLactante}
                      onChange={(val) => handleCondicaoChange('gestanteOuLactante', val)}
                      error={errors['gestanteOuLactante.detalhes']}
                    />

                    {/* Circulação / Trombose */}
                    <AnamneseRadioGroup
                      id="problemasCirculatorios"
                      pergunta="2. Possui problemas circulatórios, trombose, varizes volumosas ou alteração de pressão arterial?"
                      descricaoAjuda="Importante para evitar pressão excessiva em áreas vasculares sensíveis."
                      placeholderDetalhes="Especifique a condição (ex: hipertensão controlada, varizes em pernas)..."
                      value={formData.problemasCirculatorios}
                      onChange={(val) => handleCondicaoChange('problemasCirculatorios', val)}
                      error={errors['problemasCirculatorios.detalhes']}
                    />

                    {/* Condição Cardíaca */}
                    <AnamneseRadioGroup
                      id="doencasCardiacas"
                      pergunta="3. Possui histórico de doenças cardíacas ou faz uso de marca-passo?"
                      descricaoAjuda="Algumas técnicas de estímulo reflexo devem ser suavizadas."
                      placeholderDetalhes="Descreva a condição cardíaca ou acompanhamento médico..."
                      value={formData.doencasCardiacas}
                      onChange={(val) => handleCondicaoChange('doencasCardiacas', val)}
                      error={errors['doencasCardiacas.detalhes']}
                    />

                    {/* Lesões / Cirurgias */}
                    <AnamneseRadioGroup
                      id="lesoesOuCirurgias"
                      pergunta="4. Sofreu fraturas recentes, realizou cirurgias ou possui hérnia de disco/artrose?"
                      descricaoAjuda="Ajuda a terapeuta a proteger áreas em cicatrização ou com restrição articular."
                      placeholderDetalhes="Indique as regiões com hérnia, pinos, próteses ou procedimentos recentes..."
                      value={formData.lesoesOuCirurgias}
                      onChange={(val) => handleCondicaoChange('lesoesOuCirurgias', val)}
                      error={errors['lesoesOuCirurgias.detalhes']}
                    />

                    {/* Alergias */}
                    <AnamneseRadioGroup
                      id="alergiasProdutos"
                      pergunta="5. Apresenta alergia a cosméticos, óleos essenciais, fragrâncias ou cremes?"
                      descricaoAjuda="Utilizaremos bases neutras e hipoalergênicas caso haja sensibilidade."
                      placeholderDetalhes="Quais substâncias ou essências costumam causar irritação?"
                      value={formData.alergiasProdutos}
                      onChange={(val) => handleCondicaoChange('alergiasProdutos', val)}
                      error={errors['alergiasProdutos.detalhes']}
                    />

                    {/* Pele */}
                    <AnamneseRadioGroup
                      id="problemasPele"
                      pergunta="6. Possui dermatites, psoríase, feridas abertas, queimaduras ou micoses na pele?"
                      descricaoAjuda="Regiões com lesões ativas não recebem atrito direto."
                      placeholderDetalhes="Indique as regiões afetadas na pele..."
                      value={formData.problemasPele}
                      onChange={(val) => handleCondicaoChange('problemasPele', val)}
                      error={errors['problemasPele.detalhes']}
                    />

                    {/* Tratamento Oncológico */}
                    <AnamneseRadioGroup
                      id="tratamentoOncologico"
                      pergunta="7. Está realizando ou já realizou tratamento oncológico (quimio/radioterapia)?"
                      descricaoAjuda="Requer liberação médica e cuidados específicos na circulação linfática."
                      placeholderDetalhes="Descreva o tratamento e acompanhamento..."
                      value={formData.tratamentoOncologico}
                      onChange={(val) => handleCondicaoChange('tratamentoOncologico', val)}
                      error={errors['tratamentoOncologico.detalhes']}
                    />

                    {/* Medicamentos */}
                    <AnamneseRadioGroup
                      id="usoMedicamentos"
                      pergunta="8. Faz uso contínuo de medicamentos (ex: anticoagulantes, anti-inflamatórios, analgésicos)?"
                      descricaoAjuda="Medicamentos podem alterar a coagulação e a percepção de dor durante a sessão."
                      placeholderDetalhes="Quais medicamentos você utiliza regularmente?"
                      value={formData.usoMedicamentos}
                      onChange={(val) => handleCondicaoChange('usoMedicamentos', val)}
                      error={errors['usoMedicamentos.detalhes']}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentSection('queixa')}
                      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-canvas-neutral)]"
                    >
                      ← Voltar para Queixa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCompletedSections((prev) => new Set([...prev, 'saude']));
                        setCurrentSection('habitos');
                      }}
                      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-6 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-[var(--color-brand-deep)]"
                    >
                      Avançar para Hábitos & Preferências →
                    </button>
                  </div>
                </section>
              )}

              {/* SEÇÃO 3: Hábitos e Preferências */}
              {currentSection === 'habitos' && (
                <section
                  aria-labelledby="section-habitos-title"
                  className="space-y-6 rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-7"
                >
                  <div className="border-b border-[var(--color-border-default)] pb-4">
                    <h2
                      id="section-habitos-title"
                      className="text-lg font-bold text-[var(--color-text-primary)]"
                    >
                      3. Preferências e Hábitos
                    </h2>
                    <p className="mt-1 text-xs/5 text-[var(--color-text-secondary)]">
                      Personalize sua experiência para que cada toque esteja alinhado ao seu gosto e
                      conforto.
                    </p>
                  </div>

                  {/* Preferência de Pressão */}
                  <PressurePreferenceSelector
                    value={formData.preferenciaPressao}
                    onChange={(pressao: NivelPressao) =>
                      setFormData((prev) => ({ ...prev, preferenciaPressao: pressao }))
                    }
                  />

                  {/* Experiência Prévia */}
                  <div className="space-y-2">
                    <label
                      htmlFor="experienciaMassagem"
                      className="block text-sm font-semibold text-[var(--color-text-primary)]"
                    >
                      Experiência prévia com massoterapia
                    </label>
                    <select
                      id="experienciaMassagem"
                      value={formData.experienciaMassagem}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          experienciaMassagem: e.target.value as ExperienciaMassoterapia,
                        }))
                      }
                      className="min-h-12 w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)]"
                    >
                      <option value="primeira_vez">É a minha primeira vez fazendo massagem</option>
                      <option value="eventual">Já fiz massagem algumas vezes</option>
                      <option value="frequente">Tenho o hábito frequente de fazer massagens</option>
                    </select>
                  </div>

                  {/* Atividade Física */}
                  <div className="space-y-2">
                    <label
                      htmlFor="atividadeFisica"
                      className="block text-sm font-semibold text-[var(--color-text-primary)]"
                    >
                      Frequência de atividade física
                    </label>
                    <select
                      id="atividadeFisica"
                      value={formData.atividadeFisica}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          atividadeFisica: e.target.value as FrequenciaAtividadeFisica,
                        }))
                      }
                      className="min-h-12 w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)]"
                    >
                      <option value="sedentario">Não pratico atividades físicas no momento</option>
                      <option value="leve">Leve a moderada (1 a 2 vezes por semana)</option>
                      <option value="regular">Regular (3 a 4 vezes por semana)</option>
                      <option value="intensa">Intensa / Atleta (5 ou mais vezes por semana)</option>
                    </select>
                  </div>

                  {/* Observações Adicionais */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="observacoesAdicionais"
                      className="block text-sm font-semibold text-[var(--color-text-primary)]"
                    >
                      Observações ou preferências adicionais{' '}
                      <span className="text-xs font-normal text-[var(--color-text-secondary)]">
                        (opcional)
                      </span>
                    </label>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Ex: Preferência por temperatura da sala, som ambiente suave, evitar toque nos
                      pés, etc.
                    </p>
                    <textarea
                      id="observacoesAdicionais"
                      rows={3}
                      value={formData.observacoesAdicionais || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, observacoesAdicionais: e.target.value }))
                      }
                      placeholder="Algum outro detalhe importante que gostaria que a terapeuta soubesse?"
                      className="min-h-20 w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-icon-muted)] focus:border-[var(--color-brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentSection('saude')}
                      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-canvas-neutral)]"
                    >
                      ← Voltar para Histórico de Saúde
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCompletedSections((prev) => new Set([...prev, 'habitos']));
                        setCurrentSection('consentimento');
                      }}
                      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-6 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-[var(--color-brand-deep)]"
                    >
                      Avançar para Consentimento →
                    </button>
                  </div>
                </section>
              )}

              {/* SEÇÃO 4: Consentimento e Envio */}
              {currentSection === 'consentimento' && (
                <section
                  aria-labelledby="section-consentimento-title"
                  className="space-y-6 rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-7"
                >
                  <div className="border-b border-[var(--color-border-default)] pb-4">
                    <h2
                      id="section-consentimento-title"
                      className="text-lg font-bold text-[var(--color-text-primary)]"
                    >
                      4. Termo de Consentimento e Confirmação
                    </h2>
                    <p className="mt-1 text-xs/5 text-[var(--color-text-secondary)]">
                      Leia as informações éticas abaixo antes de registrar sua ficha de avaliação.
                    </p>
                  </div>

                  {/* Caixa com o Termo de Responsabilidade */}
                  <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-4 text-xs/6 text-[var(--color-text-secondary)]">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      Declaração de Veracidade e Consentimento Informado
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      <li>
                        Declaro que todas as informações prestadas nesta ficha de anamnese são
                        verdadeiras e completas.
                      </li>
                      <li>
                        Estou ciente de que as técnicas de massoterapia têm finalidade preventiva,
                        relaxante e de bem-estar corporal, não substituindo consultas médicas,
                        exames diagnósticos ou tratamentos hospitalares.
                      </li>
                      <li>
                        Comprometo-me a comunicar imediatamente à massoterapeuta caso ocorra
                        qualquer mudança em meu estado de saúde ou gravidez antes do início de
                        futuras sessões.
                      </li>
                      <li>
                        Autorizo o registro sigiloso destes dados para fins exclusivos de
                        personalização e segurança dos atendimentos.
                      </li>
                    </ul>
                  </div>

                  {/* Checkbox de Consentimento */}
                  <div className="space-y-2">
                    <label
                      htmlFor="consentimentoConfirmado"
                      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                        errors.consentimentoConfirmado
                          ? 'border-[var(--color-error-border)] bg-[var(--color-error-bg)]/30'
                          : formData.consentimentoConfirmado
                            ? 'border-[var(--color-brand-strong)] bg-[var(--color-brand-soft)]/50'
                            : 'border-[var(--color-border-default)] bg-white hover:border-[var(--color-brand-primary)]'
                      }`}
                    >
                      <input
                        id="consentimentoConfirmado"
                        type="checkbox"
                        disabled={submitting}
                        checked={formData.consentimentoConfirmado}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            consentimentoConfirmado: e.target.checked,
                          }));
                          if (errors.consentimentoConfirmado) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.consentimentoConfirmado;
                              return next;
                            });
                          }
                        }}
                        aria-invalid={Boolean(errors.consentimentoConfirmado)}
                        aria-describedby={
                          errors.consentimentoConfirmado ? 'consentimento-error' : undefined
                        }
                        className="mt-0.5 h-5 w-5 rounded border-[var(--color-border-default)] text-[var(--color-brand-strong)] focus:ring-[var(--color-brand-primary)]"
                      />
                      <span className="text-xs/5 font-semibold text-[var(--color-text-primary)]">
                        Li, compreendi e concordo com o termo de consentimento, autorizando o
                        registro da minha ficha de anamnese.
                      </span>
                    </label>

                    {errors.consentimentoConfirmado && (
                      <p
                        id="consentimento-error"
                        role="alert"
                        className="text-xs font-medium text-[var(--color-error-text)]"
                      >
                        {errors.consentimentoConfirmado}
                      </p>
                    )}
                  </div>

                  {/* Ações Finais de Envio */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--color-border-default)]">
                    <button
                      type="button"
                      onClick={() => setCurrentSection('habitos')}
                      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-canvas-neutral)]"
                    >
                      ← Voltar para Hábitos
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-8 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-[var(--color-brand-deep)] disabled:cursor-wait disabled:opacity-70"
                    >
                      {submitting ? 'Salvando ficha de anamnese…' : 'Salvar ficha de anamnese'}
                    </button>
                  </div>
                </section>
              )}
            </form>
          </div>
        )}

        {/* Rodapé auxiliar com link para o perfil */}
        <div className="mt-8 text-center">
          <Link
            to="/perfil"
            className="text-xs font-semibold text-[var(--color-brand-deep)] underline-offset-4 hover:underline"
          >
            ← Voltar para Meu Perfil
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
