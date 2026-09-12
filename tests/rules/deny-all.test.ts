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

describe('regras iniciais do Firestore', () => {
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

  it('nega leitura e escrita para um usuário autenticado', async () => {
    const database = testEnvironment.authenticatedContext('client-test').firestore();
    const reference = doc(database, 'technical-tests/blocked');

    await assertFails(getDoc(reference));
    await assertFails(setDoc(reference, { status: 'blocked' }));
  });

  it('permite que somente a administradora consulte histórico e pagamentos', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'clientes/client-1/historico/session-1'), {
        status: 'concluido',
      });
      await setDoc(doc(context.firestore(), 'clientes/client-1/pagamentos/payment-1'), {
        status: 'pago',
      });
    });

    const adminDatabase = testEnvironment
      .authenticatedContext('admin-1', { role: 'admin' })
      .firestore();
    const clientDatabase = testEnvironment
      .authenticatedContext('client-1', { role: 'cliente' })
      .firestore();

    await assertSucceeds(getDoc(doc(adminDatabase, 'clientes/client-1/historico/session-1')));
    await assertSucceeds(getDoc(doc(adminDatabase, 'clientes/client-1/pagamentos/payment-1')));
    await assertFails(getDoc(doc(clientDatabase, 'clientes/client-1/historico/session-1')));
    await assertFails(getDoc(doc(clientDatabase, 'clientes/client-1/pagamentos/payment-1')));
  });

  it('permite consulta do cadastro ao proprietário e à administradora, mas não a terceiros', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'clientes/client-1'), {
        uid: 'client-1',
        nome: 'Cliente de teste',
        telefone: '(11) 99999-9999',
        email: 'cliente@exemplo.com',
        role: 'cliente',
        status: 'ativo',
        createdAt: '2026-08-01T12:00:00-03:00',
      });
    });

    const adminDatabase = testEnvironment
      .authenticatedContext('admin-1', { role: 'admin' })
      .firestore();
    const ownerDatabase = testEnvironment
      .authenticatedContext('client-1', { role: 'cliente' })
      .firestore();
    const otherClientDatabase = testEnvironment
      .authenticatedContext('client-2', { role: 'cliente' })
      .firestore();

    const path = 'clientes/client-1';
    await assertSucceeds(getDoc(doc(adminDatabase, path)));
    await assertSucceeds(getDoc(doc(ownerDatabase, path)));
    await assertFails(getDoc(doc(otherClientDatabase, path)));
  });

  it('mantém papel e status protegidos contra alteração pelo próprio cliente', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'clientes/client-1'), {
        uid: 'client-1',
        nome: 'Cliente de teste',
        telefone: '(11) 99999-9999',
        email: 'cliente@exemplo.com',
        role: 'cliente',
        status: 'ativo',
        createdAt: '2026-08-01T12:00:00-03:00',
      });
    });

    const ownerDatabase = testEnvironment
      .authenticatedContext('client-1', { role: 'cliente' })
      .firestore();
    const reference = doc(ownerDatabase, 'clientes/client-1');

    await assertFails(setDoc(reference, { role: 'admin' }, { merge: true }));
    await assertFails(setDoc(reference, { status: 'inativo' }, { merge: true }));
    await assertSucceeds(setDoc(reference, { telefone: '(11) 98888-8888' }, { merge: true }));
  });

  it('restringe a anamnese ao cliente proprietário e à administradora', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'clientes/client-1/anamneses/current'), {
        consentConfirmed: true,
      });
    });

    const adminDatabase = testEnvironment
      .authenticatedContext('admin-1', { role: 'admin' })
      .firestore();
    const ownerDatabase = testEnvironment
      .authenticatedContext('client-1', { role: 'cliente' })
      .firestore();
    const otherClientDatabase = testEnvironment
      .authenticatedContext('client-2', { role: 'cliente' })
      .firestore();

    const path = 'clientes/client-1/anamneses/current';
    await assertSucceeds(getDoc(doc(adminDatabase, path)));
    await assertSucceeds(getDoc(doc(ownerDatabase, path)));
    await assertFails(getDoc(doc(otherClientDatabase, path)));
  });
});
