import { describe, expect, it } from 'vitest';
import {
  validateClinicSettings,
  validateClinicContacts,
  validateClinicPolicies,
  validateClinicReminders,
  validateClinicDeadlines,
  validateCentralizedClinicSettings,
  clinicContactsSchema,
  clinicPoliciesSchema,
  clinicRemindersSchema,
  clinicDeadlinesSchema,
  clinicSignalSchema,
  centralizedClinicSettingsSchema,
  modelarConfiguracoesClinica,
} from './clinic-settings.js';
import { DEFAULT_CLINIC_SETTINGS } from '../constants/default-seeds.js';

describe('Clinic Settings Schemas (@clinica/shared)', () => {
  it('valida com sucesso DEFAULT_CLINIC_SETTINGS', () => {
    expect(validateClinicSettings(DEFAULT_CLINIC_SETTINGS)).toBe(true);
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

  describe('clinicSignalSchema (Sinal Financeiro Centralizado)', () => {
    it('valida percentual de sinal válido (30%)', () => {
      const parsed = clinicSignalSchema.parse({ percentualSinal: 30 });
      expect(parsed.percentualSinal).toBe(30);
    });

    it('aceita percentual de sinal zero (isenção total)', () => {
      const parsed = clinicSignalSchema.parse({ percentualSinal: 0 });
      expect(parsed.percentualSinal).toBe(0);
    });

    it('rejeita percentual negativo ou superior a 100%', () => {
      expect(() => clinicSignalSchema.parse({ percentualSinal: -5 })).toThrow();
      expect(() => clinicSignalSchema.parse({ percentualSinal: 105 })).toThrow();
    });
  });

  describe('Centralização no Firestore (Contatos, Sinal, Prazos, Lembretes e Políticas)', () => {
    it('valida que DEFAULT_CLINIC_SETTINGS possui todos os 5 módulos centralizados', () => {
      expect(validateCentralizedClinicSettings(DEFAULT_CLINIC_SETTINGS)).toBe(true);

      // 1. Contatos
      expect(validateClinicContacts(DEFAULT_CLINIC_SETTINGS.contatos)).toBe(true);
      expect(DEFAULT_CLINIC_SETTINGS.contatos?.telefone).toBe('(11) 98765-4321');
      expect(DEFAULT_CLINIC_SETTINGS.contatos?.whatsapp).toBe('(11) 98765-4321');

      // 2. Sinal
      expect(DEFAULT_CLINIC_SETTINGS.percentualSinal).toBe(30);

      // 3. Prazos
      expect(validateClinicDeadlines(DEFAULT_CLINIC_SETTINGS.prazos)).toBe(true);
      expect(DEFAULT_CLINIC_SETTINGS.prazos?.antecedenciaMinimaCancelamentoHoras).toBe(3);
      expect(DEFAULT_CLINIC_SETTINGS.prazos?.intervaloMinutos).toBe(30);

      // 4. Lembretes
      expect(validateClinicReminders(DEFAULT_CLINIC_SETTINGS.lembretes)).toBe(true);
      expect(DEFAULT_CLINIC_SETTINGS.lembretes?.lembreteAtivo).toBe(true);
      expect(DEFAULT_CLINIC_SETTINGS.lembretes?.antecedenciaHoras).toBe(24);

      // 5. Políticas
      expect(validateClinicPolicies(DEFAULT_CLINIC_SETTINGS.politicas)).toBe(true);
      expect(DEFAULT_CLINIC_SETTINGS.politicas?.politicaCancelamento).toContain('3 horas');
    });

    it('valida com sucesso usando centralizedClinicSettingsSchema.safeParse', () => {
      const result = centralizedClinicSettingsSchema.safeParse(DEFAULT_CLINIC_SETTINGS);
      expect(result.success).toBe(true);
    });

    it('rejeita documento centralizado quando qualquer módulo está ausente', () => {
      const semContatos = { ...DEFAULT_CLINIC_SETTINGS, contatos: undefined };
      expect(validateCentralizedClinicSettings(semContatos)).toBe(false);

      const semPoliticas = { ...DEFAULT_CLINIC_SETTINGS, politicas: undefined };
      expect(validateCentralizedClinicSettings(semPoliticas)).toBe(false);

      const semLembretes = { ...DEFAULT_CLINIC_SETTINGS, lembretes: undefined };
      expect(validateCentralizedClinicSettings(semLembretes)).toBe(false);

      const semPrazos = { ...DEFAULT_CLINIC_SETTINGS, prazos: undefined };
      expect(validateCentralizedClinicSettings(semPrazos)).toBe(false);
    });

    describe('Factory modelarConfiguracoesClinica', () => {
      it('constrói documento centralizado válido com todos os 5 módulos por padrão', () => {
        const config = modelarConfiguracoesClinica();

        expect(validateCentralizedClinicSettings(config)).toBe(true);
        expect(config.contatos.email).toBe('contato@clinicataisromagnoli.com.br');
        expect(config.percentualSinal).toBe(30);
        expect(config.prazos.intervaloMinutos).toBe(30);
        expect(config.lembretes.lembreteAtivo).toBe(true);
        expect(config.politicas.toleranciaAtrasoMinutos).toBe(15);
      });

      it('permite sobrescrever valores específicos mantendo os demais centralizados', () => {
        const config = modelarConfiguracoesClinica({
          percentualSinal: 40,
          contatos: {
            whatsapp: '(11) 91234-5678',
          },
          lembretes: {
            antecedenciaHoras: 48,
          },
        });

        expect(validateCentralizedClinicSettings(config)).toBe(true);
        expect(config.percentualSinal).toBe(40);
        expect(config.contatos.whatsapp).toBe('(11) 91234-5678');
        expect(config.contatos.email).toBe('contato@clinicataisromagnoli.com.br');
        expect(config.lembretes.antecedenciaHoras).toBe(48);
      });
    });
  });
});
