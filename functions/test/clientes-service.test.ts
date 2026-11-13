import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registrarPerfilCliente,
  obterPerfilCliente,
  calcularRecorrenciaMensalCliente,
  extrairMesReferencia,
  listarClientes,
  ClienteBusinessError,
} from '../src/modules/clientes/clientes-service.js';
import { InMemoryClientesRepository } from '../src/modules/clientes/clientes-repository.js';
import { InMemoryNotificacoesRepository } from '../src/modules/notificacoes/notificacoes-repository.js';
import { InMemoryAgendamentosRepository } from '../src/modules/agendamentos/agendamentos-repository.js';
import type { UserContext } from '../src/modules/agendamentos/agendamentos-service.js';
import type { Agendamento } from '@clinica/shared';

describe('Serviço de Perfil de Clientes (Backend)', () => {
  let clientesRepo: InMemoryClientesRepository;
  let notifRepo: InMemoryNotificacoesRepository;

  const clienteUser: UserContext = {
    uid: 'cliente-123',
    nome: 'Mariana Lima',
    email: 'mariana@exemplo.com',
    isAdmin: false,
  };

  const adminUser: UserContext = {
    uid: 'admin-tais',
    nome: 'Tais Romagnoli',
    email: 'tais@clinica.com',
    isAdmin: true,
  };

  beforeEach(() => {
    clientesRepo = new InMemoryClientesRepository();
    notifRepo = new InMemoryNotificacoesRepository();
  });

  describe('registrarPerfilCliente', () => {
    it('registra o perfil básico do cliente com sucesso após a criação da conta', async () => {
      const input = {
        nome: 'Mariana Lima',
        email: 'mariana@exemplo.com',
        telefone: '(11) 98765-4321',
      };

      const perfil = await registrarPerfilCliente(input, clienteUser, clientesRepo, notifRepo);

      expect(perfil).toBeDefined();
      expect(perfil.uid).toBe('cliente-123');
      expect(perfil.nome).toBe('Mariana Lima');
      expect(perfil.email).toBe('mariana@exemplo.com');
      expect(perfil.telefone).toBe('(11) 98765-4321');
      expect(perfil.role).toBe('cliente');
      expect(perfil.status).toBe('ativo');
      expect(perfil.createdAt).toBeDefined();
      expect(perfil.preferenciasContato).toEqual({
        whatsapp: true,
        email: true,
        lembretesAgendamento: true,
      });

      // Verifica se foi persistido no repositório
      const salvo = await clientesRepo.buscarPorUid('cliente-123');
      expect(salvo).toEqual(perfil);

      // Verifica se gerou notificação de boas-vindas
      const notificacoes = await notifRepo.listarPorDestinatario('cliente-123');
      expect(notificacoes).toHaveLength(1);
      expect(notificacoes[0].titulo).toContain('Bem-vindo(a)');
    });

    it('aplica Custom Claims de cliente no Firebase Auth ao registrar perfil quando auth é fornecido', async () => {
      const mockSetCustomUserClaims = vi.fn().mockResolvedValue(undefined);
      const mockAuth = { setCustomUserClaims: mockSetCustomUserClaims };

      const input = {
        nome: 'Mariana Lima',
        email: 'mariana.auth@exemplo.com',
        telefone: '(11) 98765-4321',
      };

      await registrarPerfilCliente(
        input,
        { ...clienteUser, uid: 'cliente-auth-1' },
        clientesRepo,
        notifRepo,
        mockAuth,
      );

      expect(mockSetCustomUserClaims).toHaveBeenCalledWith('cliente-auth-1', {
        role: 'cliente',
        admin: false,
        client: true,
      });
    });

    it('preserva preferências de contato customizadas informadas pelo cliente', async () => {
      const input = {
        nome: 'Mariana Lima',
        email: 'mariana@exemplo.com',
        telefone: '(11) 98765-4321',
        preferenciasContato: {
          whatsapp: true,
          email: false,
          lembretesAgendamento: false,
        },
      };

      const perfil = await registrarPerfilCliente(input, clienteUser, clientesRepo);

      expect(perfil.preferenciasContato).toEqual({
        whatsapp: true,
        email: false,
        lembretesAgendamento: false,
      });
    });

    it('bloqueia tentativa de criar perfil com UID divergente para cliente não administrador', async () => {
      const input = {
        uid: 'cliente-outro',
        nome: 'Tentativa Hacker',
        email: 'hacker@exemplo.com',
        telefone: '(11) 99999-9999',
      };

      await expect(registrarPerfilCliente(input, clienteUser, clientesRepo)).rejects.toThrowError(
        ClienteBusinessError,
      );

      await expect(registrarPerfilCliente(input, clienteUser, clientesRepo)).rejects.toThrowError(
        /Não é permitido registrar perfil com UID divergente/,
      );
    });

    it('permite que a administradora registre perfil especificando o UID do cliente', async () => {
      const input = {
        uid: 'cliente-balcao',
        nome: 'Cliente Presencial',
        email: 'balcao@exemplo.com',
        telefone: '(11) 91111-2222',
      };

      const perfil = await registrarPerfilCliente(input, adminUser, clientesRepo);
      expect(perfil.uid).toBe('cliente-balcao');
      expect(perfil.role).toBe('cliente');
    });

    it('rejeita requisições sem contexto de usuário autenticado', async () => {
      const input = {
        nome: 'Sem Login',
        email: 'sem@login.com',
        telefone: '(11) 98765-4321',
      };

      // @ts-expect-error testando ausência de usuário
      await expect(registrarPerfilCliente(input, null, clientesRepo)).rejects.toThrowError(
        /Acesso não autenticado/,
      );
    });

    it('rejeita dados inválidos com erros do Zod', async () => {
      const inputInvalido = {
        nome: '',
        email: 'email-invalido',
        telefone: '123',
      };

      await expect(
        registrarPerfilCliente(inputInvalido, clienteUser, clientesRepo),
      ).rejects.toThrow();
    });

    it('retorna o perfil existente em caso de chamada repetida idempotente', async () => {
      const input = {
        nome: 'Mariana Lima',
        email: 'mariana@exemplo.com',
        telefone: '(11) 98765-4321',
      };

      const perfil1 = await registrarPerfilCliente(input, clienteUser, clientesRepo);
      const perfil2 = await registrarPerfilCliente(input, clienteUser, clientesRepo);

      expect(perfil1.uid).toBe(perfil2.uid);
      expect(perfil1.createdAt).toBe(perfil2.createdAt);
    });

    it('bloqueia com erro 409 se outro UID tentar cadastrar um e-mail já existente', async () => {
      // Cadastra primeiro usuário com este email
      await clientesRepo.salvar({
        uid: 'cliente-original',
        nome: 'Cliente Original',
        email: 'duplicado@exemplo.com',
        telefone: '(11) 98765-1111',
        role: 'cliente',
        status: 'ativo',
        createdAt: new Date().toISOString(),
      });

      const novoUsuario: UserContext = {
        uid: 'cliente-segundo',
        nome: 'Outro Usuário',
        email: 'duplicado@exemplo.com',
        isAdmin: false,
      };

      const input = {
        nome: 'Outro Usuário',
        email: 'duplicado@exemplo.com',
        telefone: '(11) 98765-2222',
      };

      await expect(registrarPerfilCliente(input, novoUsuario, clientesRepo)).rejects.toThrowError(
        ClienteBusinessError,
      );

      await expect(registrarPerfilCliente(input, novoUsuario, clientesRepo)).rejects.toThrowError(
        /Já existe um cliente cadastrado com este endereço de e-mail/,
      );
    });
  });

  describe('obterPerfilCliente', () => {
    beforeEach(async () => {
      await clientesRepo.salvar({
        uid: 'cliente-123',
        nome: 'Mariana Lima',
        email: 'mariana@exemplo.com',
        telefone: '(11) 98765-4321',
        role: 'cliente',
        status: 'ativo',
        createdAt: new Date().toISOString(),
      });
    });

    it('permite que o cliente consulte seu próprio perfil', async () => {
      const perfil = await obterPerfilCliente('cliente-123', clienteUser, clientesRepo);
      expect(perfil.uid).toBe('cliente-123');
      expect(perfil.nome).toBe('Mariana Lima');
    });

    it('permite que a administradora consulte o perfil de qualquer cliente', async () => {
      const perfil = await obterPerfilCliente('cliente-123', adminUser, clientesRepo);
      expect(perfil.uid).toBe('cliente-123');
    });

    it('bloqueia consulta a perfil de terceiros para cliente comum', async () => {
      const outroCliente: UserContext = {
        uid: 'cliente-outro',
        nome: 'Outro Cliente',
        email: 'outro@exemplo.com',
        isAdmin: false,
      };

      await expect(
        obterPerfilCliente('cliente-123', outroCliente, clientesRepo),
      ).rejects.toThrowError(ClienteBusinessError);

      await expect(
        obterPerfilCliente('cliente-123', outroCliente, clientesRepo),
      ).rejects.toThrowError(/Acesso negado/);
    });

    it('retorna 404 quando o perfil não for encontrado', async () => {
      await expect(
        obterPerfilCliente('cliente-inexistente', adminUser, clientesRepo),
      ).rejects.toThrowError(/Perfil do cliente não encontrado/);
    });
  });

  describe('listarClientes', () => {
    beforeEach(async () => {
      await clientesRepo.salvar({
        uid: 'cliente-1',
        nome: 'Mariana Silva',
        email: 'mariana.silva@exemplo.com',
        telefone: '(11) 98765-4321',
        role: 'cliente',
        status: 'ativo',
        createdAt: '2026-09-01T10:00:00.000Z',
      });
      await clientesRepo.salvar({
        uid: 'cliente-2',
        nome: 'Ana Carolina Santos',
        email: 'ana.santos@exemplo.com',
        telefone: '(11) 97654-3210',
        role: 'cliente',
        status: 'ativo',
        createdAt: '2026-09-05T10:00:00.000Z',
      });
      await clientesRepo.salvar({
        uid: 'cliente-3',
        nome: 'Carlos Eduardo',
        email: 'carlos.eduardo@exemplo.com',
        telefone: '(11) 95432-1098',
        role: 'cliente',
        status: 'inativo',
        createdAt: '2026-09-10T10:00:00.000Z',
      });
    });

    it('permite que a administradora liste todos os clientes cadastrados', async () => {
      const lista = await listarClientes(adminUser, clientesRepo);
      expect(lista).toHaveLength(3);
      expect(lista.map((c) => c.nome)).toEqual([
        'Ana Carolina Santos',
        'Carlos Eduardo',
        'Mariana Silva',
      ]);
    });

    it('filtra clientes por termo de busca no nome', async () => {
      const resultado = await listarClientes(adminUser, clientesRepo, 'Carolina');
      expect(resultado).toHaveLength(1);
      expect(resultado[0]?.nome).toBe('Ana Carolina Santos');
    });

    it('filtra clientes por termo de busca no e-mail', async () => {
      const resultado = await listarClientes(adminUser, clientesRepo, 'mariana.silva');
      expect(resultado).toHaveLength(1);
      expect(resultado[0]?.email).toBe('mariana.silva@exemplo.com');
    });

    it('filtra clientes por telefone mesmo com formato numérico puro', async () => {
      const resultado = await listarClientes(adminUser, clientesRepo, '954321098');
      expect(resultado).toHaveLength(1);
      expect(resultado[0]?.nome).toBe('Carlos Eduardo');
    });

    it('bloqueia cliente comum de listar clientes cadastrados com erro 403', async () => {
      await expect(listarClientes(clienteUser, clientesRepo)).rejects.toThrowError(
        ClienteBusinessError,
      );
      await expect(listarClientes(clienteUser, clientesRepo)).rejects.toThrowError(
        /Acesso negado. Apenas administradoras podem listar clientes./,
      );
    });

    it('bloqueia requisição não autenticada com erro 401', async () => {
      const unauth = null as unknown as UserContext;
      await expect(listarClientes(unauth, clientesRepo)).rejects.toThrowError(
        /Acesso não autenticado/,
      );
    });
  });

  describe('calcularRecorrenciaMensalCliente', () => {
    let agendamentosRepo: InMemoryAgendamentosRepository;

    beforeEach(async () => {
      agendamentosRepo = new InMemoryAgendamentosRepository();
      await clientesRepo.salvar({
        uid: 'cli-recorrente-1',
        nome: 'Juliana Paes',
        email: 'juliana@exemplo.com',
        telefone: '(11) 98888-7777',
        role: 'cliente',
        status: 'ativo',
        createdAt: '2026-01-01T10:00:00.000Z',
      });
    });

    const criarAgendamentoHelper = (
      id: string,
      dataHoraInicio: string,
      status: Agendamento['status'] = 'concluido',
    ): Agendamento => ({
      id,
      clienteId: 'cli-recorrente-1',
      clienteNome: 'Juliana Paes',
      servicoId: 'massagem-relaxante',
      servicoNome: 'Massagem Relaxante',
      duracaoMinutos: 60,
      valorTotalEmCentavos: 17000,
      valorSinalEmCentavos: 5100,
      saldoRestanteEmCentavos: 11900,
      dataHoraInicio,
      dataHoraFim: new Date(new Date(dataHoraInicio).getTime() + 60 * 60 * 1000).toISOString(),
      intervaloAposMinutos: 30,
      profissionalId: 'prof-tais',
      profissionalNome: 'Tais Romagnoli',
      status,
      metodoPagamento: 'pix',
      origem: 'app_cliente',
      sinalIsento: false,
      concluidoEm: status === 'concluido' ? dataHoraInicio : undefined,
      createdAt: dataHoraInicio,
      updatedAt: dataHoraInicio,
    });

    it('extrairMesReferencia identifica corretamente formatos string e Date', () => {
      expect(extrairMesReferencia('2026-11')).toBe('2026-11');
      expect(extrairMesReferencia('2026-11-20T10:00:00.000Z')).toBe('2026-11');
      expect(extrairMesReferencia(new Date('2026-08-15T12:00:00.000Z'))).toBe('2026-08');
    });

    it('cliente sem sessões concluídas no mês não é classificado como recorrente', async () => {
      const resultado = await calcularRecorrenciaMensalCliente(
        'cli-recorrente-1',
        clientesRepo,
        agendamentosRepo,
        '2026-11',
      );

      expect(resultado.recorrente).toBe(false);
      expect(resultado.totalAtendimentosMes).toBe(0);
      expect(resultado.totalAtendimentosConcluidos).toBe(0);
      expect(resultado.mesReferencia).toBe('2026-11');

      const clienteSalvo = await clientesRepo.buscarPorUid('cli-recorrente-1');
      expect(clienteSalvo?.recorrente).toBe(false);
      expect(clienteSalvo?.totalAtendimentosMes).toBe(0);
    });

    it('cliente com apenas 1 sessão concluída no mês não atinge o critério mínimo de recorrência', async () => {
      await agendamentosRepo.salvar(
        criarAgendamentoHelper('ag-1', '2026-11-05T10:00:00.000Z', 'concluido'),
      );

      const resultado = await calcularRecorrenciaMensalCliente(
        'cli-recorrente-1',
        clientesRepo,
        agendamentosRepo,
        '2026-11',
      );

      expect(resultado.recorrente).toBe(false);
      expect(resultado.totalAtendimentosMes).toBe(1);
      expect(resultado.totalAtendimentosConcluidos).toBe(1);
    });

    it('marca como recorrente quem concluir pelo menos duas sessões no mês', async () => {
      await agendamentosRepo.salvar(
        criarAgendamentoHelper('ag-1', '2026-11-05T10:00:00.000Z', 'concluido'),
      );
      await agendamentosRepo.salvar(
        criarAgendamentoHelper('ag-2', '2026-11-19T14:00:00.000Z', 'concluido'),
      );

      const resultado = await calcularRecorrenciaMensalCliente(
        'cli-recorrente-1',
        clientesRepo,
        agendamentosRepo,
        '2026-11',
      );

      expect(resultado.recorrente).toBe(true);
      expect(resultado.totalAtendimentosMes).toBe(2);
      expect(resultado.totalAtendimentosConcluidos).toBe(2);
      expect(resultado.ultimoAtendimento).toBe('2026-11-19T14:00:00.000Z');

      const clienteSalvo = await clientesRepo.buscarPorUid('cli-recorrente-1');
      expect(clienteSalvo?.recorrente).toBe(true);
      expect(clienteSalvo?.totalAtendimentosMes).toBe(2);
      expect(clienteSalvo?.mesReferenciaRecorrencia).toBe('2026-11');
    });

    it('não considera sessões canceladas ou de meses distintos para a recorrência do mês alvo', async () => {
      // 1 sessão concluída em novembro
      await agendamentosRepo.salvar(
        criarAgendamentoHelper('ag-1', '2026-11-05T10:00:00.000Z', 'concluido'),
      );
      // 1 sessão cancelada em novembro
      await agendamentosRepo.salvar(
        criarAgendamentoHelper('ag-2', '2026-11-12T14:00:00.000Z', 'cancelado'),
      );
      // 2 sessões concluídas em outubro
      await agendamentosRepo.salvar(
        criarAgendamentoHelper('ag-3', '2026-10-10T10:00:00.000Z', 'concluido'),
      );
      await agendamentosRepo.salvar(
        criarAgendamentoHelper('ag-4', '2026-10-24T10:00:00.000Z', 'concluido'),
      );

      // Em novembro: apenas 1 concluída -> recorrente false
      const resNovembro = await calcularRecorrenciaMensalCliente(
        'cli-recorrente-1',
        clientesRepo,
        agendamentosRepo,
        '2026-11',
      );
      expect(resNovembro.recorrente).toBe(false);
      expect(resNovembro.totalAtendimentosMes).toBe(1);
      expect(resNovembro.totalAtendimentosConcluidos).toBe(3);

      // Em outubro: 2 concluídas -> recorrente true
      const resOutubro = await calcularRecorrenciaMensalCliente(
        'cli-recorrente-1',
        clientesRepo,
        agendamentosRepo,
        '2026-10',
      );
      expect(resOutubro.recorrente).toBe(true);
      expect(resOutubro.totalAtendimentosMes).toBe(2);
    });

    it('obterPerfilCliente recalcula e injeta os dados de recorrência quando agendamentosRepo é fornecido', async () => {
      await agendamentosRepo.salvar(
        criarAgendamentoHelper('ag-1', '2026-11-01T10:00:00.000Z', 'concluido'),
      );
      await agendamentosRepo.salvar(
        criarAgendamentoHelper('ag-2', '2026-11-15T10:00:00.000Z', 'concluido'),
      );

      const userContext: UserContext = {
        uid: 'cli-recorrente-1',
        nome: 'Juliana Paes',
        email: 'juliana@exemplo.com',
        isAdmin: false,
      };

      const perfil = await obterPerfilCliente(
        'cli-recorrente-1',
        userContext,
        clientesRepo,
        agendamentosRepo,
        '2026-11',
      );

      expect(perfil.recorrente).toBe(true);
      expect(perfil.totalAtendimentosMes).toBe(2);
      expect(perfil.mesReferenciaRecorrencia).toBe('2026-11');
    });

    it('lança erro 404 se o cliente não existir para cálculo de recorrência', async () => {
      await expect(
        calcularRecorrenciaMensalCliente('cli-fantasma', clientesRepo, agendamentosRepo),
      ).rejects.toThrowError(/Cliente não encontrado/);
    });
  });
});
