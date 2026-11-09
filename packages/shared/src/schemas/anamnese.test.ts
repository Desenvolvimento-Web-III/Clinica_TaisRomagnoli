import { describe, it, expect } from 'vitest';
import {
  fichaAnamneseSchema,
  salvarFichaAnamneseInputSchema,
  calcularPontosAtencao,
  INITIAL_ANAMNESE_DATA,
} from './anamnese.js';
import type { FichaAnamneseData } from '../types/anamnese.js';

describe('Anamnese Schemas e Regras (Shared)', () => {
  const fichaValida: FichaAnamneseData = {
    ...INITIAL_ANAMNESE_DATA,
    consentimentoConfirmado: true,
  };

  it('valida uma ficha completa e válida', () => {
    const parseResult = fichaAnamneseSchema.safeParse(fichaValida);
    expect(parseResult.success).toBe(true);
  });

  it('exige consentimento confirmado', () => {
    const semConsentimento = {
      ...fichaValida,
      consentimentoConfirmado: false,
    };
    const result = fichaAnamneseSchema.safeParse(semConsentimento);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/consentimento/i);
    }
  });

  it('rejeita quando condição médica for afirmativa mas sem detalhes', () => {
    const comProblemaSemDetalhe = {
      ...fichaValida,
      doencasCardiacas: { resposta: true, detalhes: '   ' },
    };
    const result = fichaAnamneseSchema.safeParse(comProblemaSemDetalhe);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('doencasCardiacas'))).toBe(true);
    }
  });

  it('aceita quando condição médica for afirmativa e com detalhes preenchidos', () => {
    const comProblemaComDetalhe = {
      ...fichaValida,
      doencasCardiacas: { resposta: true, detalhes: 'Arritmia leve controlada' },
    };
    const result = fichaAnamneseSchema.safeParse(comProblemaComDetalhe);
    expect(result.success).toBe(true);
  });

  it('exige ao menos uma região de foco selecionada', () => {
    const semRegioes = {
      ...fichaValida,
      regioesFoco: [],
    };
    const result = fichaAnamneseSchema.safeParse(semRegioes);
    expect(result.success).toBe(false);
  });

  it('rejeita intensidade de dor fora do intervalo 0-10', () => {
    const dorInvalida = {
      ...fichaValida,
      intensidadeDor: 11,
    };
    const result = fichaAnamneseSchema.safeParse(dorInvalida);
    expect(result.success).toBe(false);
  });

  it('valida salvarFichaAnamneseInputSchema com clienteId opcional', () => {
    const inputSemCliente = { dados: fichaValida };
    expect(salvarFichaAnamneseInputSchema.safeParse(inputSemCliente).success).toBe(true);

    const inputComCliente = { clienteId: 'cliente_123', dados: fichaValida };
    expect(salvarFichaAnamneseInputSchema.safeParse(inputComCliente).success).toBe(true);
  });

  describe('calcularPontosAtencao', () => {
    it('retorna lista vazia quando nenhuma condição de risco for marcada e dor < 7', () => {
      const pontos = calcularPontosAtencao(fichaValida);
      expect(pontos).toHaveLength(0);
    });

    it('adiciona ponto de atenção para dor intensa (>= 7)', () => {
      const pontos = calcularPontosAtencao({
        ...fichaValida,
        intensidadeDor: 8,
      });
      expect(pontos).toContain('Dor intensa referida (Nível 8/10)');
    });

    it('adiciona múltiplos pontos de atenção para condições clínicas ativas', () => {
      const pontos = calcularPontosAtencao({
        ...fichaValida,
        gestanteOuLactante: { resposta: true, detalhes: 'Gestante 24 semanas' },
        problemasCirculatorios: { resposta: true, detalhes: 'Varizes nos membros inferiores' },
        intensidadeDor: 7,
      });

      expect(pontos).toHaveLength(3);
      expect(pontos).toEqual(
        expect.arrayContaining([
          'Gestante/Lactante: Gestante 24 semanas',
          'Circulatório/Varizes: Varizes nos membros inferiores',
          'Dor intensa referida (Nível 7/10)',
        ]),
      );
    });
  });
});
