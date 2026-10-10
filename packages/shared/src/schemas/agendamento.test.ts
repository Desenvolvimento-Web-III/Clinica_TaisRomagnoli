import { describe, it, expect } from 'vitest';
import {
  solicitarAgendamentoInputSchema,
  cancelarAgendamentoInputSchema,
  calcularValoresAgendamento,
  calcularDataHoraFim,
  verificarConflitoHorarios,
  verificarAntecedenciaCancelamento,
} from './agendamento.js';

describe('Agendamento Schemas e Regras de Negócio (@clinica/shared)', () => {
  describe('solicitarAgendamentoInputSchema', () => {
    it('valida payload correto para solicitação de agendamento pelo cliente', () => {
      const input = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix',
      };

      const resultado = solicitarAgendamentoInputSchema.safeParse(input);
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.profissionalId).toBe('prof-tais-romagnoli');
        expect(resultado.data.profissionalNome).toBe('Tais Romagnoli');
        expect(resultado.data.isencaoSinalAdmin).toBe(false);
      }
    });

    it('rejeita payload com duração inválida ou valor negativo', () => {
      const inputInvalido = {
        servicoId: '',
        servicoNome: '',
        duracaoMinutos: 5, // menor que 15
        valorTotalEmCentavos: -100,
        dataHoraInicio: 'data-invalida',
        metodoPagamento: 'invalido',
      };

      const resultado = solicitarAgendamentoInputSchema.safeParse(inputInvalido);
      expect(resultado.success).toBe(false);
    });
  });

  describe('cancelarAgendamentoInputSchema', () => {
    it('valida input de cancelamento com id e motivo opcional', () => {
      const resultado = cancelarAgendamentoInputSchema.safeParse({
        agendamentoId: 'ag-12345',
        motivo: 'Imprevisto de trabalho',
      });
      expect(resultado.success).toBe(true);
    });
  });

  describe('calcularValoresAgendamento', () => {
    it('calcula 30% de sinal e saldo restante para cliente padrão', () => {
      const valores = calcularValoresAgendamento(17000, 30, false);
      expect(valores.valorTotalEmCentavos).toBe(17000);
      expect(valores.valorSinalEmCentavos).toBe(5100); // 30% de 17000
      expect(valores.saldoRestanteEmCentavos).toBe(11900); // 70% de 17000
      expect(valores.sinalIsento).toBe(false);
    });

    it('isenta sinal quando solicitado pela administradora (presencial)', () => {
      const valores = calcularValoresAgendamento(17000, 30, true);
      expect(valores.valorTotalEmCentavos).toBe(17000);
      expect(valores.valorSinalEmCentavos).toBe(0);
      expect(valores.saldoRestanteEmCentavos).toBe(17000);
      expect(valores.sinalIsento).toBe(true);
    });
  });

  describe('calcularDataHoraFim', () => {
    it('adiciona duração de 60 minutos à data/hora de início', () => {
      const inicioIso = '2026-10-22T10:00:00.000Z';
      const fimIso = calcularDataHoraFim(inicioIso, 60);
      expect(fimIso).toBe('2026-10-22T11:00:00.000Z');
    });
  });

  describe('verificarConflitoHorarios', () => {
    it('detecta conflito quando horários se sobrepõem diretamente', () => {
      const novo = {
        inicioIso: '2026-10-22T10:00:00.000Z',
        fimIso: '2026-10-22T11:00:00.000Z',
        intervaloMinutos: 30,
      };
      const existente = {
        inicioIso: '2026-10-22T10:30:00.000Z',
        fimIso: '2026-10-22T11:30:00.000Z',
        intervaloMinutos: 30,
      };

      expect(verificarConflitoHorarios(novo, existente)).toBe(true);
    });

    it('detecta conflito quando novo atendimento tenta agendar durante o intervalo de 30min', () => {
      const existente = {
        inicioIso: '2026-10-22T09:00:00.000Z',
        fimIso: '2026-10-22T10:00:00.000Z',
        intervaloMinutos: 30, // ocupa até 10:30
      };
      const novo = {
        inicioIso: '2026-10-22T10:15:00.000Z',
        fimIso: '2026-10-22T11:15:00.000Z',
        intervaloMinutos: 30,
      };

      expect(verificarConflitoHorarios(novo, existente)).toBe(true);
    });

    it('permite agendamento que respeita o término + 30 min de intervalo', () => {
      const existente = {
        inicioIso: '2026-10-22T09:00:00.000Z',
        fimIso: '2026-10-22T10:00:00.000Z',
        intervaloMinutos: 30, // liberado a partir das 10:30
      };
      const novo = {
        inicioIso: '2026-10-22T10:30:00.000Z',
        fimIso: '2026-10-22T11:30:00.000Z',
        intervaloMinutos: 30,
      };

      expect(verificarConflitoHorarios(novo, existente)).toBe(false);
    });
  });

  describe('verificarAntecedenciaCancelamento e classificarCancelamento', () => {
    it('classifica como "no_prazo" com mais de 3 horas de antecedência, liberando o sinal para reagendamento', () => {
      const inicio = '2026-10-22T14:00:00.000Z';
      const agora = new Date('2026-10-22T09:00:00.000Z'); // 5 horas antes

      const resultado = verificarAntecedenciaCancelamento(inicio, 3, agora);
      expect(resultado.permitido).toBe(true);
      expect(resultado.classificacao).toBe('no_prazo');
      expect(resultado.sinalRetido).toBe(false);
      expect(resultado.sinalDisponivelReagendamento).toBe(true);
      expect(resultado.horasRestantes).toBe(5);
      expect(resultado.minutosRestantes).toBe(300);
      expect(resultado.mensagemBrandbook).toContain(
        'Você pode usar o valor do sinal em um novo agendamento.',
      );
    });

    it('classifica como "no_prazo" no limite exato de 3 horas (180 minutos)', () => {
      const inicio = '2026-10-22T14:00:00.000Z';
      const agora = new Date('2026-10-22T11:00:00.000Z'); // Exatamente 3 horas antes

      const resultado = verificarAntecedenciaCancelamento(inicio, 3, agora);
      expect(resultado.permitido).toBe(true);
      expect(resultado.classificacao).toBe('no_prazo');
      expect(resultado.sinalRetido).toBe(false);
      expect(resultado.sinalDisponivelReagendamento).toBe(true);
      expect(resultado.minutosRestantes).toBe(180);
    });

    it('classifica como "tardio" com 2 horas e 59 minutos de antecedência (perda do sinal)', () => {
      const inicio = '2026-10-22T14:00:00.000Z';
      const agora = new Date('2026-10-22T11:01:00.000Z'); // 2h59min antes (179 min)

      const resultado = verificarAntecedenciaCancelamento(inicio, 3, agora);
      expect(resultado.permitido).toBe(false);
      expect(resultado.classificacao).toBe('tardio');
      expect(resultado.sinalRetido).toBe(true);
      expect(resultado.sinalDisponivelReagendamento).toBe(false);
      expect(resultado.minutosRestantes).toBe(179);
      expect(resultado.mensagemBrandbook).toContain(
        'Como faltam menos de três horas para a sessão, o valor do sinal não poderá ser reutilizado.',
      );
    });

    it('classifica como "tardio" quando cancelamento ocorre com menos de 3 horas ou a posteriori', () => {
      const inicio = '2026-10-22T14:00:00.000Z';
      const agora = new Date('2026-10-22T12:30:00.000Z'); // 1h30 antes

      const resultado = verificarAntecedenciaCancelamento(inicio, 3, agora);
      expect(resultado.permitido).toBe(false);
      expect(resultado.classificacao).toBe('tardio');
      expect(resultado.sinalRetido).toBe(true);
      expect(resultado.sinalDisponivelReagendamento).toBe(false);
      expect(resultado.horasRestantes).toBe(1);
      expect(resultado.minutosRestantes).toBe(90);
    });

    it('classifica como "tardio" quando a sessão já começou ou passou', () => {
      const inicio = '2026-10-22T14:00:00.000Z';
      const agora = new Date('2026-10-22T14:30:00.000Z'); // 30 min após o início

      const resultado = verificarAntecedenciaCancelamento(inicio, 3, agora);
      expect(resultado.permitido).toBe(false);
      expect(resultado.classificacao).toBe('tardio');
      expect(resultado.sinalRetido).toBe(true);
      expect(resultado.sinalDisponivelReagendamento).toBe(false);
    });
  });
});
