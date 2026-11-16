import { z } from 'zod';

/**
 * Papel do usuário executor registrado na trilha de auditoria.
 */
export const usuarioRoleAuditoriaSchema = z.enum(['admin', 'cliente', 'sistema', 'anonimo']);
export type UsuarioRoleAuditoria = z.infer<typeof usuarioRoleAuditoriaSchema>;

/**
 * Schema para um registro de auditoria completo gravado no sistema.
 */
export const registroAuditoriaSchema = z.object({
  id: z.string().min(1, 'ID do registro de auditoria é obrigatório'),
  usuarioId: z.string().min(1, 'ID do usuário é obrigatório'),
  usuarioEmail: z.string().email('E-mail do usuário inválido').optional().nullable(),
  usuarioRole: usuarioRoleAuditoriaSchema.default('sistema'),
  acao: z.string().min(1, 'Ação de auditoria é obrigatória'),
  recurso: z.string().min(1, 'Recurso afetado é obrigatório'),
  recursoId: z.string().min(1, 'ID do recurso afetado é obrigatório'),
  dataHora: z.string().datetime({ message: 'Data e hora em formato ISO 8601 é obrigatória' }),
  dadosAfetados: z.record(z.string(), z.unknown()).default({}),
  ip: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

export type RegistroAuditoria = z.infer<typeof registroAuditoriaSchema>;

/**
 * Schema de entrada para criação de registro de auditoria.
 */
export const criarRegistroAuditoriaInputSchema = z.object({
  id: z.string().optional(),
  usuarioId: z.string().min(1, 'ID do usuário é obrigatório'),
  usuarioEmail: z.string().email().optional().nullable(),
  usuarioRole: usuarioRoleAuditoriaSchema.default('sistema'),
  acao: z.string().min(1, 'Ação é obrigatória'),
  recurso: z.string().min(1, 'Recurso é obrigatório'),
  recursoId: z.string().min(1, 'ID do recurso é obrigatório'),
  dataHora: z.string().datetime().optional(),
  dadosAfetados: z.record(z.string(), z.unknown()).default({}),
  ip: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

export type CriarRegistroAuditoriaInput = z.infer<typeof criarRegistroAuditoriaInputSchema>;

/**
 * Schema de filtro para consulta de registros de auditoria.
 */
export const filtroAuditoriaSchema = z.object({
  usuarioId: z.string().optional(),
  acao: z.string().optional(),
  recurso: z.string().optional(),
  recursoId: z.string().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  limite: z.number().int().positive().max(100).default(50).optional(),
});

export type FiltroAuditoria = z.infer<typeof filtroAuditoriaSchema>;
