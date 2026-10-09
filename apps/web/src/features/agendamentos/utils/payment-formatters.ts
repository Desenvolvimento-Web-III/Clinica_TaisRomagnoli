/**
 * Funções utilitárias de máscaras e validações para formulário de pagamento
 */

export function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function maskCardExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export function maskCardCvv(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

export function maskCardHolderName(value: string): string {
  return value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').toUpperCase();
}

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'desconhecido';

export function detectCardBrand(cardNumber: string): CardBrand {
  const clean = cardNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
  if (/^3[47]/.test(clean)) return 'amex';
  if (/^(4011|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|6062|650|651|655)/.test(clean))
    return 'elo';
  return 'desconhecido';
}

export interface CardValidationErrors {
  numero?: string;
  nome?: string;
  validade?: string;
  cvv?: string;
}

export function validateCreditCardForm(data: {
  numero: string;
  nome: string;
  validade: string;
  cvv: string;
}): { isValid: boolean; errors: CardValidationErrors } {
  const errors: CardValidationErrors = {};

  // Validação do número do cartão
  const cleanNumber = data.numero.replace(/\D/g, '');
  if (!cleanNumber) {
    errors.numero = 'Informe o número do cartão.';
  } else if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    errors.numero = 'Número do cartão inválido (mínimo de 13 a 16 dígitos).';
  }

  // Validação do nome
  const cleanName = data.nome.trim();
  if (!cleanName) {
    errors.nome = 'Informe o nome impresso no cartão.';
  } else if (cleanName.length < 3) {
    errors.nome = 'Nome muito curto.';
  } else if (!cleanName.includes(' ')) {
    errors.nome = 'Informe o nome completo (nome e sobrenome).';
  }

  // Validação da validade (MM/AA)
  const cleanExpiry = data.validade.trim();
  if (!cleanExpiry) {
    errors.validade = 'Informe a validade.';
  } else {
    const parts = cleanExpiry.split('/');
    if (parts.length !== 2 || parts[0]?.length !== 2 || parts[1]?.length !== 2) {
      errors.validade = 'Formato inválido. Use MM/AA.';
    } else {
      const month = parseInt(parts[0], 10);
      const year = 2000 + parseInt(parts[1], 10);

      if (month < 1 || month > 12) {
        errors.validade = 'Mês inválido (01 a 12).';
      } else {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          errors.validade = 'Cartão expirado.';
        }
      }
    }
  }

  // Validação do CVV
  const cleanCvv = data.cvv.replace(/\D/g, '');
  if (!cleanCvv) {
    errors.cvv = 'Informe o código CVV.';
  } else if (cleanCvv.length < 3 || cleanCvv.length > 4) {
    errors.cvv = 'CVV deve conter 3 ou 4 dígitos.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
