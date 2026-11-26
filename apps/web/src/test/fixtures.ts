import type { ClinicSettings, PainelIndicadores } from '@clinica/shared';
import type { AdminClientListItem } from '@/features/admin-dashboard/types';
import type { Service } from '@/features/services/types';

// Fixtures are restricted to tests; the application reads these records from Firestore/functions.
export const clinicSettingsFixture: ClinicSettings = {
  percentualSinal: 30,
  intervaloMinutos: 30,
  diasFolga: [0, 2],
  antecedenciaMinimaCancelamentoHoras: 3,
  criterioClienteRecorrenteAtendimentosMes: 2,
  updatedAt: '2026-11-25T00:00:00.000Z',
  contatos: {
    telefone: '(11) 98765-4321',
    whatsapp: '(11) 98765-4321',
    email: 'contato@clinica.com',
    endereco: 'Rua das Flores, 100',
  },
  politicas: {
    politicaCancelamento: 'Cancelamento com três horas de antecedência.',
    politicaReagendamento: 'Reagendamento com três horas de antecedência.',
    toleranciaAtrasoMinutos: 15,
  },
  lembretes: {
    lembreteAtivo: true,
    antecedenciaHoras: 24,
    canais: { whatsapp: true, email: false, notificacaoApp: true },
  },
  prazos: {
    antecedenciaMinimaAgendamentoHoras: 2,
    antecedenciaMinimaCancelamentoHoras: 3,
    intervaloMinutos: 30,
    criterioClienteRecorrenteAtendimentosMes: 2,
  },
};

export const adminClientsFixture: AdminClientListItem[] = [
  { id: 'demo-client-1', nome: 'Mariana Silva', email: 'mariana@example.com', telefone: '(11) 98765-4321', status: 'ativo', totalAtendimentosMes: 3 },
  { id: 'demo-client-2', nome: 'Ana Carolina Santos', email: 'ana@example.com', telefone: '(11) 97654-3210', status: 'ativo', totalAtendimentosMes: 1 },
  { id: 'demo-client-3', nome: 'Juliana Lima', email: 'juliana@example.com', telefone: '(11) 96543-2109', status: 'ativo', totalAtendimentosMes: 2 },
  { id: 'demo-client-4', nome: 'Carlos Eduardo', email: 'carlos@example.com', telefone: '(11) 95432-1098', status: 'ativo', totalAtendimentosMes: 0 },
];

export const servicesFixture: Service[] = [
  { id: 'srv-1', name: 'Massagem Relaxante', description: 'Atendimento de teste', durationMinutes: 60, priceInCents: 15000, imageSrc: '', imageAlt: 'Massagem Relaxante', active: true, category: 'Corporal' },
  { id: 'srv-2', name: 'Massagem com Pedras Quentes', description: 'Atendimento de teste', durationMinutes: 90, priceInCents: 20000, imageSrc: '', imageAlt: 'Massagem com Pedras Quentes', active: true, category: 'Corporal' },
];

export const indicatorsFixture: PainelIndicadores = {
  dataReferencia: '2026-11-25',
  mesReferencia: '2026-11',
  geradoEmIso: '2026-11-25T00:00:00.000Z',
  indicadores: {
    agendamentosDoDia: { total: 4, concluidos: 1, pendentes: 1, emAndamento: 0, cancelados: 0, detalhe: '1 concluído, 1 pendente' },
    clientesCadastrados: { total: 4, novosNoMes: 1, detalhe: '4 clientes' },
    clientesRecorrentes: { total: 2, criterioMinimoAtendimentosMes: 2, percentualSobreTotal: 50, detalhe: '2 clientes recorrentes' },
    atendimentosRealizadosMes: { total: 1, totalMinutos: 60, detalhe: '1 atendimento concluído' },
    cancelamentosEFaltas: { totalCancelamentos: 0, cancelamentosNoPrazo: 0, cancelamentosTardios: 0, faltas: 0, taxaCancelamentoPercentual: 0, detalhe: 'Sem cancelamentos' },
    ocupacaoAgenda: { taxaOcupacaoPercentual: 0, slotsOcupados: 0, slotsDisponiveis: 0, metaOcupacaoPercentual: 80, metaSuperada: false, detalhe: '0% de ocupação' },
    valoresRecebidosEPrevistos: { valorTotalRecebidoCentavos: 0, valorTotalPrevistoCentavos: 0, valorTotalRecebidoReais: 0, valorTotalPrevistoReais: 0, valorSinaisRetidosCentavos: 0, detalhe: 'R$ 0,00 recebidos, R$ 0,00 previstos' },
    servicoMaisAgendado: { servicoId: 'srv-1', nome: 'Massagem Relaxante', totalAgendamentos: 1, detalhe: '1 agendamento', rankingTopServicos: [] },
  },
  categorias: {
    operacionais: { agendamentosDoDia: { total: 4, concluidos: 1, pendentes: 1, emAndamento: 0, cancelados: 0, detalhe: '1 concluído, 1 pendente' }, cancelamentosEFaltas: { totalCancelamentos: 0, cancelamentosNoPrazo: 0, cancelamentosTardios: 0, faltas: 0, taxaCancelamentoPercentual: 0, detalhe: 'Sem cancelamentos' }, ocupacaoAgenda: { taxaOcupacaoPercentual: 0, slotsOcupados: 0, slotsDisponiveis: 0, metaOcupacaoPercentual: 80, metaSuperada: false, detalhe: '0% de ocupação' } },
    clientes: { clientesCadastrados: { total: 4, novosNoMes: 1, detalhe: '4 clientes' }, clientesRecorrentes: { total: 2, criterioMinimoAtendimentosMes: 2, percentualSobreTotal: 50, detalhe: '2 clientes recorrentes' } },
    financeiras: { valoresRecebidosEPrevistos: { valorTotalRecebidoCentavos: 0, valorTotalPrevistoCentavos: 0, valorTotalRecebidoReais: 0, valorTotalPrevistoReais: 0, valorSinaisRetidosCentavos: 0, detalhe: 'R$ 0,00 recebidos, R$ 0,00 previstos' } },
    servicos: { atendimentosRealizadosMes: { total: 1, totalMinutos: 60, detalhe: '1 atendimento concluído' }, servicoMaisAgendado: { servicoId: 'srv-1', nome: 'Massagem Relaxante', totalAgendamentos: 1, detalhe: '1 agendamento', rankingTopServicos: [] } },
  },
};
