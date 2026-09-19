import { describe, expect, it } from 'vitest';
import {
  CONFIGURACAO_HORARIOS_PADRAO,
  faixaHorarioSchema,
  diaFuncionamentoSchema,
  horariosFuncionamentoSchema,
  salvarHorariosInputSchema,
} from './horarios-funcionamento.js';

describe('horariosFuncionamentoSchema', () => {
  it('valida com sucesso a configuração padrão da clínica', () => {
    const resultado = horariosFuncionamentoSchema.safeParse(CONFIGURACAO_HORARIOS_PADRAO);
    expect(resultado.success).toBe(true);

    if (resultado.success) {
      expect(resultado.data.dias).toHaveLength(7);
      // Domingo (0) e Terça (2) são folgas
      const domingo = resultado.data.dias.find((d) => d.dia === 0);
      const terca = resultado.data.dias.find((d) => d.dia === 2);
      expect(domingo?.ativo).toBe(false);
      expect(terca?.ativo).toBe(false);

      // Segunda (1) é dia ativo com turnos e intervalo padrão de 30 min
      const segunda = resultado.data.dias.find((d) => d.dia === 1);
      expect(segunda?.ativo).toBe(true);
      expect(segunda?.turnos).toHaveLength(2);
      expect(segunda?.intervaloMinutos).toBe(30);
    }
  });

  it('rejeita faixa de horário em que início é maior ou igual ao fim', () => {
    const faixaInvalida = { inicio: '12:00', fim: '08:00' };
    const resultado = faixaHorarioSchema.safeParse(faixaInvalida);
    expect(resultado.success).toBe(false);

    const faixaIgual = { inicio: '10:00', fim: '10:00' };
    const resultadoIgual = faixaHorarioSchema.safeParse(faixaIgual);
    expect(resultadoIgual.success).toBe(false);
  });

  it('rejeita formato de horário fora do padrão HH:mm', () => {
    const faixaInvalida = { inicio: '8:00', fim: '12:00' };
    const resultado = faixaHorarioSchema.safeParse(faixaInvalida);
    expect(resultado.success).toBe(false);
  });

  it('rejeita sobreposição de turnos no mesmo dia', () => {
    const diaComSobreposicao = {
      dia: 1,
      ativo: true,
      turnos: [
        { inicio: '08:00', fim: '12:00' },
        { inicio: '11:30', fim: '16:00' }, // sobrepõe com o fim das 12:00
      ],
      intervaloMinutos: 30,
    };

    const resultado = diaFuncionamentoSchema.safeParse(diaComSobreposicao);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toContain(
        'Não é permitida a sobreposição de horários/turnos no mesmo dia',
      );
    }
  });

  it('permite turnos consecutivos sem sobreposição', () => {
    const diaValido = {
      dia: 1,
      ativo: true,
      turnos: [
        { inicio: '08:00', fim: '12:00' },
        { inicio: '12:00', fim: '16:00' },
      ],
      intervaloMinutos: 30,
    };

    const resultado = diaFuncionamentoSchema.safeParse(diaValido);
    expect(resultado.success).toBe(true);
  });

  it('rejeita intervalo em minutos negativo', () => {
    const diaInvalido = {
      dia: 1,
      ativo: true,
      turnos: [{ inicio: '08:00', fim: '12:00' }],
      intervaloMinutos: -10,
    };

    const resultado = diaFuncionamentoSchema.safeParse(diaInvalido);
    expect(resultado.success).toBe(false);
  });

  it('rejeita configuração com menos de 7 dias da semana ou dias repetidos', () => {
    // 6 dias apenas
    const configIncompleta = {
      ...CONFIGURACAO_HORARIOS_PADRAO,
      dias: CONFIGURACAO_HORARIOS_PADRAO.dias.slice(0, 6),
    };
    expect(horariosFuncionamentoSchema.safeParse(configIncompleta).success).toBe(false);

    // Dias repetidos
    const configRepetida = {
      ...CONFIGURACAO_HORARIOS_PADRAO,
      dias: [
        ...CONFIGURACAO_HORARIOS_PADRAO.dias.slice(0, 6),
        CONFIGURACAO_HORARIOS_PADRAO.dias[0]!, // repete domingo
      ],
    };
    expect(horariosFuncionamentoSchema.safeParse(configRepetida).success).toBe(false);
  });

  it('valida input de atualização com salvarHorariosInputSchema', () => {
    const inputValido = {
      intervaloPadraoMinutos: 45,
      dias: CONFIGURACAO_HORARIOS_PADRAO.dias,
      professionalId: 'tais-01',
    };

    const resultado = salvarHorariosInputSchema.safeParse(inputValido);
    expect(resultado.success).toBe(true);
  });

  describe('intervalos de manutenção', () => {
    it('valida intervalo de manutenção com início, fim e descrição', () => {
      const diaComManutencao = {
        dia: 1,
        ativo: true,
        turnos: [
          { inicio: '08:00', fim: '12:00' },
          { inicio: '14:00', fim: '18:00' },
        ],
        intervaloMinutos: 30,
        intervalosManutencao: [
          {
            inicio: '12:00',
            fim: '14:00',
            descricao: 'Higienização das salas e almoço da profissional',
          },
        ],
      };

      const resultado = diaFuncionamentoSchema.safeParse(diaComManutencao);
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.intervalosManutencao).toHaveLength(1);
        expect(resultado.data.intervalosManutencao[0]?.descricao).toBe(
          'Higienização das salas e almoço da profissional',
        );
      }
    });

    it('rejeita sobreposição entre intervalos de manutenção no mesmo dia', () => {
      const diaComSobreposicaoManutencao = {
        dia: 1,
        ativo: true,
        turnos: [{ inicio: '08:00', fim: '18:00' }],
        intervaloMinutos: 30,
        intervalosManutencao: [
          { inicio: '11:00', fim: '13:00', descricao: 'Limpeza 1' },
          { inicio: '12:30', fim: '14:00', descricao: 'Limpeza 2' }, // sobreposição
        ],
      };

      const resultado = diaFuncionamentoSchema.safeParse(diaComSobreposicaoManutencao);
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues[0]?.message).toContain(
          'Não é permitida a sobreposição de intervalos de manutenção no mesmo dia',
        );
      }
    });
  });
});
