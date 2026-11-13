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
  sessionId: z.string().trim().min(1, 'Identificador de sessão não pode ser vazio.').optional(),
});

export type RevogarSessoesInput = z.infer<typeof revogarSessoesInputSchema>;

export const iniciarSessaoUnicaInputSchema = z.object({
  sessionId: z.string().trim().min(1, 'Identificador de sessão não pode ser vazio.').optional(),
  motivo: z.string().trim().max(250, 'O motivo deve ter no máximo 250 caracteres.').optional(),
});

export type IniciarSessaoUnicaInput = z.infer<typeof iniciarSessaoUnicaInputSchema>;

export interface ResultadoRevogacaoSessao {
  uid: string;
  sessionId?: string;
  revogadoEm: string;
  mensagem: string;
  motivo?: string;
  politicaSessaoUnica?: boolean;
}
