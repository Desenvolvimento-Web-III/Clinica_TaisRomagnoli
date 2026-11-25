import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

describe('Security Rules: criação de agendamento direto no Firestore', () => {
  let testEnvironment: RulesTestEnvironment;
  const booking = {
    id: 'ag-novo',
    clienteId: 'cliente-1',
    clienteNome: 'Cliente Teste',
    clienteEmail: 'cliente@example.com',
    clienteTelefone: '(11) 99999-9999',
    servicoId: 'reiki',
    servicoNome: 'Reiki',
    duracaoMinutos: 60,
    valorTotalEmCentavos: 12000,
    valorSinalEmCentavos: 3600,
    saldoRestanteEmCentavos: 8400,
    dataHoraInicio: '2026-12-01T13:00:00.000Z',
    dataHoraFim: '2026-12-01T14:00:00.000Z',
    intervaloAposMinutos: 30,
    profissionalId: 'prof-tais-romagnoli',
    profissionalNome: 'Tais Romagnoli',
    status: 'pendente',
    metodoPagamento: 'pix',
    origem: 'app_cliente',
    sinalIsento: false,
    createdAt: '2026-11-24T12:00:00.000Z',
    updatedAt: '2026-11-24T12:00:00.000Z',
  };

  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: 'demo-clinica-local',
      firestore: { rules: await readFile(resolve('firestore.rules'), 'utf8') },
    });
  });

  afterAll(async () => testEnvironment.cleanup());

  beforeEach(async () => {
    await testEnvironment.clearFirestore();
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await firestore.doc('clientes/cliente-1').set({
        uid: 'cliente-1',
        nome: 'Cliente Teste',
        email: 'cliente@example.com',
        telefone: '(11) 99999-9999',
      });
      await firestore.doc('servicos/reiki').set({
        name: 'Reiki',
        active: true,
        durationMinutes: 60,
        priceInCents: 12000,
      });
    });
  });

  it('permite ao cliente salvar um pedido pendente vinculado ao próprio perfil e serviço ativo', async () => {
    const db = testEnvironment.authenticatedContext('cliente-1').firestore();
    await assertSucceeds(db.doc('agendamentos/ag-novo').set(booking));
  });

  it('aceita perfil sem campo uid duplicado e catálogo legado com valores string e sem ativo explícito', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await firestore.doc('clientes/cliente-1').set({
        nome: 'Cliente Teste',
        email: 'cliente@example.com',
        telefone: '(11) 99999-9999',
      });
      await firestore.doc('servicos/reiki').set({
        nome: 'Reiki',
        duracao: '60',
        preco: '120',
      });
    });
    const db = testEnvironment.authenticatedContext('cliente-1').firestore();
    await assertSucceeds(db.doc('agendamentos/ag-novo').set(booking));
  });

  it('recusa dados pessoais que não correspondam ao perfil salvo', async () => {
    const db = testEnvironment.authenticatedContext('cliente-1').firestore();
    await assertFails(
      db.doc('agendamentos/ag-novo').set({ ...booking, clienteTelefone: '(11) 00000-0000' }),
    );
  });

  it('recusa criação por outro cliente e status confirmado enviado pelo frontend', async () => {
    const otherClientDb = testEnvironment.authenticatedContext('cliente-2').firestore();
    await assertFails(otherClientDb.doc('agendamentos/ag-novo').set(booking));

    const ownerDb = testEnvironment.authenticatedContext('cliente-1').firestore();
    await assertFails(
      ownerDb.doc('agendamentos/ag-novo').set({ ...booking, status: 'confirmado' }),
    );
  });

  it('recusa valores financeiros inconsistentes, duração fora dos limites e serviços inativos', async () => {
    const db = testEnvironment.authenticatedContext('cliente-1').firestore();
    await assertFails(
      db.doc('agendamentos/ag-novo').set({ ...booking, valorTotalEmCentavos: 999 }),
    );
    await assertFails(db.doc('agendamentos/ag-novo').set({ ...booking, duracaoMinutos: 400 }));
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await firestore.doc('servicos/reiki').update({ active: false });
    });
    await assertFails(db.doc('agendamentos/ag-novo').set(booking));
  });

  it('permite a administradora criar pedido presencial para cliente cadastrado', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await firestore.doc('admins/admin-1').set({ role: 'admin' });
    });
    const adminDb = testEnvironment.authenticatedContext('admin-1').firestore();
    await assertSucceeds(
      adminDb.doc('agendamentos/ag-novo').set({ ...booking, origem: 'presencial_admin' }),
    );
  });
});
