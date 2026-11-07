import { describe, expect, it } from 'vitest';
import {
  professionalSchema,
  criarProfissionalInputSchema,
  atualizarProfissionalInputSchema,
  vincularServicoProfissionalInputSchema,
  verificarProfissionalHabilitadoParaServico,
  ID_PROFISSIONAL_PADRAO,
} from './professional.js';
import { validateProfessional } from './clinic-settings.js';
import { DEFAULT_INITIAL_PROFESSIONAL } from '../constants/default-seeds.js';

describe('professionalSchema e contratos de profissionais', () => {
  it('valida com sucesso a profissional padrão da clínica (Tais Romagnoli)', () => {
    const parsed = professionalSchema.safeParse(DEFAULT_INITIAL_PROFESSIONAL);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.id).toBe(ID_PROFISSIONAL_PADRAO);
      expect(parsed.data.nome).toBe('Tais Romagnoli');
      expect(parsed.data.especialidade).toBe('Massoterapeuta');
      expect(parsed.data.ativo).toBe(true);
      expect(parsed.data.diasFolga).toEqual([0, 2]);
      expect(parsed.data.intervaloMinutos).toBe(30);
    }
  });

  it('falha ao validar profissional sem nome ou especialidade', () => {
    const invalido = {
      id: 'prof-invalido',
      nome: '  ',
      especialidade: '',
    };
    const parsed = professionalSchema.safeParse(invalido);
    expect(parsed.success).toBe(false);
  });

  it('valida input de criação de profissional aplicando valores default', () => {
    const input = {
      nome: 'Mariana Silva',
      especialidade: 'Acupunturista',
    };
    const parsed = criarProfissionalInputSchema.parse(input);
    expect(parsed.nome).toBe('Mariana Silva');
    expect(parsed.especialidade).toBe('Acupunturista');
    expect(parsed.ativo).toBe(true);
    expect(parsed.diasFolga).toEqual([0, 2]);
    expect(parsed.intervaloMinutos).toBe(30);
  });

  it('valida input de atualização parcial de profissional', () => {
    const input = {
      id: 'prof-tais-romagnoli',
      especialidade: 'Massoterapeuta Especialista e Fisioterapeuta',
      intervaloMinutos: 40,
    };
    const parsed = atualizarProfissionalInputSchema.parse(input);
    expect(parsed.id).toBe('prof-tais-romagnoli');
    expect(parsed.especialidade).toBe('Massoterapeuta Especialista e Fisioterapeuta');
    expect(parsed.intervaloMinutos).toBe(40);
  });

  it('rejeita atualização sem ID de profissional', () => {
    const input = {
      nome: 'Novo Nome',
    };
    const parsed = atualizarProfissionalInputSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('valida o schema de vinculação entre serviço e profissional', () => {
    const vinculo = vincularServicoProfissionalInputSchema.parse({
      servicoId: 'massagem-relaxante',
      profissionalId: 'prof-tais-romagnoli',
      habilitado: true,
    });
    expect(vinculo.servicoId).toBe('massagem-relaxante');
    expect(vinculo.profissionalId).toBe('prof-tais-romagnoli');
    expect(vinculo.habilitado).toBe(true);
  });

  it('executa type guard validateProfessional corretamente', () => {
    expect(validateProfessional(DEFAULT_INITIAL_PROFESSIONAL)).toBe(true);
    expect(validateProfessional(null)).toBe(false);
    expect(validateProfessional({ id: 'sem-campos' })).toBe(false);
  });

  it('verifica habilitação de profissional para serviço considerando fallback da profissional padrão', () => {
    // Serviço legado sem array explícito
    const servicoLegado = {
      nome: 'Massagem Relaxante',
    };
    expect(verificarProfissionalHabilitadoParaServico(servicoLegado, ID_PROFISSIONAL_PADRAO)).toBe(
      true,
    );
    expect(verificarProfissionalHabilitadoParaServico(servicoLegado, 'outro-prof')).toBe(false);

    // Serviço com lista explícita
    const servicoComProfissionais = {
      profissionaisHabilitados: ['prof-tais-romagnoli', 'prof-mariana'],
    };
    expect(
      verificarProfissionalHabilitadoParaServico(servicoComProfissionais, 'prof-tais-romagnoli'),
    ).toBe(true);
    expect(
      verificarProfissionalHabilitadoParaServico(servicoComProfissionais, 'prof-mariana'),
    ).toBe(true);
    expect(verificarProfissionalHabilitadoParaServico(servicoComProfissionais, 'prof-pedro')).toBe(
      false,
    );
  });
});
