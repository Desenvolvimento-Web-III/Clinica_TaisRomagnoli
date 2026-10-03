import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, it } from 'vitest';

describe('Security Rules para configuracoes/horarios_funcionamento', () => {
  let testEnvironment: RulesTestEnvironment;

  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: 'demo-clinica-local',
      firestore: {
        rules: await readFile(resolve('firestore.rules'), 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
  });

  it('permite leitura pública (usuário anônimo/visitante)', async () => {
    const unauthDb = testEnvironment.unauthenticatedContext().firestore();
    const ref = unauthDb.doc('configuracoes/horarios_funcionamento');
    await assertSucceeds(ref.get());
  });

  it('permite leitura para usuário cliente autenticado', async () => {
    const clientDb = testEnvironment.authenticatedContext('cliente-123').firestore();
    const ref = clientDb.doc('configuracoes/horarios_funcionamento');
    await assertSucceeds(ref.get());
  });

  it('bloqueia escrita para visitante não autenticado', async () => {
    const unauthDb = testEnvironment.unauthenticatedContext().firestore();
    const ref = unauthDb.doc('configuracoes/horarios_funcionamento');
    await assertFails(ref.set({ intervaloPadraoMinutos: 30 }));
  });

  it('bloqueia escrita para usuário comum sem claim de admin', async () => {
    const clientDb = testEnvironment
      .authenticatedContext('cliente-123', { role: 'cliente' })
      .firestore();
    const ref = clientDb.doc('configuracoes/horarios_funcionamento');
    await assertFails(ref.set({ intervaloPadraoMinutos: 30 }));
  });

  it('permite escrita para usuário autenticado com custom claim admin', async () => {
    const adminDb = testEnvironment.authenticatedContext('admin-tais', { admin: true }).firestore();
    const ref = adminDb.doc('configuracoes/horarios_funcionamento');
    await assertSucceeds(ref.set({ intervaloPadraoMinutos: 30, atualizadoPor: 'admin-tais' }));
  });
});
