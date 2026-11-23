import type { Agendamento } from '@clinica/shared';
import type { AdminClientListItem } from './types';

export type ReportCategory = 'clientes' | 'agenda' | 'recorrencia' | 'pagamentos';

export interface ReportLine {
  id: string;
  values: Array<string | number>;
  searchText: string;
  status: string;
  receivedCents?: number;
  expectedCents?: number;
  retainedCents?: number;
}

export interface ReportTableData {
  headers: string[];
  rows: ReportLine[];
}

const STATUS_LABELS: Record<Agendamento['status'], string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  reagendado: 'Reagendado',
  falta: 'Falta',
};

function formatarData(value: string | undefined): string {
  if (!value) return '—';
  const datePart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return '—';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatarMoeda(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dentroDoMes(appointment: Agendamento, month: string): boolean {
  return appointment.dataHoraInicio.slice(0, 7) === month;
}

function filtrarAgendamentosDoMes(appointments: Agendamento[], month: string): Agendamento[] {
  return appointments.filter((appointment) => dentroDoMes(appointment, month));
}

function filtrarAtendimentosDoMes(appointments: Agendamento[], month: string): Agendamento[] {
  return appointments.filter(
    (appointment) =>
      dentroDoMes(appointment, month) ||
      (appointment.status === 'concluido' && appointment.concluidoEm?.slice(0, 7) === month),
  );
}

function textoBusca(values: Array<string | number>): string {
  return values.join(' ').toLocaleLowerCase('pt-BR');
}

function linha(
  id: string,
  values: Array<string | number>,
  status = '',
  valoresFinanceiros?: Pick<ReportLine, 'receivedCents' | 'expectedCents' | 'retainedCents'>,
): ReportLine {
  return { id, values, searchText: textoBusca(values), status, ...valoresFinanceiros };
}

export function montarTabelaRelatorio(
  category: ReportCategory,
  month: string,
  clients: AdminClientListItem[],
  appointments: Agendamento[],
): ReportTableData {
  const appointmentsOfMonth = filtrarAgendamentosDoMes(appointments, month);
  const appointmentsForMonthTotals = filtrarAtendimentosDoMes(appointments, month);

  if (category === 'clientes') {
    const concludedCounts = new Map<string, number>();
    const lastAppointments = new Map<string, string>();
    appointmentsForMonthTotals
      .filter((appointment) => appointment.status === 'concluido')
      .forEach((appointment) => {
        concludedCounts.set(
          appointment.clienteId,
          (concludedCounts.get(appointment.clienteId) ?? 0) + 1,
        );
        const current = lastAppointments.get(appointment.clienteId) ?? '';
        if (appointment.dataHoraInicio > current) {
          lastAppointments.set(appointment.clienteId, appointment.dataHoraInicio);
        }
      });

    const rows = [...clients]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((client) => {
        const clientStatus = client.status ?? 'ativo';
        const values = [
          client.nome,
          client.email || '—',
          client.telefone || '—',
          clientStatus === 'inativo'
            ? 'Inativo'
            : clientStatus === 'pendente'
              ? 'Pendente'
              : 'Ativo',
          concludedCounts.get(client.id) ?? 0,
          formatarData(lastAppointments.get(client.id)),
        ];
        return linha(client.id, values, clientStatus);
      });

    return {
      headers: [
        'Cliente',
        'E-mail',
        'Telefone',
        'Status',
        'Atendimentos concluídos no mês',
        'Último atendimento',
      ],
      rows,
    };
  }

  if (category === 'recorrencia') {
    const totals = new Map<string, { nome: string; quantidade: number }>();
    appointmentsForMonthTotals
      .filter((appointment) => appointment.status === 'concluido')
      .forEach((appointment) => {
        const current = totals.get(appointment.clienteId) ?? {
          nome: appointment.clienteNome,
          quantidade: 0,
        };
        current.quantidade += 1;
        totals.set(appointment.clienteId, current);
      });

    const clientById = new Map(clients.map((client) => [client.id, client]));
    const rows = [...totals.entries()]
      .filter(([, total]) => total.quantidade >= 2)
      .sort((a, b) => b[1].quantidade - a[1].quantidade)
      .map(([clientId, total]) => {
        const client = clientById.get(clientId);
        return linha(clientId, [total.nome, client?.email || '—', month, total.quantidade]);
      });

    return { headers: ['Cliente', 'E-mail', 'Mês', 'Atendimentos concluídos'], rows };
  }

  if (category === 'agenda') {
    const rows = appointmentsOfMonth
      .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio))
      .map((appointment) => {
        const values = [
          formatarData(appointment.dataHoraInicio),
          appointment.dataHoraInicio.slice(11, 16),
          appointment.clienteNome,
          appointment.servicoNome,
          `${appointment.duracaoMinutos} min`,
          STATUS_LABELS[appointment.status],
          formatarMoeda(appointment.valorTotalEmCentavos),
        ];
        return linha(appointment.id, values, appointment.status);
      });

    return {
      headers: ['Data', 'Horário', 'Cliente', 'Serviço', 'Duração', 'Status', 'Valor previsto'],
      rows,
    };
  }

  const rows = appointmentsForMonthTotals.map((appointment) => {
    const isRetained =
      appointment.status === 'falta' ||
      (appointment.status === 'cancelado' && appointment.classificacaoCancelamento === 'tardio');
    const isReceived = appointment.status === 'concluido' || isRetained;
    const isExpected =
      appointment.status === 'pendente' ||
      appointment.status === 'confirmado' ||
      appointment.status === 'reagendado' ||
      appointment.status === 'em_andamento';
    const receivedCents = isRetained
      ? appointment.valorSinalEmCentavos
      : isReceived
        ? appointment.valorTotalEmCentavos
        : 0;
    const expectedCents = isExpected ? appointment.valorTotalEmCentavos : 0;
    const retainedCents = isRetained ? appointment.valorSinalEmCentavos : 0;
    const values = [
      formatarData(appointment.dataHoraInicio),
      appointment.clienteNome,
      appointment.servicoNome,
      STATUS_LABELS[appointment.status],
      appointment.metodoPagamento,
      formatarMoeda(receivedCents),
      formatarMoeda(expectedCents),
      formatarMoeda(retainedCents),
    ];
    const status = isRetained
      ? 'retido'
      : isReceived
        ? 'recebido'
        : isExpected
          ? 'previsto'
          : 'outro';
    return linha(appointment.id, values, status, { receivedCents, expectedCents, retainedCents });
  });

  return {
    headers: [
      'Data',
      'Cliente',
      'Serviço',
      'Status do agendamento',
      'Forma de pagamento',
      'Recebido pelo critério da agenda',
      'Previsto',
      'Sinal retido',
    ],
    rows,
  };
}

function protegerFormulaCsv(value: string | number): string {
  const text = String(value);
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function serializarRelatorioCsv(headers: string[], rows: ReportLine[]): string {
  return [headers, ...rows.map((row) => row.values)]
    .map((values) => values.map(protegerFormulaCsv).join(';'))
    .join('\r\n');
}
