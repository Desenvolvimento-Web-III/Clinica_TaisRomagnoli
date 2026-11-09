import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, it } from 'vitest';

describe('Security Rules para bloqueios_agenda e horarios_fixos', () => {
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

  describe('bloqueios_agenda', () => {
    beforeAll(async () => {
      await testEnvironment.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bloqueios_agenda').doc('bloq-1').set({
          id: 'bloq-1',
          tipo: 'unico',
          data: '2026-11-20',
          horaInicio: '14:00',
          horaFim: '16:00',
          motivo: 'Manutenção',
          ativo: true,
        });
      });
    });

    it('permite leitura pública (visitante não autenticado)', async () => {
      const db = testEnvironment.unauthenticatedContext().firestore();
      await assertSucceeds(db.collection('bloqueios_agenda').doc('bloq-1').get());
    });

    it('permite leitura para cliente autenticado', async () => {
      const db = testEnvironment.authenticatedContext('cliente-123').firestore();
      await assertSucceeds(db.collection('bloqueios_agenda').doc('bloq-1').get());
    });

    it('bloqueia escrita direta client-side para visitante', async () => {
      const db = testEnvironment.unauthenticatedContext().firestore();
      await assertFails(
        db.collection('bloqueios_agenda').doc('bloq-novo').set({
          tipo: 'unico',
          data: '2026-11-21',
        }),
      );
    });

    it('bloqueia escrita direta client-side para cliente autenticado', async () => {
      const db = testEnvironment.authenticatedContext('cliente-123').firestore();
      await assertFails(
        db.collection('bloqueios_agenda').doc('bloq-novo').set({
          tipo: 'unico',
          data: '2026-11-21',
        }),
      );
    });

    it('bloqueia escrita direta client-side para administradora (gerenciado por Cloud Functions)', async () => {
      const db = testEnvironment
        .authenticatedContext('admin-123', { role: 'admin', admin: true })
        .firestore();
      await assertFails(
        db.collection('bloqueios_agenda').doc('bloq-novo').set({
          tipo: 'unico',
          data: '2026-11-21',
        }),
      );
    });

    it('bloqueia atualização e exclusão direta client-side para qualquer usuário', async () => {
      const adminDb = testEnvironment
        .authenticatedContext('admin-123', { role: 'admin', admin: true })
        .firestore();
      await assertFails(
        adminDb.collection('bloqueios_agenda').doc('bloq-1').update({
          motivo: 'Alteração Indevida',
        }),
      );
      await assertFails(adminDb.collection('bloqueios_agenda').doc('bloq-1').delete());

      const clientDb = testEnvironment.authenticatedContext('cliente-123').firestore();
      await assertFails(
        clientDb.collection('bloqueios_agenda').doc('bloq-1').update({
          motivo: 'Alteração Indevida',
        }),
      );
      await assertFails(clientDb.collection('bloqueios_agenda').doc('bloq-1').delete());
    });
  });

  describe('horarios_fixos', () => {
    beforeAll(async () => {
      await testEnvironment.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('horarios_fixos').doc('fixo-1').set({
          id: 'fixo-1',
          clienteId: 'cliente-titular',
          diaSemana: 3,
          horaInicio: '09:00',
          horaFim: '10:00',
          ativo: true,
        });
      });
    });

    it('bloqueia leitura por visitante não autenticado', async () => {
      const db = testEnvironment.unauthenticatedContext().firestore();
      await assertFails(db.collection('horarios_fixos').doc('fixo-1').get());
    });

    it('bloqueia leitura por outro cliente não titular', async () => {
      const db = testEnvironment.authenticatedContext('outro-cliente').firestore();
      await assertFails(db.collection('horarios_fixos').doc('fixo-1').get());
    });

    it('permite leitura pelo próprio cliente titular do horário fixo', async () => {
      const db = testEnvironment.authenticatedContext('cliente-titular').firestore();
      await assertSucceeds(db.collection('horarios_fixos').doc('fixo-1').get());
    });

    it('permite leitura pela administradora com claim admin', async () => {
      const db = testEnvironment
        .authenticatedContext('admin-1', { role: 'admin', admin: true })
        .firestore();
      await assertSucceeds(db.collection('horarios_fixos').doc('fixo-1').get());
    });

    it('bloqueia escrita direta client-side incondicionalmente', async () => {
      const adminDb = testEnvironment
        .authenticatedContext('admin-1', { role: 'admin', admin: true })
        .firestore();
      await assertFails(
        adminDb.collection('horarios_fixos').doc('fixo-2').set({
          clienteId: 'cliente-qualquer',
        }),
      );

      const clientDb = testEnvironment.authenticatedContext('cliente-titular').firestore();
      await assertFails(
        clientDb.collection('horarios_fixos').doc('fixo-2').set({
          clienteId: 'cliente-titular',
        }),
      );
    });

    it('bloqueia atualização e exclusão direta client-side para qualquer usuário', async () => {
      const adminDb = testEnvironment
        .authenticatedContext('admin-1', { role: 'admin', admin: true })
        .firestore();
      await assertFails(
        adminDb.collection('horarios_fixos').doc('fixo-1').update({
          ativo: false,
        }),
      );
      await assertFails(adminDb.collection('horarios_fixos').doc('fixo-1').delete());

      const clientDb = testEnvironment.authenticatedContext('cliente-titular').firestore();
      await assertFails(
        clientDb.collection('horarios_fixos').doc('fixo-1').update({
          ativo: false,
        }),
      );
      await assertFails(clientDb.collection('horarios_fixos').doc('fixo-1').delete());
    });
  });
});
