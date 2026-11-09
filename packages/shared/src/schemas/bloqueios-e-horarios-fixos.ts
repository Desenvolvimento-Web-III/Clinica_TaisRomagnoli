import { z } from 'zod';
import { diaSemanaSchema, horaFormatadaSchema } from './horarios-funcionamento.js';

export const dataIsoFormatadaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido. Esperado YYYY-MM-DD');

export const frequenciaRecorrenciaSchema = z.enum(['semanal', 'quinzenal']);
export type FrequenciaRecorrencia = z.infer<typeof frequenciaRecorrenciaSchema>;

/**
 * Bloqueio único/pontual na agenda (ex: folga em feriado, compromisso pontual da profissional).
 */
export const bloqueioUnicoSchema = z
  .object({
    id: z.string().min(1),
    tipo: z.literal('unico'),
    data: dataIsoFormatadaSchema,
    horaInicio: horaFormatadaSchema,
    horaFim: horaFormatadaSchema,
    diaInteiro: z.boolean().default(false),
    motivo: z.string().min(1, 'O motivo do bloqueio é obrigatório').max(200),
    profissionalId: z.string().default('default'),
    ativo: z.boolean().default(true),
    criadoPor: z.string(),
    criadoEm: z.string(),
    atualizadoEm: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.diaInteiro) return true;
      return data.horaInicio < data.horaFim;
    },
    {
      message: 'O horário de início do bloqueio deve ser anterior ao horário de término',
      path: ['horaFim'],
    },
  );

export type BloqueioUnico = z.infer<typeof bloqueioUnicoSchema>;

/**
 * Bloqueio recorrente na agenda (ex: reunião semanal de equipe, almoço estendido toda quinta-feira).
 */
export const bloqueioRecorrenteSchema = z
  .object({
    id: z.string().min(1),
    tipo: z.literal('recorrente'),
    diaSemana: diaSemanaSchema,
    horaInicio: horaFormatadaSchema,
    horaFim: horaFormatadaSchema,
    frequencia: frequenciaRecorrenciaSchema.default('semanal'),
    dataInicio: dataIsoFormatadaSchema.optional(),
    dataFim: dataIsoFormatadaSchema.optional(),
    motivo: z.string().min(1, 'O motivo do bloqueio é obrigatório').max(200),
    profissionalId: z.string().default('default'),
    ativo: z.boolean().default(true),
    criadoPor: z.string(),
    criadoEm: z.string(),
    atualizadoEm: z.string().optional(),
  })
  .refine((data) => data.horaInicio < data.horaFim, {
    message: 'O horário de início do bloqueio deve ser anterior ao horário de término',
    path: ['horaFim'],
  })
  .refine(
    (data) => {
      if (!data.dataInicio || !data.dataFim) return true;
      return data.dataInicio <= data.dataFim;
    },
    {
      message: 'A data inicial da recorrência deve ser anterior ou igual à data final',
      path: ['dataFim'],
    },
  );

export type BloqueioRecorrente = z.infer<typeof bloqueioRecorrenteSchema>;

export const bloqueioAgendaSchema = z.discriminatedUnion('tipo', [
  bloqueioUnicoSchema,
  bloqueioRecorrenteSchema,
]);

export type BloqueioAgenda = z.infer<typeof bloqueioAgendaSchema>;

/**
 * Schemas de entrada para criação de bloqueios.
 */
export const criarBloqueioUnicoInputSchema = z
  .object({
    tipo: z.literal('unico'),
    data: dataIsoFormatadaSchema,
    horaInicio: horaFormatadaSchema,
    horaFim: horaFormatadaSchema,
    diaInteiro: z.boolean().optional().default(false),
    motivo: z.string().min(1, 'O motivo do bloqueio é obrigatório').max(200),
    profissionalId: z.string().optional().default('default'),
  })
  .refine(
    (data) => {
      if (data.diaInteiro) return true;
      return data.horaInicio < data.horaFim;
    },
    {
      message: 'O horário de início do bloqueio deve ser anterior ao horário de término',
      path: ['horaFim'],
    },
  );

export type CriarBloqueioUnicoInput = z.infer<typeof criarBloqueioUnicoInputSchema>;

export const criarBloqueioRecorrenteInputSchema = z
  .object({
    tipo: z.literal('recorrente'),
    diaSemana: diaSemanaSchema,
    horaInicio: horaFormatadaSchema,
    horaFim: horaFormatadaSchema,
    frequencia: frequenciaRecorrenciaSchema.optional().default('semanal'),
    dataInicio: dataIsoFormatadaSchema.optional(),
    dataFim: dataIsoFormatadaSchema.optional(),
    motivo: z.string().min(1, 'O motivo do bloqueio é obrigatório').max(200),
    profissionalId: z.string().optional().default('default'),
  })
  .refine((data) => data.horaInicio < data.horaFim, {
    message: 'O horário de início do bloqueio deve ser anterior ao horário de término',
    path: ['horaFim'],
  })
  .refine(
    (data) => {
      if (!data.dataInicio || !data.dataFim) return true;
      return data.dataInicio <= data.dataFim;
    },
    {
      message: 'A data inicial da recorrência deve ser anterior ou igual à data final',
      path: ['dataFim'],
    },
  );

export type CriarBloqueioRecorrenteInput = z.infer<typeof criarBloqueioRecorrenteInputSchema>;

export const criarBloqueioInputSchema = z.discriminatedUnion('tipo', [
  criarBloqueioUnicoInputSchema,
  criarBloqueioRecorrenteInputSchema,
]);

export type CriarBloqueioInput = z.infer<typeof criarBloqueioInputSchema>;

/**
 * Reserva para cliente fixo (horário fixo semanal ou quinzenal reservado na agenda).
 */
export const horarioFixoClienteSchema = z
  .object({
    id: z.string().min(1),
    clienteId: z.string().min(1, 'ID do cliente é obrigatório'),
    clienteNome: z.string().min(1, 'Nome do cliente é obrigatório'),
    clienteTelefone: z.string().optional(),
    clienteEmail: z.string().email('E-mail do cliente inválido').optional(),
    servicoId: z.string().optional(),
    servicoNome: z.string().optional(),
    profissionalId: z.string().default('default'),
    diaSemana: diaSemanaSchema,
    horaInicio: horaFormatadaSchema,
    horaFim: horaFormatadaSchema,
    frequencia: frequenciaRecorrenciaSchema.default('semanal'),
    dataInicio: dataIsoFormatadaSchema,
    dataFim: dataIsoFormatadaSchema.optional(),
    observacoes: z.string().max(300).optional(),
    ativo: z.boolean().default(true),
    criadoPor: z.string(),
    criadoEm: z.string(),
    atualizadoEm: z.string().optional(),
  })
  .refine((data) => data.horaInicio < data.horaFim, {
    message: 'O horário de início deve ser anterior ao horário de término',
    path: ['horaFim'],
  })
  .refine(
    (data) => {
      if (!data.dataFim) return true;
      return data.dataInicio <= data.dataFim;
    },
    {
      message: 'A data inicial do horário fixo deve ser anterior ou igual à data final',
      path: ['dataFim'],
    },
  );

export type HorarioFixoCliente = z.infer<typeof horarioFixoClienteSchema>;

/**
 * Entrada para criar reserva de cliente fixo.
 */
export const criarHorarioFixoInputSchema = z
  .object({
    clienteId: z.string().min(1, 'ID do cliente é obrigatório'),
    clienteNome: z.string().min(1, 'Nome do cliente é obrigatório'),
    clienteTelefone: z.string().optional(),
    clienteEmail: z.string().email('E-mail do cliente inválido').optional(),
    servicoId: z.string().optional(),
    servicoNome: z.string().optional(),
    profissionalId: z.string().optional().default('default'),
    diaSemana: diaSemanaSchema,
    horaInicio: horaFormatadaSchema,
    horaFim: horaFormatadaSchema,
    frequencia: frequenciaRecorrenciaSchema.optional().default('semanal'),
    dataInicio: dataIsoFormatadaSchema,
    dataFim: dataIsoFormatadaSchema.optional(),
    observacoes: z.string().max(300).optional(),
    ativo: z.boolean().optional().default(true),
  })
  .refine((data) => data.horaInicio < data.horaFim, {
    message: 'O horário de início deve ser anterior ao horário de término',
    path: ['horaFim'],
  })
  .refine(
    (data) => {
      if (!data.dataFim) return true;
      return data.dataInicio <= data.dataFim;
    },
    {
      message: 'A data inicial do horário fixo deve ser anterior ou igual à data final',
      path: ['dataFim'],
    },
  );

export type CriarHorarioFixoInput = z.infer<typeof criarHorarioFixoInputSchema>;

export const atualizarHorarioFixoInputSchema = z
  .object({
    id: z.string().min(1),
    diaSemana: diaSemanaSchema.optional(),
    horaInicio: horaFormatadaSchema.optional(),
    horaFim: horaFormatadaSchema.optional(),
    frequencia: frequenciaRecorrenciaSchema.optional(),
    servicoId: z.string().optional(),
    servicoNome: z.string().optional(),
    dataInicio: dataIsoFormatadaSchema.optional(),
    dataFim: dataIsoFormatadaSchema.optional(),
    observacoes: z.string().max(300).optional(),
    ativo: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.horaInicio && data.horaFim) {
        return data.horaInicio < data.horaFim;
      }
      return true;
    },
    {
      message: 'O horário de início deve ser anterior ao horário de término',
      path: ['horaFim'],
    },
  );

export type AtualizarHorarioFixoInput = z.infer<typeof atualizarHorarioFixoInputSchema>;

/**
 * Interface para checagem de conflitos na agenda.
 */
export interface ParametrosChecagemConflito {
  dataHoraInicioIso: string;
  dataHoraFimIso: string;
  clienteIdSolicitante?: string;
  bloqueios: BloqueioAgenda[];
  horariosFixos: HorarioFixoCliente[];
}

export interface ResultadoChecagemConflito {
  conflito: boolean;
  motivo?: string;
  tipoConflito?: 'bloqueio_unico' | 'bloqueio_recorrente' | 'horario_fixo_outro_cliente';
  detalhes?: {
    id: string;
    descricao: string;
  };
}

/**
 * Extrai componentes de data e horário local no formato YYYY-MM-DD, dia da semana (0..6) e HH:mm.
 */
export function extrairDataHoraLocal(isoString: string): {
  dataYmd: string;
  diaSemana: number;
  horaFormatada: string;
} {
  const data = new Date(isoString);
  // Converte para componentes de data no fuso padrão
  const ano = data.getUTCFullYear();
  const mesNum = data.getUTCMonth();
  const diaNum = data.getUTCDate();
  const mes = String(mesNum + 1).padStart(2, '0');
  const dia = String(diaNum).padStart(2, '0');
  const hora = String(data.getUTCHours()).padStart(2, '0');
  const minuto = String(data.getUTCMinutes()).padStart(2, '0');

  // Para compatibilidade com datas completas em ISO locais ou UTC
  const dataYmd = isoString.includes('T') ? isoString.substring(0, 10) : `${ano}-${mes}-${dia}`;
  const horaFormatada = isoString.includes('T') ? isoString.substring(11, 16) : `${hora}:${minuto}`;

  // dia da semana baseado na data YMD
  const partes = dataYmd.split('-');
  const y = Number(partes[0]) || ano;
  const m = partes[1] !== undefined ? Number(partes[1]) - 1 : mesNum;
  const d = Number(partes[2]) || diaNum;
  const dataObj = new Date(Date.UTC(y, m, d));
  const diaSemana = dataObj.getUTCDay();

  return { dataYmd, diaSemana, horaFormatada };
}

/**
 * Determina se duas faixas de horário (formato HH:mm) se sobrepõem.
 * [inicioA, fimA] e [inicioB, fimB] colidem quando inicioA < fimB e fimA > inicioB.
 */
export function horariosColidem(
  inicioA: string,
  fimA: string,
  inicioB: string,
  fimB: string,
): boolean {
  return inicioA < fimB && fimA > inicioB;
}

/**
 * Função pura que verifica se uma solicitação de atendimento colide com bloqueios únicos,
 * bloqueios recorrentes ou horários fixos de outros clientes.
 */
export function verificarConflitoBloqueioOuHorarioFixo(
  params: ParametrosChecagemConflito,
): ResultadoChecagemConflito {
  const { dataHoraInicioIso, dataHoraFimIso, clienteIdSolicitante, bloqueios, horariosFixos } =
    params;

  const inicio = extrairDataHoraLocal(dataHoraInicioIso);
  const fim = extrairDataHoraLocal(dataHoraFimIso);

  const horaInicioAgendamento = inicio.horaFormatada;
  const horaFimAgendamento = fim.horaFormatada;
  const dataYmdAgendamento = inicio.dataYmd;
  const diaSemanaAgendamento = inicio.diaSemana;

  // 1. Verificar Bloqueios Únicos
  for (const bloqueio of bloqueios) {
    if (!bloqueio.ativo) continue;

    if (bloqueio.tipo === 'unico') {
      if (bloqueio.data === dataYmdAgendamento) {
        if (
          bloqueio.diaInteiro ||
          horariosColidem(
            horaInicioAgendamento,
            horaFimAgendamento,
            bloqueio.horaInicio,
            bloqueio.horaFim,
          )
        ) {
          return {
            conflito: true,
            motivo: `Horário indisponível devido a bloqueio pontual na agenda: ${bloqueio.motivo}`,
            tipoConflito: 'bloqueio_unico',
            detalhes: { id: bloqueio.id, descricao: bloqueio.motivo },
          };
        }
      }
    }
  }

  // 2. Verificar Bloqueios Recorrentes
  for (const bloqueio of bloqueios) {
    if (!bloqueio.ativo) continue;

    if (bloqueio.tipo === 'recorrente') {
      if (bloqueio.diaSemana === diaSemanaAgendamento) {
        // Validação do período de vigência da recorrência
        if (bloqueio.dataInicio && dataYmdAgendamento < bloqueio.dataInicio) {
          continue;
        }
        if (bloqueio.dataFim && dataYmdAgendamento > bloqueio.dataFim) {
          continue;
        }

        // Validação quinzenal (se aplicável)
        if (bloqueio.frequencia === 'quinzenal' && bloqueio.dataInicio) {
          const inicioDate = new Date(bloqueio.dataInicio).getTime();
          const agendDate = new Date(dataYmdAgendamento).getTime();
          const diffWeeks = Math.floor((agendDate - inicioDate) / (1000 * 60 * 60 * 24 * 7));
          if (diffWeeks % 2 !== 0) {
            continue;
          }
        }

        if (
          horariosColidem(
            horaInicioAgendamento,
            horaFimAgendamento,
            bloqueio.horaInicio,
            bloqueio.horaFim,
          )
        ) {
          return {
            conflito: true,
            motivo: `Horário indisponível devido a bloqueio recorrente na agenda: ${bloqueio.motivo}`,
            tipoConflito: 'bloqueio_recorrente',
            detalhes: { id: bloqueio.id, descricao: bloqueio.motivo },
          };
        }
      }
    }
  }

  // 3. Verificar Horários Fixos de Clientes
  for (const horarioFixo of horariosFixos) {
    if (!horarioFixo.ativo) continue;

    // Se o cliente solicitante for o próprio titular do horário fixo, não gera conflito para ele
    if (clienteIdSolicitante && horarioFixo.clienteId === clienteIdSolicitante) {
      continue;
    }

    if (horarioFixo.diaSemana === diaSemanaAgendamento) {
      // Período de vigência
      if (dataYmdAgendamento < horarioFixo.dataInicio) {
        continue;
      }
      if (horarioFixo.dataFim && dataYmdAgendamento > horarioFixo.dataFim) {
        continue;
      }

      // Quinzenal
      if (horarioFixo.frequencia === 'quinzenal') {
        const inicioDate = new Date(horarioFixo.dataInicio).getTime();
        const agendDate = new Date(dataYmdAgendamento).getTime();
        const diffWeeks = Math.floor((agendDate - inicioDate) / (1000 * 60 * 60 * 24 * 7));
        if (diffWeeks % 2 !== 0) {
          continue;
        }
      }

      if (
        horariosColidem(
          horaInicioAgendamento,
          horaFimAgendamento,
          horarioFixo.horaInicio,
          horarioFixo.horaFim,
        )
      ) {
        return {
          conflito: true,
          motivo:
            'O horário selecionado está reservado para atendimento exclusivo de um cliente fixo da clínica.',
          tipoConflito: 'horario_fixo_outro_cliente',
          detalhes: {
            id: horarioFixo.id,
            descricao: `Horário fixo reservado (${horarioFixo.horaInicio} às ${horarioFixo.horaFim})`,
          },
        };
      }
    }
  }

  return { conflito: false };
}
