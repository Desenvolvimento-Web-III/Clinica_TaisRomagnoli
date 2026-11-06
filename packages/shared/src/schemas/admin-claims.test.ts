import { describe, expect, it } from 'vitest';
import { atribuirFuncaoAdminInputSchema, gerarCustomClaims } from './admin-claims.js';

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

  it('valida entrada para o papel client e cliente', () => {
    const resClient = atribuirFuncaoAdminInputSchema.safeParse({
      targetUid: 'user-client-1',
      role: 'client',
    });
    expect(resClient.success).toBe(true);
    if (resClient.success) {
      expect(resClient.data.role).toBe('client');
    }

    const resCliente = atribuirFuncaoAdminInputSchema.safeParse({
      targetUid: 'user-client-2',
      role: 'cliente',
    });
    expect(resCliente.success).toBe(true);
    if (resCliente.success) {
      expect(resCliente.data.role).toBe('cliente');
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

describe('gerarCustomClaims', () => {
  it('gera payload com admin: true e client: false para role admin', () => {
    const claims = gerarCustomClaims('admin');
    expect(claims).toEqual({
      role: 'admin',
      admin: true,
      client: false,
    });
  });

  it('gera payload com admin: false e client: true para role client', () => {
    const claims = gerarCustomClaims('client');
    expect(claims).toEqual({
      role: 'client',
      admin: false,
      client: true,
    });
  });

  it('gera payload com admin: false e client: true para role cliente', () => {
    const claims = gerarCustomClaims('cliente');
    expect(claims).toEqual({
      role: 'cliente',
      admin: false,
      client: true,
    });
  });
});
