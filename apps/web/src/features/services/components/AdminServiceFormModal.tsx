import { useEffect, useState, useId, type ChangeEvent, type FormEvent } from 'react';
import {
  calcularPercentualSinal,
  calcularSinal,
  centavosParaReais,
  PERCENTUAL_SINAL_PADRAO,
  servicoInputSchema,
} from '@clinica/shared';
import type { UpsertServiceInput } from '../service-firestore-repository';
import type { Service } from '../types';

export interface AdminServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceToEdit?: Service | null;
  onSave: (serviceData: UpsertServiceInput) => Promise<void> | void;
}

const SUGESTOES_DURACAO = [30, 45, 60, 90, 120];

interface AdminServiceFormDialogProps {
  serviceToEdit?: Service | null;
  onClose: () => void;
  onSave: (serviceData: UpsertServiceInput) => Promise<void> | void;
}

function AdminServiceFormDialog({ serviceToEdit, onClose, onSave }: AdminServiceFormDialogProps) {
  const isEditing = Boolean(serviceToEdit);

  const initialPreco = serviceToEdit ? centavosParaReais(serviceToEdit.priceInCents) : '';
  const initialSinal = serviceToEdit
    ? serviceToEdit.sinalInCents !== undefined
      ? centavosParaReais(serviceToEdit.sinalInCents)
      : typeof initialPreco === 'number'
        ? calcularSinal(initialPreco, serviceToEdit.sinalPercentual ?? PERCENTUAL_SINAL_PADRAO)
        : ''
    : '';

  const initialSinalPercentual =
    serviceToEdit?.sinalPercentual ??
    (typeof initialPreco === 'number' && typeof initialSinal === 'number' && initialPreco > 0
      ? calcularPercentualSinal(initialPreco, initialSinal)
      : PERCENTUAL_SINAL_PADRAO);

  const [nome, setNome] = useState(serviceToEdit?.name ?? '');
  const [duracaoMinutos, setDuracaoMinutos] = useState<number | ''>(
    serviceToEdit?.durationMinutes ?? 60,
  );
  const [preco, setPreco] = useState<number | ''>(initialPreco);
  const [sinal, setSinal] = useState<number | ''>(initialSinal);
  const [sinalPercentual, setSinalPercentual] = useState<number>(initialSinalPercentual);
  const [isSinalPersonalizado, setIsSinalPersonalizado] = useState(
    Boolean(
      serviceToEdit?.sinalPercentual && serviceToEdit.sinalPercentual !== PERCENTUAL_SINAL_PADRAO,
    ),
  );
  const [descricao, setDescricao] = useState(serviceToEdit?.description ?? '');
  const [ativo, setAtivo] = useState(serviceToEdit?.active ?? true);
  const [categoria, setCategoria] = useState(serviceToEdit?.category || 'Corporal');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const modalTitleId = useId();
  const nomeId = useId();
  const duracaoId = useId();
  const precoId = useId();
  const sinalId = useId();
  const descricaoId = useId();
  const ativoId = useId();
  const categoriaId = useId();

  // Tecla Escape para fechar o modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  // Atualiza preço e recalcula sinal automático caso não seja personalizado
  const handlePrecoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      setPreco('');
      if (!isSinalPersonalizado) {
        setSinal('');
      }
      return;
    }

    const valor = parseFloat(rawVal);
    if (!Number.isNaN(valor)) {
      setPreco(valor);
      if (!isSinalPersonalizado) {
        const sinalCalculado = calcularSinal(valor, PERCENTUAL_SINAL_PADRAO);
        setSinal(sinalCalculado);
        setSinalPercentual(PERCENTUAL_SINAL_PADRAO);
      } else if (typeof sinal === 'number' && valor > 0) {
        setSinalPercentual(calcularPercentualSinal(valor, sinal));
      }
    }
  };

  // Atualiza sinal manualmente
  const handleSinalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setIsSinalPersonalizado(true);

    if (rawVal === '') {
      setSinal('');
      return;
    }

    const valor = parseFloat(rawVal);
    if (!Number.isNaN(valor)) {
      setSinal(valor);
      if (typeof preco === 'number' && preco > 0) {
        setSinalPercentual(calcularPercentualSinal(preco, valor));
      }
    }
  };

  // Restaura o cálculo padrão de sinal de 30%
  const handleRestaurarSinalPadrao = () => {
    setIsSinalPersonalizado(false);
    if (typeof preco === 'number' && preco > 0) {
      const sinalCalculado = calcularSinal(preco, PERCENTUAL_SINAL_PADRAO);
      setSinal(sinalCalculado);
      setSinalPercentual(PERCENTUAL_SINAL_PADRAO);
    } else {
      setSinal('');
      setSinalPercentual(PERCENTUAL_SINAL_PADRAO);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const valorPreco = typeof preco === 'number' ? preco : 0;
    const valorSinal =
      typeof sinal === 'number' ? sinal : calcularSinal(valorPreco, PERCENTUAL_SINAL_PADRAO);

    const validacao = servicoInputSchema.safeParse({
      id: serviceToEdit?.id,
      nome,
      duracaoMinutos: typeof duracaoMinutos === 'number' ? duracaoMinutos : 0,
      preco: valorPreco,
      sinal: valorSinal,
      sinalPercentual,
      descricao,
      ativo,
      categoria,
    });

    if (!validacao.success) {
      const fieldErrors: Record<string, string> = {};
      const formatados = validacao.error.flatten().fieldErrors;
      for (const [key, msgs] of Object.entries(formatados)) {
        const primeiroErro = msgs?.[0];
        if (primeiroErro) {
          fieldErrors[key] = primeiroErro;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        id: serviceToEdit?.id,
        nome: validacao.data.nome,
        duracaoMinutos: validacao.data.duracaoMinutos,
        preco: validacao.data.preco,
        sinal: validacao.data.sinal,
        sinalPercentual: validacao.data.sinalPercentual ?? sinalPercentual,
        descricao: validacao.data.descricao,
        ativo: validacao.data.ativo,
        categoria: validacao.data.categoria,
      });
      onClose();
    } catch (err) {
      setGeneralError(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao salvar o serviço. Tente novamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      data-testid="admin-service-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs"
    >
      <div
        className="relative my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-2xl transition-all sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border-default)] pb-4">
          <div>
            <span className="inline-block rounded-full bg-[var(--color-brand-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-brand-deep)]">
              {isEditing ? 'Edição de Procedimento' : 'Novo Procedimento'}
            </span>
            <h2
              id={modalTitleId}
              className="mt-1 text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl"
            >
              {isEditing ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)] sm:text-sm">
              Preencha as informações do procedimento com valores, sinal e detalhes acolhedores.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Fechar formulário"
            className="rounded-xl p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-text-primary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-brand-deep)]"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Mensagem de Erro Geral */}
        {generalError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {generalError}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {/* Nome do Serviço */}
          <div>
            <label
              htmlFor={nomeId}
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]"
            >
              Nome do Serviço <span className="text-red-500">*</span>
            </label>
            <input
              id={nomeId}
              name="nome"
              type="text"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Massagem Relaxante com Óleos Essenciais"
              aria-invalid={Boolean(errors.nome)}
              aria-describedby={errors.nome ? `${nomeId}-error` : undefined}
              className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-hidden focus:ring-2 ${
                errors.nome
                  ? 'border-red-500 bg-red-50/50 focus:ring-red-400'
                  : 'border-[var(--color-border-default)] bg-white focus:border-[var(--color-brand-deep)] focus:ring-[var(--color-brand-deep)]/20'
              }`}
            />
            {errors.nome && (
              <p
                id={`${nomeId}-error`}
                role="alert"
                className="mt-1 text-xs font-medium text-red-600"
              >
                {errors.nome}
              </p>
            )}
          </div>

          {/* Duração e Categoria em Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Duração (minutos) */}
            <div>
              <label
                htmlFor={duracaoId}
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]"
              >
                Duração (em minutos) <span className="text-red-500">*</span>
              </label>
              <input
                id={duracaoId}
                name="duracao"
                type="number"
                min="15"
                max="360"
                step="5"
                value={duracaoMinutos}
                onChange={(e) =>
                  setDuracaoMinutos(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                placeholder="60"
                aria-invalid={Boolean(errors.duracaoMinutos)}
                aria-describedby={errors.duracaoMinutos ? `${duracaoId}-error` : undefined}
                className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-hidden focus:ring-2 ${
                  errors.duracaoMinutos
                    ? 'border-red-500 bg-red-50/50 focus:ring-red-400'
                    : 'border-[var(--color-border-default)] bg-white focus:border-[var(--color-brand-deep)] focus:ring-[var(--color-brand-deep)]/20'
                }`}
              />

              {/* Atalhos de Duração */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[var(--color-text-secondary)]">Atalhos:</span>
                {SUGESTOES_DURACAO.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuracaoMinutos(mins)}
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${
                      duracaoMinutos === mins
                        ? 'bg-[var(--color-brand-deep)] text-white'
                        : 'bg-[var(--color-canvas-neutral)] text-[var(--color-text-secondary)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>

              {errors.duracaoMinutos && (
                <p
                  id={`${duracaoId}-error`}
                  role="alert"
                  className="mt-1 text-xs font-medium text-red-600"
                >
                  {errors.duracaoMinutos}
                </p>
              )}
            </div>

            {/* Categoria */}
            <div>
              <label
                htmlFor={categoriaId}
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]"
              >
                Categoria
              </label>
              <select
                id={categoriaId}
                name="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-[var(--color-brand-deep)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-brand-deep)]/20"
              >
                <option value="Corporal">Massagem Corporal</option>
                <option value="Facial">Tratamento Facial</option>
                <option value="Terapêutica">Terapêutica / Alívio</option>
                <option value="Termoterapia">Termoterapia (Pedras)</option>
                <option value="Holística">Holística & Bem-estar</option>
                <option value="Podal">Podal / Pés & Mãos</option>
                <option value="Oriental">Oriental / Energética</option>
              </select>
            </div>
          </div>

          {/* Preço e Sinal em Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Preço (R$) */}
            <div>
              <label
                htmlFor={precoId}
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]"
              >
                Preço Total (R$) <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-[var(--color-text-secondary)]">
                  R$
                </span>
                <input
                  id={precoId}
                  name="preco"
                  type="number"
                  min="1"
                  step="0.50"
                  value={preco}
                  onChange={handlePrecoChange}
                  placeholder="150,00"
                  aria-invalid={Boolean(errors.preco)}
                  aria-describedby={errors.preco ? `${precoId}-error` : undefined}
                  className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-sm transition-colors focus:outline-hidden focus:ring-2 ${
                    errors.preco
                      ? 'border-red-500 bg-red-50/50 focus:ring-red-400'
                      : 'border-[var(--color-border-default)] bg-white focus:border-[var(--color-brand-deep)] focus:ring-[var(--color-brand-deep)]/20'
                  }`}
                />
              </div>
              {errors.preco && (
                <p
                  id={`${precoId}-error`}
                  role="alert"
                  className="mt-1 text-xs font-medium text-red-600"
                >
                  {errors.preco}
                </p>
              )}
            </div>

            {/* Sinal para Reserva */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor={sinalId}
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]"
                >
                  Sinal para Reserva (R$) <span className="text-red-500">*</span>
                </label>
                {isSinalPersonalizado && (
                  <button
                    type="button"
                    onClick={handleRestaurarSinalPadrao}
                    className="text-[11px] font-semibold text-[var(--color-brand-deep)] hover:underline"
                  >
                    Usar padrão (30%)
                  </button>
                )}
              </div>

              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-[var(--color-text-secondary)]">
                  R$
                </span>
                <input
                  id={sinalId}
                  name="sinal"
                  type="number"
                  min="0"
                  step="0.50"
                  value={sinal}
                  onChange={handleSinalChange}
                  placeholder="45,00"
                  aria-invalid={Boolean(errors.sinal)}
                  aria-describedby={errors.sinal ? `${sinalId}-error` : undefined}
                  className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-sm transition-colors focus:outline-hidden focus:ring-2 ${
                    errors.sinal
                      ? 'border-red-500 bg-red-50/50 focus:ring-red-400'
                      : 'border-[var(--color-border-default)] bg-white focus:border-[var(--color-brand-deep)] focus:ring-[var(--color-brand-deep)]/20'
                  }`}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
                <span>
                  {typeof preco === 'number' && typeof sinal === 'number' && preco > 0
                    ? `Equivale a ${sinalPercentual}% do valor total`
                    : 'Regra padrão: 30% do valor da sessão'}
                </span>
                {isSinalPersonalizado && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                    Personalizado
                  </span>
                )}
              </div>

              {errors.sinal && (
                <p
                  id={`${sinalId}-error`}
                  role="alert"
                  className="mt-1 text-xs font-medium text-red-600"
                >
                  {errors.sinal}
                </p>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor={descricaoId}
                className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]"
              >
                Descrição do Procedimento <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {descricao.length} / 1000
              </span>
            </div>
            <textarea
              id={descricaoId}
              name="descricao"
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva as técnicas, indicações terapêuticas, óleos utilizados e sensações de relaxamento proporcionadas..."
              aria-invalid={Boolean(errors.descricao)}
              aria-describedby={errors.descricao ? `${descricaoId}-error` : undefined}
              className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:outline-hidden focus:ring-2 ${
                errors.descricao
                  ? 'border-red-500 bg-red-50/50 focus:ring-red-400'
                  : 'border-[var(--color-border-default)] bg-white focus:border-[var(--color-brand-deep)] focus:ring-[var(--color-brand-deep)]/20'
              }`}
            />
            {errors.descricao && (
              <p
                id={`${descricaoId}-error`}
                role="alert"
                className="mt-1 text-xs font-medium text-red-600"
              >
                {errors.descricao}
              </p>
            )}
          </div>

          {/* Checkbox de Ativo */}
          <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-4">
            <label htmlFor={ativoId} className="flex cursor-pointer items-start gap-3">
              <input
                id={ativoId}
                name="ativo"
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-brand-deep)] focus:ring-[var(--color-brand-deep)]"
              />
              <div>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Serviço ativo e visível para agendamento
                </span>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Quando desmarcado, o procedimento é preservado no sistema para consulta
                  administrativa, mas fica oculto no catálogo público dos clientes.
                </p>
              </div>
            </label>
          </div>

          {/* Rodapé e Botões */}
          <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border-default)] pt-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[var(--color-border-default)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-canvas-neutral)] sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-deep)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-brand-dark)] focus:outline-hidden focus:ring-2 focus:ring-[var(--color-brand-deep)] focus:ring-offset-2 disabled:opacity-50 sm:w-auto"
            >
              {isSubmitting ? (
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
                <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Serviço'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminServiceFormModal({
  isOpen,
  onClose,
  serviceToEdit,
  onSave,
}: AdminServiceFormModalProps) {
  if (!isOpen) return null;

  return (
    <AdminServiceFormDialog
      key={serviceToEdit ? serviceToEdit.id : 'novo'}
      serviceToEdit={serviceToEdit}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
