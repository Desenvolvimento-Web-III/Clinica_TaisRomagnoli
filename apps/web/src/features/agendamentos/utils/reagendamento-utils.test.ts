import { describe, it, expect } from 'vitest';
import { CONFIGURACAO_HORARIOS_PADRAO } from '@clinica/shared';
import { gerarDiasReagendamento } from './reagendamento-utils';

describe('reagendamento-utils', () => {
  describe('gerarDiasReagendamento', () => {
    it('gera os dias seguintes a uma quarta-feira excluindo rigorosamente domingo e terça-feira', () => {
      // 2026-11-18 é Quarta-feira
      const dataQuarta = '2026-11-18T10:00:00';
      const dataHoje = new Date('2026-11-18T08:00:00');

      const dias = gerarDiasReagendamento(dataQuarta, dataHoje, 6, CONFIGURACAO_HORARIOS_PADRAO);

      expect(dias).toHaveLength(6);

      // Dias gerados:
      // 1. Qui 19 Nov
      // 2. Sex 20 Nov
      // 3. Sáb 21 Nov
      // (Dom 22 Nov ignorado - folga)
      // 4. Seg 23 Nov
      // (Ter 24 Nov ignorado - folga)
      // 5. Qua 25 Nov
      // 6. Qui 26 Nov
      expect(dias[0]?.isoDate).toBe('2026-11-19');
      expect(dias[0]?.diaSemanaFormatado).toBe('Quinta-feira');

      expect(dias[1]?.isoDate).toBe('2026-11-20');
      expect(dias[1]?.diaSemanaFormatado).toBe('Sexta-feira');

      expect(dias[2]?.isoDate).toBe('2026-11-21');
      expect(dias[2]?.diaSemanaFormatado).toBe('Sábado');

      expect(dias[3]?.isoDate).toBe('2026-11-23');
      expect(dias[3]?.diaSemanaFormatado).toBe('Segunda-feira');

      expect(dias[4]?.isoDate).toBe('2026-11-25');
      expect(dias[4]?.diaSemanaFormatado).toBe('Quarta-feira');

      expect(dias[5]?.isoDate).toBe('2026-11-26');
      expect(dias[5]?.diaSemanaFormatado).toBe('Quinta-feira');

      // Nenhuma opção deve ser domingo (0) ou terça-feira (2)
      dias.forEach((d) => {
        const diaSemana = new Date(d.isoDate + 'T12:00:00').getDay();
        expect(diaSemana).not.toBe(0);
        expect(diaSemana).not.toBe(2);
      });
    });

    it('começa a partir de amanhã caso o agendamento original seja de uma data passada', () => {
      // Agendamento em outubro (já passou)
      const agendamentoAntigo = '2026-10-15T14:00:00';
      // Hoje é 2026-11-13 (sexta-feira)
      const dataHoje = new Date('2026-11-13T10:00:00');

      const dias = gerarDiasReagendamento(agendamentoAntigo, dataHoje, 4, CONFIGURACAO_HORARIOS_PADRAO);

      expect(dias).toHaveLength(4);
      // Amanhã é sábado 2026-11-14
      expect(dias[0]?.isoDate).toBe('2026-11-14');
      expect(dias[0]?.diaSemanaFormatado).toBe('Sábado');

      // Domingo 15 é folga!
      // Segunda 16 é dia de atendimento
      expect(dias[1]?.isoDate).toBe('2026-11-16');
      expect(dias[1]?.diaSemanaFormatado).toBe('Segunda-feira');

      // Terça 17 é folga!
      // Quarta 18 é dia de atendimento
      expect(dias[2]?.isoDate).toBe('2026-11-18');
      expect(dias[2]?.diaSemanaFormatado).toBe('Quarta-feira');

      // Quinta 19 é dia de atendimento
      expect(dias[3]?.isoDate).toBe('2026-11-19');
      expect(dias[3]?.diaSemanaFormatado).toBe('Quinta-feira');
    });

    it('usa os dias ativos da configuração da clínica em vez de folgas fixas', () => {
      const configuracao = structuredClone(CONFIGURACAO_HORARIOS_PADRAO);
      configuracao.dias = configuracao.dias.map((dia) => ({
        ...dia,
        ativo: dia.dia === 2 || dia.dia === 6,
        turnos: dia.dia === 2 || dia.dia === 6 ? [{ inicio: '09:00', fim: '13:00' }] : [],
      }));

      const dias = gerarDiasReagendamento(
        '2026-11-18T10:00:00',
        new Date('2026-11-18T08:00:00'),
        3,
        configuracao,
      );

      expect(dias.map((dia) => dia.isoDate)).toEqual(['2026-11-21', '2026-11-24', '2026-11-28']);
    });
  });
});
