import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serviceCatalog } from '@/features/services/catalog';
import { formatServiceDuration, formatServicePrice } from '@/features/services/formatters';
import { useOptionalAuth } from '@/features/auth/auth-context';
import { getUserDisplayName } from '@/features/auth/user-display';
import { BookingCalendar } from '@/features/agendamentos/components/BookingCalendar';
import { PixQrCode } from '@/features/agendamentos/components/PixQrCode';
import { addAgendamentoStorage } from '@/features/agendamentos/data/agendamentos-storage';
import type { Agendamento } from '@/features/agendamentos/types/agendamento';

type FlowStep = 'calendario' | 'confirmacao' | 'pagamento' | 'concluido';
type MetodoPagamento = 'pix' | 'cartao' | 'boleto';

interface DiaOpcao {
  isoDate: string;
  diaSemana: string;
  dataCurta: string;
  disponivel: boolean;
}

const DIAS_DISPONIVEIS_MOCK: DiaOpcao[] = [
  { isoDate: '2026-10-21', diaSemana: 'Quarta-feira', dataCurta: '21 Out', disponivel: true },
  { isoDate: '2026-10-22', diaSemana: 'Quinta-feira', dataCurta: '22 Out', disponivel: true },
  { isoDate: '2026-10-23', diaSemana: 'Sexta-feira', dataCurta: '23 Out', disponivel: true },
  { isoDate: '2026-10-24', diaSemana: 'Sábado', dataCurta: '24 Out', disponivel: true },
  { isoDate: '2026-10-25', diaSemana: 'Domingo', dataCurta: '25 Out', disponivel: false },
  { isoDate: '2026-10-26', diaSemana: 'Segunda-feira', dataCurta: '26 Out', disponivel: true },
  { isoDate: '2026-10-27', diaSemana: 'Terça-feira', dataCurta: '27 Out', disponivel: false },
  { isoDate: '2026-10-28', diaSemana: 'Quarta-feira', dataCurta: '28 Out', disponivel: true },
];

function generateAppointmentId() {
  return `ag-${Date.now()}`;
}

function calcularFimHorario(inicio: string, duracaoMin: number) {
  const parts = inicio.split(':');
  const h = Number(parts[0] ?? '0');
  const m = Number(parts[1] ?? '0');
  const totalMin = h * 60 + m + duracaoMin;
  const finalH = Math.floor(totalMin / 60) % 24;
  const finalM = totalMin % 60;
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
}

export function AgendamentoFlowPage() {
  const { serviceId } = useParams<{ serviceId?: string }>();
  const navigate = useNavigate();
  const auth = useOptionalAuth();
  const currentUser = auth?.currentUser ?? null;

  // Serviço selecionado
  const selectedServiceId = serviceId || serviceCatalog[0]?.id || 'massagem-relaxante';

  const servicoAtual = useMemo(() => {
    return (
      serviceCatalog.find((s) => s.id === selectedServiceId) ||
      serviceCatalog[0] || {
        id: 'massagem-relaxante',
        name: 'Massagem Relaxante',
        description: 'Sessão de relaxamento e alívio de tensões.',
        durationMinutes: 60,
        priceInCents: 17000,
        imageSrc: '',
        imageAlt: 'Massagem Relaxante',
        active: true,
      }
    );
  }, [selectedServiceId]);

  // Estados do fluxo
  const [step, setStep] = useState<FlowStep>('calendario');
  const nomeCliente = currentUser ? getUserDisplayName(currentUser) : 'Mariana Souza';
  const [dataSelecionada, setDataSelecionada] = useState<string>('2026-10-22');
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('10:00');
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');
  const [novoAgendamentoCriado, setNovoAgendamentoCriado] = useState<Agendamento | null>(null);

  // Cartão de crédito mock form state
  const [cartaoNumero, setCartaoNumero] = useState('');
  const [cartaoNome, setCartaoNome] = useState('');
  const [cartaoValidade, setCartaoValidade] = useState('');
  const [cartaoCvv, setCartaoCvv] = useState('');

  // Cálculos de valor
  const valorTotalReais = servicoAtual.priceInCents / 100;
  const valorSinalReais = Math.round(valorTotalReais * 0.3 * 100) / 100;
  const saldoRestanteReais = Math.round((valorTotalReais - valorSinalReais) * 100) / 100;

  const diaSelecionadoObj = DIAS_DISPONIVEIS_MOCK.find((d) => d.isoDate === dataSelecionada);
  const dataFormatadaTexto = diaSelecionadoObj
    ? `${diaSelecionadoObj.dataCurta} • ${diaSelecionadoObj.diaSemana}`
    : dataSelecionada;

  // Finalizar agendamento
  const handleFinalizar = () => {
    const novo: Agendamento = {
      id: generateAppointmentId(),
      servicoNome: servicoAtual.name,
      servicoCategoria: 'Massoterapia',
      duracaoMinutos: servicoAtual.durationMinutes,
      profissionalNome: 'Tais Romagnoli',
      dataHoraIso: `${dataSelecionada}T${horarioSelecionado}:00`,
      dataFormatada: diaSelecionadoObj
        ? `${diaSelecionadoObj.diaSemana.substring(0, 3)}, ${diaSelecionadoObj.dataCurta}`
        : dataSelecionada,
      horarioFormatado: `${horarioSelecionado} - ${calcularFimHorario(horarioSelecionado, servicoAtual.durationMinutes)}`,
      valorTotal: valorTotalReais,
      sinalPago: valorSinalReais,
      status: 'pendente',
      imagemUrl: servicoAtual.imageSrc,
      observacao: `Agendado via aplicativo por ${nomeCliente}. Método: ${metodoPagamento.toUpperCase()}.`,
    };

    addAgendamentoStorage(novo);
    setNovoAgendamentoCriado(novo);
    setStep('concluido');
  };

  // ==========================================
  // TELA 1: CALENDÁRIO (SELEÇÃO DATA/HORA)
  // ==========================================
  if (step === 'calendario') {
    return (
      <BookingCalendar
        dataSelecionada={dataSelecionada}
        horarioSelecionado={horarioSelecionado}
        onSelectData={(isoDate) => setDataSelecionada(isoDate)}
        onSelectHorario={(hora) => setHorarioSelecionado(hora)}
        onConfirmar={() => setStep('confirmacao')}
        onVoltar={() => navigate('/servicos')}
      />
    );
  }

  // ==========================================
  // TELA 4: PÁGINA DE CONFIRMAÇÃO (FUNDO VERDE)
  // ==========================================
  if (step === 'concluido') {
    return (
      <div
        data-testid="pagina-confirmacao-concluido"
        className="flex min-h-dvh flex-col justify-between bg-[#22C55E] p-6 text-white sm:p-10"
      >
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center text-center">
          {/* Círculo Branco com Checkmark Verde */}
          <div className="relative mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-2xl ring-8 ring-white/20 sm:h-36 sm:w-36">
            <svg
              aria-hidden="true"
              className="h-16 w-16 text-[#22C55E] sm:h-20 sm:w-20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
            Agendamento Concluído!
          </h1>

          <p className="mt-2 text-sm text-white/90 sm:text-base">
            Sua solicitação de horário foi recebida com sucesso.
          </p>

          {/* Card Resumo do Agendamento */}
          <div className="mt-6 w-full rounded-3xl border border-white/30 bg-white/20 p-5 text-left text-sm text-white backdrop-blur-md shadow-lg sm:p-6">
            <div className="space-y-3">
              <div className="flex justify-between border-b border-white/20 pb-2">
                <span className="text-white/80">Serviço:</span>
                <span className="font-bold text-white">
                  {novoAgendamentoCriado?.servicoNome || servicoAtual.name}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/20 pb-2">
                <span className="text-white/80">Data e Horário:</span>
                <span className="font-bold text-white">
                  {dataFormatadaTexto} às {horarioSelecionado}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/20 pb-2">
                <span className="text-white/80">Profissional:</span>
                <span className="font-bold text-white">Tais Romagnoli</span>
              </div>
              <div className="flex justify-between border-b border-white/20 pb-2">
                <span className="text-white/80">Sinal de 30%:</span>
                <span className="font-bold text-white">
                  {formatServicePrice(valorSinalReais * 100)} (Registrado)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/80">Saldo no atendimento:</span>
                <span className="font-bold text-white">
                  {formatServicePrice(saldoRestanteReais * 100)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Botões Inferiores */}
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 pt-6">
          <button
            type="button"
            data-testid="ver-meus-agendamentos-btn"
            onClick={() => navigate('/agendamentos')}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--color-brand-strong)] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-[var(--color-brand-deep)] active:scale-[0.98]"
          >
            Ver meus agendamentos
          </button>

          <button
            type="button"
            data-testid="voltar-para-servicos-btn"
            onClick={() => navigate('/servicos')}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--color-brand-soft)] px-6 py-3.5 text-sm font-bold text-[var(--color-brand-deep)] shadow-md transition-all hover:bg-white active:scale-[0.98]"
          >
            Voltar para serviços
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA 3: PAGAMENTO (RESPONSIVO)
  // ==========================================
  if (step === 'pagamento') {
    return (
      <div className="min-h-dvh bg-[var(--color-canvas-neutral)] pb-16 text-[var(--color-text-primary)]">
        {/* Cabeçalho Roxo Curvo e Responsivo */}
        <header className="sticky top-0 z-30 bg-gradient-to-b from-[#8F75D0] to-[#7A60B8] pb-6 pt-4 text-white shadow-md backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6">
            <button
              type="button"
              data-testid="voltar-confirmacao-btn"
              onClick={() => setStep('confirmacao')}
              aria-label="Voltar para confirmação"
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
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Pagamento</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="mx-auto mt-6 max-w-4xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
            {/* Coluna Esquerda: Stepper e Seleção de Método */}
            <div className="rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-6 lg:col-span-6">
              <div className="relative border-l-2 border-[var(--color-brand-primary)] pl-6 space-y-6">
                {/* Item 1: Valor Total */}
                <div className="relative">
                  <span className="absolute -left-[35px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-strong)] text-xs font-bold text-white shadow-sm">
                    1
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Valor Total
                  </p>
                  <div
                    data-testid="valor-total-display"
                    className="mt-2 flex items-center justify-between rounded-2xl bg-[var(--color-brand-soft)] border border-[#DDD6FE] px-4 py-3.5"
                  >
                    <span className="text-sm font-semibold text-[var(--color-brand-deep)]">
                      Total do Serviço
                    </span>
                    <span className="text-lg font-bold text-[var(--color-brand-deep)]">
                      {formatServicePrice(servicoAtual.priceInCents)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                    * Sinal de 30% ({formatServicePrice(valorSinalReais * 100)}) exigido para
                    confirmação da reserva.
                  </p>
                </div>

                {/* Item 2: Métodos de Pagamento */}
                <div className="relative">
                  <span className="absolute -left-[35px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-strong)] text-xs font-bold text-white shadow-sm">
                    2
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Métodos de pagamento
                  </p>

                  {/* Seletor de Métodos */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid="metodo-pix-btn"
                      onClick={() => setMetodoPagamento('pix')}
                      className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold transition-all ${
                        metodoPagamento === 'pix'
                          ? 'bg-[var(--color-brand-strong)] text-white shadow-sm'
                          : 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] hover:bg-[#DDD6FE]'
                      }`}
                    >
                      Pix
                    </button>

                    <button
                      type="button"
                      data-testid="metodo-cartao-btn"
                      onClick={() => setMetodoPagamento('cartao')}
                      className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold transition-all ${
                        metodoPagamento === 'cartao'
                          ? 'bg-[var(--color-brand-strong)] text-white shadow-sm'
                          : 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] hover:bg-[#DDD6FE]'
                      }`}
                    >
                      Cartão de Crédito
                    </button>

                    <button
                      type="button"
                      data-testid="metodo-boleto-btn"
                      onClick={() => setMetodoPagamento('boleto')}
                      className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold transition-all ${
                        metodoPagamento === 'boleto'
                          ? 'bg-[var(--color-brand-strong)] text-white shadow-sm'
                          : 'bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] hover:bg-[#DDD6FE]'
                      }`}
                    >
                      Boleto
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Detalhes do Método + Finalização */}
            <div className="space-y-4 lg:col-span-6">
              {metodoPagamento === 'pix' && (
                <PixQrCode valorFormatado={formatServicePrice(valorSinalReais * 100)} />
              )}

              {metodoPagamento === 'cartao' && (
                <div
                  data-testid="cartao-form-container"
                  className="space-y-3 rounded-3xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-6"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
                    Dados do Cartão de Crédito
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                      Número do Cartão
                    </label>
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      value={cartaoNumero}
                      onChange={(e) => setCartaoNumero(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-3 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                      Nome impresso no Cartão
                    </label>
                    <input
                      type="text"
                      placeholder="Nome Completo"
                      value={cartaoNome}
                      onChange={(e) => setCartaoNome(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-3 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                        Validade (MM/AA)
                      </label>
                      <input
                        type="text"
                        placeholder="12/28"
                        value={cartaoValidade}
                        onChange={(e) => setCartaoValidade(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-3 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cartaoCvv}
                        onChange={(e) => setCartaoCvv(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] p-3 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    * Cobrança imediata do sinal de {formatServicePrice(valorSinalReais * 100)}.
                  </p>
                </div>
              )}

              {metodoPagamento === 'boleto' && (
                <div
                  data-testid="boleto-info-container"
                  className="rounded-3xl border border-[var(--color-border-default)] bg-white p-5 text-center shadow-sm sm:p-6"
                >
                  <p className="text-sm font-bold text-[var(--color-brand-deep)]">
                    Boleto Bancário • {formatServicePrice(valorSinalReais * 100)}
                  </p>
                  <p className="mt-2 rounded-xl bg-[var(--color-canvas-neutral)] p-3 font-mono text-xs text-[var(--color-text-secondary)] break-all border border-[var(--color-border-default)]">
                    34191.79001 01043.510047 91020.150008 5 91450000005100
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    O boleto tem compensação de 1 a 3 dias úteis. A confirmação da reserva ocorre
                    após a liquidação.
                  </p>
                </div>
              )}

              {/* Botão Finalizar */}
              <div className="pt-2">
                <button
                  type="button"
                  data-testid="finalizar-agendamento-btn"
                  onClick={handleFinalizar}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-brand-strong)] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-brand-deep)] active:scale-[0.98]"
                >
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ====================================================
  // TELA 2: CONFIRMAÇÃO DO AGENDAMENTO (SOMENTE LEITURA)
  // ====================================================
  return (
    <div className="min-h-dvh bg-[var(--color-canvas-neutral)] pb-16 text-[var(--color-text-primary)]">
      {/* Cabeçalho Roxo Curvo e Responsivo */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-[#8F75D0] to-[#7A60B8] py-4 text-white shadow-md backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            data-testid="voltar-calendario-topo-btn"
            onClick={() => setStep('calendario')}
            aria-label="Voltar para o calendário"
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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Confirmação do Agendamento
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-4xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
          {/* Coluna Esquerda: Dados do Agendamento (Somente Leitura) */}
          <div className="space-y-4 rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-6 lg:col-span-7">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
              Detalhes da Reserva
            </h2>

            {/* Nome do Cliente (Visualização) */}
            <div className="rounded-2xl border border-[#DDD6FE] bg-[var(--color-brand-soft)] p-4">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
                Nome do cliente
              </span>
              <p
                data-testid="nome-cliente-display"
                className="mt-1 text-sm font-bold text-[var(--color-text-primary)]"
              >
                {nomeCliente}
              </p>
            </div>

            {/* Profissional */}
            <div className="rounded-2xl border border-[#DDD6FE] bg-[var(--color-brand-soft)] p-4">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
                Profissional responsável
              </span>
              <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
                Tais Romagnoli
              </p>
            </div>

            {/* Serviço Escolhido */}
            <div className="rounded-2xl border border-[#DDD6FE] bg-[var(--color-brand-soft)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
                  Serviço escolhido
                </span>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-[var(--color-brand-deep)] shadow-sm">
                  {formatServiceDuration(servicoAtual.durationMinutes)}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
                {servicoAtual.name}
              </p>
              {servicoAtual.description && (
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {servicoAtual.description}
                </p>
              )}
            </div>

            {/* Data e Horário Escolhidos */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#DDD6FE] bg-[var(--color-brand-soft)] p-4">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
                  Data escolhida
                </span>
                <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
                  {dataFormatadaTexto}
                </p>
              </div>

              <div className="rounded-2xl border border-[#DDD6FE] bg-[var(--color-brand-soft)] p-4">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
                  Horário escolhido
                </span>
                <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
                  {horarioSelecionado} às{' '}
                  {calcularFimHorario(horarioSelecionado, servicoAtual.durationMinutes)}
                </p>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Resumo Financeiro e Ações */}
          <div className="space-y-4 lg:col-span-5">
            {/* Card de Valores */}
            <div className="rounded-3xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-deep)]">
                Resumo de Valores
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text-secondary)]">Valor total da sessão:</span>
                  <span className="text-base font-extrabold text-[var(--color-brand-deep)]">
                    {formatServicePrice(servicoAtual.priceInCents)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#DDD6FE] bg-[var(--color-brand-soft)] p-3.5">
                  <div>
                    <p className="text-xs font-bold text-[var(--color-brand-deep)]">
                      Sinal de 30% para reserva
                    </p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      Pago agora para confirmação
                    </p>
                  </div>
                  <span className="text-base font-bold text-[var(--color-brand-deep)]">
                    {formatServicePrice(valorSinalReais * 100)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-[var(--color-text-secondary)]">
                  <span>Saldo a acertar no atendimento:</span>
                  <span className="font-bold text-[var(--color-text-primary)]">
                    {formatServicePrice(saldoRestanteReais * 100)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações Inferiores */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                data-testid="avancar-pagamento-btn"
                onClick={() => setStep('pagamento')}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-brand-strong)] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-brand-deep)] active:scale-[0.98]"
              >
                Avançar para Pagamento
              </button>

              <button
                type="button"
                data-testid="voltar-btn"
                onClick={() => setStep('calendario')}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-[#DDD6FE] bg-[var(--color-brand-soft)] px-6 py-3.5 text-sm font-bold text-[var(--color-brand-deep)] transition-all hover:bg-white active:scale-[0.98]"
              >
                Voltar ao Calendário
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
