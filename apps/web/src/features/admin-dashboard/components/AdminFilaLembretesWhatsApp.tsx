import { useState, useMemo, useEffect } from 'react';
import {
  gerarLinkWhatsapp,
  filtrarLembretes,
  type LembreteFilaItem,
} from '../utils/whatsapp-reminders';
import {
  gerarFilaLembretesAdmin,
  salvarEstadoLembreteAdmin,
} from '@/services/lembretes-admin-service';

export interface AdminFilaLembretesWhatsAppProps {
  onVoltarAgenda?: () => void;
  onPendentesChange?: (total: number) => void;
}

export function AdminFilaLembretesWhatsApp({
  onVoltarAgenda,
  onPendentesChange,
}: Readonly<AdminFilaLembretesWhatsAppProps>) {
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'enviados'>('todos');
  const [termoBusca, setTermoBusca] = useState('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState('');

  const [itensFila, setItensFila] = useState<LembreteFilaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void gerarFilaLembretesAdmin()
      .then((itens) => {
        if (ativo) setItensFila(itens);
      })
      .catch((error: unknown) => {
        if (ativo)
          setErro(error instanceof Error ? error.message : 'Não foi possível carregar a fila.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Contadores
  const totalGeral = itensFila.length;
  const totalPendentes = itensFila.filter((i) => i.statusLembrete === 'pendente').length;
  const totalEnviados = itensFila.filter((i) => i.statusLembrete === 'enviado').length;

  useEffect(() => onPendentesChange?.(totalPendentes), [onPendentesChange, totalPendentes]);

  // Itens filtrados para exibição
  const itensExibidos = useMemo(() => {
    return filtrarLembretes(itensFila, filtroStatus, termoBusca);
  }, [itensFila, filtroStatus, termoBusca]);

  // Ação: Abrir no WhatsApp
  const salvarItem = async (
    item: LembreteFilaItem,
    statusLembrete: 'pendente' | 'enviado',
    mensagem = item.mensagemPersonalizada || '',
  ) => {
    if (!item.dataHoraInicio) {
      setErro('Este agendamento não tem data e hora válidas para registrar o lembrete.');
      return false;
    }
    try {
      await salvarEstadoLembreteAdmin({
        agendamentoId: item.id,
        dataHoraInicio: item.dataHoraInicio,
        status: statusLembrete,
        mensagemPersonalizada: mensagem,
      });
      setItensFila((atuais) =>
        atuais.map((atual) =>
          atual.id === item.id
            ? {
                ...atual,
                statusLembrete,
                enviadoEm: statusLembrete === 'enviado' ? new Date().toISOString() : undefined,
                mensagemPersonalizada: mensagem,
              }
            : atual,
        ),
      );
      setErro(null);
      return true;
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : 'Não foi possível salvar o status do lembrete.',
      );
      return false;
    }
  };

  const handleAbrirWhatsapp = async (item: LembreteFilaItem) => {
    const mensagem = item.mensagemPersonalizada || '';
    const link = gerarLinkWhatsapp(item.clienteTelefone, mensagem);

    if (link && typeof window !== 'undefined') {
      window.open(link, '_blank', 'noopener,noreferrer');
    }

    if (link && (await salvarItem(item, 'enviado', mensagem))) {
      setAbertoId(item.id);
      setTimeout(() => setAbertoId(null), 3000);
    }
  };

  // Ação: Copiar Mensagem
  const handleCopiarMensagem = async (item: LembreteFilaItem) => {
    const mensagem = item.mensagemPersonalizada || '';
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(mensagem);
      }
      setCopiadoId(item.id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {
      // Fallback silencioso
    }
  };

  // Ação: Alternar Status Manualmente
  const handleAlternarStatus = async (item: LembreteFilaItem) => {
    const novoStatus: 'pendente' | 'enviado' =
      item.statusLembrete === 'enviado' ? 'pendente' : 'enviado';
    await salvarItem(item, novoStatus);
  };

  // Ação: Marcar Todos Como Enviados
  const handleMarcarTodos = async () => {
    await Promise.all(
      itensFila
        .filter((item) => item.statusLembrete === 'pendente')
        .map((item) => salvarItem(item, 'enviado')),
    );
  };

  // Ação: Redefinir Fila
  const handleRedefinirFila = async () => {
    await Promise.all(
      itensFila
        .filter((item) => item.statusLembrete === 'enviado')
        .map((item) => salvarItem(item, 'pendente')),
    );
  };

  // Ação: Iniciar Edição da Mensagem
  const handleIniciarEdicao = (item: LembreteFilaItem) => {
    setEditandoId(item.id);
    setTextoEdicao(item.mensagemPersonalizada || '');
  };

  // Ação: Salvar Edição
  const handleSalvarEdicao = async (id: string) => {
    const item = itensFila.find((filaItem) => filaItem.id === id);
    if (item && (await salvarItem(item, item.statusLembrete, textoEdicao))) setEditandoId(null);
  };

  return (
    <div data-testid="fila-lembretes-whatsapp-container" className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            {onVoltarAgenda && (
              <button
                type="button"
                onClick={onVoltarAgenda}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] transition-colors hover:bg-gray-50 hover:text-[var(--color-text-primary)]"
                aria-label="Voltar para a agenda"
              >
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
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                  />
                </svg>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
                  Fila de Lembretes pelo WhatsApp
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Envio Assistido
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Abra mensagens prontas com detalhes do atendimento diretamente no WhatsApp dos
                clientes.
              </p>
            </div>
          </div>
        </div>

        {/* Ações em Lote */}
        <div className="flex flex-wrap items-center gap-2">
          {totalPendentes > 0 && (
            <button
              type="button"
              onClick={handleMarcarTodos}
              data-testid="marcar-todos-enviados-btn"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-text-primary)] shadow-sm transition-colors hover:bg-gray-50"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Marcar todos como enviados</span>
            </button>
          )}

          {totalEnviados > 0 && (
            <button
              type="button"
              onClick={handleRedefinirFila}
              data-testid="redefinir-fila-btn"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-gray-50 hover:text-red-600"
            >
              <span>Redefinir status</span>
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {erro}
        </div>
      )}
      {carregando && (
        <div
          role="status"
          className="rounded-xl border border-[var(--color-border-default)] bg-white px-4 py-6 text-sm text-[var(--color-text-secondary)]"
        >
          Carregando fila de lembretes…
        </div>
      )}

      {/* CARDS DE RESUMO DE INDICADORES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Total na Fila
          </p>
          <p className="mt-1 text-2xl font-black text-[var(--color-text-primary)]">{totalGeral}</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Atendimentos programados
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Lembretes Pendentes
            </p>
            {totalPendentes > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <p data-testid="contador-pendentes" className="mt-1 text-2xl font-black text-amber-900">
            {totalPendentes}
          </p>
          <p className="mt-1 text-xs text-amber-700">Aguardando disparo assistido</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Lembretes Enviados
          </p>
          <p data-testid="contador-enviados" className="mt-1 text-2xl font-black text-emerald-900">
            {totalEnviados}
          </p>
          <p className="mt-1 text-xs text-emerald-700">Contatos já notificados</p>
        </div>
      </div>

      {/* BARRA DE FILTROS E BUSCA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Abas de filtro */}
        <div
          role="tablist"
          aria-label="Filtrar lembretes por status"
          className="inline-flex rounded-xl bg-gray-100 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filtroStatus === 'pendentes'}
            onClick={() => setFiltroStatus('pendentes')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              filtroStatus === 'pendentes'
                ? 'bg-white text-[var(--color-brand-deep)] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pendentes ({totalPendentes})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filtroStatus === 'enviados'}
            onClick={() => setFiltroStatus('enviados')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              filtroStatus === 'enviados'
                ? 'bg-white text-[var(--color-brand-deep)] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Enviados ({totalEnviados})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filtroStatus === 'todos'}
            onClick={() => setFiltroStatus('todos')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              filtroStatus === 'todos'
                ? 'bg-white text-[var(--color-brand-deep)] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todos ({totalGeral})
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por cliente, telefone..."
            aria-label="Buscar contatos na fila"
            className="w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2 pl-9 text-xs text-[var(--color-text-primary)] placeholder-gray-400 focus:border-[var(--color-brand-deep)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-deep)]"
          />
          <svg
            aria-hidden="true"
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          {termoBusca && (
            <button
              type="button"
              onClick={() => setTermoBusca('')}
              className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600"
              aria-label="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK TOAST DE ABERTURA */}
      {abertoId && (
        <div
          role="status"
          data-testid="whatsapp-aberto-toast"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800"
        >
          <svg
            className="h-4 w-4 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span>
            WhatsApp aberto com a mensagem pré-preenchida! O status do lembrete foi atualizado para{' '}
            <strong>Enviado</strong>.
          </span>
        </div>
      )}

      {/* LISTA DE CONTATOS NA FILA */}
      {carregando ? null : itensExibidos.length === 0 ? (
        <div
          data-testid="fila-lembretes-vazia"
          className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-white p-10 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-bold text-[var(--color-text-primary)]">
            {filtroStatus === 'pendentes'
              ? 'Nenhum lembrete pendente!'
              : 'Nenhum contato encontrado'}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {filtroStatus === 'pendentes'
              ? 'Todos os contatos agendados já receberam seus lembretes assistidos.'
              : 'Verifique se há filtros ativos ou termos de busca divergentes.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {itensExibidos.map((item) => {
            const isPendente = item.statusLembrete === 'pendente';
            const isEditando = editandoId === item.id;
            const isCopiado = copiadoId === item.id;

            return (
              <div
                key={item.id}
                data-testid={`lembrete-item-${item.id}`}
                className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition-all ${
                  isPendente
                    ? 'border-amber-200 bg-white hover:border-amber-300'
                    : 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300'
                }`}
              >
                {/* Linha 1: Dados do Cliente e Status */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    {/* Avatar do cliente */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        isPendente
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {item.clienteNome
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-[var(--color-text-primary)] text-sm sm:text-base">
                          {item.clienteNome}
                        </h4>
                        <a
                          href={`tel:${item.clienteTelefone.replace(/\D/g, '')}`}
                          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-brand-deep)] underline decoration-dotted"
                        >
                          {item.clienteTelefone}
                        </a>
                      </div>

                      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                        <span className="font-semibold text-gray-700">{item.servicoNome}</span> •{' '}
                        {item.duracao} •{' '}
                        <span className="font-semibold text-[var(--color-brand-deep)]">
                          {item.horario}
                        </span>
                        {item.dataFormatada ? ` (${item.dataFormatada})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Badges de Status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                        item.statusAgendamento === 'confirmado'
                          ? 'border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]'
                          : 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]'
                      }`}
                    >
                      {item.statusAgendamento.toUpperCase()}
                    </span>

                    <span
                      data-testid={`status-badge-${item.id}`}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                        isPendente
                          ? 'border-amber-300 bg-amber-100 text-amber-900'
                          : 'border-emerald-300 bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isPendente ? 'bg-amber-600' : 'bg-emerald-600'}`}
                      />
                      {isPendente ? 'Pendente' : 'Lembrete Enviado'}
                    </span>
                  </div>
                </div>

                {/* Linha 2: Prévia e Edição da Mensagem Pronta */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 text-xs text-gray-700">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-gray-500">
                      Mensagem Pronta para Envio Assistido
                    </span>
                    {!isEditando ? (
                      <button
                        type="button"
                        onClick={() => handleIniciarEdicao(item)}
                        className="text-[11px] font-semibold text-[var(--color-brand-deep)] hover:underline"
                      >
                        Editar mensagem
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSalvarEdicao(item.id)}
                          className="text-[11px] font-bold text-emerald-700 hover:underline"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditandoId(null)}
                          className="text-[11px] font-semibold text-gray-500 hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditando ? (
                    <textarea
                      aria-label="Editar mensagem de lembrete"
                      value={textoEdicao}
                      onChange={(e) => setTextoEdicao(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800 focus:border-[var(--color-brand-deep)] focus:outline-none"
                    />
                  ) : (
                    <p className="whitespace-pre-line text-xs/relaxed text-gray-600 font-sans">
                      {item.mensagemPersonalizada}
                    </p>
                  )}
                </div>

                {/* Linha 3: Barra de Ações */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                  <div className="text-[11px] text-gray-500">
                    {item.enviadoEm && (
                      <span>
                        Enviado em:{' '}
                        {new Date(item.enviadoEm).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Botão Copiar */}
                    <button
                      type="button"
                      onClick={() => void handleCopiarMensagem(item)}
                      data-testid={`copiar-msg-btn-${item.id}`}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] shadow-sm transition-colors hover:bg-gray-50"
                      aria-label={`Copiar mensagem para ${item.clienteNome}`}
                    >
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                        />
                      </svg>
                      <span>{isCopiado ? 'Copiado!' : 'Copiar'}</span>
                    </button>

                    {/* Botão Alternar Status Manualmente */}
                    <button
                      type="button"
                      onClick={() => handleAlternarStatus(item)}
                      data-testid={`alternar-status-btn-${item.id}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-gray-50"
                    >
                      {isPendente ? 'Marcar como enviado' : 'Marcar como pendente'}
                    </button>

                    {/* Botão Primário: Abrir no WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleAbrirWhatsapp(item)}
                      data-testid={`abrir-whatsapp-btn-${item.id}`}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#20ba59] active:scale-[0.98]"
                      aria-label={`Abrir WhatsApp com lembrete para ${item.clienteNome}`}
                    >
                      {/* Ícone oficial do WhatsApp */}
                      <svg aria-hidden="true" className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                      <span>Abrir no WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
