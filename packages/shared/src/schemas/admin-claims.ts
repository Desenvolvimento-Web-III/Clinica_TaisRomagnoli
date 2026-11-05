import { z } from 'zod';

/**
 * Schema de validação para solicitação de atribuição ou alteração de função administrativa via Custom Claims.
 */
export const atribuirFuncaoAdminInputSchema = z
  .object({
    targetUid: z
      .string()
      .trim()
      .min(1, 'Identificador (uid) do usuário alvo é obrigatório.')
      .optional(),
    email: z.string().trim().email('E-mail informado é inválido.').optional(),
    role: z.enum(['admin', 'cliente']).default('admin'),
  })
  .refine((data) => Boolean(data.targetUid || data.email), {
    message: 'Informe o targetUid ou o e-mail do usuário para atribuir a função.',
    path: ['targetUid'],
  });

export type AtribuirFuncaoAdminInput = z.infer<typeof atribuirFuncaoAdminInputSchema>;

/**
 * Estrutura das Custom Claims gerenciadas pelo Firebase Auth para autorização de administradores.
 */
export interface AdminCustomClaims {
  role: 'admin' | 'cliente';
  admin: boolean;
  [key: string]: unknown;
}
