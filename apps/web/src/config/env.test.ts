import { describe, expect, it, vi } from 'vitest';

describe('ambiente de teste', () => {
  it('permite iniciar o smoke test sem conexão Firebase', async () => {
    // Define como undefined para que o Zod optional() aceite a ausência dos valores
    vi.stubEnv('VITE_FIREBASE_API_KEY', undefined);
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', undefined);
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', undefined);
    vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', undefined);
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', undefined);
    vi.stubEnv('VITE_FIREBASE_APP_ID', undefined);
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'false');

    const { environment } = await import('./env');

    expect(environment.firebase).toBeNull();
    expect(environment.useFirebaseEmulators).toBe(false);
  });
});
