import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveAdministrativeAccess } from './admin-access';
import { getIdTokenResult, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

vi.mock('firebase/auth', () => ({
  getIdTokenResult: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
    authStateReady: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('resolveAdministrativeAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna unauthenticated quando currentUser é nulo', async () => {
    if (auth) {
      Object.defineProperty(auth, 'currentUser', { value: null, configurable: true });
    }

    const result = await resolveAdministrativeAccess();
    expect(result).toBe('unauthenticated');
  });

  it('retorna allowed quando o token possui claim role=admin', async () => {
    const mockUser = { uid: 'admin-uid' } as User;
    if (auth) {
      Object.defineProperty(auth, 'currentUser', { value: mockUser, configurable: true });
    }

    vi.mocked(getIdTokenResult).mockResolvedValueOnce({
      claims: { role: 'admin' },
    } as unknown as Awaited<ReturnType<typeof getIdTokenResult>>);

    const result = await resolveAdministrativeAccess();
    expect(result).toBe('allowed');
  });

  it('retorna allowed quando o token possui claim admin=true', async () => {
    const mockUser = { uid: 'admin-uid-2' } as User;
    if (auth) {
      Object.defineProperty(auth, 'currentUser', { value: mockUser, configurable: true });
    }

    vi.mocked(getIdTokenResult).mockResolvedValueOnce({
      claims: { admin: true },
    } as unknown as Awaited<ReturnType<typeof getIdTokenResult>>);

    const result = await resolveAdministrativeAccess();
    expect(result).toBe('allowed');
  });

  it('retorna unauthorized quando o token possui role=cliente e admin não é true', async () => {
    const mockUser = { uid: 'cliente-uid' } as User;
    if (auth) {
      Object.defineProperty(auth, 'currentUser', { value: mockUser, configurable: true });
    }

    vi.mocked(getIdTokenResult).mockResolvedValueOnce({
      claims: { role: 'cliente' },
    } as unknown as Awaited<ReturnType<typeof getIdTokenResult>>);

    const result = await resolveAdministrativeAccess();
    expect(result).toBe('unauthorized');
  });

  it('retorna unauthorized quando ocorre erro ao obter idTokenResult', async () => {
    const mockUser = { uid: 'erro-uid' } as User;
    if (auth) {
      Object.defineProperty(auth, 'currentUser', { value: mockUser, configurable: true });
    }

    vi.mocked(getIdTokenResult).mockRejectedValueOnce(new Error('Network error'));

    const result = await resolveAdministrativeAccess();
    expect(result).toBe('unauthorized');
  });
});
