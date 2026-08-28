import { describe, expect, it } from 'vitest';

describe('ambiente de teste', () => {
  it('permite iniciar o smoke test sem conexão Firebase', async () => {
    const { environment } = await import('./env');

    expect(environment.firebase).toBeNull();
    expect(environment.useFirebaseEmulators).toBe(false);
  });
});
