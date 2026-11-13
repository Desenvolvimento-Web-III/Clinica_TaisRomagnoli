import {
  CONFIGURACAO_HORARIOS_PADRAO,
  gerarHorariosDisponiveis,
  calcularDataHoraFim,
} from '@clinica/shared';
import type { Agendamento } from '../types/agendamento';

export interface DiaDisponivel {
  isoDate: string;
  diaSemanaFormatado: string;
  dataCurta: string;
  isDisponivel: boolean;
  motivoIndisponivel?: string;
}

export interface HorarioSlot {
  hora: string;
  isDisponivel: boolean;
}

export const NOMES_DIAS_SEMANA_COMPLETO = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const MESES_ABREV_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export const HORARIOS_PADRAO_SEMANA = [
  '08:30',
  '10:00',
  '11:30',
  '14:00',
  '15:30',
  '16:30',
  '17:30',
];
export const HORARIOS_PADRAO_SABADO = ['08:00', '09:30', '11:00', '12:30'];

/**
 * Gera as próximas opções de dias úteis para reagendamento,
 * iniciando a partir do dia seguinte ao agendamento (ou de amanhã se for passado),
 * e excluindo rigorosamente as folgas da dona da clínica (domingo e terça-feira).
 */
export function gerarDiasReagendamento(
  dataAgendamentoAtualIso?: string,
  dataHoje = new Date(),
  quantidadeDias = 6,
): DiaDisponivel[] {
  const hojeAno = dataHoje.getFullYear();
  const hojeMes = dataHoje.getMonth();
  const hojeDia = dataHoje.getDate();
  const hojeDate = new Date(hojeAno, hojeMes, hojeDia);

  let cursor: Date;

  if (dataAgendamentoAtualIso) {
    const dataIso = dataAgendamentoAtualIso.slice(0, 10);
    const [y, m, d] = dataIso.split('-').map(Number);
    const dataAgendamento = new Date(y ?? hojeAno, (m ?? hojeMes + 1) - 1, d ?? hojeDia);
    cursor = new Date(
      dataAgendamento.getFullYear(),
      dataAgendamento.getMonth(),
      dataAgendamento.getDate() + 1,
    );
    if (cursor <= hojeDate) {
      cursor = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), hojeDate.getDate() + 1);
    }
  } else {
    cursor = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), hojeDate.getDate() + 1);
  }

  const diasValidos: DiaDisponivel[] = [];

  while (diasValidos.length < quantidadeDias) {
    const dayOfWeek = cursor.getDay();
    // Exclui folgas da dona da clínica: Domingo (0) e Terça-feira (2)
    if (dayOfWeek !== 0 && dayOfWeek !== 2) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      const isoDate = `${y}-${m}-${d}`;

      diasValidos.push({
        isoDate,
        diaSemanaFormatado: NOMES_DIAS_SEMANA_COMPLETO[dayOfWeek] ?? '',
        dataCurta: `${d} ${MESES_ABREV_PT[cursor.getMonth()]}`,
        isDisponivel: true,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return diasValidos;
}

export function gerarHorariosParaData(
  isoDate: string,
  duracaoMinutos = 60,
  agendamentosExistentes: Agendamento[] = [],
): HorarioSlot[] {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dataObj = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  const dayOfWeek = dataObj.getDay();

  const horariosBase = dayOfWeek === 6 ? HORARIOS_PADRAO_SABADO : HORARIOS_PADRAO_SEMANA;

  const slotsCalculados = gerarHorariosDisponiveis({
    data: isoDate,
    duracaoMinutos,
    configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
    agendamentosExistentes: agendamentosExistentes.map((a) => {
      const inicioIso = a.dataHoraIso.endsWith('Z')
        ? a.dataHoraIso
        : `${a.dataHoraIso.slice(0, 19)}.000Z`;
      return {
        dataHoraInicio: inicioIso,
        dataHoraFim: calcularDataHoraFim(inicioIso, a.duracaoMinutos),
        intervaloAposMinutos: 30,
        status: a.status,
      };
    }),
  });

  const slotsSet = new Set(slotsCalculados.map((s) => s.horaInicio));

  return horariosBase.map((hora) => {
    const isDisponivel = slotsSet.size > 0 ? slotsSet.has(hora) : true;
    return {
      hora,
      isDisponivel,
    };
  });
}
