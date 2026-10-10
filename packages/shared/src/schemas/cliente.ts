import { z } from 'zod';
import type { ContactPreferences } from '../types/user-profile.js';

export const userRoleSchema = z.enum(['admin', 'client', 'professional', 'cliente']);

export const userStatusSchema = z.enum(['ativo', 'inativo', 'pendente']);

/**
 * Validação de telefone brasileiro com DDD:
 * Aceita formatos: (XX) 9XXXX-XXXX, (XX) XXXXX-XXXX, (XX) XXXX-XXXX, ou apenas dígitos (10 ou 11 dígitos).
 */
export const telefoneRegex = /^(?:\(?([1-9]{2})\)?\s?)?(?:((?:9\d|[2-9])\d{3})-?(\d{4}))$/;

export const contactPreferencesSchema = z.object({
  whatsapp: z.boolean().default(true),
  email: z.boolean().default(true),
  lembretesAgendamento: z.boolean().default(true),
});

export const PREFERENCIAS_CONTATO_PADRAO: ContactPreferences = {
  whatsapp: true,
  email: true,
  lembretesAgendamento: true,
};

/**
 * Schema de entrada para criação do perfil básico do cliente após o cadastro da conta
 */
export const criarPerfilClienteInputSchema = z.object({
  uid: z.string().min(1, 'Identificador de usuário (uid) é obrigatório.').optional(),
  nome: z
    .string()
    .trim()
    .min(2, 'Nome deve ter no mínimo 2 caracteres.')
    .max(100, 'Nome deve ter no máximo 100 caracteres.'),
  email: z.string().trim().email('E-mail inválido.'),
  telefone: z
    .string()
    .trim()
    .min(10, 'Telefone deve conter no mínimo 10 dígitos com DDD.')
    .max(20, 'Telefone inválido.')
    .refine((val) => {
      const clean = val.replace(/\D/g, '');
      return clean.length === 10 || clean.length === 11;
    }, 'Telefone com DDD deve conter 10 ou 11 dígitos.'),
  preferenciasContato: contactPreferencesSchema.optional(),
});

export type CriarPerfilClienteInput = z.infer<typeof criarPerfilClienteInputSchema>;

/**
 * Schema para validação do documento de perfil completo do cliente
 */
export const perfilClienteSchema = z.object({
  uid: z.string().min(1),
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  telefone: z.string().min(10).max(20),
  role: userRoleSchema,
  status: userStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  preferenciasContato: contactPreferencesSchema.optional(),
});

export type PerfilClienteModel = z.infer<typeof perfilClienteSchema>;
