import { getIdTokenResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function resolveAdministrativeAccess() {
  if (!auth) return false;

  await auth.authStateReady();
  if (!auth.currentUser) return false;

  const token = await getIdTokenResult(auth.currentUser);
  return token.claims.role === 'admin';
}
