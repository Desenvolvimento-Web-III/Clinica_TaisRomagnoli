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

describe('Regras de Segurança para Configurações e Profissionais', () => {
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

  it('permite leitura pública de configurações da clínica e bloqueia escrita por cliente', async () => {
    const unauthenticatedDb = testEnvironment.unauthenticatedContext().firestore();
    const settingsRef = doc(unauthenticatedDb, 'configuracoes/geral');

    // Leitura liberada para visualização das regras no agendamento
    await assertSucceeds(getDoc(settingsRef));

    // Escrita bloqueada para clientes não autorizados
    const clientDb = testEnvironment.authenticatedContext('cliente-qualquer').firestore();
    const clientSettingsRef = doc(clientDb, 'configuracoes/geral');
    await assertFails(setDoc(clientSettingsRef, { percentualSinal: 0 }));
  });

  it('permite leitura pública de profissionais e bloqueia escrita não autorizada', async () => {
    const unauthenticatedDb = testEnvironment.unauthenticatedContext().firestore();
    const profRef = doc(unauthenticatedDb, 'profissionais/prof-tais-romagnoli');

    // Leitura liberada para exibir na grade de agendamentos
    await assertSucceeds(getDoc(profRef));

    // Escrita bloqueada para cliente
    const clientDb = testEnvironment.authenticatedContext('cliente-qualquer').firestore();
    const clientProfRef = doc(clientDb, 'profissionais/prof-tais-romagnoli');
    await assertFails(setDoc(clientProfRef, { nome: 'Invasor' }));
  });

  it('impede criação ou modificação de usuário com privilégio administrativo direto pelo cliente', async () => {
    const clientDb = testEnvironment.authenticatedContext('cliente-qualquer').firestore();
    const userRef = doc(clientDb, 'usuarios/admin-tais-romagnoli');

    await assertFails(setDoc(userRef, { role: 'admin' }));
  });
});
