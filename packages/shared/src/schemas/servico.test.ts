import { describe, expect, it } from 'vitest';
import {
  calcularPercentualSinal,
  calcularSinal,
  centavosParaReais,
  PERCENTUAL_SINAL_PADRAO,
  reaisParaCentavos,
  servicoInputSchema,
} from './servico.js';

describe('servicoInputSchema e utilitários de serviço', () => {
  it('valida dados corretos de um serviço', () => {
    const dados = {
      nome: 'Massagem Relaxante',
      duracaoMinutos: 60,
      preco: 150,
      sinal: 45,
      sinalPercentual: 30,
      descricao: 'Sessão suave para alívio de tensões musculares e estresse.',
      ativo: true,
      categoria: 'Corporal',
    };

    const parsed = servicoInputSchema.safeParse(dados);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.nome).toBe('Massagem Relaxante');
      expect(parsed.data.duracaoMinutos).toBe(60);
      expect(parsed.data.preco).toBe(150);
      expect(parsed.data.sinal).toBe(45);
      expect(parsed.data.descricao).toContain('alívio de tensões');
      expect(parsed.data.ativo).toBe(true);
    }
  });

  it('rejeita nome com menos de 3 caracteres', () => {
    const resultado = servicoInputSchema.safeParse({
      nome: 'Ab',
      duracaoMinutos: 60,
      preco: 150,
      descricao: 'Descrição válida do procedimento.',
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.nome).toBeDefined();
    }
  });

  it('rejeita duração menor que 15 minutos ou não inteira', () => {
    const resultado = servicoInputSchema.safeParse({
      nome: 'Massagem Express',
      duracaoMinutos: 10,
      preco: 80,
      descricao: 'Descrição válida do procedimento.',
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.duracaoMinutos).toBeDefined();
    }
  });

  it('rejeita preço zerado ou negativo', () => {
    const resultado = servicoInputSchema.safeParse({
      nome: 'Massagem Grátis',
      duracaoMinutos: 30,
      preco: 0,
      descricao: 'Descrição válida do procedimento.',
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.preco).toBeDefined();
    }
  });

  it('rejeita sinal com valor maior do que o preço total', () => {
    const resultado = servicoInputSchema.safeParse({
      nome: 'Massagem Especial',
      duracaoMinutos: 60,
      preco: 100,
      sinal: 120, // Maior que o preço
      descricao: 'Descrição válida do procedimento.',
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const fieldErrors = resultado.error.flatten().fieldErrors;
      expect(fieldErrors.sinal).toBeDefined();
      expect(fieldErrors.sinal?.[0]).toContain('não pode ser superior ao preço total');
    }
  });

  it('rejeita descrição com menos de 5 caracteres', () => {
    const resultado = servicoInputSchema.safeParse({
      nome: 'Massagem Curta',
      duracaoMinutos: 45,
      preco: 120,
      descricao: 'abc',
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.descricao).toBeDefined();
    }
  });

  it('calcula corretamente o sinal padrão de 30%', () => {
    expect(PERCENTUAL_SINAL_PADRAO).toBe(30);
    expect(calcularSinal(100)).toBe(30);
    expect(calcularSinal(150)).toBe(45);
    expect(calcularSinal(200)).toBe(60);
    expect(calcularSinal(125.5, 30)).toBe(37.65);
    expect(calcularSinal(0)).toBe(0);
  });

  it('calcula o percentual correspondente do sinal', () => {
    expect(calcularPercentualSinal(100, 30)).toBe(30);
    expect(calcularPercentualSinal(200, 60)).toBe(30);
    expect(calcularPercentualSinal(150, 45)).toBe(30);
    expect(calcularPercentualSinal(100, 50)).toBe(50);
  });

  it('converte corretamente entre reais e centavos', () => {
    expect(reaisParaCentavos(150)).toBe(15000);
    expect(reaisParaCentavos(45.5)).toBe(4550);
    expect(centavosParaReais(15000)).toBe(150);
    expect(centavosParaReais(4550)).toBe(45.5);
  });
});
