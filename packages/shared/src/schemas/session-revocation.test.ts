import { describe, it, expect } from 'vitest';
import { revogarSessoesInputSchema, iniciarSessaoUnicaInputSchema } from './session-revocation.js';

describe('revogarSessoesInputSchema', () => {
  it('valida input vazio atribuindo defaults', () => {
    const parsed = revogarSessoesInputSchema.parse({});
    expect(parsed.targetUid).toBeUndefined();
    expect(parsed.motivo).toBeUndefined();
    expect(parsed.politicaSessaoUnica).toBe(false);
    expect(parsed.sessionId).toBeUndefined();
  });

  it('valida targetUid, motivo e sessionId válidos', () => {
    const parsed = revogarSessoesInputSchema.parse({
      targetUid: 'user-123',
      motivo: 'Acessos antigos invalidados',
      politicaSessaoUnica: true,
      sessionId: 'sess-abc-123',
    });
    expect(parsed.targetUid).toBe('user-123');
    expect(parsed.motivo).toBe('Acessos antigos invalidados');
    expect(parsed.politicaSessaoUnica).toBe(true);
    expect(parsed.sessionId).toBe('sess-abc-123');
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

describe('iniciarSessaoUnicaInputSchema', () => {
  it('valida payload vazio', () => {
    const parsed = iniciarSessaoUnicaInputSchema.parse({});
    expect(parsed.sessionId).toBeUndefined();
    expect(parsed.motivo).toBeUndefined();
  });

  it('valida payload completo', () => {
    const parsed = iniciarSessaoUnicaInputSchema.parse({
      sessionId: 'sess-xyz-789',
      motivo: 'Novo login em dispositivo móvel',
    });
    expect(parsed.sessionId).toBe('sess-xyz-789');
    expect(parsed.motivo).toBe('Novo login em dispositivo móvel');
  });

  it('rejeita sessionId vazio', () => {
    expect(() =>
      iniciarSessaoUnicaInputSchema.parse({
        sessionId: '',
      }),
    ).toThrow();
  });
});
