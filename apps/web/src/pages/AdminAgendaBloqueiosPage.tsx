import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  NOMES_DIAS_SEMANA,
  type BloqueioAgenda,
  type CriarBloqueioInput,
  type CriarHorarioFixoInput,
  type FrequenciaRecorrencia,
  type HorarioFixoCliente,
} from '@clinica/shared';
import type { AdminClientListItem } from '@/features/admin-dashboard/types';
import { buscarClientesAdmin } from '@/services/clientes-admin-service';
import {
  alterarStatusBloqueioAdmin,
  atualizarHorarioFixoAdmin,
  criarBloqueioAdmin,
  criarHorarioFixoAdmin,
  listarBloqueiosAdmin,
  listarHorariosFixosAdmin,
  removerBloqueioAdmin,
  removerHorarioFixoAdmin,
} from '@/services/agenda-admin-service';

type AgendaTab = 'bloqueios' | 'clientes-fixos';
type TipoBloqueio = 'unico' | 'recorrente';

function dataLocalDeHoje(): string {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}

function horaDoRegistro(horario: HorarioFixoCliente): string {
  return `${horario.horaInicio}–${horario.horaFim}`;
}

function dataBloqueio(bloqueio: BloqueioAgenda): string {
  if (bloqueio.tipo === 'unico')
    return new Date(`${bloqueio.data}T12:00:00`).toLocaleDateString('pt-BR');
  const dia = NOMES_DIAS_SEMANA[bloqueio.diaSemana];
  return `${dia}${bloqueio.frequencia === 'quinzenal' ? ' (quinzenal)' : ' (semanal)'}`;
}

function periodoBloqueio(bloqueio: BloqueioAgenda): string {
  if (bloqueio.tipo === 'unico' && bloqueio.diaInteiro) return 'dia inteiro';
  return `${bloqueio.horaInicio}–${bloqueio.horaFim}`;
}

export function AdminAgendaBloqueiosPage() {
  const [tab, setTab] = useState<AgendaTab>('bloqueios');
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [horariosFixos, setHorariosFixos] = useState<HorarioFixoCliente[]>([]);
  const [clientes, setClientes] = useState<AdminClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [tipoBloqueio, setTipoBloqueio] = useState<TipoBloqueio>('unico');
  const [bloqueioData, setBloqueioData] = useState(dataLocalDeHoje());
  const [bloqueioDiaSemana, setBloqueioDiaSemana] = useState(1);
  const [bloqueioInicio, setBloqueioInicio] = useState('12:00');
  const [bloqueioFim, setBloqueioFim] = useState('13:00');
  const [bloqueioDiaInteiro, setBloqueioDiaInteiro] = useState(false);
  const [bloqueioFrequencia, setBloqueioFrequencia] = useState<FrequenciaRecorrencia>('semanal');
  const [bloqueioMotivo, setBloqueioMotivo] = useState('');

  const [horarioEditandoId, setHorarioEditandoId] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState('');
  const [diaSemana, setDiaSemana] = useState(1);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFim, setHoraFim] = useState('10:00');
  const [frequencia, setFrequencia] = useState<FrequenciaRecorrencia>('semanal');
  const [dataInicio, setDataInicio] = useState(dataLocalDeHoje());
  const [dataFim, setDataFim] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listaBloqueios, listaFixos, listaClientes] = await Promise.all([
        listarBloqueiosAdmin(),
        listarHorariosFixosAdmin(),
        buscarClientesAdmin(),
      ]);
      setBloqueios(listaBloqueios);
      setHorariosFixos(listaFixos);
      setClientes(listaClientes);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Não foi possível carregar a agenda.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(carregarDados);
  }, [carregarDados]);

  const executarAcao = async (acao: () => Promise<unknown>, mensagem: string) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await acao();
      setSuccess(mensagem);
      await carregarDados();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : 'Não foi possível salvar a alteração.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCriarBloqueio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: CriarBloqueioInput =
      tipoBloqueio === 'unico'
        ? {
            tipo: 'unico',
            data: bloqueioData,
            horaInicio: bloqueioDiaInteiro ? '00:00' : bloqueioInicio,
            horaFim: bloqueioDiaInteiro ? '23:59' : bloqueioFim,
            diaInteiro: bloqueioDiaInteiro,
            motivo: bloqueioMotivo.trim(),
            profissionalId: 'default',
          }
        : {
            tipo: 'recorrente',
            diaSemana: bloqueioDiaSemana,
            horaInicio: bloqueioInicio,
            horaFim: bloqueioFim,
            frequencia: bloqueioFrequencia,
            motivo: bloqueioMotivo.trim(),
            profissionalId: 'default',
          };
    await executarAcao(() => criarBloqueioAdmin(input), 'Bloqueio criado na agenda.');
    setBloqueioMotivo('');
  };

  const limparFormularioFixo = () => {
    setHorarioEditandoId(null);
    setClienteId('');
    setDiaSemana(1);
    setHoraInicio('09:00');
    setHoraFim('10:00');
    setFrequencia('semanal');
    setDataInicio(dataLocalDeHoje());
    setDataFim('');
    setObservacoes('');
  };

  const handleSalvarHorarioFixo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cliente = clientes.find((item) => item.id === clienteId);
    if (!cliente && !horarioEditandoId) {
      setError('Selecione um cliente cadastrado.');
      return;
    }
    const campos = {
      diaSemana,
      horaInicio,
      horaFim,
      frequencia,
      dataInicio,
      ...(dataFim ? { dataFim } : {}),
      ...(observacoes.trim() ? { observacoes: observacoes.trim() } : {}),
    };
    if (horarioEditandoId) {
      await executarAcao(
        () => atualizarHorarioFixoAdmin({ id: horarioEditandoId, ...campos }),
        'Horário fixo atualizado.',
      );
    } else {
      const input: CriarHorarioFixoInput = {
        ...campos,
        clienteId: cliente!.id,
        clienteNome: cliente!.nome,
        profissionalId: 'default',
        ativo: true,
        ...(cliente!.telefone ? { clienteTelefone: cliente!.telefone } : {}),
        ...(cliente!.email ? { clienteEmail: cliente!.email } : {}),
      };
      await executarAcao(
        () => criarHorarioFixoAdmin(input),
        'Horário fixo reservado para o cliente.',
      );
    }
    limparFormularioFixo();
  };

  const iniciarEdicaoHorario = (horario: HorarioFixoCliente) => {
    setHorarioEditandoId(horario.id);
    setClienteId(horario.clienteId);
    setDiaSemana(horario.diaSemana);
    setHoraInicio(horario.horaInicio);
    setHoraFim(horario.horaFim);
    setFrequencia(horario.frequencia);
    setDataInicio(horario.dataInicio);
    setDataFim(horario.dataFim ?? '');
    setObservacoes(horario.observacoes ?? '');
    setTab('clientes-fixos');
    setSuccess(null);
    setError(null);
    const formulario = document.getElementById('form-horario-fixo');
    if (typeof formulario?.scrollIntoView === 'function') {
      formulario.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-dvh bg-[#EDE9FE] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/admin/horarios"
            className="text-sm font-semibold text-[#6C53A6] hover:underline"
          >
            ← Horários de funcionamento
          </Link>
          <Link
            to="/admin?tab=configuracoes"
            className="text-sm font-semibold text-[#6C53A6] hover:underline"
          >
            Voltar ao painel
          </Link>
        </div>

        <header className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Bloqueios e clientes fixos</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Bloqueie períodos da agenda e reserve horários recorrentes para clientes cadastrados. As
            reservas passam a ser consideradas na disponibilidade dos agendamentos.
          </p>
        </header>

        <div role="tablist" aria-label="Gestão da agenda" className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'bloqueios'}
            onClick={() => setTab('bloqueios')}
            className={`min-h-11 rounded-xl px-4 text-sm font-bold ${tab === 'bloqueios' ? 'bg-[#7A60B8] text-white' : 'bg-white text-slate-700'}`}
          >
            Bloqueios
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'clientes-fixos'}
            onClick={() => setTab('clientes-fixos')}
            className={`min-h-11 rounded-xl px-4 text-sm font-bold ${tab === 'clientes-fixos' ? 'bg-[#7A60B8] text-white' : 'bg-white text-slate-700'}`}
          >
            Clientes fixos
          </button>
        </div>

        {success && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {success}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        {tab === 'bloqueios' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <form
              onSubmit={(event) => void handleCriarBloqueio(event)}
              className="h-fit space-y-4 rounded-2xl bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold">Adicionar bloqueio</h2>
              <label className="block text-sm font-semibold">
                Tipo de bloqueio
                <select
                  value={tipoBloqueio}
                  onChange={(event) => setTipoBloqueio(event.target.value as TipoBloqueio)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
                >
                  <option value="unico">Data específica</option>
                  <option value="recorrente">Recorrente por semana</option>
                </select>
              </label>
              {tipoBloqueio === 'unico' ? (
                <label className="block text-sm font-semibold">
                  Data
                  <input
                    required
                    type="date"
                    min={dataLocalDeHoje()}
                    value={bloqueioData}
                    onChange={(event) => setBloqueioData(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
                  />
                </label>
              ) : (
                <>
                  <label className="block text-sm font-semibold">
                    Dia da semana
                    <select
                      value={bloqueioDiaSemana}
                      onChange={(event) => setBloqueioDiaSemana(Number(event.target.value))}
                      className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
                    >
                      {NOMES_DIAS_SEMANA.map((nome, index) => (
                        <option key={nome} value={index}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold">
                    Frequência
                    <select
                      value={bloqueioFrequencia}
                      onChange={(event) =>
                        setBloqueioFrequencia(event.target.value as FrequenciaRecorrencia)
                      }
                      className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
                    >
                      <option value="semanal">Toda semana</option>
                      <option value="quinzenal">A cada duas semanas</option>
                    </select>
                  </label>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-semibold">
                  Início
                  <input
                    required
                    type="time"
                    value={bloqueioInicio}
                    disabled={bloqueioDiaInteiro}
                    onChange={(event) => setBloqueioInicio(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border px-3 disabled:bg-slate-100"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Fim
                  <input
                    required
                    type="time"
                    value={bloqueioFim}
                    disabled={bloqueioDiaInteiro}
                    onChange={(event) => setBloqueioFim(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border px-3 disabled:bg-slate-100"
                  />
                </label>
              </div>
              {tipoBloqueio === 'unico' && (
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={bloqueioDiaInteiro}
                    onChange={(event) => setBloqueioDiaInteiro(event.target.checked)}
                  />
                  Bloquear o dia inteiro
                </label>
              )}
              <label className="block text-sm font-semibold">
                Motivo
                <input
                  required
                  maxLength={200}
                  value={bloqueioMotivo}
                  onChange={(event) => setBloqueioMotivo(event.target.value)}
                  placeholder="Ex.: compromisso, manutenção"
                  className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="min-h-11 w-full rounded-xl bg-[#7A60B8] px-4 font-bold text-white disabled:opacity-60"
              >
                {saving ? 'Salvando…' : 'Salvar bloqueio'}
              </button>
            </form>

            <section
              className="space-y-3 rounded-2xl bg-white p-5 shadow-sm"
              aria-labelledby="lista-bloqueios-titulo"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 id="lista-bloqueios-titulo" className="text-lg font-bold">
                  Bloqueios cadastrados
                </h2>
                <button
                  type="button"
                  onClick={() => void carregarDados()}
                  className="text-sm font-semibold text-[#6C53A6]"
                >
                  Atualizar
                </button>
              </div>
              {loading ? (
                <p role="status">Carregando bloqueios…</p>
              ) : bloqueios.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Nenhum bloqueio cadastrado.
                </p>
              ) : (
                bloqueios.map((bloqueio) => (
                  <article
                    key={bloqueio.id}
                    data-testid={`bloqueio-${bloqueio.id}`}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold">{bloqueio.motivo}</p>
                      <p className="text-sm text-slate-600">
                        {dataBloqueio(bloqueio)} · {periodoBloqueio(bloqueio)}
                      </p>
                      <span
                        className={`text-xs font-bold ${bloqueio.ativo ? 'text-emerald-700' : 'text-slate-500'}`}
                      >
                        {bloqueio.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void executarAcao(
                            () => alterarStatusBloqueioAdmin(bloqueio.id, !bloqueio.ativo),
                            `Bloqueio ${bloqueio.ativo ? 'pausado' : 'ativado'}.`,
                          )
                        }
                        className="min-h-10 rounded-lg border px-3 text-xs font-bold"
                      >
                        {bloqueio.ativo ? 'Pausar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          if (window.confirm(`Excluir o bloqueio "${bloqueio.motivo}"?`)) {
                            void executarAcao(
                              () => removerBloqueioAdmin(bloqueio.id),
                              'Bloqueio removido.',
                            );
                          }
                        }}
                        className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <form
              id="form-horario-fixo"
              onSubmit={(event) => void handleSalvarHorarioFixo(event)}
              className="h-fit space-y-4 rounded-2xl bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-bold">
                {horarioEditandoId ? 'Editar horário fixo' : 'Reservar horário recorrente'}
              </h2>
              <label className="block text-sm font-semibold">
                Cliente cadastrado
                <select
                  required
                  value={clienteId}
                  disabled={Boolean(horarioEditandoId)}
                  onChange={(event) => setClienteId(event.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border px-3 disabled:bg-slate-100"
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Dia da semana
                <select
                  value={diaSemana}
                  onChange={(event) => setDiaSemana(Number(event.target.value))}
                  className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
                >
                  {NOMES_DIAS_SEMANA.map((nome, index) => (
                    <option key={nome} value={index}>
                      {nome}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-semibold">
                  Início
                  <input
                    required
                    type="time"
                    value={horaInicio}
                    onChange={(event) => setHoraInicio(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Fim
                  <input
                    required
                    type="time"
                    value={horaFim}
                    onChange={(event) => setHoraFim(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
                  />
                </label>
              </div>
              <label className="block text-sm font-semibold">
                Frequência
                <select
                  value={frequencia}
                  onChange={(event) => setFrequencia(event.target.value as FrequenciaRecorrencia)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border px-3"
                >
                  <option value="semanal">Toda semana</option>
                  <option value="quinzenal">A cada duas semanas</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-semibold">
                  Válido a partir de
                  <input
                    required
                    type="date"
                    value={dataInicio}
                    onChange={(event) => setDataInicio(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border px-2"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Até (opcional)
                  <input
                    type="date"
                    min={dataInicio}
                    value={dataFim}
                    onChange={(event) => setDataFim(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border px-2"
                  />
                </label>
              </div>
              <label className="block text-sm font-semibold">
                Observações (opcional)
                <textarea
                  maxLength={300}
                  rows={3}
                  value={observacoes}
                  onChange={(event) => setObservacoes(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border px-3 py-2"
                />
              </label>
              <div className="flex gap-2">
                {horarioEditandoId && (
                  <button
                    type="button"
                    onClick={limparFormularioFixo}
                    className="min-h-11 flex-1 rounded-xl border px-3 font-semibold"
                  >
                    Cancelar edição
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 flex-1 rounded-xl bg-[#7A60B8] px-4 font-bold text-white disabled:opacity-60"
                >
                  {saving
                    ? 'Salvando…'
                    : horarioEditandoId
                      ? 'Salvar alterações'
                      : 'Reservar horário'}
                </button>
              </div>
            </form>

            <section
              className="space-y-3 rounded-2xl bg-white p-5 shadow-sm"
              aria-labelledby="lista-horarios-fixos-titulo"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 id="lista-horarios-fixos-titulo" className="text-lg font-bold">
                  Clientes fixos
                </h2>
                <button
                  type="button"
                  onClick={() => void carregarDados()}
                  className="text-sm font-semibold text-[#6C53A6]"
                >
                  Atualizar
                </button>
              </div>
              {loading ? (
                <p role="status">Carregando reservas…</p>
              ) : horariosFixos.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Nenhum cliente possui horário fixo.
                </p>
              ) : (
                horariosFixos.map((horario) => (
                  <article
                    key={horario.id}
                    data-testid={`horario-fixo-${horario.id}`}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold">{horario.clienteNome}</p>
                      <p className="text-sm text-slate-600">
                        {NOMES_DIAS_SEMANA[horario.diaSemana]} · {horaDoRegistro(horario)} ·{' '}
                        {horario.frequencia === 'quinzenal' ? 'quinzenal' : 'semanal'}
                      </p>
                      <p className="text-xs text-slate-500">
                        A partir de{' '}
                        {new Date(`${horario.dataInicio}T12:00:00`).toLocaleDateString('pt-BR')}
                        {horario.dataFim
                          ? ` até ${new Date(`${horario.dataFim}T12:00:00`).toLocaleDateString('pt-BR')}`
                          : ''}
                      </p>
                      <span
                        className={`text-xs font-bold ${horario.ativo ? 'text-emerald-700' : 'text-slate-500'}`}
                      >
                        {horario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => iniciarEdicaoHorario(horario)}
                        className="min-h-10 rounded-lg border px-3 text-xs font-bold"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void executarAcao(
                            () =>
                              atualizarHorarioFixoAdmin({ id: horario.id, ativo: !horario.ativo }),
                            `Reserva ${horario.ativo ? 'pausada' : 'ativada'}.`,
                          )
                        }
                        className="min-h-10 rounded-lg border px-3 text-xs font-bold"
                      >
                        {horario.ativo ? 'Pausar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Excluir a reserva recorrente de ${horario.clienteNome}?`,
                            )
                          ) {
                            void executarAcao(
                              () => removerHorarioFixoAdmin(horario.id),
                              'Reserva removida.',
                            );
                          }
                        }}
                        className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
