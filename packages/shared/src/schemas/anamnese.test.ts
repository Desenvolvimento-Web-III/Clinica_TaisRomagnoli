import { describe, it, expect } from 'vitest';
import {
  fichaAnamneseSchema,
  salvarFichaAnamneseInputSchema,
  registrarLiberacaoMedicaInputSchema,
  calcularPontosAtencao,
  calcularContraindicacoesLiberacaoMedica,
  avaliarBloqueioContraindicacao,
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

  describe('Contraindicações e bloqueio por exigência de liberação médica', () => {
    it('identifica contraindicações que exigem liberação médica para condições críticas', () => {
      const contraindicacoes = calcularContraindicacoesLiberacaoMedica({
        ...fichaValida,
        tratamentoOncologico: { resposta: true, detalhes: 'Quimioterapia em 2026' },
        doencasCardiacas: { resposta: true, detalhes: 'Uso de marca-passo' },
        problemasCirculatorios: { resposta: true, detalhes: 'Histórico de trombose' },
      });

      expect(contraindicacoes).toHaveLength(3);
      expect(contraindicacoes).toEqual(
        expect.arrayContaining([
          'Tratamento Oncológico: Quimioterapia em 2026',
          'Cardíaco: Uso de marca-passo',
          'Circulatório/Trombose: Histórico de trombose',
        ]),
      );
    });

    it('não classifica alergias, gestação sem sinalização médica ou dor isolada como bloqueio automático', () => {
      const contraindicacoes = calcularContraindicacoesLiberacaoMedica({
        ...fichaValida,
        gestanteOuLactante: { resposta: true, detalhes: 'Gestação de 20 semanas' },
        alergiasProdutos: { resposta: true, detalhes: 'Alergia a lavanda' },
        problemasPele: { resposta: true, detalhes: 'Dermatite leve no braço' },
        intensidadeDor: 8,
      });

      expect(contraindicacoes).toHaveLength(0);
    });

    it('retorna bloqueio desativado quando ficha for nula ou sem exigência médica', () => {
      expect(avaliarBloqueioContraindicacao(null).bloqueado).toBe(false);
      expect(avaliarBloqueioContraindicacao({}).bloqueado).toBe(false);
      expect(
        avaliarBloqueioContraindicacao({
          ...fichaValida,
          alergiasProdutos: { resposta: true, detalhes: 'Óleo de amêndoas' },
        }).bloqueado,
      ).toBe(false);
    });

    it('bloqueia confirmação quando a ficha exige liberação médica sem aprovação', () => {
      const avaliacao = avaliarBloqueioContraindicacao({
        ...fichaValida,
        tratamentoOncologico: { resposta: true, detalhes: 'Em acompanhamento oncológico' },
      });

      expect(avaliacao.exigeLiberacaoMedica).toBe(true);
      expect(avaliacao.liberacaoMedicaAprovada).toBe(false);
      expect(avaliacao.bloqueado).toBe(true);
      expect(avaliacao.motivoBloqueio).toMatch(/liberação médica/i);
    });

    it('bloqueia confirmação quando exigeLiberacaoMedica ou contraindicacoes explícitas estiverem presentes', () => {
      expect(avaliarBloqueioContraindicacao({ exigeLiberacaoMedica: true }).bloqueado).toBe(true);
      expect(
        avaliarBloqueioContraindicacao({ contraindicacoes: ['Trombose venosa'] }).bloqueado,
      ).toBe(true);
    });

    it('libera confirmação quando a liberação médica estiver aprovada', () => {
      const avaliacao = avaliarBloqueioContraindicacao({
        ...fichaValida,
        problemasCirculatorios: { resposta: true, detalhes: 'Varizes sob acompanhamento médico' },
        exigeLiberacaoMedica: true,
        liberacaoMedicaAprovada: true,
        liberacaoMedicaAprovadaEm: '2026-11-08T12:00:00.000Z',
        liberacaoMedicaAprovadaPor: 'admin-tais',
      });

      expect(avaliacao.exigeLiberacaoMedica).toBe(true);
      expect(avaliacao.liberacaoMedicaAprovada).toBe(true);
      expect(avaliacao.bloqueado).toBe(false);
      expect(avaliacao.motivoBloqueio).toBeUndefined();
    });

    it('valida registrarLiberacaoMedicaInputSchema corretamente', () => {
      expect(
        registrarLiberacaoMedicaInputSchema.safeParse({
          clienteId: 'cliente-123',
          aprovada: true,
          observacoes: 'Atestado médico validado na clínica.',
        }).success,
      ).toBe(true);

      expect(
        registrarLiberacaoMedicaInputSchema.safeParse({
          clienteId: '',
          aprovada: true,
        }).success,
      ).toBe(false);
    });
  });
});
