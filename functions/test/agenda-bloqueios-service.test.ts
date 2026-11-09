import { describe, it, expect, beforeEach } from 'vitest';
import {
  criarBloqueioAgenda,
  listarBloqueiosAgenda,
  removerBloqueioAgenda,
  alternarStatusBloqueioAgenda,
  criarHorarioFixoCliente,
  listarHorariosFixosClientes,
  removerHorarioFixoCliente,
  atualizarHorarioFixoCliente,
  verificarDisponibilidadeAgenda,
  AgendaBloqueiosBusinessError,
  type CallerContext,
} from '../src/modules/agenda/agenda-bloqueios-service.js';
import { InMemoryBloqueiosRepository } from '../src/modules/agenda/bloqueios-repository.js';
import { InMemoryHorariosFixosRepository } from '../src/modules/agenda/horarios-fixos-repository.js';

describe('Agenda Bloqueios e Horários Fixos Service', () => {
  let bloqueiosRepo: InMemoryBloqueiosRepository;
  let horariosFixosRepo: InMemoryHorariosFixosRepository;

  const adminCaller: CallerContext = {
    uid: 'admin-tais-1',
    isAdmin: true,
    email: 'admin@clinicataisromagnoli.com.br',
    nome: 'Tais Romagnoli',
  };

  const clientCaller: CallerContext = {
    uid: 'cliente-mariana-1',
    isAdmin: false,
    email: 'mariana@exemplo.com',
    nome: 'Mariana Souza',
  };

  beforeEach(() => {
    bloqueiosRepo = new InMemoryBloqueiosRepository();
    horariosFixosRepo = new InMemoryHorariosFixosRepository();
  });

  describe('criarBloqueioAgenda', () => {
    it('cria bloqueio único com sucesso para administradora', async () => {
      const input = {
        tipo: 'unico',
        data: '2026-11-20',
        horaInicio: '14:00',
        horaFim: '16:00',
        diaInteiro: false,
        motivo: 'Consulta médica externa',
      };

      const bloqueio = await criarBloqueioAgenda(input, adminCaller, bloqueiosRepo);

      expect(bloqueio.id).toBeDefined();
      expect(bloqueio.tipo).toBe('unico');
      expect(bloqueio.ativo).toBe(true);
      expect(bloqueio.criadoPor).toBe('admin-tais-1');
      expect(bloqueio.criadoEm).toBeDefined();

      const persistido = await bloqueiosRepo.buscarPorId(bloqueio.id);
      expect(persistido).toEqual(bloqueio);
    });

    it('cria bloqueio recorrente semanal com sucesso', async () => {
      const input = {
        tipo: 'recorrente',
        diaSemana: 4, // Quinta-feira
        horaInicio: '12:00',
        horaFim: '13:30',
        frequencia: 'semanal',
        motivo: 'Almoço e higienização profunda',
      };

      const bloqueio = await criarBloqueioAgenda(input, adminCaller, bloqueiosRepo);

      expect(bloqueio.id).toBeDefined();
      expect(bloqueio.tipo).toBe('recorrente');
      if (bloqueio.tipo === 'recorrente') {
        expect(bloqueio.diaSemana).toBe(4);
        expect(bloqueio.frequencia).toBe('semanal');
      }
    });

    it('rejeita criação de bloqueio para usuário não administrador com erro 403', async () => {
      const input = {
        tipo: 'unico',
        data: '2026-11-20',
        horaInicio: '14:00',
        horaFim: '16:00',
        motivo: 'Tentativa não autorizada',
      };

      await expect(criarBloqueioAgenda(input, clientCaller, bloqueiosRepo)).rejects.toThrow(
        AgendaBloqueiosBusinessError,
      );

      try {
        await criarBloqueioAgenda(input, clientCaller, bloqueiosRepo);
      } catch (err: unknown) {
        expect((err as AgendaBloqueiosBusinessError).statusCode).toBe(403);
      }
    });

    it('rejeita dados inválidos com hora final anterior à inicial', async () => {
      const input = {
        tipo: 'unico',
        data: '2026-11-20',
        horaInicio: '16:00',
        horaFim: '14:00',
        motivo: 'Horário invertido',
      };

      await expect(criarBloqueioAgenda(input, adminCaller, bloqueiosRepo)).rejects.toThrow();
    });
  });

  describe('listarBloqueiosAgenda', () => {
    beforeEach(async () => {
      await criarBloqueioAgenda(
        {
          tipo: 'unico',
          data: '2026-11-20',
          horaInicio: '08:00',
          horaFim: '10:00',
          motivo: 'Bloqueio ativo 1',
        },
        adminCaller,
        bloqueiosRepo,
      );

      const bloqueio2 = await criarBloqueioAgenda(
        {
          tipo: 'unico',
          data: '2026-11-21',
          horaInicio: '08:00',
          horaFim: '10:00',
          motivo: 'Bloqueio inativo',
        },
        adminCaller,
        bloqueiosRepo,
      );

      await bloqueiosRepo.atualizarStatus(bloqueio2.id, false);
    });

    it('admin pode listar todos os bloqueios (incluindo inativos)', async () => {
      const todos = await listarBloqueiosAgenda(adminCaller, bloqueiosRepo, false);
      expect(todos.length).toBe(2);
    });

    it('cliente comum só recebe bloqueios ativos', async () => {
      const ativos = await listarBloqueiosAgenda(clientCaller, bloqueiosRepo, false);
      expect(ativos.length).toBe(1);
      expect(ativos[0]?.motivo).toBe('Bloqueio ativo 1');
    });
  });

  describe('removerBloqueioAgenda e alternarStatusBloqueioAgenda', () => {
    it('remove bloqueio com sucesso por administradora', async () => {
      const bloqueio = await criarBloqueioAgenda(
        {
          tipo: 'unico',
          data: '2026-11-20',
          horaInicio: '08:00',
          horaFim: '10:00',
          motivo: 'Bloqueio para remoção',
        },
        adminCaller,
        bloqueiosRepo,
      );

      const res = await removerBloqueioAgenda(bloqueio.id, adminCaller, bloqueiosRepo);
      expect(res.removido).toBe(true);

      const busca = await bloqueiosRepo.buscarPorId(bloqueio.id);
      expect(busca).toBeNull();
    });

    it('rejeita remoção de bloqueio por cliente com erro 403', async () => {
      await expect(
        removerBloqueioAgenda('qualquer-id', clientCaller, bloqueiosRepo),
      ).rejects.toThrow(AgendaBloqueiosBusinessError);
    });

    it('retorna 404 ao tentar remover bloqueio inexistente', async () => {
      await expect(removerBloqueioAgenda('nao-existe', adminCaller, bloqueiosRepo)).rejects.toThrow(
        AgendaBloqueiosBusinessError,
      );
    });

    it('alterna status ativo/inativo de um bloqueio', async () => {
      const bloqueio = await criarBloqueioAgenda(
        {
          tipo: 'unico',
          data: '2026-11-20',
          horaInicio: '08:00',
          horaFim: '10:00',
          motivo: 'Bloqueio para desativar',
        },
        adminCaller,
        bloqueiosRepo,
      );

      const desativado = await alternarStatusBloqueioAgenda(
        bloqueio.id,
        false,
        adminCaller,
        bloqueiosRepo,
      );
      expect(desativado.ativo).toBe(false);

      const reativado = await alternarStatusBloqueioAgenda(
        bloqueio.id,
        true,
        adminCaller,
        bloqueiosRepo,
      );
      expect(reativado.ativo).toBe(true);
    });
  });

  describe('Horários Fixos para Clientes', () => {
    it('cria reserva de cliente fixo semanal por administradora', async () => {
      const input = {
        clienteId: 'cli-carlos-1',
        clienteNome: 'Carlos Eduardo',
        clienteTelefone: '11988887777',
        diaSemana: 3, // Quarta-feira
        horaInicio: '09:00',
        horaFim: '10:00',
        frequencia: 'semanal' as const,
        dataInicio: '2026-11-01',
        observacoes: 'Horário fixo semanal reservado',
      };

      const fixo = await criarHorarioFixoCliente(input, adminCaller, horariosFixosRepo);

      expect(fixo.id).toBeDefined();
      expect(fixo.clienteId).toBe('cli-carlos-1');
      expect(fixo.diaSemana).toBe(3);
      expect(fixo.ativo).toBe(true);
      expect(fixo.criadoPor).toBe('admin-tais-1');
    });

    it('rejeita criação de horário fixo por cliente comum com erro 403', async () => {
      const input = {
        clienteId: 'cli-carlos-1',
        clienteNome: 'Carlos Eduardo',
        diaSemana: 3,
        horaInicio: '09:00',
        horaFim: '10:00',
        dataInicio: '2026-11-01',
      };

      await expect(criarHorarioFixoCliente(input, clientCaller, horariosFixosRepo)).rejects.toThrow(
        AgendaBloqueiosBusinessError,
      );
    });

    it('cliente comum só consegue listar suas próprias reservas fixas', async () => {
      await criarHorarioFixoCliente(
        {
          clienteId: 'cliente-mariana-1',
          clienteNome: 'Mariana Souza',
          diaSemana: 1,
          horaInicio: '08:00',
          horaFim: '09:00',
          dataInicio: '2026-11-01',
        },
        adminCaller,
        horariosFixosRepo,
      );

      await criarHorarioFixoCliente(
        {
          clienteId: 'cliente-outro-2',
          clienteNome: 'Outro Cliente',
          diaSemana: 1,
          horaInicio: '10:00',
          horaFim: '11:00',
          dataInicio: '2026-11-01',
        },
        adminCaller,
        horariosFixosRepo,
      );

      const listaCliente = await listarHorariosFixosClientes(clientCaller, horariosFixosRepo);
      expect(listaCliente.length).toBe(1);
      expect(listaCliente[0]?.clienteId).toBe('cliente-mariana-1');

      const listaAdmin = await listarHorariosFixosClientes(adminCaller, horariosFixosRepo);
      expect(listaAdmin.length).toBe(2);
    });

    it('remove horário fixo com sucesso e impede acesso não autorizado', async () => {
      const fixo = await criarHorarioFixoCliente(
        {
          clienteId: 'cli-remocao-1',
          clienteNome: 'Cliente Teste',
          diaSemana: 5,
          horaInicio: '14:00',
          horaFim: '15:00',
          dataInicio: '2026-11-01',
        },
        adminCaller,
        horariosFixosRepo,
      );

      await expect(
        removerHorarioFixoCliente(fixo.id, clientCaller, horariosFixosRepo),
      ).rejects.toThrow(AgendaBloqueiosBusinessError);

      const res = await removerHorarioFixoCliente(fixo.id, adminCaller, horariosFixosRepo);
      expect(res.removido).toBe(true);

      const busca = await horariosFixosRepo.buscarPorId(fixo.id);
      expect(busca).toBeNull();
    });

    it('atualiza dados de um horário fixo existente', async () => {
      const fixo = await criarHorarioFixoCliente(
        {
          clienteId: 'cli-update-1',
          clienteNome: 'Cliente Update',
          diaSemana: 1,
          horaInicio: '08:00',
          horaFim: '09:00',
          dataInicio: '2026-11-01',
        },
        adminCaller,
        horariosFixosRepo,
      );

      const atualizado = await atualizarHorarioFixoCliente(
        {
          id: fixo.id,
          horaInicio: '08:30',
          horaFim: '09:30',
          observacoes: 'Horário ajustado a pedido do cliente',
        },
        adminCaller,
        horariosFixosRepo,
      );

      expect(atualizado.horaInicio).toBe('08:30');
      expect(atualizado.horaFim).toBe('09:30');
      expect(atualizado.observacoes).toBe('Horário ajustado a pedido do cliente');
      expect(atualizado.atualizadoEm).toBeDefined();
    });
  });

  describe('verificarDisponibilidadeAgenda', () => {
    beforeEach(async () => {
      await criarBloqueioAgenda(
        {
          tipo: 'unico',
          data: '2026-11-20',
          horaInicio: '14:00',
          horaFim: '16:00',
          motivo: 'Reunião Externa',
        },
        adminCaller,
        bloqueiosRepo,
      );

      await criarHorarioFixoCliente(
        {
          clienteId: 'cliente-mariana-1',
          clienteNome: 'Mariana Souza',
          diaSemana: 3, // Quarta-feira (ex: 2026-11-18)
          horaInicio: '09:00',
          horaFim: '10:00',
          dataInicio: '2026-11-01',
        },
        adminCaller,
        horariosFixosRepo,
      );
    });

    it('retorna indisponível quando horário colide com bloqueio único', async () => {
      const res = await verificarDisponibilidadeAgenda(
        {
          dataHoraInicioIso: '2026-11-20T14:30:00.000Z',
          dataHoraFimIso: '2026-11-20T15:30:00.000Z',
        },
        bloqueiosRepo,
        horariosFixosRepo,
      );

      expect(res.disponivel).toBe(false);
      expect(res.conflito).toBe(true);
      expect(res.tipoConflito).toBe('bloqueio_unico');
    });

    it('retorna indisponível quando outro cliente tenta agendar no horário de um cliente fixo', async () => {
      const res = await verificarDisponibilidadeAgenda(
        {
          dataHoraInicioIso: '2026-11-18T09:00:00.000Z',
          dataHoraFimIso: '2026-11-18T10:00:00.000Z',
          clienteIdSolicitante: 'outro-cliente-999',
        },
        bloqueiosRepo,
        horariosFixosRepo,
      );

      expect(res.disponivel).toBe(false);
      expect(res.conflito).toBe(true);
      expect(res.tipoConflito).toBe('horario_fixo_outro_cliente');
    });

    it('retorna disponível quando o próprio cliente titular do horário fixo solicita', async () => {
      const res = await verificarDisponibilidadeAgenda(
        {
          dataHoraInicioIso: '2026-11-18T09:00:00.000Z',
          dataHoraFimIso: '2026-11-18T10:00:00.000Z',
          clienteIdSolicitante: 'cliente-mariana-1',
        },
        bloqueiosRepo,
        horariosFixosRepo,
      );

      expect(res.disponivel).toBe(true);
      expect(res.conflito).toBe(false);
    });

    it('retorna disponível quando o horário está completamente livre', async () => {
      const res = await verificarDisponibilidadeAgenda(
        {
          dataHoraInicioIso: '2026-11-16T08:00:00.000Z',
          dataHoraFimIso: '2026-11-16T09:00:00.000Z',
        },
        bloqueiosRepo,
        horariosFixosRepo,
      );

      expect(res.disponivel).toBe(true);
      expect(res.conflito).toBe(false);
    });
  });
});
