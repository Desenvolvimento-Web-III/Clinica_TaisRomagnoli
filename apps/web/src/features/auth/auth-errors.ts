import { getFirebaseErrorCode } from '@/lib/firebase-error';

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/operation-not-allowed':
    'O método de login por e-mail e senha não está habilitado no Firebase Authentication. Contate a administração.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado em outra conta.',
  'auth/weak-password': 'A senha fornecida é muito fraca. Ela deve conter pelo menos 6 caracteres.',
  'auth/invalid-email': 'O endereço de e-mail informado é inválido.',
  'auth/user-disabled': 'Esta conta de usuário foi desativada.',
  'auth/too-many-requests': 'Muitas tentativas com falha. Por segurança, tente novamente mais tarde.',
  'auth/network-request-failed': 'Falha de conexão com a rede. Verifique sua conexão com a internet.',
};

export const DEFAULT_AUTH_ERROR_MESSAGE =
  'Não foi possível autenticar no momento. Tente novamente mais tarde.';

/**
 * Retorna uma mensagem amigável e explicativa em português para erros do Firebase Auth.
 */
export function getAuthErrorMessage(error: unknown): string {
  const code = getFirebaseErrorCode(error);
  if (!code) {
    return DEFAULT_AUTH_ERROR_MESSAGE;
  }

  return AUTH_ERROR_MESSAGES[code] ?? DEFAULT_AUTH_ERROR_MESSAGE;
}
