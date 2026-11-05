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
 * Schema Zod para cadastro de um novo serviço no painel administrativo.
 * Valida duração em minutos, preço, sinal, descrição e status de ativação.
 */
export const criarServicoInputSchema = servicoInputSchema;
export type CriarServicoInput = z.infer<typeof criarServicoInputSchema>;

/**
 * Schema Zod para edição de um serviço existente (exige identificador).
 */
export const editarServicoInputSchema = servicoInputSchema.and(
  z.object({
    id: z.string().trim().min(1, 'O identificador do serviço é obrigatório'),
  }),
);

export type EditarServicoInput = z.infer<typeof editarServicoInputSchema>;

/**
 * Schema para alteração de status ativo/inativo de um serviço.
 */
export const alterarStatusServicoInputSchema = z.object({
  id: z.string().trim().min(1, 'O identificador do serviço é obrigatório'),
  ativo: z.boolean(),
});

export type AlterarStatusServicoInput = z.infer<typeof alterarStatusServicoInputSchema>;

/**
 * Schema para operações que demandam apenas o identificador do serviço.
 */
export const gerenciarServicoIdSchema = z.object({
  id: z.string().trim().min(1, 'O identificador do serviço é obrigatório'),
});

export type GerenciarServicoIdInput = z.infer<typeof gerenciarServicoIdSchema>;

/**
 * Modelo completo do serviço representando a entidade no sistema e no banco de dados.
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

/**
 * Schema Zod para validação rigorosa de serviços persistidos no banco de dados (Firestore).
 * Garante a presença dos campos de sinal de pagamento conforme as regras de negócio.
 */
export const servicoDatabaseSchema = z
  .object({
    id: z.string().trim().min(1, 'Identificador obrigatório'),
    nome: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    duracaoMinutos: z.number().int().min(15).max(360),
    preco: z.number().positive('Preço deve ser positivo'),
    precoEmCentavos: z.number().int().positive('Preço em centavos deve ser positivo'),
    sinal: z.number().min(0, 'Sinal não pode ser negativo'),
    sinalEmCentavos: z.number().int().min(0, 'Sinal em centavos não pode ser negativo'),
    sinalPercentual: z
      .number()
      .min(0, 'Percentual de sinal não pode ser negativo')
      .max(100, 'Percentual não pode exceder 100%'),
    descricao: z.string().trim().min(5, 'Descrição deve ter no mínimo 5 caracteres'),
    ativo: z.boolean(),
    categoria: z.string().trim().optional(),
    imageSrc: z.string().optional(),
    imageAlt: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .refine((data) => data.sinal <= data.preco, {
    message: 'O valor do sinal não pode ser superior ao preço total do serviço',
    path: ['sinal'],
  })
  .refine((data) => data.sinalEmCentavos <= data.precoEmCentavos, {
    message: 'O valor do sinal em centavos não pode ser superior ao preço em centavos',
    path: ['sinalEmCentavos'],
  });

export type ServicoDatabase = z.infer<typeof servicoDatabaseSchema>;

/**
 * Type guard que valida se um objeto desconhecido atende a estrutura do ServicoModel com sinal de pagamento.
 */
export function validateServico(data: unknown): data is ServicoModel {
  if (!data || typeof data !== 'object') return false;
  const result = servicoDatabaseSchema.safeParse(data);
  return result.success;
}

/**
 * Schema Zod flexível para leitura de documentos da coleção 'servicos' do Firestore,
 * aceitando tanto convenções em português quanto em inglês / legado.
 */
export const servicoFirestoreDocumentSchema = z.object({
  id: z.string().optional(),
  nome: z.string().optional(),
  name: z.string().optional(),
  descricao: z.string().optional(),
  description: z.string().optional(),
  duracao: z.number().optional(),
  duracaoMinutos: z.number().optional(),
  durationMinutes: z.number().optional(),
  preco: z.union([z.number(), z.string()]).optional(),
  precoCentavos: z.union([z.number(), z.string()]).optional(),
  priceInCents: z.union([z.number(), z.string()]).optional(),
  sinal: z.union([z.number(), z.string()]).optional(),
  sinalCentavos: z.union([z.number(), z.string()]).optional(),
  sinalInCents: z.union([z.number(), z.string()]).optional(),
  sinalPercentual: z.union([z.number(), z.string()]).optional(),
  ativo: z.boolean().optional(),
  active: z.boolean().optional(),
  categoria: z.string().optional(),
  category: z.string().optional(),
  imageSrc: z.string().optional(),
  imageAlt: z.string().optional(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
});
