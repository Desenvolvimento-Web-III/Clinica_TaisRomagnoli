import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, it } from 'vitest';

describe('Regras de Segurança para Configurações, Profissionais e Serviços', () => {
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
    const settingsRef = unauthenticatedDb.doc('configuracoes/geral');

    // Leitura liberada para visualização das regras no agendamento
    await assertSucceeds(settingsRef.get());

    // Escrita bloqueada para clientes não autorizados
    const clientDb = testEnvironment.authenticatedContext('cliente-qualquer').firestore();
    const clientSettingsRef = clientDb.doc('configuracoes/geral');
    await assertFails(clientSettingsRef.set({ percentualSinal: 0 }));
  });

  it('permite leitura pública de profissionais e bloqueia escrita não autorizada', async () => {
    const unauthenticatedDb = testEnvironment.unauthenticatedContext().firestore();
    const profRef = unauthenticatedDb.doc('profissionais/prof-tais-romagnoli');

    // Leitura liberada para exibir na grade de agendamentos
    await assertSucceeds(profRef.get());

    // Escrita bloqueada para cliente
    const clientDb = testEnvironment.authenticatedContext('cliente-qualquer').firestore();
    const clientProfRef = clientDb.doc('profissionais/prof-tais-romagnoli');
    await assertFails(clientProfRef.set({ nome: 'Invasor' }));
  });

  it('permite leitura pública de serviços e restringe gravação para usuários não autenticados', async () => {
    const unauthenticatedDb = testEnvironment.unauthenticatedContext().firestore();
    const serviceRef = unauthenticatedDb.doc('servicos/massagem-relaxante');

    // Leitura pública liberada para catálogo de serviços
    await assertSucceeds(serviceRef.get());

    // Escrita bloqueada para visitantes não autenticados
    await assertFails(serviceRef.set({ name: 'Serviço Não Autorizado' }));

    // Escrita permitida para usuário autenticado (admin)
    const adminDb = testEnvironment.authenticatedContext('admin-user').firestore();
    const adminServiceRef = adminDb.doc('servicos/novo-servico');
    await assertSucceeds(adminServiceRef.set({ name: 'Novo Serviço', active: true }));
  });

  it('impede criação ou modificação de usuário com privilégio administrativo direto pelo cliente', async () => {
    const clientDb = testEnvironment.authenticatedContext('cliente-qualquer').firestore();
    const userRef = clientDb.doc('usuarios/admin-tais-romagnoli');

    await assertFails(userRef.set({ role: 'admin' }));
  });
});
