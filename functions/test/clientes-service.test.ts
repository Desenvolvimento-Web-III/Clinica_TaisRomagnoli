import { beforeEach, describe, expect, it } from 'vitest';
import {
  registrarPerfilCliente,
  obterPerfilCliente,
  ClienteBusinessError,
} from '../src/modules/clientes/clientes-service.js';
import { InMemoryClientesRepository } from '../src/modules/clientes/clientes-repository.js';
import { InMemoryNotificacoesRepository } from '../src/modules/notificacoes/notificacoes-repository.js';
import type { UserContext } from '../src/modules/agendamentos/agendamentos-service.js';

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
});
