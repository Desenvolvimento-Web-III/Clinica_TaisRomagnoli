import { z } from 'zod';

export const ID_PROFISSIONAL_PADRAO = 'prof-tais-romagnoli';
export const NOME_PROFISSIONAL_PADRAO = 'Tais Romagnoli';

/**
 * Schema Zod completo para validação do documento de profissional no sistema e Firestore.
 */
export const professionalSchema = z.object({
  id: z.string().trim().min(1, 'O identificador do profissional é obrigatório.'),
  nome: z
    .string()
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  especialidade: z
    .string()
    .trim()
    .min(2, 'A especialidade deve ter no mínimo 2 caracteres.')
    .max(100, 'A especialidade deve ter no máximo 100 caracteres.'),
  ativo: z.boolean().default(true),
  diasFolga: z
    .array(
      z
        .number()
        .int()
        .min(0, 'Dia da semana inválido (0-6).')
        .max(6, 'Dia da semana inválido (0-6).'),
    )
    .default([0, 2]), // 0 = Domingo, 2 = Terça-feira (padrão da clínica)
  intervaloMinutos: z
    .number()
    .int('O intervalo deve ser um número inteiro de minutos.')
    .min(0, 'O intervalo não pode ser negativo.')
    .max(120, 'O intervalo não pode exceder 120 minutos.')
    .default(30),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ProfessionalDocument = z.infer<typeof professionalSchema>;

/**
 * Schema Zod para cadastro de novo profissional (restrito à administradora).
 */
export const criarProfissionalInputSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2, 'O identificador personalizado deve ter no mínimo 2 caracteres.')
    .max(50, 'O identificador não pode exceder 50 caracteres.')
    .regex(
      /^[a-z0-9-]+$/,
      'O identificador deve conter apenas letras minúsculas, números e hifens.',
    )
    .optional(),
  nome: z
    .string()
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.'),
  especialidade: z
    .string()
    .trim()
    .min(2, 'A especialidade deve ter no mínimo 2 caracteres.')
    .max(100, 'A especialidade deve ter no máximo 100 caracteres.'),
  ativo: z.boolean().optional().default(true),
  diasFolga: z
    .array(
      z
        .number()
        .int()
        .min(0, 'Dia da semana inválido (0-6).')
        .max(6, 'Dia da semana inválido (0-6).'),
    )
    .optional()
    .default([0, 2]),
  intervaloMinutos: z
    .number()
    .int('O intervalo deve ser um número inteiro de minutos.')
    .min(0, 'O intervalo não pode ser negativo.')
    .max(120, 'O intervalo não pode exceder 120 minutos.')
    .optional()
    .default(30),
});

export type CriarProfissionalInput = z.infer<typeof criarProfissionalInputSchema>;

/**
 * Schema Zod para atualização cadastral de profissional (restrito à administradora).
 */
export const atualizarProfissionalInputSchema = z.object({
  id: z.string().trim().min(1, 'O ID do profissional é obrigatório.'),
  nome: z
    .string()
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres.')
    .max(100, 'O nome deve ter no máximo 100 caracteres.')
    .optional(),
  especialidade: z
    .string()
    .trim()
    .min(2, 'A especialidade deve ter no mínimo 2 caracteres.')
    .max(100, 'A especialidade deve ter no máximo 100 caracteres.')
    .optional(),
  ativo: z.boolean().optional(),
  diasFolga: z
    .array(
      z
        .number()
        .int()
        .min(0, 'Dia da semana inválido (0-6).')
        .max(6, 'Dia da semana inválido (0-6).'),
    )
    .optional(),
  intervaloMinutos: z
    .number()
    .int('O intervalo deve ser um número inteiro de minutos.')
    .min(0, 'O intervalo não pode ser negativo.')
    .max(120, 'O intervalo não pode exceder 120 minutos.')
    .optional(),
});

export type AtualizarProfissionalInput = z.infer<typeof atualizarProfissionalInputSchema>;

/**
 * Schema Zod para vincular ou desvincular um profissional a um serviço.
 */
export const vincularServicoProfissionalInputSchema = z.object({
  servicoId: z.string().trim().min(1, 'ID do serviço é obrigatório.'),
  profissionalId: z.string().trim().min(1, 'ID do profissional é obrigatório.'),
  habilitado: z.boolean().default(true),
});

export type VincularServicoProfissionalInput = z.infer<
  typeof vincularServicoProfissionalInputSchema
>;

/**
 * Verifica se um profissional está habilitado para realizar determinado serviço.
 * Para compatibilidade com serviços sem profissionais especificados, assume a profissional padrão.
 */
export function verificarProfissionalHabilitadoParaServico(
  servico: {
    profissionaisHabilitados?: string[];
    profissionalPadraoId?: string;
  },
  profissionalId: string,
): boolean {
  if (!servico.profissionaisHabilitados || servico.profissionaisHabilitados.length === 0) {
    // Se o serviço não possui profissionais explicitamente cadastrados,
    // o padrão da clínica é a profissional inicial ('prof-tais-romagnoli')
    const padrao = servico.profissionalPadraoId || ID_PROFISSIONAL_PADRAO;
    return profissionalId === padrao;
  }

  return servico.profissionaisHabilitados.includes(profissionalId);
}
