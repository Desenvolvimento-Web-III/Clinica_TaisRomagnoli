import { describe, it, expect } from 'vitest';
import type { MetodoPagamento, StatusAgendamento } from '../types/agendamento.js';
import {
  solicitarAgendamentoInputSchema,
  cancelarAgendamentoInputSchema,
  calcularValoresAgendamento,
  calcularDataHoraFim,
  verificarConflitoHorarios,
  verificarAntecedenciaCancelamento,
  agendamentoSchema,
  validateAgendamento,
  modelarAgendamento,
  agendamentoClienteSchema,
  agendamentoProfissionalSchema,
  agendamentoServicoSchema,
  agendamentoHorarioSchema,
  agendamentoValoresSchema,
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

  describe('Modelagem de Agendamento no Firestore (Cliente, Profissional, Serviço, Horário, Status e Valores)', () => {
    const agendamentoValido = {
      id: 'ag-12345',
      clienteId: 'cliente-joao',
      clienteNome: 'João Silva',
      clienteEmail: 'joao@exemplo.com',
      clienteTelefone: '(11)99999-1111',
      servicoId: 'massagem-relaxante',
      servicoNome: 'Massagem Relaxante',
      duracaoMinutos: 60,
      valorTotalEmCentavos: 17000,
      valorSinalEmCentavos: 5100,
      saldoRestanteEmCentavos: 11900,
      dataHoraInicio: '2026-11-10T14:00:00.000Z',
      dataHoraFim: '2026-11-10T15:00:00.000Z',
      intervaloAposMinutos: 30,
      profissionalId: 'prof-tais-romagnoli',
      profissionalNome: 'Tais Romagnoli',
      status: 'confirmado' as const,
      metodoPagamento: 'pix' as const,
      origem: 'app_cliente' as const,
      sinalIsento: false,
      observacoes: 'Preferência por aromaterapia com óleo de lavanda.',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    };

    it('valida com sucesso documento que possui todas as seis dimensões modeladas', () => {
      const parsed = agendamentoSchema.safeParse(agendamentoValido);
      expect(parsed.success).toBe(true);
      expect(validateAgendamento(agendamentoValido)).toBe(true);
    });

    describe('Dimensão 1: Cliente (clienteId, clienteNome, clienteEmail, clienteTelefone)', () => {
      it('rejeita agendamento sem clienteId ou com clienteId vazio', () => {
        expect(validateAgendamento({ ...agendamentoValido, clienteId: '' })).toBe(false);
      });

      it('rejeita agendamento sem clienteNome ou com clienteNome vazio', () => {
        expect(validateAgendamento({ ...agendamentoValido, clienteNome: '' })).toBe(false);
      });

      it('rejeita cliente com e-mail inválido', () => {
        expect(validateAgendamento({ ...agendamentoValido, clienteEmail: 'email-invalido' })).toBe(
          false,
        );
      });

      it('valida schema granular agendamentoClienteSchema', () => {
        expect(
          agendamentoClienteSchema.safeParse({
            clienteId: 'cliente-1',
            clienteNome: 'Maria Silva',
            clienteEmail: 'maria@exemplo.com',
          }).success,
        ).toBe(true);
      });
    });

    describe('Dimensão 2: Profissional (profissionalId, profissionalNome)', () => {
      it('rejeita agendamento sem profissionalId', () => {
        expect(validateAgendamento({ ...agendamentoValido, profissionalId: '' })).toBe(false);
      });

      it('rejeita agendamento sem profissionalNome', () => {
        expect(validateAgendamento({ ...agendamentoValido, profissionalNome: '' })).toBe(false);
      });

      it('valida schema granular agendamentoProfissionalSchema', () => {
        expect(
          agendamentoProfissionalSchema.safeParse({
            profissionalId: 'prof-tais-romagnoli',
            profissionalNome: 'Tais Romagnoli',
          }).success,
        ).toBe(true);
      });
    });

    describe('Dimensão 3: Serviço (servicoId, servicoNome, duracaoMinutos)', () => {
      it('rejeita agendamento com servicoId vazio', () => {
        expect(validateAgendamento({ ...agendamentoValido, servicoId: '' })).toBe(false);
      });

      it('rejeita agendamento com duração não positiva', () => {
        expect(validateAgendamento({ ...agendamentoValido, duracaoMinutos: 0 })).toBe(false);
        expect(validateAgendamento({ ...agendamentoValido, duracaoMinutos: -30 })).toBe(false);
      });

      it('valida schema granular agendamentoServicoSchema', () => {
        expect(
          agendamentoServicoSchema.safeParse({
            servicoId: 'drenagem-linfatica',
            servicoNome: 'Drenagem Linfática',
            duracaoMinutos: 50,
          }).success,
        ).toBe(true);
      });
    });

    describe('Dimensão 4: Horário (dataHoraInicio, dataHoraFim, intervaloAposMinutos)', () => {
      it('rejeita dataHoraInicio que não seja ISO 8601 válida', () => {
        expect(validateAgendamento({ ...agendamentoValido, dataHoraInicio: 'data-errada' })).toBe(
          false,
        );
      });

      it('rejeita dataHoraFim que não seja ISO 8601 válida', () => {
        expect(validateAgendamento({ ...agendamentoValido, dataHoraFim: 'data-errada' })).toBe(
          false,
        );
      });

      it('rejeita intervalo pós-atendimento negativo', () => {
        expect(validateAgendamento({ ...agendamentoValido, intervaloAposMinutos: -10 })).toBe(
          false,
        );
      });

      it('valida schema granular agendamentoHorarioSchema', () => {
        expect(
          agendamentoHorarioSchema.safeParse({
            dataHoraInicio: '2026-11-10T14:00:00.000Z',
            dataHoraFim: '2026-11-10T15:00:00.000Z',
            intervaloAposMinutos: 30,
          }).success,
        ).toBe(true);
      });
    });

    describe('Dimensão 5: Status (pendente, confirmado, em_andamento, concluido, cancelado, falta)', () => {
      const todosOsStatus = [
        'pendente',
        'confirmado',
        'em_andamento',
        'concluido',
        'cancelado',
        'falta',
      ] as const;

      it.each(todosOsStatus)('aceita o status válido "%s"', (status) => {
        expect(validateAgendamento({ ...agendamentoValido, status })).toBe(true);
      });

      it('rejeita status não reconhecido pelo domínio', () => {
        expect(
          validateAgendamento({
            ...agendamentoValido,
            status: 'status_invalido' as unknown as StatusAgendamento,
          }),
        ).toBe(false);
      });
    });

    describe('Dimensão 6: Valores (valorTotalEmCentavos, valorSinalEmCentavos, saldoRestanteEmCentavos, metodoPagamento, sinalIsento)', () => {
      it('rejeita valorTotalEmCentavos menor ou igual a zero', () => {
        expect(validateAgendamento({ ...agendamentoValido, valorTotalEmCentavos: 0 })).toBe(false);
        expect(validateAgendamento({ ...agendamentoValido, valorTotalEmCentavos: -5000 })).toBe(
          false,
        );
      });

      it('rejeita valorSinalEmCentavos negativo', () => {
        expect(validateAgendamento({ ...agendamentoValido, valorSinalEmCentavos: -100 })).toBe(
          false,
        );
      });

      it('rejeita saldoRestanteEmCentavos negativo', () => {
        expect(validateAgendamento({ ...agendamentoValido, saldoRestanteEmCentavos: -100 })).toBe(
          false,
        );
      });

      it('rejeita metodoPagamento desconhecido', () => {
        expect(
          validateAgendamento({
            ...agendamentoValido,
            metodoPagamento: 'bitcoin' as unknown as MetodoPagamento,
          }),
        ).toBe(false);
      });

      it('valida schema granular agendamentoValoresSchema', () => {
        expect(
          agendamentoValoresSchema.safeParse({
            valorTotalEmCentavos: 17000,
            valorSinalEmCentavos: 5100,
            saldoRestanteEmCentavos: 11900,
            sinalIsento: false,
            metodoPagamento: 'pix',
          }).success,
        ).toBe(true);
      });
    });

    describe('Factory modelarAgendamento', () => {
      it('gera um modelo de agendamento completo e válido a partir de parâmetros estruturados', () => {
        const ag = modelarAgendamento({
          cliente: {
            clienteId: 'cliente-99',
            clienteNome: 'Ana Carolina',
            clienteEmail: 'ana@exemplo.com',
            clienteTelefone: '(11)97777-6666',
          },
          servico: {
            servicoId: 'massagem-relaxante',
            servicoNome: 'Massagem Relaxante',
            duracaoMinutos: 60,
          },
          dataHoraInicio: '2026-11-15T09:00:00.000Z',
          valorTotalEmCentavos: 17000,
          metodoPagamento: 'pix',
        });

        expect(validateAgendamento(ag)).toBe(true);
        expect(ag.clienteId).toBe('cliente-99');
        expect(ag.clienteNome).toBe('Ana Carolina');
        expect(ag.profissionalId).toBe('prof-tais-romagnoli');
        expect(ag.profissionalNome).toBe('Tais Romagnoli');
        expect(ag.duracaoMinutos).toBe(60);
        expect(ag.dataHoraFim).toBe('2026-11-15T10:00:00.000Z');
        expect(ag.intervaloAposMinutos).toBe(30);
        expect(ag.valorTotalEmCentavos).toBe(17000);
        expect(ag.valorSinalEmCentavos).toBe(5100);
        expect(ag.saldoRestanteEmCentavos).toBe(11900);
        expect(ag.sinalIsento).toBe(false);
        expect(ag.status).toBe('pendente');
        expect(ag.origem).toBe('app_cliente');
      });

      it('gera agendamento presencial com isenção de sinal pela administradora', () => {
        const ag = modelarAgendamento({
          cliente: {
            clienteId: 'cliente-balcao',
            clienteNome: 'Carlos Eduardo',
          },
          servico: {
            servicoId: 'massagem-terapeutica',
            servicoNome: 'Massagem Terapêutica',
            duracaoMinutos: 60,
          },
          dataHoraInicio: '2026-11-16T14:00:00.000Z',
          valorTotalEmCentavos: 18000,
          metodoPagamento: 'presencial',
          sinalIsento: true,
          origem: 'presencial_admin',
        });

        expect(validateAgendamento(ag)).toBe(true);
        expect(ag.sinalIsento).toBe(true);
        expect(ag.valorSinalEmCentavos).toBe(0);
        expect(ag.saldoRestanteEmCentavos).toBe(18000);
        expect(ag.status).toBe('confirmado');
        expect(ag.origem).toBe('presencial_admin');
      });
    });
  });
});
