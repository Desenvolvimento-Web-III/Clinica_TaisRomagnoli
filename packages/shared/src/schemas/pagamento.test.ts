import { describe, it, expect } from 'vitest';
import {
  calcularCobrancaSinal,
  gerarDadosCobrancaSinal,
  solicitarCobrancaSinalInputSchema,
  cobrancaSinalSchema,
  PERCENTUAL_SINAL_REGRA,
} from './pagamento.js';

describe('Schema e Regras de Cobrança do Sinal de 30% (pagamento.ts)', () => {
  describe('calcularCobrancaSinal', () => {
    it('calcula o sinal de exatamente 30% e o saldo restante de 70% com precisão de centavos', () => {
      // Ex: Serviço de R$ 150,00 (15000 centavos) -> Sinal 30% = R$ 45,00 (4500 centavos)
      const res = calcularCobrancaSinal(15000);
      expect(res.valorTotalEmCentavos).toBe(15000);
      expect(res.percentualSinal).toBe(PERCENTUAL_SINAL_REGRA);
      expect(res.valorSinalEmCentavos).toBe(4500);
      expect(res.saldoRestanteEmCentavos).toBe(10500);
      expect(res.valorSinalEmCentavos + res.saldoRestanteEmCentavos).toBe(res.valorTotalEmCentavos);
    });

    it('arredonda corretamente centavos fracionários', () => {
      // R$ 175,50 (17550 centavos) -> 30% = 5265 centavos (R$ 52,65)
      const res = calcularCobrancaSinal(17550);
      expect(res.valorSinalEmCentavos).toBe(5265);
      expect(res.saldoRestanteEmCentavos).toBe(12285);
      expect(res.valorSinalEmCentavos + res.saldoRestanteEmCentavos).toBe(17550);
    });

    it('retorna zeros caso valor do serviço seja menor ou igual a zero', () => {
      const res = calcularCobrancaSinal(0);
      expect(res.valorSinalEmCentavos).toBe(0);
      expect(res.saldoRestanteEmCentavos).toBe(0);
    });

    it('permite percentual customizado dentro de 0 a 100%', () => {
      const res = calcularCobrancaSinal(20000, 50);
      expect(res.valorSinalEmCentavos).toBe(10000);
      expect(res.saldoRestanteEmCentavos).toBe(10000);
      expect(res.percentualSinal).toBe(50);
    });
  });

  describe('gerarDadosCobrancaSinal', () => {
    it('gera dados de cobrança Pix com chave e código copia e cola', () => {
      const dados = gerarDadosCobrancaSinal({
        cobrancaId: 'cob-1234567890',
        metodoPagamento: 'pix',
        valorSinalEmCentavos: 4500,
        servicoNome: 'Massagem Relaxante',
      });

      expect(dados.metodo).toBe('pix');
      expect(dados.chavePix).toBe('financeiro@clinicataisromagnoli.com.br');
      expect(dados.codigoPixCopiaECola).toContain('BR.GOV.BCB.PIX');
      expect(dados.instrucoes).toContain('R$ 45,00');
      expect(dados.instrucoes).toContain('Massagem Relaxante');
    });

    it('gera dados de cobrança para boleto', () => {
      const dados = gerarDadosCobrancaSinal({
        cobrancaId: 'cob-boleto-1',
        metodoPagamento: 'boleto',
        valorSinalEmCentavos: 5100,
        servicoNome: 'Drenagem Linfática',
      });

      expect(dados.metodo).toBe('boleto');
      expect(dados.linhaDigitavelBoleto).toBeDefined();
      expect(dados.instrucoes).toContain('R$ 51,00');
    });

    it('gera dados de cobrança para cartão', () => {
      const dados = gerarDadosCobrancaSinal({
        cobrancaId: 'cob-card-1',
        metodoPagamento: 'cartao',
        valorSinalEmCentavos: 6000,
        servicoNome: 'Limpeza de Pele',
      });

      expect(dados.metodo).toBe('cartao');
      expect(dados.mensagemSucesso).toBeDefined();
      expect(dados.instrucoes).toContain('R$ 60,00');
    });
  });

  describe('solicitarCobrancaSinalInputSchema', () => {
    it('valida input mínimo correto para cobrança', () => {
      const input = {
        servicoId: 'servico-massagem',
        servicoNome: 'Massagem Relaxante',
        valorTotalEmCentavos: 17000,
        metodoPagamento: 'pix',
      };

      const parsed = solicitarCobrancaSinalInputSchema.parse(input);
      expect(parsed.servicoId).toBe('servico-massagem');
      expect(parsed.metodoPagamento).toBe('pix');
      expect(parsed.valorTotalEmCentavos).toBe(17000);
    });

    it('rejeita valor inferior a R$ 1,00', () => {
      const input = {
        servicoId: 'servico-massagem',
        valorTotalEmCentavos: 50,
      };

      expect(() => solicitarCobrancaSinalInputSchema.parse(input)).toThrow();
    });

    it('rejeita servicoId vazio', () => {
      const input = {
        servicoId: '',
      };

      expect(() => solicitarCobrancaSinalInputSchema.parse(input)).toThrow();
    });
  });

  describe('cobrancaSinalSchema', () => {
    it('valida objeto de cobrança completo', () => {
      const cobranca = {
        id: 'cob-100',
        clienteId: 'cliente-1',
        clienteNome: 'Mariana Souza',
        servicoId: 'serv-1',
        servicoNome: 'Massagem Relaxante',
        valorTotalEmCentavos: 15000,
        percentualSinal: 30,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        metodoPagamento: 'pix',
        status: 'pendente',
        dadosCobranca: {
          metodo: 'pix',
          chavePix: 'financeiro@clinicataisromagnoli.com.br',
          codigoPixCopiaECola: '0002012658...',
          instrucoes: 'Efetue o pagamento do sinal de 30% (R$ 45,00)',
        },
        expiraEmIso: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const parsed = cobrancaSinalSchema.parse(cobranca);
      expect(parsed.id).toBe('cob-100');
      expect(parsed.status).toBe('pendente');
    });
  });
});

