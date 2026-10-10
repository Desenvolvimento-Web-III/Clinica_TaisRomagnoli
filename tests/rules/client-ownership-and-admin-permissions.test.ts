import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

describe('Security Rules: Permissões de Administradora e Propriedade de Dados do Cliente', () => {
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

  beforeEach(async () => {
    await testEnvironment.clearFirestore();

    // Semeia dados fictícios de cliente e subcoleções para testes de leitura
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await adminDb.doc('clientes/cliente-joao').set({
        uid: 'cliente-joao',
        nome: 'João Silva',
        telefone: '(11)99999-1111',
        email: 'joao@exemplo.com',
        role: 'cliente',
        status: 'ativo',
        createdAt: '2026-09-01T10:00:00Z',
        preferenciasContato: { whatsapp: true, email: true },
      });

      await adminDb.doc('clientes/cliente-maria').set({
        uid: 'cliente-maria',
        nome: 'Maria Souza',
        telefone: '(11)98888-2222',
        email: 'maria@exemplo.com',
        role: 'cliente',
        status: 'ativo',
        createdAt: '2026-09-02T10:00:00Z',
      });

      await adminDb.doc('clientes/cliente-joao/historico/hist-1').set({
        servico: 'Massagem Relaxante',
        data: '2026-09-10T14:00:00Z',
        status: 'concluido',
      });

      await adminDb.doc('clientes/cliente-joao/pagamentos/pag-1').set({
        valor: 15000,
        metodo: 'pix',
        status: 'confirmado',
      });

      await adminDb.doc('clientes/cliente-joao/anamneses/anam-1').set({
        queixaPrincipal: 'Dores lombares',
        contraindicacoes: [],
      });
    });
  });

  describe('Listagem e Consulta da Coleção /clientes', () => {
    it('permite que a administradora liste todos os clientes cadastrados', async () => {
      const adminDb = testEnvironment
        .authenticatedContext('admin-tais', { role: 'admin' })
        .firestore();

      await assertSucceeds(adminDb.collection('clientes').get());
    });

    it('bloqueia a listagem de clientes para usuários clientes comuns', async () => {
      const clientDb = testEnvironment
        .authenticatedContext('cliente-joao', { role: 'cliente' })
        .firestore();

      await assertFails(clientDb.collection('clientes').get());
    });

    it('bloqueia a listagem de clientes para visitantes não autenticados', async () => {
      const unauthDb = testEnvironment.unauthenticatedContext().firestore();
      await assertFails(unauthDb.collection('clientes').get());
    });

    it('permite consulta individual ao titular do cadastro e à administradora', async () => {
      const ownerDb = testEnvironment
        .authenticatedContext('cliente-joao', { role: 'cliente' })
        .firestore();
      const adminDb = testEnvironment
        .authenticatedContext('admin-tais', { role: 'admin' })
        .firestore();

      await assertSucceeds(ownerDb.doc('clientes/cliente-joao').get());
      await assertSucceeds(adminDb.doc('clientes/cliente-joao').get());
    });

    it('bloqueia a consulta individual do cadastro por outros clientes ou deslogados', async () => {
      const otherClientDb = testEnvironment
        .authenticatedContext('cliente-maria', { role: 'cliente' })
        .firestore();
      const unauthDb = testEnvironment.unauthenticatedContext().firestore();

      await assertFails(otherClientDb.doc('clientes/cliente-joao').get());
      await assertFails(unauthDb.doc('clientes/cliente-joao').get());
    });
  });

  describe('Criação de Cadastro de Cliente (/clientes/{uid})', () => {
    it('permite que o cliente crie seu próprio cadastro com formato válido e status ativo', async () => {
      const newClientDb = testEnvironment
        .authenticatedContext('cliente-carlos', { role: 'cliente' })
        .firestore();

      await assertSucceeds(
        newClientDb.doc('clientes/cliente-carlos').set({
          uid: 'cliente-carlos',
          nome: 'Carlos Eduardo',
          telefone: '(11)97777-3333',
          email: 'carlos@exemplo.com',
          role: 'cliente',
          status: 'ativo',
          createdAt: new Date().toISOString(),
          preferenciasContato: { whatsapp: true, email: false },
        }),
      );
    });

    it('bloqueia tentativa de criação onde o cliente tenta se autoatribuir role admin', async () => {
      const attackerDb = testEnvironment
        .authenticatedContext('cliente-hacker', { role: 'cliente' })
        .firestore();

      await assertFails(
        attackerDb.doc('clientes/cliente-hacker').set({
          uid: 'cliente-hacker',
          nome: 'Invasor',
          telefone: '(11)99999-0000',
          email: 'hacker@exemplo.com',
          role: 'admin',
          status: 'ativo',
          createdAt: new Date().toISOString(),
        }),
      );
    });

    it('bloqueia tentativa de criar documento com UID divergente do autenticado', async () => {
      const clientDb = testEnvironment
        .authenticatedContext('cliente-joao', { role: 'cliente' })
        .firestore();

      await assertFails(
        clientDb.doc('clientes/cliente-vitima').set({
          uid: 'cliente-vitima',
          nome: 'Vítima',
          telefone: '(11)91111-2222',
          email: 'vitima@exemplo.com',
          role: 'cliente',
          status: 'ativo',
          createdAt: new Date().toISOString(),
        }),
      );
    });

    it('bloqueia tentativa de criação contendo campos não autorizados no esquema', async () => {
      const clientDb = testEnvironment
        .authenticatedContext('cliente-novo', { role: 'cliente' })
        .firestore();

      await assertFails(
        clientDb.doc('clientes/cliente-novo').set({
          uid: 'cliente-novo',
          nome: 'Novo Cliente',
          telefone: '(11)92222-3333',
          email: 'novo@exemplo.com',
          role: 'cliente',
          status: 'ativo',
          createdAt: new Date().toISOString(),
          saldoCreditos: 1000,
        }),
      );
    });

    it('bloqueia criação de cadastro por visitante não autenticado', async () => {
      const unauthDb = testEnvironment.unauthenticatedContext().firestore();

      await assertFails(
        unauthDb.doc('clientes/cliente-anonimo').set({
          uid: 'cliente-anonimo',
          nome: 'Anônimo',
          telefone: '(11)91111-0000',
          email: 'anon@exemplo.com',
          role: 'cliente',
          status: 'ativo',
          createdAt: new Date().toISOString(),
        }),
      );
    });
  });

  describe('Atualização e Exclusão de Cadastro de Cliente', () => {
    it('permite que o próprio cliente atualize seus dados de contato e preferências', async () => {
      const ownerDb = testEnvironment
        .authenticatedContext('cliente-joao', { role: 'cliente' })
        .firestore();

      await assertSucceeds(
        ownerDb.doc('clientes/cliente-joao').update({
          telefone: '(11)98888-9999',
          updatedAt: new Date().toISOString(),
        }),
      );
    });

    it('bloqueia tentativa do cliente alterar papel (role) ou status na atualização', async () => {
      const ownerDb = testEnvironment
        .authenticatedContext('cliente-joao', { role: 'cliente' })
        .firestore();

      await assertFails(
        ownerDb.doc('clientes/cliente-joao').update({
          role: 'admin',
        }),
      );

      await assertFails(
        ownerDb.doc('clientes/cliente-joao').update({
          status: 'inativo',
        }),
      );
    });

    it('bloqueia atualização do cadastro por terceiros', async () => {
      const otherClientDb = testEnvironment
        .authenticatedContext('cliente-maria', { role: 'cliente' })
        .firestore();

      await assertFails(
        otherClientDb.doc('clientes/cliente-joao').update({
          nome: 'Nome Alterado por Terceiro',
        }),
      );
    });

    it('bloqueia exclusão de clientes incondicionalmente no client-side', async () => {
      const ownerDb = testEnvironment
        .authenticatedContext('cliente-joao', { role: 'cliente' })
        .firestore();
      const adminDb = testEnvironment
        .authenticatedContext('admin-tais', { role: 'admin' })
        .firestore();

      // Nem o próprio cliente nem a administradora podem deletar direto pelo client
      await assertFails(ownerDb.doc('clientes/cliente-joao').delete());
      await assertFails(adminDb.doc('clientes/cliente-joao').delete());
    });
  });

  describe('Subcoleções Restritas: Histórico, Pagamentos e Anamnese', () => {
    it('permite leitura de histórico e pagamentos somente para a administradora', async () => {
      const adminDb = testEnvironment
        .authenticatedContext('admin-tais', { role: 'admin' })
        .firestore();
      const ownerDb = testEnvironment
        .authenticatedContext('cliente-joao', { role: 'cliente' })
        .firestore();
      const otherClientDb = testEnvironment
        .authenticatedContext('cliente-maria', { role: 'cliente' })
        .firestore();

      // Admin pode ler
      await assertSucceeds(adminDb.doc('clientes/cliente-joao/historico/hist-1').get());
      await assertSucceeds(adminDb.doc('clientes/cliente-joao/pagamentos/pag-1').get());

      // Cliente (mesmo sendo dono da conta) não tem acesso direto a histórico/pagamentos no Firestore
      await assertFails(ownerDb.doc('clientes/cliente-joao/historico/hist-1').get());
      await assertFails(ownerDb.doc('clientes/cliente-joao/pagamentos/pag-1').get());

      // Terceiros também não podem ler
      await assertFails(otherClientDb.doc('clientes/cliente-joao/historico/hist-1').get());
      await assertFails(otherClientDb.doc('clientes/cliente-joao/pagamentos/pag-1').get());
    });

    it('permite leitura de anamnese para o titular e para a administradora, bloqueando terceiros', async () => {
      const adminDb = testEnvironment
        .authenticatedContext('admin-tais', { role: 'admin' })
        .firestore();
      const ownerDb = testEnvironment
        .authenticatedContext('cliente-joao', { role: 'cliente' })
        .firestore();
      const otherClientDb = testEnvironment
        .authenticatedContext('cliente-maria', { role: 'cliente' })
        .firestore();
      const unauthDb = testEnvironment.unauthenticatedContext().firestore();

      await assertSucceeds(adminDb.doc('clientes/cliente-joao/anamneses/anam-1').get());
      await assertSucceeds(ownerDb.doc('clientes/cliente-joao/anamneses/anam-1').get());
      await assertFails(otherClientDb.doc('clientes/cliente-joao/anamneses/anam-1').get());
      await assertFails(unauthDb.doc('clientes/cliente-joao/anamneses/anam-1').get());
    });

    it('bloqueia escrita direta client-side em histórico, pagamentos e anamnese', async () => {
      const ownerDb = testEnvironment
        .authenticatedContext('cliente-joao', { role: 'cliente' })
        .firestore();
      const adminDb = testEnvironment
        .authenticatedContext('admin-tais', { role: 'admin' })
        .firestore();

      // Escrita bloqueada em histórico
      await assertFails(
        ownerDb.doc('clientes/cliente-joao/historico/hist-novo').set({ sessao: 'Fraude' }),
      );
      await assertFails(
        adminDb.doc('clientes/cliente-joao/historico/hist-novo').set({ sessao: 'Manual' }),
      );

      // Escrita bloqueada em pagamentos
      await assertFails(ownerDb.doc('clientes/cliente-joao/pagamentos/pag-novo').set({ valor: 0 }));
      await assertFails(
        adminDb.doc('clientes/cliente-joao/pagamentos/pag-novo').set({ valor: 100 }),
      );

      // Escrita bloqueada em anamnese
      await assertFails(
        ownerDb.doc('clientes/cliente-joao/anamneses/anam-novo').set({ dor: false }),
      );
      await assertFails(
        adminDb.doc('clientes/cliente-joao/anamneses/anam-novo').set({ dor: false }),
      );
    });
  });
});
