import { describe, it, expect } from 'vitest';
import {
  maskCardNumber,
  maskCardExpiry,
  maskCardCvv,
  maskCardHolderName,
  detectCardBrand,
  validateCreditCardForm,
} from './payment-formatters';

describe('payment-formatters', () => {
  describe('maskCardNumber', () => {
    it('formata números em blocos de 4 dígitos', () => {
      expect(maskCardNumber('1234567812345678')).toBe('1234 5678 1234 5678');
      expect(maskCardNumber('12345')).toBe('1234 5');
    });

    it('limita a 16 dígitos e ignora caracteres não numéricos', () => {
      expect(maskCardNumber('1234-abcd-5678-9012-3456-9999')).toBe('1234 5678 9012 3456');
    });
  });

  describe('maskCardExpiry', () => {
    it('adiciona barra automaticamente após 2 dígitos', () => {
      expect(maskCardExpiry('12')).toBe('12');
      expect(maskCardExpiry('1228')).toBe('12/28');
    });

    it('remove caracteres não numéricos e limita a 4 dígitos', () => {
      expect(maskCardExpiry('12/2899')).toBe('12/28');
    });
  });

  describe('maskCardCvv', () => {
    it('limita CVV a no máximo 4 dígitos numéricos', () => {
      expect(maskCardCvv('123')).toBe('123');
      expect(maskCardCvv('12345')).toBe('1234');
      expect(maskCardCvv('abc99')).toBe('99');
    });
  });

  describe('maskCardHolderName', () => {
    it('converte para maiúsculas e remove números e caracteres especiais', () => {
      expect(maskCardHolderName('Mariana Souza')).toBe('MARIANA SOUZA');
      expect(maskCardHolderName('João 123 Silva!')).toBe('JOÃO  SILVA');
    });
  });

  describe('detectCardBrand', () => {
    it('identifica bandeiras principais', () => {
      expect(detectCardBrand('4111 2222 3333 4444')).toBe('visa');
      expect(detectCardBrand('5123 4567 8901 2345')).toBe('mastercard');
      expect(detectCardBrand('3782 822463 10005')).toBe('amex');
      expect(detectCardBrand('6062 8224 6310 0050')).toBe('elo');
      expect(detectCardBrand('9999 9999 9999 9999')).toBe('desconhecido');
    });
  });

  describe('validateCreditCardForm', () => {
    it('valida formulário com sucesso quando todos os dados estão corretos', () => {
      const result = validateCreditCardForm({
        numero: '4111 2222 3333 4444',
        nome: 'MARIANA SOUZA',
        validade: '12/30',
        cvv: '123',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('retorna erros para campos vazios ou inválidos', () => {
      const result = validateCreditCardForm({
        numero: '',
        nome: 'Mariana',
        validade: '13/20',
        cvv: '1',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.numero).toBeDefined();
      expect(result.errors.nome).toContain('completo');
      expect(result.errors.validade).toBeDefined();
      expect(result.errors.cvv).toBeDefined();
    });
  });
});
