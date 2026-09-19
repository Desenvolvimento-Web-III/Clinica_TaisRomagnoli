import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    const ref = doc(unauthDb, 'configuracoes', 'horarios_funcionamento');
    await assertSucceeds(getDoc(ref));
  });

  it('permite leitura para usuário cliente autenticado', async () => {
    const clientDb = testEnvironment.authenticatedContext('cliente-123').firestore();
    const ref = doc(clientDb, 'configuracoes', 'horarios_funcionamento');
    await assertSucceeds(getDoc(ref));
  });

  it('bloqueia escrita para visitante não autenticado', async () => {
    const unauthDb = testEnvironment.unauthenticatedContext().firestore();
    const ref = doc(unauthDb, 'configuracoes', 'horarios_funcionamento');
    await assertFails(setDoc(ref, { intervaloPadraoMinutos: 30 }));
  });

  it('bloqueia escrita para usuário comum sem claim de admin', async () => {
    const clientDb = testEnvironment
      .authenticatedContext('cliente-123', { role: 'cliente' })
      .firestore();
    const ref = doc(clientDb, 'configuracoes', 'horarios_funcionamento');
    await assertFails(setDoc(ref, { intervaloPadraoMinutos: 30 }));
  });

  it('permite escrita para usuário autenticado com custom claim admin', async () => {
    const adminDb = testEnvironment.authenticatedContext('admin-tais', { admin: true }).firestore();
    const ref = doc(adminDb, 'configuracoes', 'horarios_funcionamento');
    await assertSucceeds(setDoc(ref, { intervaloPadraoMinutos: 30, atualizadoPor: 'admin-tais' }));
  });
});
