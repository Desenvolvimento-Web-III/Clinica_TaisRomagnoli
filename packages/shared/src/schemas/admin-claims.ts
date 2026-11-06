import { z } from 'zod';

/**
 * Papéis de acesso suportados pelas Custom Claims do Firebase Authentication.
 */
export const customClaimsRoleSchema = z.enum(['admin', 'client', 'cliente']);
export type CustomClaimsRole = z.infer<typeof customClaimsRoleSchema>;

/**
 * Schema de validação para solicitação de atribuição ou alteração de função administrativa ou cliente via Custom Claims.
 */
export const atribuirFuncaoAdminInputSchema = z
  .object({
    targetUid: z
      .string()
      .trim()
      .min(1, 'Identificador (uid) do usuário alvo é obrigatório.')
      .optional(),
    email: z.string().trim().email('E-mail informado é inválido.').optional(),
    role: customClaimsRoleSchema.default('admin'),
  })
  .refine((data) => Boolean(data.targetUid || data.email), {
    message: 'Informe o targetUid ou o e-mail do usuário para atribuir a função.',
    path: ['targetUid'],
  });

export type AtribuirFuncaoAdminInput = z.infer<typeof atribuirFuncaoAdminInputSchema>;

/**
 * Estrutura das Custom Claims gerenciadas pelo Firebase Auth para perfis admin e client/cliente.
 */
export interface CustomClaimsPayload {
  role: 'admin' | 'client' | 'cliente';
  admin: boolean;
  client: boolean;
  [key: string]: unknown;
}

export type AdminCustomClaims = CustomClaimsPayload;

/**
 * Gera o payload de Custom Claims padronizado e estritamente tipado de acordo com o papel.
 */
export function gerarCustomClaims(role: CustomClaimsRole): CustomClaimsPayload {
  const isAdmin = role === 'admin';
  return {
    role,
    admin: isAdmin,
    client: !isAdmin,
  };
}
