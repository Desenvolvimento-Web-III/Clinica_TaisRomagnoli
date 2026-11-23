import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, it } from 'vitest';

describe('Security Rules para auditoria (/auditoria/{logId})', () => {
  let testEnvironment: RulesTestEnvironment;

  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: 'demo-clinica-local',
      firestore: {
        rules: await readFile(resolve('firestore.rules'), 'utf8'),
      },
    });

    // Cria registro de auditoria com regras desabilitadas
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection('auditoria')
        .doc('log-1')
        .set({
          id: 'log-1',
          usuarioId: 'admin-001',
          usuarioEmail: 'admin@clinica.com',
          usuarioRole: 'admin',
          acao: 'servico.cadastrado',
          recurso: 'servicos',
          recursoId: 'serv-1',
          dataHora: '2026-11-16T14:00:00.000Z',
          dadosAfetados: { nome: 'Reiki' },
        });
    });
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
  });

  it('bloqueia leitura para visitante não autenticado', async () => {
    const db = testEnvironment.unauthenticatedContext().firestore();
    await assertFails(db.collection('auditoria').doc('log-1').get());
  });

  it('bloqueia leitura para cliente autenticado sem claim admin', async () => {
    const db = testEnvironment.authenticatedContext('cliente-123', { role: 'cliente' }).firestore();
    await assertFails(db.collection('auditoria').doc('log-1').get());
  });

  it('permite leitura para administradora com claim role=admin', async () => {
    const db = testEnvironment.authenticatedContext('admin-123', { role: 'admin' }).firestore();
    await assertSucceeds(db.collection('auditoria').doc('log-1').get());
  });

  it('permite leitura para administradora com claim admin=true', async () => {
    const db = testEnvironment.authenticatedContext('admin-123', { admin: true }).firestore();
    await assertSucceeds(db.collection('auditoria').doc('log-1').get());
  });

  it('bloqueia gravação client-side mesmo para administradora', async () => {
    const db = testEnvironment.authenticatedContext('admin-123', { admin: true }).firestore();
    await assertFails(
      db.collection('auditoria').doc('log-2').set({
        id: 'log-2',
        usuarioId: 'admin-123',
        acao: 'teste',
        recurso: 'auditoria',
        recursoId: 'log-2',
        dataHora: new Date().toISOString(),
        dadosAfetados: {},
      }),
    );
  });

  it('bloqueia exclusão client-side mesmo para administradora', async () => {
    const db = testEnvironment.authenticatedContext('admin-123', { admin: true }).firestore();
    await assertFails(db.collection('auditoria').doc('log-1').delete());
  });
});
