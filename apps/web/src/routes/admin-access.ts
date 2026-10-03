import { getIdTokenResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type AdminAccessResult = 'allowed' | 'unauthenticated' | 'unauthorized';

export const ADMIN_EMAIL = 'admin@clinicataisromagnoli.com.br';

export function isAdministratorEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return (
    normalized === ADMIN_EMAIL ||
    normalized.startsWith('admin@') ||
    normalized.startsWith('admin.') ||
    normalized.startsWith('admin_') ||
    normalized.includes('admin') ||
    normalized.includes('administrador') ||
    normalized.includes('taisromagnoli')
  );
}

export async function resolveAdministrativeAccess(): Promise<AdminAccessResult> {
  if (!auth) return 'unauthenticated';

  await auth.authStateReady();
  if (!auth.currentUser) return 'unauthenticated';

  const isEmailAdmin = isAdministratorEmail(auth.currentUser.email);

  try {
    const token = await getIdTokenResult(auth.currentUser);
    const isAdmin = token.claims.role === 'admin' || token.claims.admin === true || isEmailAdmin;
    return isAdmin ? 'allowed' : 'unauthorized';
  } catch {
    return isEmailAdmin ? 'allowed' : 'unauthorized';
  }
}
