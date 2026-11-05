import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_CLINIC_SETTINGS,
  DEFAULT_INITIAL_ADMIN,
  DEFAULT_INITIAL_PROFESSIONAL,
  DEFAULT_INITIAL_SERVICES,
  getInitialClinicData,
  getInitialServicesData,
  seedClinicData,
  seedServicesData,
  validateClinicSettings,
  validateProfessional,
  validateServico,
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

  describe('Seed de Serviços e Sinal de Pagamento no Banco de Dados', () => {
    it('garante que todos os serviços iniciais possuem sinal de 30% configurado', () => {
      expect(DEFAULT_INITIAL_SERVICES.length).toBe(18);

      const servicesData = getInitialServicesData();
      expect(servicesData.length).toBe(18);
      expect(servicesData[0]?.collection).toBe('servicos');
      expect(servicesData[0]?.data.sinalPercentual).toBe(30);

      for (const servico of DEFAULT_INITIAL_SERVICES) {
        expect(servico.sinalPercentual).toBe(30);
        expect(servico.sinal).toBe(Math.round(servico.preco * 0.3 * 100) / 100);
        expect(servico.sinalEmCentavos).toBe(Math.round(servico.precoEmCentavos * 0.3));
        expect(servico.sinal).toBeLessThanOrEqual(servico.preco);
        expect(validateServico(servico)).toBe(true);
      }
    });

    it('persiste os serviços no Firestore com campos de sinal via seedServicesData', async () => {
      const mockWriter = {
        set: vi.fn().mockResolvedValue(undefined),
      };

      const result = await seedServicesData(mockWriter);

      expect(result.count).toBe(18);
      expect(result.collections).toEqual(['servicos']);
      expect(mockWriter.set).toHaveBeenCalledTimes(18);

      // Valida o primeiro serviço (Massagem Relaxante: R$ 170 / Sinal: R$ 51 / 5100 centavos)
      expect(mockWriter.set).toHaveBeenCalledWith(
        'servicos',
        'massagem-relaxante',
        expect.objectContaining({
          sinal: 51,
          sinalPercentual: 30,
          sinalEmCentavos: 5100,
          sinalInCents: 5100,
        }),
      );
    });

    it('executa seed completo incluindo serviços quando includeServices for true', async () => {
      const mockWriter = {
        set: vi.fn().mockResolvedValue(undefined),
      };

      const result = await seedClinicData(mockWriter, { includeServices: true });

      expect(result.count).toBe(21); // 3 configurações/base + 18 serviços
      expect(result.collections).toContain('servicos');
      expect(result.collections).toContain('configuracoes');
      expect(result.collections).toContain('profissionais');
      expect(result.collections).toContain('usuarios');
      expect(mockWriter.set).toHaveBeenCalledTimes(21);
    });

    it('valida que o arquivo seed-data.json possui a coleção servicos com sinal em cada procedimento', () => {
      const jsonPath = resolve(__dirname, './seed-data.json');
      const rawData = readFileSync(jsonPath, 'utf-8');
      const seedJson = JSON.parse(rawData);

      expect(seedJson.servicos).toBeDefined();
      const servicoKeys = Object.keys(seedJson.servicos);
      expect(servicoKeys.length).toBe(18);

      for (const key of servicoKeys) {
        const item = seedJson.servicos[key];
        expect(item.sinalPercentual).toBe(30);
        expect(item.sinal).toBeDefined();
        expect(item.sinalEmCentavos).toBeDefined();
        expect(item.sinalInCents).toBeDefined();
        expect(item.sinal).toBe(Math.round(item.preco * 0.3 * 100) / 100);
      }
    });
  });
});
