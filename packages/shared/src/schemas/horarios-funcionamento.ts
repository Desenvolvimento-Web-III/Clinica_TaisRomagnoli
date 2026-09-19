import { z } from 'zod';

/**
 * Representa os dias da semana em formato numérico (padrão JavaScript / ISO):
 * 0: Domingo, 1: Segunda-feira, 2: Terça-feira, 3: Quarta-feira,
 * 4: Quinta-feira, 5: Sexta-feira, 6: Sábado.
 */
export const diaSemanaSchema = z
  .number()
  .int('O dia da semana deve ser um número inteiro')
  .min(0, 'O dia da semana deve ser entre 0 (domingo) e 6 (sábado)')
  .max(6, 'O dia da semana deve ser entre 0 (domingo) e 6 (sábado)');

export type DiaSemana = z.infer<typeof diaSemanaSchema>;

export const NOMES_DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

export const horaFormatadaSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    'Formato de horário inválido. Esperado HH:mm (00:00 a 23:59)',
  );

/**
 * Faixa de horário ou turno (início e término).
 * Garante que o início seja estritamente anterior ao término.
 */
export const faixaHorarioSchema = z
  .object({
    inicio: horaFormatadaSchema,
    fim: horaFormatadaSchema,
  })
  .refine((data) => data.inicio < data.fim, {
    message: 'O horário de início deve ser anterior ao horário de término',
    path: ['fim'],
  });

export type FaixaHorario = z.infer<typeof faixaHorarioSchema>;

/**
 * Intervalo de manutenção ou pausa técnica da clínica (ex: higienização, assepsia, almoço ou manutenção de equipamentos).
 */
export const intervaloManutencaoSchema = z
  .object({
    inicio: horaFormatadaSchema,
    fim: horaFormatadaSchema,
    descricao: z.string().max(100, 'A descrição deve ter no máximo 100 caracteres').optional(),
  })
  .refine((data) => data.inicio < data.fim, {
    message: 'O horário inicial da manutenção deve ser anterior ao horário final',
    path: ['fim'],
  });

export type IntervaloManutencao = z.infer<typeof intervaloManutencaoSchema>;

/**
 * Configuração de funcionamento de um dia específico da semana.
 */
export const diaFuncionamentoSchema = z
  .object({
    dia: diaSemanaSchema,
    ativo: z.boolean(),
    turnos: z.array(faixaHorarioSchema),
    intervaloMinutos: z
      .number()
      .int('O intervalo deve ser um número inteiro')
      .min(0, 'O intervalo em minutos não pode ser negativo'),
    intervalosManutencao: z.array(intervaloManutencaoSchema).default([]),
  })
  .refine(
    (data) => {
      if (!data.ativo || data.turnos.length <= 1) {
        return true;
      }
      // Ordena os turnos por horário de início e verifica se há sobreposição
      const ordenados = [...data.turnos].sort((a, b) => a.inicio.localeCompare(b.inicio));
      for (let i = 0; i < ordenados.length - 1; i++) {
        const turnoAtual = ordenados[i];
        const proximoTurno = ordenados[i + 1];
        if (turnoAtual && proximoTurno && turnoAtual.fim > proximoTurno.inicio) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Não é permitida a sobreposição de horários/turnos no mesmo dia',
      path: ['turnos'],
    },
  )
  .refine(
    (data) => {
      if (!data.ativo || !data.intervalosManutencao || data.intervalosManutencao.length <= 1) {
        return true;
      }
      // Ordena os intervalos de manutenção e verifica se há sobreposição entre eles
      const ordenados = [...data.intervalosManutencao].sort((a, b) =>
        a.inicio.localeCompare(b.inicio),
      );
      for (let i = 0; i < ordenados.length - 1; i++) {
        const atual = ordenados[i];
        const proximo = ordenados[i + 1];
        if (atual && proximo && atual.fim > proximo.inicio) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Não é permitida a sobreposição de intervalos de manutenção no mesmo dia',
      path: ['intervalosManutencao'],
    },
  );

export type DiaFuncionamento = z.infer<typeof diaFuncionamentoSchema>;

/**
 * Configuração completa dos horários de funcionamento da clínica.
 */
export const horariosFuncionamentoSchema = z.object({
  dias: z.array(diaFuncionamentoSchema).refine(
    (dias) => {
      if (dias.length !== 7) return false;
      const diasCadastrados = new Set(dias.map((item) => item.dia));
      return (
        diasCadastrados.size === 7 && [0, 1, 2, 3, 4, 5, 6].every((d) => diasCadastrados.has(d))
      );
    },
    {
      message: 'A configuração deve conter exatamente os 7 dias da semana (de 0 a 6)',
      path: ['dias'],
    },
  ),
  intervaloPadraoMinutos: z
    .number()
    .int('O intervalo padrão deve ser inteiro')
    .min(0, 'O intervalo padrão não pode ser negativo')
    .default(30),
  professionalId: z.string().optional(),
  atualizadoEm: z.string().optional(),
  atualizadoPor: z.string().optional(),
});

export type HorariosFuncionamento = z.infer<typeof horariosFuncionamentoSchema>;

/**
 * Schema de entrada para salvar/atualizar os horários pelo backend ou admin.
 */
export const salvarHorariosInputSchema = horariosFuncionamentoSchema.omit({
  atualizadoEm: true,
  atualizadoPor: true,
});

export type SalvarHorariosInput = z.infer<typeof salvarHorariosInputSchema>;

/**
 * Configuração padrão inicial da clínica:
 * - Terças e domingos são dias de folga (ativo: false);
 * - Segundas, quartas, quintas, sextas e sábados são dias de atendimento (ativo: true);
 * - Intervalo padrão entre atendimentos de 30 minutos;
 * - Todas as configurações são dinâmicas e editáveis no banco de dados.
 */
export const CONFIGURACAO_HORARIOS_PADRAO: HorariosFuncionamento = {
  intervaloPadraoMinutos: 30,
  dias: [
    // 0: Domingo (folga)
    {
      dia: 0,
      ativo: false,
      turnos: [],
      intervaloMinutos: 30,
      intervalosManutencao: [],
    },
    // 1: Segunda-feira (atendimento)
    {
      dia: 1,
      ativo: true,
      turnos: [
        { inicio: '08:00', fim: '12:00' },
        { inicio: '14:00', fim: '18:00' },
      ],
      intervaloMinutos: 30,
      intervalosManutencao: [
        { inicio: '12:00', fim: '14:00', descricao: 'Almoço e higienização das salas' },
      ],
    },
    // 2: Terça-feira (folga)
    {
      dia: 2,
      ativo: false,
      turnos: [],
      intervaloMinutos: 30,
      intervalosManutencao: [],
    },
    // 3: Quarta-feira (atendimento)
    {
      dia: 3,
      ativo: true,
      turnos: [
        { inicio: '08:00', fim: '12:00' },
        { inicio: '14:00', fim: '18:00' },
      ],
      intervaloMinutos: 30,
      intervalosManutencao: [
        { inicio: '12:00', fim: '14:00', descricao: 'Almoço e higienização das salas' },
      ],
    },
    // 4: Quinta-feira (atendimento)
    {
      dia: 4,
      ativo: true,
      turnos: [
        { inicio: '08:00', fim: '12:00' },
        { inicio: '14:00', fim: '18:00' },
      ],
      intervaloMinutos: 30,
      intervalosManutencao: [
        { inicio: '12:00', fim: '14:00', descricao: 'Almoço e higienização das salas' },
      ],
    },
    // 5: Sexta-feira (atendimento)
    {
      dia: 5,
      ativo: true,
      turnos: [
        { inicio: '08:00', fim: '12:00' },
        { inicio: '14:00', fim: '18:00' },
      ],
      intervaloMinutos: 30,
      intervalosManutencao: [
        { inicio: '12:00', fim: '14:00', descricao: 'Almoço e higienização das salas' },
      ],
    },
    // 6: Sábado (atendimento)
    {
      dia: 6,
      ativo: true,
      turnos: [
        { inicio: '08:00', fim: '12:00' },
        { inicio: '14:00', fim: '18:00' },
      ],
      intervaloMinutos: 30,
      intervalosManutencao: [
        { inicio: '12:00', fim: '14:00', descricao: 'Almoço e higienização das salas' },
      ],
    },
  ],
};
