import { useEffect, useState, useId } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuth } from '@/features/auth/auth-context';
import { getUserDisplayName } from '@/features/auth/user-display';
import { AdminNav } from '@/features/admin-dashboard/components/AdminNav';
import type { AdminSection } from '@/features/admin-dashboard/types';
import { AdminServiceFormModal } from '@/features/services/components/AdminServiceFormModal';
import {
  saveServiceToFirestore,
  subscribeToServicesFromFirestore,
  type UpsertServiceInput,
} from '@/features/services/service-firestore-repository';
import type { Service } from '@/features/services/types';

interface AgendamentoDemo {
  id: string;
  horario: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  duracao: string;
  valor: number;
  status: 'confirmado' | 'pendente' | 'concluido';
  sinalPago: boolean;
}

const AGENDAMENTOS_DEMO: AgendamentoDemo[] = [
  {
    id: 'ag-1',
    horario: '09:00 - 10:00',
    clienteNome: 'Mariana Silva',
    clienteTelefone: '(11) 98765-4321',
    servicoNome: 'Massagem Relaxante',
    duracao: '60 min',
    valor: 150,
    status: 'concluido',
    sinalPago: true,
  },
  {
    id: 'ag-2',
    horario: '10:30 - 12:00',
    clienteNome: 'Ana Carolina Santos',
    clienteTelefone: '(11) 97654-3210',
    servicoNome: 'Massagem com Pedras Quentes',
    duracao: '90 min',
    valor: 200,
    status: 'confirmado',
    sinalPago: true,
  },
  {
    id: 'ag-3',
    horario: '14:00 - 15:00',
    clienteNome: 'Juliana Lima',
    clienteTelefone: '(11) 96543-2109',
    servicoNome: 'Drenagem Linfática',
    duracao: '60 min',
    valor: 160,
    status: 'confirmado',
    sinalPago: true,
  },
  {
    id: 'ag-4',
    horario: '15:30 - 16:30',
    clienteNome: 'Carlos Eduardo',
    clienteTelefone: '(11) 95432-1098',
    servicoNome: 'Liberação Miofascial',
    duracao: '60 min',
    valor: 170,
    status: 'pendente',
    sinalPago: false,
  },
];

interface ClienteDemo {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  totalAtendimentosMes: number;
  ultimoAtendimento: string;
}

const CLIENTES_DEMO: ClienteDemo[] = [
  {
    id: 'demo-client-1',
    nome: 'Mariana Silva',
    email: 'mariana.silva@exemplo.com',
    telefone: '(11) 98765-4321',
    totalAtendimentosMes: 3,
    ultimoAtendimento: '26/09/2026',
  },
  {
    id: 'demo-client-2',
    nome: 'Ana Carolina Santos',
    email: 'ana.santos@exemplo.com',
    telefone: '(11) 97654-3210',
    totalAtendimentosMes: 2,
    ultimoAtendimento: '25/09/2026',
  },
  {
    id: 'demo-client-3',
    nome: 'Juliana Lima',
    email: 'juliana.lima@exemplo.com',
    telefone: '(11) 96543-2109',
    totalAtendimentosMes: 1,
    ultimoAtendimento: '20/09/2026',
  },
  {
    id: 'demo-client-4',
    nome: 'Carlos Eduardo',
    email: 'carlos.eduardo@exemplo.com',
    telefone: '(11) 95432-1098',
    totalAtendimentosMes: 2,
    ultimoAtendimento: '22/09/2026',
  },
];

const SERVICOS_INICIAIS: Service[] = [
  {
    id: 'srv-1',
    name: 'Massagem Relaxante',
    description: 'Massagem suave com movimentos fluidos para alívio de estresse.',
    durationMinutes: 60,
    priceInCents: 15000,
    sinalPercentual: 30,
    sinalInCents: 4500,
    category: 'Corporal',
    active: true,
    imageSrc: '',
    imageAlt: 'Massagem Relaxante',
  },
  {
    id: 'srv-2',
    name: 'Massagem com Pedras Quentes',
    description: 'Termoterapia com pedras vulcânicas aquecidas para relaxamento profundo.',
    durationMinutes: 90,
    priceInCents: 20000,
    sinalPercentual: 30,
    sinalInCents: 6000,
    category: 'Termoterapia',
    active: true,
    imageSrc: '',
    imageAlt: 'Massagem com Pedras Quentes',
  },
  {
    id: 'srv-3',
    name: 'Drenagem Linfática',
    description: 'Massagem manual suave para diminuir edemas e retenção de líquidos.',
    durationMinutes: 60,
    priceInCents: 16000,
    sinalPercentual: 30,
    sinalInCents: 4800,
    category: 'Estética/Saúde',
    active: true,
    imageSrc: '',
    imageAlt: 'Drenagem Linfática',
  },
  {
    id: 'srv-4',
    name: 'Liberação Miofascial',
    description: 'Terapia manual profunda para alívio de pontos-gatilho e tensões.',
    durationMinutes: 60,
    priceInCents: 17000,
    sinalPercentual: 30,
    sinalInCents: 5100,
    category: 'Terapêutica',
    active: true,
    imageSrc: '',
    imageAlt: 'Liberação Miofascial',
  },
  {
    id: 'srv-5',
    name: 'Aromaterapia',
    description: 'Aplicação de óleos essenciais terapêuticos com massagem suave.',
    durationMinutes: 60,
    priceInCents: 14000,
    sinalPercentual: 30,
    sinalInCents: 4200,
    category: 'Holística',
    active: true,
    imageSrc: '',
    imageAlt: 'Aromaterapia',
  },
  {
    id: 'srv-6',
    name: 'Reflexologia Podal',
    description: 'Pressão em zonas reflexas dos pés para equilíbrio do organismo.',
    durationMinutes: 45,
    priceInCents: 12000,
    sinalPercentual: 30,
    sinalInCents: 3600,
    category: 'Podal',
    active: true,
    imageSrc: '',
    imageAlt: 'Reflexologia Podal',
  },
  {
    id: 'srv-7',
    name: 'Shiatsu Tradicional',
    description: 'Terapia oriental de pressão digital ao longo dos meridianos corporais.',
    durationMinutes: 60,
    priceInCents: 18000,
    sinalPercentual: 30,
    sinalInCents: 5400,
    category: 'Oriental',
    active: true,
    imageSrc: '',
    imageAlt: 'Shiatsu Tradicional',
  },
  {
    id: 'srv-8',
    name: 'Reiki & Terapia Energética',
    description: 'Harmonização bioenergética suave para equilíbrio e serenidade.',
    durationMinutes: 50,
    priceInCents: 13000,
    sinalPercentual: 30,
    sinalInCents: 3900,
    category: 'Energética',
    active: true,
    imageSrc: '',
    imageAlt: 'Reiki & Terapia Energética',
  },
];

const VALID_SECTIONS: AdminSection[] = [
  'agenda',
  'clientes',
  'servicos',
  'relatorios',
  'configuracoes',
];

export function AdminDashboardPage() {
  const { section } = useParams<{ section?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputId = useId();

  const resolvedSection: AdminSection =
    section && VALID_SECTIONS.includes(section as AdminSection)
      ? (section as AdminSection)
      : VALID_SECTIONS.includes(searchParams.get('tab') as AdminSection)
        ? (searchParams.get('tab') as AdminSection)
        : 'agenda';

  const [activeSection, setActiveSection] = useState<AdminSection>(resolvedSection);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [modalPresencialAberto, setModalPresencialAberto] = useState(false);

  // Estados de Gerenciamento de Serviços
  const [servicos, setServicos] = useState<Service[]>(SERVICOS_INICIAIS);
  const [modalServicoAberto, setModalServicoAberto] = useState(false);
  const [servicoParaEdicao, setServicoParaEdicao] = useState<Service | null>(null);
  const [feedbackServico, setFeedbackServico] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToServicesFromFirestore(
      (novosServicos) => {
        if (novosServicos && novosServicos.length > 0) {
          setServicos(novosServicos);
        }
      },
      undefined,
      false,
    );

    return () => unsubscribe();
  }, []);

  const handleAbrirModalCadastro = () => {
    setServicoParaEdicao(null);
    setModalServicoAberto(true);
  };

  const handleAbrirModalEdicao = (servico: Service) => {
    setServicoParaEdicao(servico);
    setModalServicoAberto(true);
  };

  const handleSalvarServico = async (input: UpsertServiceInput) => {
    const salvo = await saveServiceToFirestore(input);
    setServicos((prev) => {
      const idx = prev.findIndex((s) => s.id === salvo.id);
      if (idx >= 0) {
        const atualizados = [...prev];
        atualizados[idx] = salvo;
        return atualizados;
      }
      return [salvo, ...prev];
    });
    setFeedbackServico({
      tipo: 'sucesso',
      texto: `Procedimento "${salvo.name}" ${input.id ? 'atualizado' : 'cadastrado'} com sucesso!`,
    });
  };

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleSelectSection = (section: AdminSection) => {
    setActiveSection(section);
    setSearchParams({ tab: section });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/servicos', { replace: true });
    } catch {
      navigate('/servicos', { replace: true });
    }
  };

  const clientesFiltrados = CLIENTES_DEMO.filter(
    (c) =>
      c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) ||
      c.email.toLowerCase().includes(buscaCliente.toLowerCase()) ||
      c.telefone.includes(buscaCliente),
  );

  return (
    <div className="min-h-dvh bg-[var(--color-canvas-neutral)] text-[var(--color-text-primary)]">
      {/* Top Header do Painel */}
      <header className="border-b border-[var(--color-border-default)] bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div className="hidden border-l border-[var(--color-border-default)] pl-3 sm:block">
              <span className="inline-flex items-center rounded-full bg-[var(--color-brand-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-brand-deep)]">
                Painel da Administradora
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold sm:text-sm">
                {currentUser ? getUserDisplayName(currentUser) : 'Tais Romagnoli'}
              </p>
              <span className="text-[11px] text-[var(--color-text-secondary)]">Administradora</span>
            </div>

            <Link
              to="/servicos"
              className="hidden rounded-xl border border-[var(--color-border-default)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-brand-deep)] sm:inline-block"
            >
              Ver Catálogo Público
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
                />
              </svg>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navegação Exclusiva com as 5 Áreas */}
      <AdminNav activeSection={activeSection} onSelectSection={handleSelectSection} />

      {/* Conteúdo Principal */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* SEÇÃO 1: AGENDA */}
        {activeSection === 'agenda' && (
          <section id="admin-panel-agenda" aria-labelledby="admin-tab-agenda" className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
                  Agenda de Atendimentos
                </h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Consulte os atendimentos agendados para hoje e crie novos agendamentos
                  presenciais.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalPresencialAberto(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-deep)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Novo Agendamento Presencial</span>
              </button>
            </div>

            {/* Aviso de Regra de Negócio: Presencial sem sinal */}
            <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-brand-soft)]/50 p-4 text-xs text-[var(--color-brand-deep)] sm:text-sm">
              <span className="font-bold">Regra de Produto Aplicada:</span> Agendamentos presenciais
              cadastrados pela administradora não exigem sinal obrigatório de 30%.
            </div>

            {/* Lista de Atendimentos */}
            <div className="grid gap-4">
              {AGENDAMENTOS_DEMO.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm transition-all hover:border-[var(--color-brand-deep)]/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-xs font-bold text-[var(--color-brand-deep)]">
                      {item.horario.split(' - ')[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[var(--color-text-primary)]">
                          {item.clienteNome}
                        </h3>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {item.clienteTelefone}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {item.servicoNome} • {item.duracao}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border-default)] pt-2 sm:border-0 sm:pt-0">
                    <div className="text-right sm:text-left">
                      <p className="font-bold text-[var(--color-text-primary)]">
                        R$ {item.valor.toFixed(2).replace('.', ',')}
                      </p>
                      <span className="text-[11px] text-[var(--color-text-secondary)]">
                        {item.sinalPago ? 'Sinal pago (30%)' : 'Sinal pendente/isento'}
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        item.status === 'concluido'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'confirmado'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SEÇÃO 2: CLIENTES */}
        {activeSection === 'clientes' && (
          <section
            id="admin-panel-clientes"
            aria-labelledby="admin-tab-clientes"
            className="space-y-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
                  Gestão de Clientes
                </h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Acesse dados cadastrais, histórico e fichas de avaliação de clientes cadastrados.
                </p>
              </div>

              <div className="w-full max-w-xs">
                <label htmlFor={searchInputId} className="sr-only">
                  Buscar clientes
                </label>
                <div className="relative">
                  <input
                    id={searchInputId}
                    type="text"
                    placeholder="Buscar por nome ou telefone..."
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2 pl-9 text-sm focus:border-[var(--color-brand-deep)] focus:outline-none"
                  />
                  <svg
                    aria-hidden="true"
                    className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-secondary)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {clientesFiltrados.map((cliente) => {
                const isRecorrente = cliente.totalAtendimentosMes >= 2;
                return (
                  <div
                    key={cliente.id}
                    className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[var(--color-text-primary)]">
                          {cliente.nome}
                        </h3>
                        {isRecorrente && (
                          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                            Cliente Recorrente
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)] sm:text-sm">
                        {cliente.email} • {cliente.telefone}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        Atendimentos este mês:{' '}
                        <strong className="text-[var(--color-text-primary)]">
                          {cliente.totalAtendimentosMes}
                        </strong>{' '}
                        • Último atendimento: {cliente.ultimoAtendimento}
                      </p>
                    </div>

                    <Link
                      to={`/admin/clientes/${cliente.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-brand-deep)] bg-white px-4 py-2 text-xs font-bold text-[var(--color-brand-deep)] transition-colors hover:bg-[var(--color-brand-soft)]"
                    >
                      <span>Ver Ficha Completa</span>
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SEÇÃO 3: SERVIÇOS */}
        {activeSection === 'servicos' && (
          <section
            id="admin-panel-servicos"
            aria-labelledby="admin-tab-servicos"
            className="space-y-6"
          >
            {feedbackServico && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm"
              >
                <span>{feedbackServico.texto}</span>
                <button
                  type="button"
                  onClick={() => setFeedbackServico(null)}
                  className="ml-4 text-xs font-bold text-emerald-700 hover:text-emerald-950"
                >
                  Fechar
                </button>
              </div>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
                  Serviços e Procedimentos
                </h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Catálogo administrativo dos procedimentos com valores, durações, sinal de reserva
                  e edição completa.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleAbrirModalCadastro}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-deep)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-brand-dark)]"
                >
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Novo Serviço</span>
                </button>

                <Link
                  to="/servicos"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-canvas-neutral)]"
                >
                  <span>Visualizar como Cliente</span>
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {servicos.map((servico) => {
                const precoEmReais = servico.priceInCents / 100;
                const sinalEmReais =
                  (servico.sinalInCents ?? Math.round(servico.priceInCents * 0.3)) / 100;
                const percentualSinal =
                  servico.sinalPercentual ??
                  (precoEmReais > 0 ? Math.round((sinalEmReais / precoEmReais) * 100) : 30);

                return (
                  <div
                    key={servico.id}
                    className="flex flex-col justify-between rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-md bg-[var(--color-brand-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand-deep)]">
                          {servico.category || 'Corporal'}
                        </span>
                        {servico.active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                            Inativo
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 font-bold text-[var(--color-text-primary)]">
                        {servico.name}
                      </h3>

                      {servico.description && (
                        <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                          {servico.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 border-t border-[var(--color-border-default)] pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-text-secondary)]">
                          {servico.durationMinutes} min
                        </span>
                        <strong className="text-base text-[var(--color-brand-deep)]">
                          R$ {precoEmReais.toFixed(2).replace('.', ',')}
                        </strong>
                      </div>

                      {/* Sinal de Reserva */}
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-[var(--color-canvas-neutral)] px-2.5 py-1.5 text-xs">
                        <span className="text-[var(--color-text-secondary)]">
                          Sinal de reserva:
                        </span>
                        <span className="font-semibold text-[var(--color-brand-deep)]">
                          R$ {sinalEmReais.toFixed(2).replace('.', ',')} ({percentualSinal}%)
                        </span>
                      </div>

                      {/* Ações */}
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleAbrirModalEdicao(servico)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-canvas-neutral)] hover:text-[var(--color-brand-deep)]"
                        >
                          <svg
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SEÇÃO 4: RELATÓRIOS (8 INDICADORES DE PRODUTO) */}
        {activeSection === 'relatorios' && (
          <section
            id="admin-panel-relatorios"
            aria-labelledby="admin-tab-relatorios"
            className="space-y-6"
          >
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
                Relatórios e Indicadores Administrativos
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Acompanhamento dos 8 indicadores consolidados da clínica conforme diretrizes de
                produto.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Indicador 1 */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  1. Agendamentos do Dia
                </span>
                <p className="mt-2 text-2xl font-black text-[var(--color-text-primary)]">6</p>
                <p className="mt-1 text-xs text-emerald-600 font-medium">
                  4 concluídos, 2 pendentes
                </p>
              </div>

              {/* Indicador 2 */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  2. Clientes Cadastrados
                </span>
                <p className="mt-2 text-2xl font-black text-[var(--color-text-primary)]">148</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  +12 novos neste mês
                </p>
              </div>

              {/* Indicador 3 */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  3. Clientes Recorrentes
                </span>
                <p className="mt-2 text-2xl font-black text-[var(--color-brand-deep)]">32</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  ≥ 2 atendimentos no mesmo mês
                </p>
              </div>

              {/* Indicador 4 */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  4. Atendimentos no Mês
                </span>
                <p className="mt-2 text-2xl font-black text-[var(--color-text-primary)]">74</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Sessões concluídas
                </p>
              </div>

              {/* Indicador 5 */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  5. Cancelamentos e Faltas
                </span>
                <p className="mt-2 text-2xl font-black text-amber-600">3 / 1</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  3 com aviso ≥ 3h, 1 falta
                </p>
              </div>

              {/* Indicador 6 */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  6. Ocupação da Agenda
                </span>
                <p className="mt-2 text-2xl font-black text-[var(--color-text-primary)]">82%</p>
                <p className="mt-1 text-xs text-emerald-600 font-medium">
                  Meta mensal de 80% superada
                </p>
              </div>

              {/* Indicador 7 */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  7. Valores Recebidos e Previstos
                </span>
                <p className="mt-2 text-xl font-black text-[var(--color-text-primary)]">R$ 8.940</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  R$ 3.830 previstos (sinal 30% retido)
                </p>
              </div>

              {/* Indicador 8 */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  8. Serviço Mais Agendado
                </span>
                <p className="mt-2 text-lg font-bold text-[var(--color-brand-deep)]">
                  Massagem Relaxante
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  38 atendimentos realizados
                </p>
              </div>
            </div>
          </section>
        )}

        {/* SEÇÃO 5: CONFIGURAÇÕES */}
        {activeSection === 'configuracoes' && (
          <section
            id="admin-panel-configuracoes"
            aria-labelledby="admin-tab-configuracoes"
            className="space-y-6"
          >
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
                Configurações da Clínica
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Gerencie regras operacionais, horários de atendimento e parâmetros gerais.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Card Destaque: Horários de Funcionamento */}
              <div className="rounded-2xl border border-[var(--color-brand-deep)]/20 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
                  <svg
                    aria-hidden="true"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-bold text-[var(--color-text-primary)]">
                  Horários de Funcionamento e Manutenção
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Configure dias de atendimento da semana, horário de abertura e fechamento, e
                  intervalos de manutenção para descanso ou limpeza.
                </p>

                <div className="mt-6">
                  <Link
                    to="/admin/horarios"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-deep)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
                  >
                    <span>Abrir Gestor de Horários</span>
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Card Parâmetros do Negócio */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                  Parâmetros de Operação Vigentes
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Políticas consolidadas no documento de produto da clínica:
                </p>

                <dl className="mt-4 divide-y divide-[var(--color-border-default)] text-sm">
                  <div className="flex justify-between py-2.5">
                    <dt className="text-[var(--color-text-secondary)]">
                      Sinal obrigatório para cliente
                    </dt>
                    <dd className="font-semibold text-[var(--color-text-primary)]">30%</dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-[var(--color-text-secondary)]">
                      Antecedência mínima cancelamento
                    </dt>
                    <dd className="font-semibold text-[var(--color-text-primary)]">3 horas</dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-[var(--color-text-secondary)]">
                      Intervalo padrão entre sessões
                    </dt>
                    <dd className="font-semibold text-[var(--color-text-primary)]">30 minutos</dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-[var(--color-text-secondary)]">Critério de recorrência</dt>
                    <dd className="font-semibold text-[var(--color-text-primary)]">
                      ≥ 2 atendimentos/mês
                    </dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-[var(--color-text-secondary)]">Dias de folga padrão</dt>
                    <dd className="font-semibold text-[var(--color-text-primary)]">
                      Terças e Domingos
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modal Demonstrativo para Agendamento Presencial */}
      {modalPresencialAberto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
              Novo Agendamento Presencial
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Cadastre um atendimento feito no balcão da clínica. Não há exigência de sinal de 30%
              nesta modalidade.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setModalPresencialAberto(false);
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  className="mt-1 w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm focus:border-[var(--color-brand-deep)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                  Procedimento
                </label>
                <select className="mt-1 w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden">
                  {servicos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — R$ {(s.priceInCents / 100).toFixed(2).replace('.', ',')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalPresencialAberto(false)}
                  className="rounded-xl border border-[var(--color-border-default)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-canvas-neutral)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--color-brand-deep)] px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro e Edição de Serviços */}
      <AdminServiceFormModal
        isOpen={modalServicoAberto}
        onClose={() => setModalServicoAberto(false)}
        serviceToEdit={servicoParaEdicao}
        onSave={handleSalvarServico}
      />
    </div>
  );
}
