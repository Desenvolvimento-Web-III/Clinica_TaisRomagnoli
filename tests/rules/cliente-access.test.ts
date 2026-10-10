import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, it } from 'vitest';

describe('Isolamento de dados, agendamento e ficha do cliente', () => {
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
    if (testEnvironment) {
      await testEnvironment.cleanup();
    }
  });

  describe('Dados cadastrais (/clientes/{uid} e /usuarios/{uid})', () => {
    it('permite que o cliente consulte e crie seus próprios dados cadastrais', async () => {
      const clientDb = testEnvironment
        .authenticatedContext('cliente-1', { role: 'cliente' })
        .firestore();

      await assertSucceeds(
        clientDb.doc('clientes/cliente-1').set({
          uid: 'cliente-1',
          nome: 'Cliente Um',
          telefone: '(11) 99999-1111',
          email: 'cliente1@exemplo.com',
          role: 'cliente',
          status: 'ativo',
          createdAt: new Date().toISOString(),
        }),
      );

      await assertSucceeds(clientDb.doc('clientes/cliente-1').get());
    });

    it('bloqueia o acesso de outro cliente aos dados cadastrais alheios', async () => {
      const otherClientDb = testEnvironment
        .authenticatedContext('cliente-2', { role: 'cliente' })
        .firestore();

      await assertFails(otherClientDb.doc('clientes/cliente-1').get());
      await assertFails(
        otherClientDb.doc('clientes/cliente-1').set({ nome: 'Invasor' }, { merge: true }),
      );
    });

    it('bloqueia usuário anônimo de consultar dados cadastrais', async () => {
      const unauthDb = testEnvironment.unauthenticatedContext().firestore();
      await assertFails(unauthDb.doc('clientes/cliente-1').get());
    });

    it('permite que a administradora consulte os dados de qualquer cliente', async () => {
      const adminDb = testEnvironment
        .authenticatedContext('admin-1', { role: 'admin' })
        .firestore();
      await assertSucceeds(adminDb.doc('clientes/cliente-1').get());
    });
  });

  describe('Ficha de Anamnese (/clientes/{uid}/anamneses/{id} e /fichas/{id})', () => {
    it('permite que o cliente consulte sua própria ficha e bloqueia a gravação direta', async () => {
      await testEnvironment.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('clientes/cliente-1/anamneses/ficha-1').set({
          objetivoPrincipal: 'Relaxamento muscular',
          consentimentoConfirmado: true,
          createdAt: new Date().toISOString(),
        });
      });

      const clientDb = testEnvironment
        .authenticatedContext('cliente-1', { role: 'cliente' })
        .firestore();

      await assertSucceeds(clientDb.doc('clientes/cliente-1/anamneses/ficha-1').get());

      await assertFails(
        clientDb.doc('clientes/cliente-1/anamneses/ficha-2').set({
          objetivoPrincipal: 'Relaxamento muscular',
          consentimentoConfirmado: true,
          createdAt: new Date().toISOString(),
        }),
      );
    });

    it('bloqueia outro cliente de ler ou alterar a ficha do cliente titular', async () => {
      const otherClientDb = testEnvironment
        .authenticatedContext('cliente-2', { role: 'cliente' })
        .firestore();

      await assertFails(otherClientDb.doc('clientes/cliente-1/anamneses/ficha-1').get());
      await assertFails(
        otherClientDb
          .doc('clientes/cliente-1/anamneses/ficha-1')
          .set({ consentimentoConfirmado: false }),
      );
    });

    it('bloqueia acesso anônimo à ficha de avaliação', async () => {
      const unauthDb = testEnvironment.unauthenticatedContext().firestore();
      await assertFails(unauthDb.doc('clientes/cliente-1/anamneses/ficha-1').get());
    });

    it('permite que a administradora consulte a ficha do cliente', async () => {
      const adminDb = testEnvironment
        .authenticatedContext('admin-1', { role: 'admin' })
        .firestore();
      await assertSucceeds(adminDb.doc('clientes/cliente-1/anamneses/ficha-1').get());
    });
  });

  describe('Agendamentos (/clientes/{uid}/agendamentos/{id} e /agendamentos/{id})', () => {
    it('permite que o cliente acesse seus próprios agendamentos na subcoleção', async () => {
      const clientDb = testEnvironment
        .authenticatedContext('cliente-1', { role: 'cliente' })
        .firestore();

      await assertSucceeds(
        clientDb.doc('clientes/cliente-1/agendamentos/agenda-1').set({
          servicoNome: 'Massagem Relaxante',
          status: 'confirmado',
          clienteId: 'cliente-1',
        }),
      );

      await assertSucceeds(clientDb.doc('clientes/cliente-1/agendamentos/agenda-1').get());
    });

    it('bloqueia outro cliente de acessar os agendamentos da subcoleção de terceiros', async () => {
      const otherClientDb = testEnvironment
        .authenticatedContext('cliente-2', { role: 'cliente' })
        .firestore();

      await assertFails(otherClientDb.doc('clientes/cliente-1/agendamentos/agenda-1').get());
      await assertFails(
        otherClientDb.doc('clientes/cliente-1/agendamentos/agenda-1').set({ status: 'cancelado' }),
      );
    });

    it('permite que o cliente acesse seus próprios agendamentos na coleção raiz', async () => {
      await testEnvironment.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('agendamentos/agenda-global-1').set({
          clienteId: 'cliente-1',
          servicoNome: 'Massagem Terapêutica',
          status: 'confirmado',
        });
      });

      const clientDb = testEnvironment
        .authenticatedContext('cliente-1', { role: 'cliente' })
        .firestore();
      await assertSucceeds(clientDb.doc('agendamentos/agenda-global-1').get());
    });

    it('bloqueia outro cliente de acessar agendamentos de terceiros na coleção raiz', async () => {
      const otherClientDb = testEnvironment
        .authenticatedContext('cliente-2', { role: 'cliente' })
        .firestore();
      await assertFails(otherClientDb.doc('agendamentos/agenda-global-1').get());
      await assertFails(
        otherClientDb.doc('agendamentos/agenda-global-1').update({ status: 'cancelado' }),
      );
    });

    it('bloqueia usuário não autenticado em agendamentos', async () => {
      const unauthDb = testEnvironment.unauthenticatedContext().firestore();
      await assertFails(unauthDb.doc('agendamentos/agenda-global-1').get());
      await assertFails(unauthDb.doc('clientes/cliente-1/agendamentos/agenda-1').get());
    });

    it('permite que a administradora consulte agendamentos de qualquer cliente', async () => {
      const adminDb = testEnvironment
        .authenticatedContext('admin-1', { role: 'admin' })
        .firestore();
      await assertSucceeds(adminDb.doc('agendamentos/agenda-global-1').get());
      await assertSucceeds(adminDb.doc('clientes/cliente-1/agendamentos/agenda-1').get());
    });
  });
});
