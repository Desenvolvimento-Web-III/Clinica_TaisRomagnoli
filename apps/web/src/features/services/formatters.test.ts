import { describe, expect, it } from 'vitest';
import { calculateServiceSinal, formatServiceDuration, formatServicePrice } from './formatters';

describe('services formatters', () => {
  it('formata o preço em reais a partir de centavos', () => {
    const formatado = formatServicePrice(17000);
    // Checa normalizando espaço não quebrável
    expect(formatado.replace(/\u00a0/g, ' ')).toBe('R$ 170,00');
  });

  it('formata a duração em minutos', () => {
    expect(formatServiceDuration(60)).toBe('60 min');
  });

  it('calcula o sinal padrão de 30% e o saldo restante', () => {
    const resultado = calculateServiceSinal({
      priceInCents: 17000,
    });

    expect(resultado.percentual).toBe(30);
    expect(resultado.sinalInCents).toBe(5100);
    expect(resultado.saldoInCents).toBe(11900);
  });

  it('respeita percentual ou sinal personalizado quando fornecido', () => {
    const resultado = calculateServiceSinal({
      priceInCents: 20000,
      sinalPercentual: 50,
    });

    expect(resultado.percentual).toBe(50);
    expect(resultado.sinalInCents).toBe(10000);
    expect(resultado.saldoInCents).toBe(10000);
  });
});
