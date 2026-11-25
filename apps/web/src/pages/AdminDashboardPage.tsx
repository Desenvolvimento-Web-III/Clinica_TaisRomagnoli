import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  avaliarBloqueioContraindicacao,
  MENSAGEM_BLOQUEIO_CONTRAINDICACAO,
  MENSAGEM_ERRO_DATA_PASSADA,
  verificarDataHoraNoPassado,
  type Agendamento as SharedAgendamento,
  type ResultadoAvaliacaoContraindicacao,
} from '@clinica/shared';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuth } from '@/features/auth/auth-context';
import { getUserDisplayName } from '@/features/auth/user-display';
import { AdminNav } from '@/features/admin-dashboard/components/AdminNav';
import type { AdminSection } from '@/features/admin-dashboard/types';
import { AdminServiceFormModal } from '@/features/services/components/AdminServiceFormModal';
import { AdminServicesList } from '@/features/services/components/AdminServicesList';
import {
  saveServiceToFirestore,
  subscribeToServicesFromFirestore,
  syncMissingDefaultServicesToFirestore,
  toggleServiceStatus,
  type UpsertServiceInput,
} from '@/features/services/service-firestore-repository';
import type { Service } from '@/features/services/types';
import { AdminConfiguracoesGerais } from '@/features/admin-dashboard/components/AdminConfiguracoesGerais';
import { AdminClientsList } from '@/features/admin-dashboard/components/AdminClientsList';
import { AdminIndicadoresOperacionais } from '@/features/admin-dashboard/components/AdminIndicadoresOperacionais';
import { AdminRelatoriosSection } from '@/features/admin-dashboard/components/AdminRelatoriosSection';
import { AdminFilaLembretesWhatsApp } from '@/features/admin-dashboard/components/AdminFilaLembretesWhatsApp';
import { AdminAgendaCalendario } from '@/features/admin-dashboard/components/AdminAgendaCalendario';
import { carregarLembretesEnviadosStorage } from '@/features/admin-dashboard/utils/whatsapp-reminders';
import {
  atualizarStatusAgendamentoBackend,
  buscarAgendamentosAdmin,
  buscarAgendamentosAdminDoDia,
  alterarAgendamentoBackend,
  criarAgendamentoFirestore,
} from '@/services/agendamentos-service';
import { obterFichaAnamneseApi } from '@/services/anamnese-service';
import { buscarClientesAdmin } from '@/services/clientes-admin-service';
import {
  consultarPainelIndicadoresAdmin,
  PAINEL_INDICADORES_PADRAO,
} from '@/services/indicadores-admin-service';
import type { PainelIndicadores } from '@clinica/shared';
import type { AdminClientListItem } from '@/features/admin-dashboard/types';

interface AgendamentoAgendaItem {
  id: string;
  clienteId?: string;
  horario: string;
  clienteNome: string;
  clienteTelefone: string;
  clienteEmail: string;
  servicoNome: string;
  duracao: string;
  valor: number;
  status:
    'confirmado' | 'pendente' | 'concluido' | 'cancelado' | 'em_andamento' | 'reagendado' | 'falta';
  sinalPago: boolean;
}

function mapSharedAgendamentoToAgendaItem(item: SharedAgendamento): AgendamentoAgendaItem {
  const inicio = new Date(item.dataHoraInicio);
  const fim = new Date(item.dataHoraFim);
  const horaInicio = Number.isNaN(inicio.getTime())
    ? '09:00'
    : inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const horaFim = Number.isNaN(fim.getTime())
    ? '10:00'
    : fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return {
    id: item.id,
    clienteId: item.clienteId,
    horario: `${horaInicio} - ${horaFim}`,
    clienteNome: item.clienteNome || 'Cliente presencial',
    clienteTelefone: item.clienteTelefone || '—',
    clienteEmail: item.clienteEmail || '—',
    servicoNome: item.servicoNome,
    duracao: `${item.duracaoMinutos} min`,
    valor: item.valorTotalEmCentavos / 100,
    status: item.status,
    sinalPago: !item.sinalIsento && item.valorSinalEmCentavos > 0,
  };
}

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
    active: false,
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

function obterDataHoraPresencialInicial(): string {
  const agora = new Date();
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  const ano = amanha.getFullYear();
  const mes = String(amanha.getMonth() + 1).padStart(2, '0');
  const dia = String(amanha.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T10:00`;
}

function formatarDataHoraLocalInput(dataIso: string): string {
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return obterDataHoraPresencialInicial();
  const offset = data.getTimezoneOffset() * 60_000;
  return new Date(data.getTime() - offset).toISOString().slice(0, 16);
}

export function AdminDashboardPage() {
  const { section } = useParams<{ section?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const isLembretesRoute = section === 'lembretes' || searchParams.get('tab') === 'lembretes';

  const resolvedSection: AdminSection = isLembretesRoute
    ? 'agenda'
    : section && VALID_SECTIONS.includes(section as AdminSection)
      ? (section as AdminSection)
      : VALID_SECTIONS.includes(searchParams.get('tab') as AdminSection)
        ? (searchParams.get('tab') as AdminSection)
        : 'agenda';

  const [activeSection, setActiveSection] = useState<AdminSection>(resolvedSection);
  const [agendaSubView, setAgendaSubView] = useState<'lista' | 'calendario' | 'lembretes'>(
    isLembretesRoute || searchParams.get('sub') === 'lembretes' ? 'lembretes' : 'lista',
  );
  const [modalPresencialAberto, setModalPresencialAberto] = useState(false);
  const [agendamentoParaEdicao, setAgendamentoParaEdicao] = useState<SharedAgendamento | null>(
    null,
  );
  const [motivoAlteracao, setMotivoAlteracao] = useState('');

  // Estados da Agenda e Agendamento Presencial
  const [agendaItems, setAgendaItems] = useState<AgendamentoAgendaItem[]>([]);
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(true);
  const [erroAgenda, setErroAgenda] = useState<string | null>(null);
  const [agendamentosRelatorio, setAgendamentosRelatorio] = useState<SharedAgendamento[]>([]);
  const [isLoadingRelatorio, setIsLoadingRelatorio] = useState(true);
  const [erroAgendamentosRelatorio, setErroAgendamentosRelatorio] = useState<string | null>(null);
  const [confirmingAgendaId, setConfirmingAgendaId] = useState<string | null>(null);
  const [agendaFeedback, setAgendaFeedback] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
    clienteId?: string;
  } | null>(null);
  const [presencialClienteId, setPresencialClienteId] = useState('');
  const [presencialServicoId, setPresencialServicoId] = useState(
    SERVICOS_INICIAIS[0]?.id ?? 'srv-1',
  );
  const [presencialDataHora, setPresencialDataHora] = useState(obterDataHoraPresencialInicial);
  const [presencialIsencaoSinal, setPresencialIsencaoSinal] = useState(true);
  const [presencialAvaliacaoBloqueio, setPresencialAvaliacaoBloqueio] =
    useState<ResultadoAvaliacaoContraindicacao | null>(null);
  const [presencialErro, setPresencialErro] = useState<string | null>(null);
  const [submittingPresencial, setSubmittingPresencial] = useState(false);

  // Estados de Gerenciamento de Clientes
  const [clientes, setClientes] = useState<AdminClientListItem[]>([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
  const [erroClientes, setErroClientes] = useState<string | null>(null);

  // Estados dos 8 Indicadores do Painel Administrativo
  const [painelIndicadores, setPainelIndicadores] =
    useState<PainelIndicadores>(PAINEL_INDICADORES_PADRAO);

  const lembretesPendentesCount = useMemo(() => {
    const salvos = carregarLembretesEnviadosStorage();
    return agendaItems.filter(
      (ag) => ag.status !== 'cancelado' && ag.status !== 'falta' && !salvos[ag.id],
    ).length;
  }, [agendaItems]);

  const carregarClientes = useCallback(async () => {
    setIsLoadingClientes(true);
    setErroClientes(null);
    try {
      const lista = await buscarClientesAdmin();
      setClientes(lista);
    } catch (error) {
      setClientes([]);
      setErroClientes(
        error instanceof Error ? error.message : 'Não foi possível carregar os clientes.',
      );
    } finally {
      setIsLoadingClientes(false);
    }
  }, []);

  const carregarAgendaDoDia = useCallback(async () => {
    setIsLoadingAgenda(true);
    setErroAgenda(null);
    try {
      const lista = await buscarAgendamentosAdminDoDia();
      setAgendaItems(lista.map(mapSharedAgendamentoToAgendaItem));
    } catch (error) {
      setAgendaItems([]);
      setErroAgenda(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os agendamentos do dia.',
      );
    } finally {
      setIsLoadingAgenda(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    void buscarClientesAdmin()
      .then((lista) => {
        if (ativo) {
          setClientes(lista);
          setErroClientes(null);
        }
      })
      .catch((error: unknown) => {
        if (ativo) {
          setClientes([]);
          setErroClientes(
            error instanceof Error ? error.message : 'Não foi possível carregar os clientes.',
          );
        }
      })
      .finally(() => {
        if (ativo) setIsLoadingClientes(false);
      });
    void buscarAgendamentosAdminDoDia()
      .then((lista) => {
        if (ativo) {
          setAgendaItems(lista.map(mapSharedAgendamentoToAgendaItem));
          setErroAgenda(null);
        }
      })
      .catch((error: unknown) => {
        if (ativo) {
          setAgendaItems([]);
          setErroAgenda(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os agendamentos do dia.',
          );
        }
      })
      .finally(() => {
        if (ativo) setIsLoadingAgenda(false);
      });
    void buscarAgendamentosAdmin()
      .then((lista) => {
        if (ativo) {
          setAgendamentosRelatorio(lista);
        }
      })
      .catch((error: unknown) => {
        if (ativo) {
          setErroAgendamentosRelatorio(
            error instanceof Error ? error.message : 'Não foi possível carregar a agenda.',
          );
        }
      })
      .finally(() => {
        if (ativo) setIsLoadingRelatorio(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    if (activeSection === 'agenda' || activeSection === 'relatorios') {
      void consultarPainelIndicadoresAdmin().then((dados) => {
        if (ativo && dados) {
          setPainelIndicadores(dados);
        }
      });
    }
    return () => {
      ativo = false;
    };
  }, [activeSection]);

  // Estados de Gerenciamento de Serviços
  const [servicos, setServicos] = useState<Service[]>(SERVICOS_INICIAIS);
  const [modalServicoAberto, setModalServicoAberto] = useState(false);
  const [servicoParaEdicao, setServicoParaEdicao] = useState<Service | null>(null);
  const [feedbackServico, setFeedbackServico] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  useEffect(() => {
    void syncMissingDefaultServicesToFirestore();

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

  const handleAlternarStatusServico = async (servico: Service) => {
    try {
      const novoStatus = !servico.active;
      const servicoAtualizado = await toggleServiceStatus(servico);
      setServicos((prev) => {
        const idx = prev.findIndex((s) => s.id === servicoAtualizado.id);
        if (idx >= 0) {
          const atualizados = [...prev];
          atualizados[idx] = servicoAtualizado;
          return atualizados;
        }
        return [servicoAtualizado, ...prev];
      });
      setFeedbackServico({
        tipo: 'sucesso',
        texto: `Serviço "${servico.name}" foi ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`,
      });
    } catch {
      setFeedbackServico({
        tipo: 'erro',
        texto: `Não foi possível alterar o status do serviço "${servico.name}".`,
      });
    }
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

  const handleAbrirModalPresencial = () => {
    setAgendamentoParaEdicao(null);
    setMotivoAlteracao('');
    setPresencialErro(null);
    setPresencialAvaliacaoBloqueio(null);
    setPresencialClienteId('');
    setPresencialServicoId(servicos[0]?.id ?? 'srv-1');
    setPresencialDataHora(obterDataHoraPresencialInicial());
    setPresencialIsencaoSinal(true);
    setModalPresencialAberto(true);
  };

  const handleAbrirEdicaoAgendamento = (agendamento: SharedAgendamento) => {
    if (agendamento.status === 'cancelado' || agendamento.status === 'concluido') return;
    setPresencialErro(null);
    setAgendamentoParaEdicao(agendamento);
    setMotivoAlteracao('');
    setPresencialClienteId(agendamento.clienteId);
    setPresencialServicoId(agendamento.servicoId);
    setPresencialDataHora(formatarDataHoraLocalInput(agendamento.dataHoraInicio));
    setPresencialIsencaoSinal(agendamento.sinalIsento);
    setModalPresencialAberto(true);
  };

  const handleSelecionarClientePresencial = async (selectedId: string) => {
    setPresencialClienteId(selectedId);
    setPresencialErro(null);
    setPresencialAvaliacaoBloqueio(null);

    if (!selectedId) {
      return;
    }

    const fichaRes = await obterFichaAnamneseApi(selectedId);
    if (fichaRes.sucesso && fichaRes.dados) {
      setPresencialAvaliacaoBloqueio(avaliarBloqueioContraindicacao(fichaRes.dados));
    }
  };

  const handleConfirmarAgendamentoAgenda = async (item: AgendamentoAgendaItem) => {
    setAgendaFeedback(null);
    setConfirmingAgendaId(item.id);

    try {
      if (item.clienteId) {
        const fichaRes = await obterFichaAnamneseApi(item.clienteId);
        if (fichaRes.sucesso && fichaRes.dados) {
          const avaliacao = avaliarBloqueioContraindicacao(fichaRes.dados);
          if (avaliacao.bloqueado) {
            setAgendaFeedback({
              tipo: 'erro',
              texto: avaliacao.motivoBloqueio || MENSAGEM_BLOQUEIO_CONTRAINDICACAO,
              clienteId: item.clienteId,
            });
            return;
          }
        }
      }

      const resposta = await atualizarStatusAgendamentoBackend({
        agendamentoId: item.id,
        novoStatus: 'confirmado',
      });

      if (!resposta.sucesso) {
        setAgendaFeedback({
          tipo: 'erro',
          texto: resposta.erro || 'Não foi possível confirmar o agendamento.',
          clienteId: item.clienteId,
        });
        return;
      }

      setAgendaItems((prev) =>
        prev.map((ag) => (ag.id === item.id ? { ...ag, status: 'confirmado' } : ag)),
      );
      setAgendaFeedback({
        tipo: 'sucesso',
        texto: `Agendamento de ${item.clienteNome} confirmado com sucesso.`,
      });
    } finally {
      setConfirmingAgendaId(null);
    }
  };

  const handleCriarAgendamentoPresencial = async (e: FormEvent) => {
    e.preventDefault();
    setPresencialErro(null);

    if (
      !agendamentoParaEdicao &&
      presencialIsencaoSinal &&
      presencialAvaliacaoBloqueio?.bloqueado
    ) {
      setPresencialErro(
        presencialAvaliacaoBloqueio.motivoBloqueio || MENSAGEM_BLOQUEIO_CONTRAINDICACAO,
      );
      return;
    }

    const servicoSelecionado =
      servicos.find((s) => s.id === presencialServicoId) ?? servicos[0] ?? SERVICOS_INICIAIS[0]!;
    const dataSelecionada = new Date(presencialDataHora);
    const dataHoraNormalizada = Number.isNaN(dataSelecionada.getTime())
      ? ''
      : dataSelecionada.toISOString();

    if (!dataHoraNormalizada || verificarDataHoraNoPassado(dataHoraNormalizada)) {
      setPresencialErro(MENSAGEM_ERRO_DATA_PASSADA);
      return;
    }

    const clienteSelecionado = clientes.find((cliente) => cliente.id === presencialClienteId);
    if (!clienteSelecionado) {
      setPresencialErro('Selecione um cliente cadastrado para criar o agendamento.');
      return;
    }

    setSubmittingPresencial(true);
    try {
      if (agendamentoParaEdicao) {
        const resposta = await alterarAgendamentoBackend({
          agendamentoId: agendamentoParaEdicao.id,
          novaDataHoraInicio: dataHoraNormalizada,
          motivo: motivoAlteracao.trim() || undefined,
        });
        if (!resposta.sucesso || !resposta.dados) {
          setPresencialErro(resposta.erro || 'Não foi possível reagendar o atendimento.');
          return;
        }
        setAgendamentosRelatorio((anteriores) =>
          anteriores.map((item) => (item.id === resposta.dados!.id ? resposta.dados! : item)),
        );
        await carregarAgendaDoDia();
        setAgendaFeedback({
          tipo: 'sucesso',
          texto: `Agendamento de ${resposta.dados.clienteNome} atualizado para ${new Date(resposta.dados.dataHoraInicio).toLocaleString('pt-BR')}.`,
        });
        setModalPresencialAberto(false);
        setAgendamentoParaEdicao(null);
        return;
      }

      const resposta = await criarAgendamentoFirestore(
        {
          clienteId: clienteSelecionado.id,
          servicoId: servicoSelecionado.id,
          servicoNome: servicoSelecionado.name,
          duracaoMinutos: servicoSelecionado.durationMinutes,
          valorTotalEmCentavos: servicoSelecionado.priceInCents,
          dataHoraInicio: dataHoraNormalizada,
          metodoPagamento: 'presencial',
          profissionalId: 'prof-tais-romagnoli',
          profissionalNome: 'Tais Romagnoli',
          isencaoSinalAdmin: presencialIsencaoSinal,
        },
        clienteSelecionado.id,
      );

      if (!resposta.sucesso || !resposta.dados) {
        setPresencialErro(
          resposta.erro || 'Não foi possível salvar o agendamento no banco de dados.',
        );
        return;
      }

      setAgendamentosRelatorio((prev) => [resposta.dados!, ...prev]);
      await carregarAgendaDoDia();
      setAgendaFeedback({
        tipo: 'sucesso',
        texto: `Agendamento presencial de ${clienteSelecionado.nome} salvo no banco de dados.`,
      });
      setModalPresencialAberto(false);
    } finally {
      setSubmittingPresencial(false);
    }
  };

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
              className="hidden rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-zinc-100 hover:text-zinc-950 hover:border-zinc-300 sm:inline-block"
            >
              Ver Catálogo Público
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 hover:text-red-900 hover:border-red-300"
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

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  data-testid="toggle-fila-lembretes-btn"
                  onClick={() =>
                    setAgendaSubView(agendaSubView === 'lembretes' ? 'lista' : 'lembretes')
                  }
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold shadow-sm transition-all ${
                    agendaSubView === 'lembretes'
                      ? 'border-[var(--color-brand-deep)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <svg className="h-4 w-4 fill-current text-emerald-600" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>
                    {agendaSubView === 'lembretes'
                      ? 'Ver Atendimentos da Agenda'
                      : 'Fila de Lembretes WhatsApp'}
                  </span>
                  {lembretesPendentesCount > 0 && agendaSubView !== 'lembretes' && (
                    <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {lembretesPendentesCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleAbrirModalPresencial}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-deep)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-brand-dark)] active:bg-[var(--color-brand-darker)]"
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
            </div>

            {/* Sub-navegação interna da Agenda */}
            <div className="flex flex-wrap border-b border-[var(--color-border-default)]">
              <button
                type="button"
                onClick={() => setAgendaSubView('lista')}
                className={`border-b-2 px-4 py-2 text-xs font-bold transition-all ${
                  agendaSubView === 'lista'
                    ? 'border-[var(--color-brand-deep)] text-[var(--color-brand-deep)]'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Atendimentos de Hoje ({agendaItems.length})
              </button>
              <button
                type="button"
                data-testid="tab-calendario-agenda"
                onClick={() => setAgendaSubView('calendario')}
                className={`border-b-2 px-4 py-2 text-xs font-bold transition-all ${
                  agendaSubView === 'calendario'
                    ? 'border-[var(--color-brand-deep)] text-[var(--color-brand-deep)]'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Calendário
              </button>
              <button
                type="button"
                data-testid="tab-fila-lembretes-whatsapp"
                onClick={() => setAgendaSubView('lembretes')}
                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition-all ${
                  agendaSubView === 'lembretes'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-emerald-700'
                }`}
              >
                <span>Fila de Lembretes WhatsApp</span>
                {lembretesPendentesCount > 0 && (
                  <span className="rounded-full border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    {lembretesPendentesCount} pendentes
                  </span>
                )}
              </button>
            </div>

            {agendaSubView === 'lembretes' ? (
              <AdminFilaLembretesWhatsApp
                agendamentos={agendaItems}
                onVoltarAgenda={() => setAgendaSubView('lista')}
              />
            ) : agendaSubView === 'calendario' ? (
              <>
                {agendaFeedback && (
                  <div
                    role={agendaFeedback.tipo === 'erro' ? 'alert' : 'status'}
                    data-testid="agenda-feedback-banner"
                    className={`rounded-2xl border p-4 text-sm font-medium ${
                      agendaFeedback.tipo === 'erro'
                        ? 'border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]'
                        : 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
                    }`}
                  >
                    {agendaFeedback.texto}
                  </div>
                )}
                <AdminAgendaCalendario
                  agendamentos={agendamentosRelatorio}
                  isLoading={isLoadingRelatorio}
                  error={erroAgendamentosRelatorio}
                  onEditAppointment={handleAbrirEdicaoAgendamento}
                  onRefresh={() => {
                    setIsLoadingRelatorio(true);
                    setErroAgendamentosRelatorio(null);
                    void buscarAgendamentosAdmin()
                      .then(setAgendamentosRelatorio)
                      .catch((error: unknown) =>
                        setErroAgendamentosRelatorio(
                          error instanceof Error
                            ? error.message
                            : 'Não foi possível carregar a agenda.',
                        ),
                      )
                      .finally(() => setIsLoadingRelatorio(false));
                  }}
                />
              </>
            ) : (
              <>
                {/* Indicadores Operacionais */}
                <AdminIndicadoresOperacionais indicadores={painelIndicadores.indicadores} />

                {/* Aviso de Regra de Negócio: Presencial sem sinal */}
                <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-brand-soft)]/50 p-4 text-xs text-[var(--color-brand-deep)] sm:text-sm">
                  <span className="font-bold">Regra de Produto Aplicada:</span> Agendamentos
                  presenciais cadastrados pela administradora não exigem sinal obrigatório de 30%.
                </div>

                <section aria-labelledby="agenda-do-dia-titulo" className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2
                        id="agenda-do-dia-titulo"
                        className="text-lg font-bold text-[var(--color-text-primary)]"
                      >
                        Agenda do dia
                      </h2>
                      <p className="text-sm capitalize text-[var(--color-text-secondary)]">
                        {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void carregarAgendaDoDia()}
                      disabled={isLoadingAgenda}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-brand-deep)] shadow-sm hover:bg-[var(--color-brand-soft)] disabled:cursor-wait disabled:opacity-60"
                    >
                      {isLoadingAgenda ? 'Atualizando…' : 'Atualizar agenda'}
                    </button>
                  </div>

                  {isLoadingAgenda ? (
                    <p
                      role="status"
                      className="rounded-2xl border bg-white p-6 text-center text-sm"
                    >
                      Carregando agendamentos do dia…
                    </p>
                  ) : erroAgenda ? (
                    <div
                      role="alert"
                      className="flex flex-col gap-3 rounded-2xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-4 text-sm text-[var(--color-error-text)] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p>{erroAgenda}</p>
                      <button
                        type="button"
                        onClick={() => void carregarAgendaDoDia()}
                        className="font-semibold underline underline-offset-4"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ) : agendaItems.length === 0 ? (
                    <p
                      data-testid="agenda-do-dia-vazia"
                      className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-white p-6 text-center text-sm text-[var(--color-text-secondary)]"
                    >
                      Nenhum agendamento cadastrado para hoje.
                    </p>
                  ) : (
                    <>
                      {agendaFeedback && (
                        <div
                          role={agendaFeedback.tipo === 'erro' ? 'alert' : 'status'}
                          data-testid="agenda-feedback-banner"
                          className={`flex flex-col gap-3 rounded-2xl border p-4 text-xs/5 sm:flex-row sm:items-center sm:justify-between sm:text-sm/6 ${
                            agendaFeedback.tipo === 'erro'
                              ? 'border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]'
                              : 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
                          }`}
                        >
                          <div className="space-y-1 font-medium">
                            <p>{agendaFeedback.texto}</p>
                            {agendaFeedback.clienteId && (
                              <Link
                                to={`/admin/clientes/${agendaFeedback.clienteId}`}
                                className="inline-block font-semibold underline underline-offset-4"
                              >
                                Revisar ficha e liberação médica
                              </Link>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setAgendaFeedback(null)}
                            className="self-start text-xs font-bold underline-offset-4 hover:underline sm:self-center"
                          >
                            Fechar
                          </button>
                        </div>
                      )}

                      {/* Lista de Atendimentos */}
                      <div className="grid gap-4">
                        {agendaItems.map((item) => (
                          <div
                            key={item.id}
                            data-testid={`agenda-item-${item.id}`}
                            className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm transition-all hover:border-[var(--color-brand-deep)]/40 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-xs font-bold text-[var(--color-brand-deep)]">
                                {item.horario.split(' - ')[0]}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <h3 className="font-bold text-[var(--color-text-primary)]">
                                    {item.clienteNome}
                                  </h3>
                                  <span className="text-xs text-[var(--color-text-secondary)]">
                                    {item.clienteTelefone}
                                  </span>
                                  <span className="text-xs text-[var(--color-text-secondary)]">
                                    {item.clienteEmail}
                                  </span>
                                </div>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                  {item.servicoNome} • {item.duracao}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-2 sm:border-0 sm:pt-0">
                              <div className="text-right sm:text-left">
                                <p className="font-bold text-[var(--color-text-primary)]">
                                  R$ {item.valor.toFixed(2).replace('.', ',')}
                                </p>
                                <span className="text-[11px] text-[var(--color-text-secondary)]">
                                  {item.sinalPago ? 'Sinal pago (30%)' : 'Sinal pendente/isento'}
                                </span>
                              </div>

                              {item.status === 'pendente' && (
                                <button
                                  type="button"
                                  data-testid={`confirmar-agendamento-btn-${item.id}`}
                                  disabled={confirmingAgendaId === item.id}
                                  onClick={() => void handleConfirmarAgendamentoAgenda(item)}
                                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-brand-strong)] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-deep)] disabled:cursor-wait disabled:opacity-60"
                                >
                                  {confirmingAgendaId === item.id
                                    ? 'Confirmando…'
                                    : 'Confirmar agendamento'}
                                </button>
                              )}

                              {item.status !== 'cancelado' && item.status !== 'concluido' && (
                                <button
                                  type="button"
                                  data-testid={`editar-agendamento-agenda-${item.id}`}
                                  onClick={() => {
                                    const agendamento = agendamentosRelatorio.find(
                                      (registro) => registro.id === item.id,
                                    );
                                    if (agendamento) handleAbrirEdicaoAgendamento(agendamento);
                                  }}
                                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border-default)] px-3.5 py-2 text-xs font-semibold text-[var(--color-brand-deep)] hover:bg-[var(--color-brand-soft)]"
                                >
                                  Editar / reagendar
                                </button>
                              )}

                              <button
                                type="button"
                                data-testid={`enviar-lembrete-rapido-btn-${item.id}`}
                                onClick={() => setAgendaSubView('lembretes')}
                                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                                title="Abrir mensagem de lembrete no WhatsApp"
                              >
                                <svg
                                  className="h-3.5 w-3.5 fill-current text-emerald-600"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                </svg>
                                <span>Lembrete</span>
                              </button>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                                  item.status === 'concluido'
                                    ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
                                    : item.status === 'confirmado'
                                      ? 'border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]'
                                      : item.status === 'cancelado' || item.status === 'falta'
                                        ? 'border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]'
                                        : 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]'
                                }`}
                              >
                                {item.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {/* SEÇÃO 2: CLIENTES */}
        {activeSection === 'clientes' && (
          <section id="admin-panel-clientes" aria-labelledby="admin-tab-clientes">
            <AdminClientsList
              clients={clientes}
              isLoading={isLoadingClientes}
              error={erroClientes}
              onRefresh={carregarClientes}
            />
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

            <AdminServicesList
              services={servicos}
              onEditService={handleAbrirModalEdicao}
              onToggleStatus={handleAlternarStatusServico}
              onNewService={handleAbrirModalCadastro}
            />
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
                Acompanhe os indicadores da clínica e filtre dados de clientes, agenda, recorrência
                e pagamentos.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Indicador 1 */}
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm"
                data-testid="indicador-agendamentos-dia"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  1. Agendamentos do Dia
                </span>
                <p className="mt-2 text-2xl font-black text-[var(--color-text-primary)]">
                  {painelIndicadores.indicadores.agendamentosDoDia.total}
                </p>
                <p className="mt-1 text-xs text-emerald-600 font-medium">
                  {painelIndicadores.indicadores.agendamentosDoDia.detalhe}
                </p>
              </div>

              {/* Indicador 2 */}
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm"
                data-testid="indicador-clientes-cadastrados"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  2. Clientes Cadastrados
                </span>
                <p className="mt-2 text-2xl font-black text-[var(--color-text-primary)]">
                  {painelIndicadores.indicadores.clientesCadastrados.total}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {painelIndicadores.indicadores.clientesCadastrados.detalhe}
                </p>
              </div>

              {/* Indicador 3 */}
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm"
                data-testid="indicador-clientes-recorrentes"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  3. Clientes Recorrentes
                </span>
                <p className="mt-2 text-2xl font-black text-[var(--color-brand-deep)]">
                  {painelIndicadores.indicadores.clientesRecorrentes.total}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {painelIndicadores.indicadores.clientesRecorrentes.detalhe}
                </p>
              </div>

              {/* Indicador 4 */}
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm"
                data-testid="indicador-atendimentos-mes"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  4. Atendimentos no Mês
                </span>
                <p className="mt-2 text-2xl font-black text-[var(--color-text-primary)]">
                  {painelIndicadores.indicadores.atendimentosRealizadosMes.total}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {painelIndicadores.indicadores.atendimentosRealizadosMes.detalhe}
                </p>
              </div>

              {/* Indicador 5 */}
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm"
                data-testid="indicador-cancelamentos-faltas"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  5. Cancelamentos e Faltas
                </span>
                <p className="mt-2 text-2xl font-black text-amber-600">
                  {painelIndicadores.indicadores.cancelamentosEFaltas.cancelamentosNoPrazo} /{' '}
                  {painelIndicadores.indicadores.cancelamentosEFaltas.cancelamentosTardios +
                    painelIndicadores.indicadores.cancelamentosEFaltas.faltas}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {painelIndicadores.indicadores.cancelamentosEFaltas.detalhe}
                </p>
              </div>

              {/* Indicador 6 */}
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm"
                data-testid="indicador-ocupacao-agenda"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  6. Ocupação da Agenda
                </span>
                <p className="mt-2 text-2xl font-black text-[var(--color-text-primary)]">
                  {painelIndicadores.indicadores.ocupacaoAgenda.taxaOcupacaoPercentual}%
                </p>
                <p
                  className={`mt-1 text-xs font-medium ${
                    painelIndicadores.indicadores.ocupacaoAgenda.metaSuperada
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {painelIndicadores.indicadores.ocupacaoAgenda.detalhe}
                </p>
              </div>

              {/* Indicador 7 */}
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm"
                data-testid="indicador-valores-recebidos"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  7. Valores Recebidos e Previstos
                </span>
                <p className="mt-2 text-xl font-black text-[var(--color-text-primary)]">
                  R${' '}
                  {painelIndicadores.indicadores.valoresRecebidosEPrevistos.valorTotalRecebidoReais.toLocaleString(
                    'pt-BR',
                    { minimumFractionDigits: 0 },
                  )}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {painelIndicadores.indicadores.valoresRecebidosEPrevistos.detalhe}
                </p>
              </div>

              {/* Indicador 8 */}
              <div
                className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm"
                data-testid="indicador-servico-mais-agendado"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  8. Serviço Mais Agendado
                </span>
                <p className="mt-2 text-lg font-bold text-[var(--color-brand-deep)]">
                  {painelIndicadores.indicadores.servicoMaisAgendado.nome}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {painelIndicadores.indicadores.servicoMaisAgendado.totalAgendamentos === 0
                    ? '0 agendamentos no período'
                    : painelIndicadores.indicadores.servicoMaisAgendado.detalhe}
                </p>
              </div>
            </div>

            <AdminRelatoriosSection
              clients={clientes}
              appointments={agendamentosRelatorio}
              isLoading={isLoadingClientes || isLoadingRelatorio}
              error={erroClientes || erroAgendamentosRelatorio}
            />
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

            {/* Card Destaque: Horários de Funcionamento */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--color-brand-deep)]/20 bg-white p-5 shadow-xs sm:p-6 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]">
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
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                    Horários de Funcionamento e Intervalos de Manutenção
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)] sm:text-sm">
                    Configure os dias da semana atendidos, faixas de abertura/fechamento e pausas
                    para almoço ou limpeza.
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  to="/admin/horarios"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-deep)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-dark)] active:bg-[var(--color-brand-darker)]"
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

            {/* Formulário Interativo: Configurações Gerais da Clínica */}
            <div className="space-y-6">
              <AdminConfiguracoesGerais />
            </div>
          </section>
        )}
      </main>

      {/* Formulário administrativo para criar e reagendar atendimentos */}
      {modalPresencialAberto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs"
        >
          <div className="relative flex flex-col w-full max-w-md max-h-[92dvh] sm:max-h-[88vh] rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-[var(--color-border-default)]">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                {agendamentoParaEdicao
                  ? 'Editar / reagendar atendimento'
                  : 'Novo agendamento administrativo'}
              </h3>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)] sm:text-sm">
                {agendamentoParaEdicao
                  ? 'Altere a data e o horário. Cliente e serviço permanecem vinculados ao atendimento.'
                  : 'Cadastre um atendimento feito pela clínica. O agendamento administrativo não exige sinal.'}
              </p>
            </div>

            <form
              onSubmit={(e) => void handleCriarAgendamentoPresencial(e)}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div>
                  <label
                    htmlFor="presencial-cliente-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
                  >
                    Cliente cadastrado
                  </label>
                  <select
                    id="presencial-cliente-select"
                    required
                    disabled={Boolean(agendamentoParaEdicao)}
                    value={presencialClienteId}
                    onChange={(e) => void handleSelecionarClientePresencial(e.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden disabled:bg-gray-100"
                  >
                    <option value="">Selecione um cliente cadastrado</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {presencialAvaliacaoBloqueio?.bloqueado && (
                  <div
                    role="status"
                    data-testid="modal-presencial-bloqueio-alerta"
                    className="space-y-2 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3.5 text-xs/5 text-[var(--color-warning-text)]"
                  >
                    <p className="font-bold">Ficha exige liberação médica</p>
                    <p>
                      A confirmação direta está bloqueada enquanto não houver liberação médica
                      aprovada na ficha do cliente.
                    </p>
                    {presencialClienteId && (
                      <Link
                        to={`/admin/clientes/${presencialClienteId}`}
                        className="inline-block font-semibold underline underline-offset-4"
                      >
                        Abrir ficha para avaliar liberação médica
                      </Link>
                    )}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="presencial-servico-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
                  >
                    Procedimento
                  </label>
                  <select
                    id="presencial-servico-select"
                    disabled={Boolean(agendamentoParaEdicao)}
                    value={presencialServicoId}
                    onChange={(e) => setPresencialServicoId(e.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-hidden disabled:bg-gray-100"
                  >
                    {servicos.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — R$ {(s.priceInCents / 100).toFixed(2).replace('.', ',')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="presencial-data-hora"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
                  >
                    Data e horário
                  </label>
                  <input
                    id="presencial-data-hora"
                    type="datetime-local"
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    value={presencialDataHora}
                    onChange={(e) => setPresencialDataHora(e.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-none"
                  />
                </div>

                <label
                  htmlFor="presencial-isencao-sinal"
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas-neutral)] px-3.5 py-2 text-xs font-medium text-[var(--color-text-primary)]"
                >
                  <input
                    id="presencial-isencao-sinal"
                    type="checkbox"
                    checked={presencialIsencaoSinal}
                    disabled={Boolean(agendamentoParaEdicao)}
                    onChange={(e) => setPresencialIsencaoSinal(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-brand-deep)]"
                  />
                  <span>Isentar sinal de 30% (confirmar atendimento presencial)</span>
                </label>

                {agendamentoParaEdicao && (
                  <div>
                    <label
                      htmlFor="presencial-motivo-alteracao"
                      className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
                    >
                      Motivo da alteração (opcional)
                    </label>
                    <textarea
                      id="presencial-motivo-alteracao"
                      maxLength={300}
                      rows={3}
                      value={motivoAlteracao}
                      onChange={(event) => setMotivoAlteracao(event.target.value)}
                      className="mt-1.5 w-full resize-y rounded-xl border border-[var(--color-border-default)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-deep)] focus:outline-none"
                    />
                  </div>
                )}

                {presencialErro && (
                  <div
                    role="alert"
                    data-testid="modal-presencial-erro"
                    className="rounded-xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-3 text-xs/5 font-medium text-[var(--color-error-text)]"
                  >
                    {presencialErro}
                  </div>
                )}
              </div>

              <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 p-4 sm:p-6 pt-3 sm:pt-4 border-t border-[var(--color-border-default)] bg-gray-50/70 sm:bg-white">
                <button
                  type="button"
                  disabled={submittingPresencial}
                  onClick={() => setModalPresencialAberto(false)}
                  className="min-h-11 w-full sm:w-auto rounded-xl border border-[var(--color-border-default)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-zinc-100 hover:text-zinc-950 hover:border-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPresencial}
                  className="min-h-11 w-full sm:w-auto rounded-xl bg-[var(--color-brand-deep)] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-dark)] active:bg-[var(--color-brand-darker)] disabled:cursor-wait disabled:opacity-60"
                >
                  {submittingPresencial
                    ? 'Salvando…'
                    : agendamentoParaEdicao
                      ? 'Salvar alteração'
                      : 'Confirmar Agendamento'}
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
