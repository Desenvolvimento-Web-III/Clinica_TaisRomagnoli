import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertFails,
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
});
