import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, it } from 'vitest';

const adminClaims = { role: 'admin', admin: true };
const horaCriacao = '2026-11-25T12:00:00.000Z';

function bloqueioUnico(id: string) {
  return {
    id,
    tipo: 'unico',
    data: '2026-12-01',
    horaInicio: '14:00',
    horaFim: '16:00',
    diaInteiro: false,
    motivo: 'Manutenção',
    profissionalId: 'default',
    ativo: true,
    criadoPor: 'admin-123',
    criadoEm: horaCriacao,
  };
}

function horarioFixo(id: string) {
  return {
    id,
    clienteId: 'cliente-titular',
    clienteNome: 'Cliente Titular',
    clienteTelefone: '(11) 99999-0000',
    clienteEmail: 'cliente@example.com',
    profissionalId: 'default',
    diaSemana: 3,
    horaInicio: '09:00',
    horaFim: '10:00',
    frequencia: 'semanal',
    dataInicio: '2026-12-01',
    ativo: true,
    criadoPor: 'admin-123',
    criadoEm: horaCriacao,
  };
}

describe('Security Rules para bloqueios_agenda e horarios_fixos', () => {
  let testEnvironment: RulesTestEnvironment;

  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: 'demo-clinica-local',
      firestore: {
        rules: await readFile(resolve('firestore.rules'), 'utf8'),
      },
    });
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('admins').doc('admin-registry').set({
        role: 'admin',
      });
      await context.firestore().collection('clientes').doc('cliente-titular').set({
        nome: 'Cliente Titular',
        email: 'cliente@example.com',
        telefone: '(11) 99999-0000',
      });
      await context
        .firestore()
        .collection('bloqueios_agenda')
        .doc('bloq-1')
        .set(bloqueioUnico('bloq-1'));
      await context
        .firestore()
        .collection('horarios_fixos')
        .doc('fixo-1')
        .set(horarioFixo('fixo-1'));
    });
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
  });

  describe('bloqueios_agenda', () => {
    it('permite leitura pública para calcular disponibilidade', async () => {
      const db = testEnvironment.unauthenticatedContext().firestore();
      await assertSucceeds(db.collection('bloqueios_agenda').doc('bloq-1').get());
    });

    it('permite admin criar bloqueio validado e rejeita documento malformado', async () => {
      const db = testEnvironment.authenticatedContext('admin-123', adminClaims).firestore();
      await assertSucceeds(
        db.collection('bloqueios_agenda').doc('bloq-novo').set(bloqueioUnico('bloq-novo')),
      );
      await assertFails(
        db
          .collection('bloqueios_agenda')
          .doc('bloq-invalido')
          .set({
            ...bloqueioUnico('id-diferente-do-documento'),
          }),
      );
      await assertFails(
        db
          .collection('bloqueios_agenda')
          .doc('bloq-outro-autor')
          .set({
            ...bloqueioUnico('bloq-outro-autor'),
            criadoPor: 'outra-conta',
          }),
      );
    });

    it('reconhece admin pelo documento admins/{uid}, sem depender de custom claims', async () => {
      const db = testEnvironment.authenticatedContext('admin-registry').firestore();
      await assertSucceeds(
        db
          .collection('bloqueios_agenda')
          .doc('bloq-registry-admin')
          .set({
            ...bloqueioUnico('bloq-registry-admin'),
            criadoPor: 'admin-registry',
          }),
      );
    });

    it('bloqueia visitante e cliente de criar, atualizar ou excluir bloqueios', async () => {
      const visitante = testEnvironment.unauthenticatedContext().firestore();
      const cliente = testEnvironment.authenticatedContext('cliente-123').firestore();
      await assertFails(
        visitante
          .collection('bloqueios_agenda')
          .doc('bloq-visitante')
          .set(bloqueioUnico('bloq-visitante')),
      );
      await assertFails(
        cliente
          .collection('bloqueios_agenda')
          .doc('bloq-cliente')
          .set(bloqueioUnico('bloq-cliente')),
      );
      await assertFails(
        cliente.collection('bloqueios_agenda').doc('bloq-1').update({ ativo: false }),
      );
      await assertFails(cliente.collection('bloqueios_agenda').doc('bloq-1').delete());
    });

    it('permite admin pausar e excluir bloqueio', async () => {
      const db = testEnvironment.authenticatedContext('admin-123', adminClaims).firestore();
      await assertSucceeds(
        db.collection('bloqueios_agenda').doc('bloq-1').update({
          ativo: false,
          atualizadoEm: horaCriacao,
        }),
      );
      await assertSucceeds(db.collection('bloqueios_agenda').doc('bloq-1').delete());
    });
  });

  describe('horarios_fixos', () => {
    it('restringe leitura ao admin e ao cliente titular', async () => {
      const visitante = testEnvironment.unauthenticatedContext().firestore();
      const outroCliente = testEnvironment.authenticatedContext('outro-cliente').firestore();
      const titular = testEnvironment.authenticatedContext('cliente-titular').firestore();
      const admin = testEnvironment.authenticatedContext('admin-123', adminClaims).firestore();
      await assertFails(visitante.collection('horarios_fixos').doc('fixo-1').get());
      await assertFails(outroCliente.collection('horarios_fixos').doc('fixo-1').get());
      await assertSucceeds(titular.collection('horarios_fixos').doc('fixo-1').get());
      await assertSucceeds(admin.collection('horarios_fixos').doc('fixo-1').get());
    });

    it('permite admin criar, atualizar e excluir reserva fixa validada', async () => {
      const db = testEnvironment.authenticatedContext('admin-123', adminClaims).firestore();
      await assertSucceeds(
        db.collection('horarios_fixos').doc('fixo-2').set(horarioFixo('fixo-2')),
      );
      await assertSucceeds(
        db.collection('horarios_fixos').doc('fixo-2').update({
          horaFim: '10:30',
          atualizadoEm: horaCriacao,
        }),
      );
      const segundoAdmin = testEnvironment
        .authenticatedContext('admin-456', adminClaims)
        .firestore();
      await assertSucceeds(
        segundoAdmin.collection('horarios_fixos').doc('fixo-1').update({
          horaFim: '10:30',
          atualizadoEm: horaCriacao,
        }),
      );
      await assertSucceeds(db.collection('horarios_fixos').doc('fixo-2').delete());
    });

    it('bloqueia escrita de horários fixos para visitante, cliente e cliente não titular', async () => {
      const visitante = testEnvironment.unauthenticatedContext().firestore();
      const cliente = testEnvironment.authenticatedContext('cliente-titular').firestore();
      const payload = horarioFixo('fixo-nao-autorizado');
      await assertFails(visitante.collection('horarios_fixos').doc(payload.id).set(payload));
      await assertFails(cliente.collection('horarios_fixos').doc(payload.id).set(payload));
      await assertFails(
        cliente.collection('horarios_fixos').doc('fixo-1').update({ ativo: false }),
      );
      await assertFails(cliente.collection('horarios_fixos').doc('fixo-1').delete());
    });

    it('rejeita reserva fixa ligada a perfil cujo nome não confere', async () => {
      const db = testEnvironment.authenticatedContext('admin-123', adminClaims).firestore();
      await assertFails(
        db
          .collection('horarios_fixos')
          .doc('fixo-nome-invalido')
          .set({
            ...horarioFixo('fixo-nome-invalido'),
            clienteNome: 'Outro nome',
          }),
      );
    });
  });
});
