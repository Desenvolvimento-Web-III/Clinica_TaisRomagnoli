import { describe, it, expect, beforeEach } from 'vitest';
import {
  solicitarNovoAgendamento,
  alterarAgendamentoExistente,
  cancelarAgendamentoExistente,
  atualizarStatusAgendamento,
  listarAgendamentos,
  AgendamentoBusinessError,
  type UserContext,
} from '../src/modules/agendamentos/agendamentos-service.js';
import { InMemoryAgendamentosRepository } from '../src/modules/agendamentos/agendamentos-repository.js';
import { InMemoryNotificacoesRepository } from '../src/modules/notificacoes/notificacoes-repository.js';
import { InMemoryBloqueiosRepository } from '../src/modules/agenda/bloqueios-repository.js';
import { InMemoryHorariosFixosRepository } from '../src/modules/agenda/horarios-fixos-repository.js';
import { InMemoryServicosRepository } from '../src/modules/servicos/servicos-repository.js';
import { InMemoryProfissionaisRepository } from '../src/modules/profissionais/profissionais-repository.js';
import {
  CONFIGURACAO_HORARIOS_PADRAO,
  ID_PROFISSIONAL_PADRAO,
  type ServicoModel,
} from '@clinica/shared';

describe('Agendamentos Service (Functions Backend)', () => {
  let repo: InMemoryAgendamentosRepository;
  let notifRepo: InMemoryNotificacoesRepository;

  const clienteUser: UserContext = {
    uid: 'user-cliente-1',
    nome: 'Mariana Souza',
    email: 'mariana@exemplo.com',
    telefone: '(11) 98888-7777',
    isAdmin: false,
  };

  const adminUser: UserContext = {
    uid: 'admin-tais-1',
    nome: 'Tais Romagnoli',
    email: 'admin@clinicataisromagnoli.com.br',
    isAdmin: true,
  };

  beforeEach(() => {
    repo = new InMemoryAgendamentosRepository();
    notifRepo = new InMemoryNotificacoesRepository();
  });

  describe('solicitarNovoAgendamento', () => {
    it('cria agendamento com sucesso para cliente com sinal de 30% e status pendente', async () => {
      // Quinta-feira (22 de Outubro de 2026) - Dia ativo na clínica
      const input = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix' as const,
      };

      const agendamento = await solicitarNovoAgendamento(input, clienteUser, repo);

      expect(agendamento.id).toBeDefined();
      expect(agendamento.clienteId).toBe('user-cliente-1');
      expect(agendamento.clienteNome).toBe('Mariana Souza');
      expect(agendamento.valorTotalEmCentavos).toBe(17000);
      expect(agendamento.valorSinalEmCentavos).toBe(5100); // 30%
      expect(agendamento.saldoRestanteEmCentavos).toBe(11900); // 70%
      expect(agendamento.status).toBe('pendente');
      expect(agendamento.sinalIsento).toBe(false);
      expect(agendamento.origem).toBe('app_cliente');
      expect(agendamento.intervaloAposMinutos).toBe(30);
      expect(agendamento.dataHoraFim).toBe('2026-10-22T11:00:00.000Z');
    });

    it('permite que a administradora crie agendamento presencial isento de sinal e confirmado', async () => {
      const input = {
        servicoId: 'drenagem-linfatica',
        servicoNome: 'Drenagem Linfática',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 18000,
        dataHoraInicio: '2026-10-22T14:00:00.000Z',
        metodoPagamento: 'dinheiro' as const,
        isencaoSinalAdmin: true,
      };

      const agendamento = await solicitarNovoAgendamento(input, adminUser, repo);

      expect(agendamento.valorSinalEmCentavos).toBe(0);
      expect(agendamento.saldoRestanteEmCentavos).toBe(18000);
      expect(agendamento.sinalIsento).toBe(true);
      expect(agendamento.status).toBe('confirmado');
      expect(agendamento.origem).toBe('presencial_admin');
    });

    it('rejeita agendamento em dia de folga da clínica (ex: Domingo ou Terça-feira)', async () => {
      // 2026-10-25 é Domingo (dia 0 = inativo)
      const inputDomingo = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-25T10:00:00.000Z',
        metodoPagamento: 'pix' as const,
      };

      await expect(solicitarNovoAgendamento(inputDomingo, clienteUser, repo)).rejects.toThrow(
        /folga cadastrada/i,
      );
    });

    it('rejeita agendamento quando há conflito de horário incluindo o intervalo de 30min', async () => {
      // Cria primeiro agendamento: 10:00 às 11:00 (com intervalo até 11:30)
      const input1 = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix' as const,
      };
      await solicitarNovoAgendamento(input1, clienteUser, repo);

      // Tenta agendar às 11:15 (conflita com intervalo de 30 min pós-sessão)
      const input2 = {
        servicoId: 'massagem-terapeutica',
        servicoNome: 'Massagem Terapêutica',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 19000,
        dataHoraInicio: '2026-10-22T11:15:00.000Z',
        metodoPagamento: 'cartao' as const,
      };

      await expect(solicitarNovoAgendamento(input2, clienteUser, repo)).rejects.toThrow(
        /não está disponível devido a outro agendamento ou intervalo de manutenção/i,
      );
    });

    it('permite novo agendamento após o término do anterior + 30 min de intervalo', async () => {
      // Primeiro agendamento: 10:00 às 11:00 (intervalo até 11:30)
      await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T10:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Segundo agendamento às 11:30 (exatamente após os 30 min de intervalo)
      const agendamento2 = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-terapeutica',
          servicoNome: 'Massagem Terapêutica',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 19000,
          dataHoraInicio: '2026-10-22T11:30:00.000Z',
          metodoPagamento: 'cartao' as const,
        },
        clienteUser,
        repo,
      );

      expect(agendamento2.id).toBeDefined();
    });

    it('rejeita agendamento quando a duração informada diverge da duração cadastrada no serviço', async () => {
      const servicosRepo = new InMemoryServicosRepository();
      const servicoMock: ServicoModel = {
        id: 'serv-relaxante-60',
        nome: 'Massagem Relaxante',
        descricao: 'Massagem relaxante corporal',
        duracaoMinutos: 60,
        preco: 170,
        sinal: 51,
        ativo: true,
        categoria: 'Relaxamento',
        destaque: true,
        ordemExibicao: 1,
        slug: 'massagem-relaxante',
        sinalPersonalizado: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      };
      await servicosRepo.salvar(servicoMock);

      // Tenta solicitar informando 45 minutos ao invés de 60
      const input = {
        servicoId: 'serv-relaxante-60',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 45,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix' as const,
      };

      await expect(
        solicitarNovoAgendamento(input, clienteUser, repo, notifRepo, servicosRepo),
      ).rejects.toThrow(/não corresponde à duração cadastrada para o serviço/i);
    });

    it('rejeita agendamento fora dos turnos de funcionamento quando a configuração da clínica é validada', async () => {
      // Início às 17:30 com 60 min ultrapassa o término do turno às 18:00
      const input = {
        servicoId: 'serv-qualquer',
        servicoNome: 'Massagem',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        dataHoraInicio: '2026-10-22T17:30:00.000Z',
        metodoPagamento: 'pix' as const,
      };

      await expect(
        solicitarNovoAgendamento(
          input,
          clienteUser,
          repo,
          notifRepo,
          undefined,
          undefined,
          undefined,
          CONFIGURACAO_HORARIOS_PADRAO,
        ),
      ).rejects.toThrow(/ultrapassa os turnos de atendimento da clínica/i);
    });

    it('rejeita agendamento durante intervalo de manutenção (almoço/higienização)', async () => {
      // Intervalo de manutenção de 12:00 às 14:00
      const input = {
        servicoId: 'serv-qualquer',
        servicoNome: 'Massagem',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        dataHoraInicio: '2026-10-22T12:30:00.000Z',
        metodoPagamento: 'pix' as const,
      };

      await expect(
        solicitarNovoAgendamento(
          input,
          clienteUser,
          repo,
          notifRepo,
          undefined,
          undefined,
          undefined,
          CONFIGURACAO_HORARIOS_PADRAO,
        ),
      ).rejects.toThrow(/ultrapassa os turnos de atendimento/i);
    });
  });

  describe('cancelarAgendamentoExistente', () => {
    it('cancela agendamento com mais de 3 horas de antecedência, liberando o sinal e classificando como no_prazo', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Cancelamento às 09:00 (5 horas antes do horário das 14:00)
      const dataReferencia = new Date('2026-10-22T09:00:00.000Z');

      const cancelado = await cancelarAgendamentoExistente(
        { agendamentoId: agendamento.id, motivo: 'Imprevisto' },
        clienteUser,
        repo,
        dataReferencia,
      );

      expect(cancelado.status).toBe('cancelado');
      expect(cancelado.classificacaoCancelamento).toBe('no_prazo');
      expect(cancelado.tipoCancelamento).toBe('no_prazo');
      expect(cancelado.sinalRetido).toBe(false);
      expect(cancelado.sinalDisponivelReagendamento).toBe(true);
      expect(cancelado.antecedenciaCancelamentoHoras).toBe(5);
      expect(cancelado.motivoCancelamento).toBe('Imprevisto');
    });

    it('cancela agendamento com menos de 3 horas de antecedência, retendo o sinal e classificando como tardio', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Cancelamento às 12:30 (1h30 antes do horário das 14:00)
      const dataReferencia = new Date('2026-10-22T12:30:00.000Z');

      const cancelado = await cancelarAgendamentoExistente(
        { agendamentoId: agendamento.id, motivo: 'Cancelamento tardio' },
        clienteUser,
        repo,
        dataReferencia,
      );

      expect(cancelado.status).toBe('cancelado');
      expect(cancelado.classificacaoCancelamento).toBe('tardio');
      expect(cancelado.tipoCancelamento).toBe('tardio');
      expect(cancelado.sinalRetido).toBe(true); // Retém sinal conforme regra de produto
      expect(cancelado.sinalDisponivelReagendamento).toBe(false);
      expect(cancelado.antecedenciaCancelamentoHoras).toBe(1);
    });

    it('cancela agendamento no limite exato de 3 horas classificando como no_prazo', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Cancelamento às 11:00 (exatamente 3 horas antes)
      const dataReferencia = new Date('2026-10-22T11:00:00.000Z');

      const cancelado = await cancelarAgendamentoExistente(
        { agendamentoId: agendamento.id, motivo: 'No limite' },
        clienteUser,
        repo,
        dataReferencia,
      );

      expect(cancelado.status).toBe('cancelado');
      expect(cancelado.classificacaoCancelamento).toBe('no_prazo');
      expect(cancelado.sinalRetido).toBe(false);
      expect(cancelado.sinalDisponivelReagendamento).toBe(true);
    });

    it('impede cancelamento de agendamento já concluído ou já cancelado', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Primeiro cancelamento com sucesso
      await cancelarAgendamentoExistente({ agendamentoId: agendamento.id }, clienteUser, repo);

      // Tentativa de segundo cancelamento
      await expect(
        cancelarAgendamentoExistente({ agendamentoId: agendamento.id }, clienteUser, repo),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Este agendamento já se encontra cancelado.',
      });
    });

    it('impede que outro cliente cancele agendamento alheio', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      const outroCliente: UserContext = {
        uid: 'user-hacker-2',
        nome: 'Outro Usuário',
        isAdmin: false,
      };

      await expect(
        cancelarAgendamentoExistente({ agendamentoId: agendamento.id }, outroCliente, repo),
      ).rejects.toThrow(AgendamentoBusinessError);
    });
  });

  describe('listarAgendamentos', () => {
    it('retorna apenas os agendamentos do cliente solicitante', async () => {
      await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T10:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      const lista = await listarAgendamentos(clienteUser, undefined, repo);
      expect(lista).toHaveLength(1);
      expect(lista[0]?.clienteId).toBe('user-cliente-1');
    });
  });

  describe('Integração com Notificações Internas', () => {
    it('gera notificação interna de confirmação ao solicitar novo agendamento', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T10:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
        notifRepo,
      );

      const notifs = await notifRepo.listarPorDestinatario(clienteUser.uid);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].evento).toBe('confirmacao');
      expect(notifs[0].agendamentoId).toBe(agendamento.id);
      expect(notifs[0].titulo).toContain('Sessão Confirmada');
    });

    it('gera notificação interna de cancelamento ao cancelar agendamento', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Cancelamento com 4h de antecedência
      const dataRef = new Date('2026-10-22T10:00:00.000Z');
      await cancelarAgendamentoExistente(
        { agendamentoId: agendamento.id, motivo: 'Imprevisto pessoal' },
        clienteUser,
        repo,
        notifRepo,
        dataRef,
      );

      const notifs = await notifRepo.listarPorDestinatario(clienteUser.uid);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].evento).toBe('cancelamento');
      expect(notifs[0].mensagem).toContain('crédito para reagendamento futuro');
      expect(notifs[0].mensagem).toContain(
        'Você pode usar o valor do sinal em um novo agendamento.',
      );
      expect(notifs[0].metadados?.classificacaoCancelamento).toBe('no_prazo');
      expect(notifs[0].metadados?.sinalDisponivelReagendamento).toBe(true);
      expect(notifs[0].metadados?.sinalRetido).toBe(false);
    });

    it('gera notificação interna de cancelamento tardio com metadados e mensagem do Brandbook', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-22T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Cancelamento com apenas 1 hora de antecedência (tardio)
      const dataRef = new Date('2026-10-22T13:00:00.000Z');
      await cancelarAgendamentoExistente(
        { agendamentoId: agendamento.id, motivo: 'Imprevisto de última hora' },
        clienteUser,
        repo,
        notifRepo,
        dataRef,
      );

      const notifs = await notifRepo.listarPorDestinatario(clienteUser.uid);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].evento).toBe('cancelamento');
      expect(notifs[0].mensagem).toContain('classificado como tardio');
      expect(notifs[0].mensagem).toContain('o valor do sinal não poderá ser reutilizado');
      expect(notifs[0].metadados?.classificacaoCancelamento).toBe('tardio');
      expect(notifs[0].metadados?.sinalRetido).toBe(true);
      expect(notifs[0].metadados?.sinalDisponivelReagendamento).toBe(false);
    });
  });

  describe('alterarAgendamentoExistente', () => {
    it('altera data/horário do agendamento com sucesso e dispara notificação de alteração', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'shiatsu',
          servicoNome: 'Shiatsu Express',
          duracaoMinutos: 45,
          valorTotalEmCentavos: 15000,
          dataHoraInicio: '2026-10-22T09:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Reagenda 24h antes do horário original
      const dataRef = new Date('2026-10-21T09:00:00.000Z');
      const alterado = await alterarAgendamentoExistente(
        {
          agendamentoId: agendamento.id,
          novaDataHoraInicio: '2026-10-22T15:00:00.000Z',
          motivo: 'Ajuste de agenda de trabalho',
        },
        clienteUser,
        repo,
        notifRepo,
        dataRef,
      );

      expect(alterado.dataHoraInicio).toBe('2026-10-22T15:00:00.000Z');
      expect(alterado.dataHoraFim).toBe('2026-10-22T15:45:00.000Z');

      const notifs = await notifRepo.listarPorDestinatario(clienteUser.uid);
      expect(notifs).toHaveLength(1);
      expect(notifs[0].evento).toBe('alteracao');
      expect(notifs[0].titulo).toContain('Agendamento Alterado');
      expect(notifs[0].mensagem).toContain('anteriormente em');
    });

    it('bloqueia tentativa de alteração com menos de 3 horas de antecedência pelo cliente', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'shiatsu',
          servicoNome: 'Shiatsu Express',
          duracaoMinutos: 45,
          valorTotalEmCentavos: 15000,
          dataHoraInicio: '2026-10-22T09:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Tentativa 1 hora antes do agendamento
      const dataRef = new Date('2026-10-22T08:00:00.000Z');

      await expect(
        alterarAgendamentoExistente(
          {
            agendamentoId: agendamento.id,
            novaDataHoraInicio: '2026-10-22T15:00:00.000Z',
          },
          clienteUser,
          repo,
          notifRepo,
          dataRef,
        ),
      ).rejects.toThrow(
        'Reagendamentos devem ser solicitados com pelo menos 3 horas de antecedência',
      );
    });

    it('permite que a administradora altere o agendamento mesmo com menos de 3 horas', async () => {
      const agendamento = await solicitarNovoAgendamento(
        {
          servicoId: 'shiatsu',
          servicoNome: 'Shiatsu Express',
          duracaoMinutos: 45,
          valorTotalEmCentavos: 15000,
          dataHoraInicio: '2026-10-22T09:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      const dataRef = new Date('2026-10-22T08:30:00.000Z'); // 30 minutos antes
      const alterado = await alterarAgendamentoExistente(
        {
          agendamentoId: agendamento.id,
          novaDataHoraInicio: '2026-10-22T16:00:00.000Z',
        },
        adminUser,
        repo,
        notifRepo,
        dataRef,
      );

      expect(alterado.dataHoraInicio).toBe('2026-10-22T16:00:00.000Z');
    });

    it('impede alteração para horário conflitante com outro agendamento existente', async () => {
      // Agendamento 1: 10:00 às 11:00 (mais intervalo até 11:30)
      await solicitarNovoAgendamento(
        {
          servicoId: 'drenagem',
          servicoNome: 'Drenagem',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 18000,
          dataHoraInicio: '2026-10-22T10:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Agendamento 2: 14:00 às 15:00
      const agendamento2 = await solicitarNovoAgendamento(
        {
          servicoId: 'shiatsu',
          servicoNome: 'Shiatsu',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 16000,
          dataHoraInicio: '2026-10-22T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
        },
        clienteUser,
        repo,
      );

      // Tenta reagendar Agendamento 2 para 10:45 (colidindo com o Agendamento 1 + intervalo)
      const dataRef = new Date('2026-10-21T10:00:00.000Z');
      await expect(
        alterarAgendamentoExistente(
          {
            agendamentoId: agendamento2.id,
            novaDataHoraInicio: '2026-10-22T10:45:00.000Z',
          },
          clienteUser,
          repo,
          notifRepo,
          dataRef,
        ),
      ).rejects.toThrow(AgendamentoBusinessError);
    });

    it('impede solicitação de agendamento que colide com bloqueio único ativo na agenda', async () => {
      const bloqueiosRepo = new InMemoryBloqueiosRepository();
      const horariosFixosRepo = new InMemoryHorariosFixosRepository();

      await bloqueiosRepo.salvar({
        id: 'bl-1',
        tipo: 'unico',
        data: '2026-10-22',
        horaInicio: '14:00',
        horaFim: '16:00',
        diaInteiro: false,
        motivo: 'Manutenção da sala de massoterapia',
        profissionalId: 'default',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-10-01T00:00:00.000Z',
      });

      const input = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T14:30:00.000Z',
        metodoPagamento: 'pix' as const,
      };

      await expect(
        solicitarNovoAgendamento(
          input,
          clienteUser,
          repo,
          notifRepo,
          undefined,
          bloqueiosRepo,
          horariosFixosRepo,
        ),
      ).rejects.toThrow(/bloqueio pontual/);
    });

    it('impede agendamento que colide com horário fixo reservado para outro cliente', async () => {
      const bloqueiosRepo = new InMemoryBloqueiosRepository();
      const horariosFixosRepo = new InMemoryHorariosFixosRepository();

      // 2026-10-22 é quinta-feira (dia 4)
      await horariosFixosRepo.salvar({
        id: 'fixo-1',
        clienteId: 'outro-cliente-titular',
        clienteNome: 'Beatriz Silva',
        diaSemana: 4,
        horaInicio: '10:00',
        horaFim: '11:00',
        frequencia: 'semanal',
        dataInicio: '2026-10-01',
        profissionalId: 'default',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-10-01T00:00:00.000Z',
      });

      const input = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix' as const,
      };

      await expect(
        solicitarNovoAgendamento(
          input,
          clienteUser,
          repo,
          notifRepo,
          undefined,
          bloqueiosRepo,
          horariosFixosRepo,
        ),
      ).rejects.toThrow(/cliente fixo/);
    });

    it('permite agendamento quando o solicitante for o próprio titular do horário fixo', async () => {
      const bloqueiosRepo = new InMemoryBloqueiosRepository();
      const horariosFixosRepo = new InMemoryHorariosFixosRepository();

      await horariosFixosRepo.salvar({
        id: 'fixo-2',
        clienteId: 'user-cliente-1', // Mesmo uid do clienteUser
        clienteNome: 'Mariana Souza',
        diaSemana: 4,
        horaInicio: '10:00',
        horaFim: '11:00',
        frequencia: 'semanal',
        dataInicio: '2026-10-01',
        profissionalId: 'default',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-10-01T00:00:00.000Z',
      });

      const input = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        metodoPagamento: 'pix' as const,
      };

      const ag = await solicitarNovoAgendamento(
        input,
        clienteUser,
        repo,
        notifRepo,
        undefined,
        bloqueiosRepo,
        horariosFixosRepo,
      );

      expect(ag.id).toBeDefined();
      expect(ag.status).toBe('pendente');
    });
  });

  describe('Validações de Vínculo com Profissionais', () => {
    let profissionaisRepo: InMemoryProfissionaisRepository;
    let servicosRepo: InMemoryServicosRepository;

    const servicoMassagem: ServicoModel = {
      id: 'massagem-relaxante',
      nome: 'Massagem Relaxante',
      duracaoMinutos: 60,
      preco: 170,
      precoEmCentavos: 17000,
      sinal: 51,
      sinalEmCentavos: 5100,
      sinalPercentual: 30,
      descricao: 'Relaxamento muscular',
      ativo: true,
      profissionaisHabilitados: [ID_PROFISSIONAL_PADRAO],
      profissionalPadraoId: ID_PROFISSIONAL_PADRAO,
    };

    beforeEach(async () => {
      profissionaisRepo = new InMemoryProfissionaisRepository(true);
      servicosRepo = new InMemoryServicosRepository();
      await servicosRepo.salvar(servicoMassagem);
    });

    it('vincula com sucesso o agendamento ao profissional cadastrado e preenche o nome oficial', async () => {
      const input = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-21T14:00:00.000Z', // Quarta-feira
        metodoPagamento: 'pix' as const,
        profissionalId: ID_PROFISSIONAL_PADRAO,
        profissionalNome: 'Nome Qualquer Submetido',
      };

      const ag = await solicitarNovoAgendamento(
        input,
        clienteUser,
        repo,
        notifRepo,
        servicosRepo,
        undefined,
        undefined,
        undefined,
        profissionaisRepo,
      );

      expect(ag.profissionalId).toBe(ID_PROFISSIONAL_PADRAO);
      expect(ag.profissionalNome).toBe('Tais Romagnoli'); // Nome oficial do cadastro
    });

    it('rejeita agendamento se o profissional selecionado não existir (404)', async () => {
      const input = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-21T14:00:00.000Z',
        metodoPagamento: 'pix' as const,
        profissionalId: 'prof-inexistente',
      };

      await expect(
        solicitarNovoAgendamento(
          input,
          clienteUser,
          repo,
          notifRepo,
          servicosRepo,
          undefined,
          undefined,
          undefined,
          profissionaisRepo,
        ),
      ).rejects.toThrow('Profissional selecionado não encontrado.');
    });

    it('rejeita agendamento se o profissional estiver inativo (422)', async () => {
      await profissionaisRepo.salvar({
        id: 'prof-inativo',
        nome: 'Profissional Inativo',
        especialidade: 'Massoterapeuta',
        ativo: false,
        diasFolga: [0],
        intervaloMinutos: 30,
        createdAt: new Date().toISOString(),
      });

      const input = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-21T14:00:00.000Z',
        metodoPagamento: 'pix' as const,
        profissionalId: 'prof-inativo',
      };

      await expect(
        solicitarNovoAgendamento(
          input,
          clienteUser,
          repo,
          notifRepo,
          servicosRepo,
          undefined,
          undefined,
          undefined,
          profissionaisRepo,
        ),
      ).rejects.toThrow('O profissional selecionado não está ativo para agendamentos.');
    });

    it('rejeita agendamento se for em dia de folga cadastrado para o profissional (422)', async () => {
      // Tais Romagnoli folga domingo (0) e terça (2)
      // 2026-10-20 foi uma terça-feira
      const inputTerca = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-20T14:00:00.000Z',
        metodoPagamento: 'pix' as const,
        profissionalId: ID_PROFISSIONAL_PADRAO,
      };

      await expect(
        solicitarNovoAgendamento(
          inputTerca,
          clienteUser,
          repo,
          notifRepo,
          servicosRepo,
          undefined,
          undefined,
          undefined,
          profissionaisRepo,
        ),
      ).rejects.toThrow('folga cadastrada');
    });

    it('rejeita agendamento se o profissional selecionado não realizar o procedimento solicitado (422)', async () => {
      await profissionaisRepo.salvar({
        id: 'prof-acupuntura',
        nome: 'Mariana Acupunturista',
        especialidade: 'Acupuntura',
        ativo: true,
        diasFolga: [0],
        intervaloMinutos: 30,
        createdAt: new Date().toISOString(),
      });

      const input = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        dataHoraInicio: '2026-10-21T14:00:00.000Z',
        metodoPagamento: 'pix' as const,
        profissionalId: 'prof-acupuntura', // Não está em profissionaisHabilitados do serviço
      };

      await expect(
        solicitarNovoAgendamento(
          input,
          clienteUser,
          repo,
          notifRepo,
          servicosRepo,
          undefined,
          undefined,
          undefined,
          profissionaisRepo,
        ),
      ).rejects.toThrow('O profissional selecionado não realiza o procedimento solicitado.');
    });

    it('valida o novo profissional ao alterar/reagendar um agendamento', async () => {
      await profissionaisRepo.salvar({
        id: 'prof-camila',
        nome: 'Camila Massagens',
        especialidade: 'Massoterapeuta',
        ativo: true,
        diasFolga: [0],
        intervaloMinutos: 30,
        createdAt: new Date().toISOString(),
      });

      await servicosRepo.salvar({
        ...servicoMassagem,
        profissionaisHabilitados: [ID_PROFISSIONAL_PADRAO, 'prof-camila'],
      });

      // Cria agendamento inicial com Tais
      const agOriginal = await solicitarNovoAgendamento(
        {
          servicoId: 'massagem-relaxante',
          servicoNome: 'Massagem Relaxante',
          duracaoMinutos: 60,
          valorTotalEmCentavos: 17000,
          dataHoraInicio: '2026-10-21T14:00:00.000Z',
          metodoPagamento: 'pix' as const,
          profissionalId: ID_PROFISSIONAL_PADRAO,
        },
        clienteUser,
        repo,
        notifRepo,
        servicosRepo,
        undefined,
        undefined,
        undefined,
        profissionaisRepo,
      );

      // Reagenda para quinta-feira trocando profissional para Camila
      const reagendado = await alterarAgendamentoExistente(
        {
          agendamentoId: agOriginal.id,
          novaDataHoraInicio: '2026-10-22T15:00:00.000Z',
          novoProfissionalId: 'prof-camila',
        },
        clienteUser,
        repo,
        notifRepo,
        new Date('2026-10-20T10:00:00.000Z'),
        undefined,
        undefined,
        undefined,
        profissionaisRepo,
        servicosRepo,
      );

      expect(reagendado.profissionalId).toBe('prof-camila');
      expect(reagendado.profissionalNome).toBe('Camila Massagens');
    });
  });

  describe('atualizarStatusAgendamento', () => {
    it('bloqueia usuário cliente comum de alterar status de agendamento (HTTP 403)', async () => {
      await expect(
        atualizarStatusAgendamento(
          { agendamentoId: 'ag-1', novoStatus: 'concluido' },
          clienteUser,
          repo,
        ),
      ).rejects.toThrow('Acesso negado');
    });

    it('lança 404 se o agendamento não for encontrado', async () => {
      await expect(
        atualizarStatusAgendamento(
          { agendamentoId: 'inexistente', novoStatus: 'confirmado' },
          adminUser,
          repo,
        ),
      ).rejects.toThrow('Agendamento não encontrado');
    });

    it('permite que a administradora confirme um agendamento pendente', async () => {
      const agOriginal = await repo.salvar({
        id: 'ag-pendente',
        clienteId: clienteUser.uid,
        clienteNome: clienteUser.nome,
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        valorSinalEmCentavos: 5100,
        saldoRestanteEmCentavos: 11900,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        dataHoraFim: '2026-10-22T11:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: ID_PROFISSIONAL_PADRAO,
        profissionalNome: 'Tais Romagnoli',
        status: 'pendente',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      });

      const atualizado = await atualizarStatusAgendamento(
        { agendamentoId: agOriginal.id, novoStatus: 'confirmado' },
        adminUser,
        repo,
      );

      expect(atualizado.status).toBe('confirmado');
    });

    it('permite transicionar de confirmado para em_andamento e depois concluido', async () => {
      const agOriginal = await repo.salvar({
        id: 'ag-fluxo-conclusao',
        clienteId: clienteUser.uid,
        clienteNome: clienteUser.nome,
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        valorSinalEmCentavos: 5100,
        saldoRestanteEmCentavos: 11900,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        dataHoraFim: '2026-10-22T11:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: ID_PROFISSIONAL_PADRAO,
        profissionalNome: 'Tais Romagnoli',
        status: 'confirmado',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      });

      // 1. Inicia o atendimento
      const emAndamento = await atualizarStatusAgendamento(
        { agendamentoId: agOriginal.id, novoStatus: 'em_andamento' },
        adminUser,
        repo,
      );
      expect(emAndamento.status).toBe('em_andamento');

      // 2. Conclui o atendimento
      const concluido = await atualizarStatusAgendamento(
        { agendamentoId: agOriginal.id, novoStatus: 'concluido' },
        adminUser,
        repo,
      );
      expect(concluido.status).toBe('concluido');
      expect(concluido.concluidoEm).toBeDefined();
    });

    it('registra falta com retenção total do sinal e criação de notificação', async () => {
      const agOriginal = await repo.salvar({
        id: 'ag-falta',
        clienteId: clienteUser.uid,
        clienteNome: clienteUser.nome,
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        valorSinalEmCentavos: 5100,
        saldoRestanteEmCentavos: 11900,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        dataHoraFim: '2026-10-22T11:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: ID_PROFISSIONAL_PADRAO,
        profissionalNome: 'Tais Romagnoli',
        status: 'confirmado',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      });

      const atualizado = await atualizarStatusAgendamento(
        {
          agendamentoId: agOriginal.id,
          novoStatus: 'falta',
          motivo: 'Cliente não compareceu e não atendeu telefone',
        },
        adminUser,
        repo,
        notifRepo,
      );

      expect(atualizado.status).toBe('falta');
      expect(atualizado.sinalRetido).toBe(true);
      expect(atualizado.sinalDisponivelReagendamento).toBe(false);
      expect(atualizado.faltaRegistradaEm).toBeDefined();

      const notifs = await notifRepo.listarPorDestinatario(clienteUser.uid);
      expect(notifs.length).toBeGreaterThan(0);
    });

    it('registra status reagendado marcando reagendadoEm', async () => {
      const agOriginal = await repo.salvar({
        id: 'ag-reagendado',
        clienteId: clienteUser.uid,
        clienteNome: clienteUser.nome,
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        valorSinalEmCentavos: 5100,
        saldoRestanteEmCentavos: 11900,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        dataHoraFim: '2026-10-22T11:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: ID_PROFISSIONAL_PADRAO,
        profissionalNome: 'Tais Romagnoli',
        status: 'confirmado',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      });

      const atualizado = await atualizarStatusAgendamento(
        {
          agendamentoId: agOriginal.id,
          novoStatus: 'reagendado',
          motivo: 'Remarcado para a próxima semana',
        },
        adminUser,
        repo,
      );

      expect(atualizado.status).toBe('reagendado');
      expect(atualizado.reagendadoEm).toBeDefined();
    });

    it('rejeita transição a partir de estados terminais (ex: concluido para pendente)', async () => {
      const agConcluido = await repo.salvar({
        id: 'ag-terminal',
        clienteId: clienteUser.uid,
        clienteNome: clienteUser.nome,
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 17000,
        valorSinalEmCentavos: 5100,
        saldoRestanteEmCentavos: 11900,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        dataHoraFim: '2026-10-22T11:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: ID_PROFISSIONAL_PADRAO,
        profissionalNome: 'Tais Romagnoli',
        status: 'concluido',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      });

      await expect(
        atualizarStatusAgendamento(
          { agendamentoId: agConcluido.id, novoStatus: 'confirmado' },
          adminUser,
          repo,
        ),
      ).rejects.toThrow(/Transição de status inválida/);
    });
  });
});
