import { describe, expect, it } from 'vitest';
import { getHealthStatus } from '../src/core/health-status.js';

describe('health status', () => {
  it('retorna um contrato técnico estável', () => {
    expect(getHealthStatus()).toEqual({
      ok: true,
      service: 'functions',
      workspace: { state: 'ready', source: 'shared-package' },
    });
  });
});
