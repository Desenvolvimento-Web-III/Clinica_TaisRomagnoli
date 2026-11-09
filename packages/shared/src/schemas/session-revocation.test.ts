import { describe, it, expect } from 'vitest';
import { revogarSessoesInputSchema } from './session-revocation.js';

describe('revogarSessoesInputSchema', () => {
  it('valida input vazio atribuindo defaults', () => {
    const parsed = revogarSessoesInputSchema.parse({});
    expect(parsed.targetUid).toBeUndefined();
    expect(parsed.motivo).toBeUndefined();
    expect(parsed.politicaSessaoUnica).toBe(false);
  });

  it('valida targetUid e motivo válidos', () => {
    const parsed = revogarSessoesInputSchema.parse({
      targetUid: 'user-123',
      motivo: 'Acessos antigos invalidados',
      politicaSessaoUnica: true,
    });
    expect(parsed.targetUid).toBe('user-123');
    expect(parsed.motivo).toBe('Acessos antigos invalidados');
    expect(parsed.politicaSessaoUnica).toBe(true);
  });

  it('rejeita targetUid vazio', () => {
    expect(() =>
      revogarSessoesInputSchema.parse({
        targetUid: '',
      }),
    ).toThrow();
  });

  it('rejeita motivo com mais de 250 caracteres', () => {
    expect(() =>
      revogarSessoesInputSchema.parse({
        motivo: 'a'.repeat(251),
      }),
    ).toThrow();
  });
});
