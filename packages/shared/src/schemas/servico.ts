import { z } from 'zod';

/**
 * Percentual de sinal padrão para reserva na clínica (30%), conforme docs/PRODUCT_RULES.md
 */
export const PERCENTUAL_SINAL_PADRAO = 30;

/**
 * Calcula o valor padrão do sinal em Reais com base no preço e no percentual definido (padrão 30%).
 * Retorna o valor arredondado para duas casas decimais.
 */
export function calcularSinal(preco: number, percentual: number = PERCENTUAL_SINAL_PADRAO): number {
  if (preco <= 0 || percentual <= 0) return 0;
  return Math.round(preco * (percentual / 100) * 100) / 100;
}

/**
 * Calcula o percentual correspondente do sinal em relação ao preço.
 */
export function calcularPercentualSinal(preco: number, sinal: number): number {
  if (preco <= 0 || sinal <= 0) return 0;
  return Math.min(100, Math.round((sinal / preco) * 100 * 10) / 10);
}

/**
 * Converte valor em Reais para centavos (inteiro).
 */
export function reaisParaCentavos(valor: number): number {
  return Math.round(valor * 100);
}

/**
 * Converte valor em centavos para Reais com precisão de duas casas.
 */
export function centavosParaReais(centavos: number): number {
  return Math.round(centavos) / 100;
}

/**
 * Schema Zod para criação e edição de serviços no painel administrativo.
 * Valida: nome, duração em minutos, preço, sinal e descrição.
 */
export const servicoInputSchema = z
  .object({
    id: z.string().trim().optional(),
    nome: z
      .string()
      .trim()
      .min(3, 'O nome do serviço deve ter no mínimo 3 caracteres')
      .max(100, 'O nome do serviço deve ter no máximo 100 caracteres'),
    duracaoMinutos: z.coerce
      .number()
      .int('A duração deve ser um número inteiro de minutos')
      .min(15, 'A duração mínima é de 15 minutos')
      .max(360, 'A duração máxima é de 360 minutos (6 horas)'),
    preco: z.coerce
      .number()
      .positive('O preço deve ser maior que zero')
      .max(10000, 'O preço deve ser menor que R$ 10.000,00'),
    sinal: z.coerce
      .number()
      .min(0, 'O sinal não pode ser negativo')
      .max(10000, 'O sinal não pode exceder R$ 10.000,00')
      .optional(),
    sinalPercentual: z.coerce
      .number()
      .min(0, 'O percentual de sinal não pode ser negativo')
      .max(100, 'O percentual de sinal não pode exceder 100%')
      .optional(),
    descricao: z
      .string()
      .trim()
      .min(5, 'A descrição deve ter no mínimo 5 caracteres')
      .max(1000, 'A descrição deve ter no máximo 1000 caracteres'),
    ativo: z.boolean().default(true),
    categoria: z.string().trim().max(50, 'A categoria deve ter no máximo 50 caracteres').optional(),
  })
  .refine(
    (data) => {
      if (data.sinal !== undefined) {
        return data.sinal <= data.preco;
      }
      return true;
    },
    {
      message: 'O valor do sinal não pode ser superior ao preço total do serviço',
      path: ['sinal'],
    },
  );

export type ServicoInput = z.infer<typeof servicoInputSchema>;

/**
 * Modelo completo do serviço representando a entidade no sistema.
 */
export interface ServicoModel {
  id: string;
  nome: string;
  duracaoMinutos: number;
  preco: number;
  precoEmCentavos: number;
  sinal: number;
  sinalEmCentavos: number;
  sinalPercentual: number;
  descricao: string;
  ativo: boolean;
  categoria?: string;
  imageSrc?: string;
  imageAlt?: string;
  createdAt?: string;
  updatedAt?: string;
}
