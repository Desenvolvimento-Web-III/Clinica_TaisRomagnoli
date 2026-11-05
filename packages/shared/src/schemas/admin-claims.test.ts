import { describe, expect, it } from 'vitest';
import { atribuirFuncaoAdminInputSchema } from './admin-claims.js';

describe('atribuirFuncaoAdminInputSchema', () => {
  it('valida entrada contendo targetUid válido', () => {
    const res = atribuirFuncaoAdminInputSchema.safeParse({
      targetUid: 'user-123',
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.targetUid).toBe('user-123');
      expect(res.data.role).toBe('admin');
    }
  });

  it('valida entrada contendo e-mail válido', () => {
    const res = atribuirFuncaoAdminInputSchema.safeParse({
      email: 'admin@clinicataisromagnoli.com.br',
      role: 'admin',
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBe('admin@clinicataisromagnoli.com.br');
      expect(res.data.role).toBe('admin');
    }
  });

  it('rejeita entrada sem targetUid e sem e-mail', () => {
    const res = atribuirFuncaoAdminInputSchema.safeParse({
      role: 'admin',
    });
    expect(res.success).toBe(false);
  });

  it('rejeita e-mail inválido', () => {
    const res = atribuirFuncaoAdminInputSchema.safeParse({
      email: 'email-invalido',
    });
    expect(res.success).toBe(false);
  });
});
