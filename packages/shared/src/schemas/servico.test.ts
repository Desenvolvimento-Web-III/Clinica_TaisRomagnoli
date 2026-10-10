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

  it('valida schema de edição exigindo identificador id', async () => {
    const { editarServicoInputSchema } = await import('./servico.js');
    const valido = editarServicoInputSchema.safeParse({
      id: 'srv-123',
      nome: 'Massagem Craniana',
      duracaoMinutos: 45,
      preco: 130,
      descricao: 'Alívio para tensões na região da cabeça e pescoço.',
      ativo: true,
    });
    expect(valido.success).toBe(true);

    const invalidoSemId = editarServicoInputSchema.safeParse({
      nome: 'Massagem Craniana',
      duracaoMinutos: 45,
      preco: 130,
      descricao: 'Alívio para tensões na região da cabeça e pescoço.',
    });
    expect(invalidoSemId.success).toBe(false);
  });

  it('valida schema de alteração de status ativo/inativo e gerenciarServicoId', async () => {
    const { alterarStatusServicoInputSchema, gerenciarServicoIdSchema } =
      await import('./servico.js');

    const statusValido = alterarStatusServicoInputSchema.safeParse({
      id: 'srv-123',
      ativo: false,
    });
    expect(statusValido.success).toBe(true);

    const statusInvalido = alterarStatusServicoInputSchema.safeParse({
      id: '',
      ativo: false,
    });
    expect(statusInvalido.success).toBe(false);

    const idValido = gerenciarServicoIdSchema.safeParse({ id: 'srv-123' });
    expect(idValido.success).toBe(true);

    const idVazio = gerenciarServicoIdSchema.safeParse({ id: '   ' });
    expect(idVazio.success).toBe(false);
  });

  it('valida schema de cadastro com duração, preço, sinal, descrição e status', async () => {
    const { criarServicoInputSchema } = await import('./servico.js');

    // Cadastro válido completo com status ativo
    const validoAtivo = criarServicoInputSchema.safeParse({
      nome: 'Bambuterapia',
      duracaoMinutos: 60,
      preco: 180,
      sinal: 54,
      descricao: 'Massagem realizada com hastes de bambu.',
      ativo: true,
      categoria: 'Corporal',
    });
    expect(validoAtivo.success).toBe(true);

    // Cadastro válido com status inativo
    const validoInativo = criarServicoInputSchema.safeParse({
      nome: 'Terapia Pré-Natal',
      duracaoMinutos: 45,
      preco: 160,
      descricao: 'Atendimento especial para gestantes.',
      ativo: false,
    });
    expect(validoInativo.success).toBe(true);
    if (validoInativo.success) {
      expect(validoInativo.data.ativo).toBe(false);
    }

    // Rejeição de cadastro sem duração
    const semDuracao = criarServicoInputSchema.safeParse({
      nome: 'Massagem Relaxante',
      preco: 150,
      descricao: 'Descrição longa e válida.',
    });
    expect(semDuracao.success).toBe(false);

    // Rejeição de cadastro sem preço
    const semPreco = criarServicoInputSchema.safeParse({
      nome: 'Massagem Relaxante',
      duracaoMinutos: 60,
      descricao: 'Descrição longa e válida.',
    });
    expect(semPreco.success).toBe(false);

    // Rejeição de cadastro sem descrição
    const semDescricao = criarServicoInputSchema.safeParse({
      nome: 'Massagem Relaxante',
      duracaoMinutos: 60,
      preco: 150,
    });
    expect(semDescricao.success).toBe(false);
  });
});
