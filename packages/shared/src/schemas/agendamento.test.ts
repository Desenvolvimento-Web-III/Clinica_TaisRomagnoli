import { describe, it, expect } from 'vitest';
import {
  solicitarAgendamentoInputSchema,
  cancelarAgendamentoInputSchema,
  atualizarStatusAgendamentoInputSchema,
  statusAgendamentoSchema,
  validarTransicaoStatus,
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

    it('aceita clienteId e clienteNome opcionais e rejeita clienteId vazio', () => {
      const valido = solicitarAgendamentoInputSchema.safeParse({
        clienteId: 'cliente-presencial-1',
        clienteNome: 'Ana Paula',
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'presencial',
        isencaoSinalAdmin: true,
      });
      expect(valido.success).toBe(true);

      const invalido = solicitarAgendamentoInputSchema.safeParse({
        clienteId: '',
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'presencial',
      });
      expect(invalido.success).toBe(false);
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

  describe('Controle de Estados do Agendamento (Máquina de Estados)', () => {
    describe('statusAgendamentoSchema', () => {
      it('aceita todos os estados válidos definidos no ciclo de vida', () => {
        const estadosValidos = [
          'pendente',
          'confirmado',
          'em_andamento',
          'concluido',
          'cancelado',
          'reagendado',
          'falta',
        ];

        estadosValidos.forEach((status) => {
          expect(statusAgendamentoSchema.safeParse(status).success).toBe(true);
        });
      });

      it('rejeita estados inexistentes ou inválidos', () => {
        const invalidos = ['aguardando', 'finalizado', 'remarcado', '', 'null'];
        invalidos.forEach((status) => {
          expect(statusAgendamentoSchema.safeParse(status).success).toBe(false);
        });
      });
    });

    describe('validarTransicaoStatus', () => {
      it('permite manter o mesmo status (idempotente)', () => {
        expect(validarTransicaoStatus('confirmado', 'confirmado').valida).toBe(true);
        expect(validarTransicaoStatus('pendente', 'pendente').valida).toBe(true);
      });

      it('permite transições válidas a partir de "pendente"', () => {
        expect(validarTransicaoStatus('pendente', 'confirmado').valida).toBe(true);
        expect(validarTransicaoStatus('pendente', 'cancelado').valida).toBe(true);
        expect(validarTransicaoStatus('pendente', 'reagendado').valida).toBe(true);
        expect(validarTransicaoStatus('pendente', 'concluido').valida).toBe(false);
        expect(validarTransicaoStatus('pendente', 'falta').valida).toBe(false);
      });

      it('permite transições válidas a partir de "confirmado"', () => {
        expect(validarTransicaoStatus('confirmado', 'em_andamento').valida).toBe(true);
        expect(validarTransicaoStatus('confirmado', 'concluido').valida).toBe(true);
        expect(validarTransicaoStatus('confirmado', 'cancelado').valida).toBe(true);
        expect(validarTransicaoStatus('confirmado', 'reagendado').valida).toBe(true);
        expect(validarTransicaoStatus('confirmado', 'falta').valida).toBe(true);
        expect(validarTransicaoStatus('confirmado', 'pendente').valida).toBe(false);
      });

      it('permite transições válidas a partir de "em_andamento"', () => {
        expect(validarTransicaoStatus('em_andamento', 'concluido').valida).toBe(true);
        expect(validarTransicaoStatus('em_andamento', 'cancelado').valida).toBe(true);
        expect(validarTransicaoStatus('em_andamento', 'falta').valida).toBe(true);
        expect(validarTransicaoStatus('em_andamento', 'confirmado').valida).toBe(false);
        expect(validarTransicaoStatus('em_andamento', 'pendente').valida).toBe(false);
      });

      it('bloqueia transições a partir de estados terminais', () => {
        const estadosTerminais: Array<'concluido' | 'cancelado' | 'falta' | 'reagendado'> = [
          'concluido',
          'cancelado',
          'falta',
          'reagendado',
        ];

        estadosTerminais.forEach((terminal) => {
          expect(validarTransicaoStatus(terminal, 'confirmado').valida).toBe(false);
          expect(validarTransicaoStatus(terminal, 'pendente').valida).toBe(false);
          expect(validarTransicaoStatus(terminal, 'em_andamento').valida).toBe(false);
        });
      });
    });

    describe('atualizarStatusAgendamentoInputSchema', () => {
      it('valida payload com agendamentoId e novoStatus', () => {
        const res = atualizarStatusAgendamentoInputSchema.safeParse({
          agendamentoId: 'ag-123',
          novoStatus: 'falta',
          motivo: 'Paciente não compareceu',
        });
        expect(res.success).toBe(true);
      });

      it('rejeita payload sem agendamentoId ou com status inválido', () => {
        expect(
          atualizarStatusAgendamentoInputSchema.safeParse({
            agendamentoId: '',
            novoStatus: 'concluido',
          }).success,
        ).toBe(false);

        expect(
          atualizarStatusAgendamentoInputSchema.safeParse({
            agendamentoId: 'ag-123',
            novoStatus: 'status_invalido',
          }).success,
        ).toBe(false);
      });
    });
  });
});
