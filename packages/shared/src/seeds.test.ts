import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CLINIC_SETTINGS,
  DEFAULT_INITIAL_ADMIN,
  DEFAULT_INITIAL_PROFESSIONAL,
  getInitialClinicData,
  seedClinicData,
  validateClinicSettings,
  validateProfessional,
  validateUserProfile,
} from './index.js';

describe('Dados Iniciais e Configurações Padrão (docs/PRODUCT_RULES.md)', () => {
  it('garante que as configurações padrão da clínica atendem às regras de produto', () => {
    // Regra 8: Agendamento feito pelo cliente exigirá sinal de 30%
    expect(DEFAULT_CLINIC_SETTINGS.percentualSinal).toBe(30);

    // Regra 17: O intervalo padrão será de 30 minutos
    expect(DEFAULT_CLINIC_SETTINGS.intervaloMinutos).toBe(30);

    // Regra 18: Terças e domingos são configurações atuais, nunca valores fixos no código (0 = Domingo, 2 = Terça)
    expect(DEFAULT_CLINIC_SETTINGS.diasFolga).toEqual([0, 2]);

    // Regra 10: Cancelamento será permitido com pelo menos três horas de antecedência
    expect(DEFAULT_CLINIC_SETTINGS.antecedenciaMinimaCancelamentoHoras).toBe(3);

    // Regra 14: Cliente recorrente é quem possui pelo menos dois atendimentos concluídos no mesmo mês
    expect(DEFAULT_CLINIC_SETTINGS.criterioClienteRecorrenteAtendimentosMes).toBe(2);

    expect(validateClinicSettings(DEFAULT_CLINIC_SETTINGS)).toBe(true);
  });

  it('garante que a profissional inicial está cadastrada como Tais Romagnoli e ativa', () => {
    expect(DEFAULT_INITIAL_PROFESSIONAL.nome).toBe('Tais Romagnoli');
    expect(DEFAULT_INITIAL_PROFESSIONAL.especialidade).toBe('Massoterapeuta');
    expect(DEFAULT_INITIAL_PROFESSIONAL.ativo).toBe(true);
    expect(DEFAULT_INITIAL_PROFESSIONAL.diasFolga).toEqual([0, 2]);
    expect(DEFAULT_INITIAL_PROFESSIONAL.intervaloMinutos).toBe(30);

    expect(validateProfessional(DEFAULT_INITIAL_PROFESSIONAL)).toBe(true);
  });

  it('garante que a administradora inicial possui papel admin e status ativo', () => {
    expect(DEFAULT_INITIAL_ADMIN.role).toBe('admin');
    expect(DEFAULT_INITIAL_ADMIN.status).toBe('ativo');
    expect(DEFAULT_INITIAL_ADMIN.nome).toBe('Tais Romagnoli');

    expect(validateUserProfile(DEFAULT_INITIAL_ADMIN)).toBe(true);
  });

  it('estrutura o seed com as coleções configuracoes, profissionais e usuarios', () => {
    const seed = getInitialClinicData();

    expect(seed.settings.collection).toBe('configuracoes');
    expect(seed.settings.id).toBe('geral');
    expect(seed.settings.data.percentualSinal).toBe(30);

    expect(seed.professional.collection).toBe('profissionais');
    expect(seed.professional.id).toBe('prof-tais-romagnoli');

    expect(seed.admin.collection).toBe('usuarios');
    expect(seed.admin.id).toBe('admin-tais-romagnoli');
  });

  it('executa a persistência de seed através do adapter', async () => {
    const mockWriter = {
      set: vi.fn().mockResolvedValue(undefined),
    };

    const result = await seedClinicData(mockWriter);

    expect(result.count).toBe(3);
    expect(result.collections).toContain('configuracoes');
    expect(result.collections).toContain('profissionais');
    expect(result.collections).toContain('usuarios');

    expect(mockWriter.set).toHaveBeenCalledTimes(3);
    expect(mockWriter.set).toHaveBeenCalledWith(
      'configuracoes',
      'geral',
      expect.objectContaining({ percentualSinal: 30 }),
    );
    expect(mockWriter.set).toHaveBeenCalledWith(
      'profissionais',
      'prof-tais-romagnoli',
      expect.objectContaining({ nome: 'Tais Romagnoli' }),
    );
    expect(mockWriter.set).toHaveBeenCalledWith(
      'usuarios',
      'admin-tais-romagnoli',
      expect.objectContaining({ role: 'admin' }),
    );
  });
});
