import type { HorariosFuncionamento } from '@clinica/shared';

export interface DiaDisponivel {
  isoDate: string;
  diaSemanaFormatado: string;
  dataCurta: string;
  isDisponivel: boolean;
  motivoIndisponivel?: string;
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
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function gerarDiasReagendamento(
  dataAgendamentoAtualIso: string | undefined,
  dataHoje: Date,
  quantidadeDias: number,
  configuracaoHorarios: HorariosFuncionamento,
): DiaDisponivel[] {
  const hojeAno = dataHoje.getFullYear();
  const hojeMes = dataHoje.getMonth();
  const hojeDia = dataHoje.getDate();
  const hojeDate = new Date(hojeAno, hojeMes, hojeDia);
  let cursor: Date;

  if (dataAgendamentoAtualIso) {
    const [ano, mes, dia] = dataAgendamentoAtualIso.slice(0, 10).split('-').map(Number);
    const dataAgendamento = new Date(ano ?? hojeAno, (mes ?? hojeMes + 1) - 1, dia ?? hojeDia);
    cursor = new Date(dataAgendamento.getFullYear(), dataAgendamento.getMonth(), dataAgendamento.getDate() + 1);
    if (cursor <= hojeDate) cursor = new Date(hojeAno, hojeMes, hojeDia + 1);
  } else {
    cursor = new Date(hojeAno, hojeMes, hojeDia + 1);
  }

  const diasValidos: DiaDisponivel[] = [];
  const diasAtivos = new Set(
    configuracaoHorarios.dias.filter((dia) => dia.ativo && dia.turnos.length > 0).map((dia) => dia.dia),
  );
  let diasVerificados = 0;
  while (diasValidos.length < quantidadeDias && diasVerificados < 366) {
    diasVerificados += 1;
    const diaSemana = cursor.getDay();
    if (diasAtivos.has(diaSemana)) {
      const ano = cursor.getFullYear();
      const mes = String(cursor.getMonth() + 1).padStart(2, '0');
      const dia = String(cursor.getDate()).padStart(2, '0');
      diasValidos.push({
        isoDate: `${ano}-${mes}-${dia}`,
        diaSemanaFormatado: NOMES_DIAS_SEMANA_COMPLETO[diaSemana] ?? '',
        dataCurta: `${dia} ${MESES_ABREV_PT[cursor.getMonth()]}`,
        isDisponivel: true,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return diasValidos;
}
