import { describe, expect, it } from 'vitest';
import {
  validateClinicSettings,
  clinicContactsSchema,
  clinicPoliciesSchema,
  clinicRemindersSchema,
  clinicDeadlinesSchema,
} from './clinic-settings.js';

const validClinicSettings = {
  percentualSinal: 30,
  intervaloMinutos: 30,
  diasFolga: [0, 2],
  antecedenciaMinimaCancelamentoHoras: 3,
  criterioClienteRecorrenteAtendimentosMes: 2,
  updatedAt: '2026-11-25T00:00:00.000Z',
};

describe('Clinic Settings Schemas (@clinica/shared)', () => {
  it('valida configurações gerais persistidas', () => {
    expect(validateClinicSettings(validClinicSettings)).toBe(true);
  });

  describe('clinicContactsSchema', () => {
    it('valida contatos com dados corretos', () => {
      const contatos = {
        telefone: '(11) 98765-4321',
        whatsapp: '(11) 98765-4321',
        email: 'contato@clinica.com',
        endereco: 'Rua das Flores, 100',
      };
      const parsed = clinicContactsSchema.parse(contatos);
      expect(parsed.email).toBe('contato@clinica.com');
    });

    it('rejeita e-mail inválido', () => {
      const contatos = {
        telefone: '(11) 98765-4321',
        whatsapp: '(11) 98765-4321',
        email: 'invalido',
        endereco: 'Rua das Flores, 100',
      };
      expect(() => clinicContactsSchema.parse(contatos)).toThrow();
    });
  });

  describe('clinicPoliciesSchema', () => {
    it('valida políticas de cancelamento e atrasos', () => {
      const politicas = {
        politicaCancelamento: 'Cancelamento com no mínimo 3 horas de antecedência.',
        politicaReagendamento: 'Reagendamento com no mínimo 3 horas de antecedência.',
        toleranciaAtrasoMinutos: 15,
      };
      const parsed = clinicPoliciesSchema.parse(politicas);
      expect(parsed.toleranciaAtrasoMinutos).toBe(15);
    });

    it('rejeita tolerância de atraso negativa', () => {
      const politicas = {
        politicaCancelamento: 'Texto suficiente longo para teste.',
        politicaReagendamento: 'Texto suficiente longo para teste.',
        toleranciaAtrasoMinutos: -5,
      };
      expect(() => clinicPoliciesSchema.parse(politicas)).toThrow();
    });
  });

  describe('clinicRemindersSchema', () => {
    it('valida lembretes automáticos e canais', () => {
      const lembretes = {
        lembreteAtivo: true,
        antecedenciaHoras: 24,
        canais: {
          whatsapp: true,
          email: false,
          notificacaoApp: true,
        },
      };
      const parsed = clinicRemindersSchema.parse(lembretes);
      expect(parsed.antecedenciaHoras).toBe(24);
      expect(parsed.canais.whatsapp).toBe(true);
    });

    it('rejeita antecedência de lembrete fora do limite permitido', () => {
      const lembretes = {
        lembreteAtivo: true,
        antecedenciaHoras: 0, // menor que 1h
        canais: {
          whatsapp: true,
          email: false,
          notificacaoApp: true,
        },
      };
      expect(() => clinicRemindersSchema.parse(lembretes)).toThrow();
    });
  });

  describe('clinicDeadlinesSchema', () => {
    it('valida prazos operacionais da clínica', () => {
      const prazos = {
        antecedenciaMinimaAgendamentoHoras: 2,
        antecedenciaMinimaCancelamentoHoras: 3,
        intervaloMinutos: 30,
        criterioClienteRecorrenteAtendimentosMes: 2,
      };
      const parsed = clinicDeadlinesSchema.parse(prazos);
      expect(parsed.antecedenciaMinimaCancelamentoHoras).toBe(3);
    });
  });
});
