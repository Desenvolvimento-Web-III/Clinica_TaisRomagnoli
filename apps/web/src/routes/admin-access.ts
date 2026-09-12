import { getIdTokenResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type AdminAccessResult = 'allowed' | 'unauthenticated' | 'unauthorized';

export async function resolveAdministrativeAccess(): Promise<AdminAccessResult> {
  if (!auth) return 'unauthenticated';

  await auth.authStateReady();
  if (!auth.currentUser) return 'unauthenticated';

  try {
    const token = await getIdTokenResult(auth.currentUser);
    return token.claims.role === 'admin' ? 'allowed' : 'unauthorized';
  } catch {
    return 'unauthorized';
  }
}
