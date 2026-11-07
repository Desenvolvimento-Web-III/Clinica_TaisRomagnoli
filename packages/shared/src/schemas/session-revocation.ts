import { z } from 'zod';

/**
 * Schema de validação para solicitação de revogação de sessões (refresh tokens) no Firebase Authentication.
 */
export const revogarSessoesInputSchema = z.object({
  targetUid: z
    .string()
    .trim()
    .min(1, 'Identificador (uid) do usuário alvo não pode ser vazio.')
    .optional(),
  motivo: z.string().trim().max(250, 'O motivo deve ter no máximo 250 caracteres.').optional(),
  politicaSessaoUnica: z.boolean().optional().default(false),
});

export type RevogarSessoesInput = z.infer<typeof revogarSessoesInputSchema>;

export interface ResultadoRevogacaoSessao {
  uid: string;
  revogadoEm: string;
  mensagem: string;
  motivo?: string;
  politicaSessaoUnica?: boolean;
}
