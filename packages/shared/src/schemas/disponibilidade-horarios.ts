import { z } from 'zod';
import {
  CONFIGURACAO_HORARIOS_PADRAO,
  type HorariosFuncionamento,
} from './horarios-funcionamento.js';
import { verificarConflitoHorarios } from './agendamento.js';
import {
  extrairDataHoraLocal,
  verificarConflitoBloqueioOuHorarioFixo,
  type BloqueioAgenda,
  type HorarioFixoCliente,
} from './bloqueios-e-horarios-fixos.js';

/**
 * Converte string 'HH:mm' para total de minutos desde 00:00.
 */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Converte total de minutos para string 'HH:mm'.
 */
export function minutosParaHora(minutos: number): string {
  const normalizado = ((minutos % 1440) + 1440) % 1440;
  const h = Math.floor(normalizado / 60);
  const m = normalizado % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface ResultadoValidacaoEncaixe {
  valido: boolean;
  motivo?: string;
  codigoErro?: 'dia_inativo' | 'fora_do_turno' | 'intervalo_manutencao';
}

/**
 * Valida se um horário e duração cabem inteiramente dentro dos turnos da clínica
 * no dia da semana selecionado e sem coincidir com intervalos de manutenção ou almoço.
 */
export function validarEncaixeHorariosFuncionamento(
  dataHoraInicioIso: string,
  duracaoMinutos: number,
  configuracao: HorariosFuncionamento = CONFIGURACAO_HORARIOS_PADRAO,
): ResultadoValidacaoEncaixe {
  const { diaSemana, horaFormatada } = extrairDataHoraLocal(dataHoraInicioIso);
  const diaConfig = configuracao.dias.find((d) => d.dia === diaSemana);

  if (!diaConfig || !diaConfig.ativo) {
    return {
      valido: false,
      motivo: 'A clínica não realiza atendimentos no dia da semana selecionado (folga cadastrada).',
      codigoErro: 'dia_inativo',
    };
  }

  const minInicio = horaParaMinutos(horaFormatada);
  const minFim = minInicio + duracaoMinutos;
  const horaFimFormatada = minutosParaHora(minFim);

  // 1. Verifica se cabe inteiramente dentro de pelo menos um turno de atendimento
  const turnoCompativel = diaConfig.turnos.find((turno) => {
    const turnoInicioMin = horaParaMinutos(turno.inicio);
    const turnoFimMin = horaParaMinutos(turno.fim);
    return minInicio >= turnoInicioMin && minFim <= turnoFimMin;
  });

  if (!turnoCompativel) {
    return {
      valido: false,
      motivo: `O horário selecionado (${horaFormatada} às ${horaFimFormatada}, duração de ${duracaoMinutos} min) ultrapassa os turnos de atendimento da clínica para este dia.`,
      codigoErro: 'fora_do_turno',
    };
  }

  // 2. Verifica se colide com intervalos de manutenção (ex: almoço, higienização de sala)
  const intervaloColidente = diaConfig.intervalosManutencao.find((manutencao) => {
    const manInicioMin = horaParaMinutos(manutencao.inicio);
    const manFimMin = horaParaMinutos(manutencao.fim);
    // Há sobreposição se a sessão começa antes do término da manutenção e termina após o início da manutenção
    return minInicio < manFimMin && minFim > manInicioMin;
  });

  if (intervaloColidente) {
    return {
      valido: false,
      motivo: `O horário selecionado colide com o intervalo de ${intervaloColidente.descricao || 'manutenção/higienização'} da clínica (${intervaloColidente.inicio} às ${intervaloColidente.fim}).`,
      codigoErro: 'intervalo_manutencao',
    };
  }

  return { valido: true };
}

export interface SlotDisponivel {
  horaInicio: string; // '08:00'
  horaFim: string; // '09:00'
  horaFimComIntervalo: string; // '09:30'
  dataHoraInicioIso: string;
  dataHoraFimIso: string;
}

export interface GerarHorariosDisponiveisParams {
  data: string; // 'YYYY-MM-DD'
  duracaoMinutos: number;
  intervaloMinutos?: number; // padrão de produto: 30 minutos
  passoMinutos?: number; // incremento entre slots candidatos (padrão 30 minutos)
  configuracaoHorarios?: HorariosFuncionamento;
  agendamentosExistentes?: Array<{
    dataHoraInicio: string;
    dataHoraFim: string;
    intervaloAposMinutos?: number;
    status?: string;
  }>;
  bloqueios?: BloqueioAgenda[];
  horariosFixos?: HorarioFixoCliente[];
  clienteIdSolicitante?: string;
}

/**
 * Motor puro de cálculo e geração de horários disponíveis.
 * Aplica rigorosamente:
 * 1. A duração exata do serviço selecionado.
 * 2. O intervalo padrão de 30 minutos de organização entre atendimentos.
 * 3. Encaixe dentro dos turnos da clínica sem invadir intervalos de manutenção.
 * 4. Respeito a bloqueios da clínica e reservas de clientes fixos.
 */
export function gerarHorariosDisponiveis(params: GerarHorariosDisponiveisParams): SlotDisponivel[] {
  const {
    data,
    duracaoMinutos,
    intervaloMinutos = 30,
    passoMinutos = 30,
    configuracaoHorarios = CONFIGURACAO_HORARIOS_PADRAO,
    agendamentosExistentes = [],
    bloqueios = [],
    horariosFixos = [],
    clienteIdSolicitante,
  } = params;

  if (duracaoMinutos <= 0) {
    return [];
  }

  const partes = data.split('-').map(Number);
  const y = partes[0]!;
  const m = partes[1]! - 1;
  const d = partes[2]!;
  const dataObj = new Date(Date.UTC(y, m, d));
  const diaSemana = dataObj.getUTCDay();

  const diaConfig = configuracaoHorarios.dias.find((cfg) => cfg.dia === diaSemana);
  if (!diaConfig || !diaConfig.ativo) {
    return [];
  }

  const slotsDisponiveis: SlotDisponivel[] = [];
  const agendamentosValidos = agendamentosExistentes.filter((a) => a.status !== 'cancelado');

  for (const turno of diaConfig.turnos) {
    const turnoInicioMin = horaParaMinutos(turno.inicio);
    const turnoFimMin = horaParaMinutos(turno.fim);

    for (
      let minInicio = turnoInicioMin;
      minInicio + duracaoMinutos <= turnoFimMin;
      minInicio += passoMinutos
    ) {
      const minFim = minInicio + duracaoMinutos;
      const horaInicioStr = minutosParaHora(minInicio);
      const horaFimStr = minutosParaHora(minFim);
      const minFimComIntervalo = minFim + intervaloMinutos;
      const horaFimComIntervaloStr = minutosParaHora(minFimComIntervalo);

      // 1. Checa colisão da sessão com intervalos de manutenção (ex: almoço)
      const colideManutencao = diaConfig.intervalosManutencao.some((manutencao) => {
        const manInicioMin = horaParaMinutos(manutencao.inicio);
        const manFimMin = horaParaMinutos(manutencao.fim);
        return minInicio < manFimMin && minFim > manInicioMin;
      });
      if (colideManutencao) {
        continue;
      }

      const dataHoraInicioIso = `${data}T${horaInicioStr}:00.000Z`;
      const dataHoraFimIso = `${data}T${horaFimStr}:00.000Z`;

      // 2. Checa colisão com agendamentos existentes respeitando o intervalo de 30 min de organização
      const colideAgendamento = agendamentosValidos.some((existente) =>
        verificarConflitoHorarios(
          {
            inicioIso: dataHoraInicioIso,
            fimIso: dataHoraFimIso,
            intervaloMinutos,
          },
          {
            inicioIso: existente.dataHoraInicio,
            fimIso: existente.dataHoraFim,
            intervaloMinutos: existente.intervaloAposMinutos ?? intervaloMinutos,
          },
        ),
      );
      if (colideAgendamento) {
        continue;
      }

      // 3. Checa colisão com bloqueios de agenda e horários fixos de clientes
      const checagemBloqueios = verificarConflitoBloqueioOuHorarioFixo({
        dataHoraInicioIso,
        dataHoraFimIso,
        clienteIdSolicitante,
        bloqueios,
        horariosFixos,
      });
      if (checagemBloqueios.conflito) {
        continue;
      }

      slotsDisponiveis.push({
        horaInicio: horaInicioStr,
        horaFim: horaFimStr,
        horaFimComIntervalo: horaFimComIntervaloStr,
        dataHoraInicioIso,
        dataHoraFimIso,
      });
    }
  }

  return slotsDisponiveis;
}

/**
 * Schema para requisição de consulta de horários disponíveis.
 */
export const consultarHorariosDisponiveisInputSchema = z
  .object({
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato ISO YYYY-MM-DD.'),
    duracaoMinutos: z.coerce
      .number()
      .int()
      .min(15, 'Duração mínima é de 15 minutos.')
      .max(360, 'Duração máxima é de 360 minutos.')
      .optional(),
    servicoId: z.string().min(1).optional(),
    profissionalId: z.string().optional().default('prof-tais-romagnoli'),
    passoMinutos: z.coerce.number().int().min(15).max(120).optional().default(30),
  })
  .refine((data) => data.duracaoMinutos !== undefined || data.servicoId !== undefined, {
    message:
      'É obrigatório informar a duração do atendimento (duracaoMinutos) ou o serviço (servicoId).',
    path: ['duracaoMinutos'],
  });

export type ConsultarHorariosDisponiveisInput = z.infer<
  typeof consultarHorariosDisponiveisInputSchema
>;
