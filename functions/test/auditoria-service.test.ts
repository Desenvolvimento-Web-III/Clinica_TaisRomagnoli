import { describe, it, expect, beforeEach } from 'vitest';
import {
  registrarAuditoria,
  listarLogsAuditoria,
  obterLogAuditoria,
  AuditoriaBusinessError,
} from '../src/modules/auditoria/auditoria-service.js';
import { InMemoryAuditoriaRepository } from '../src/modules/auditoria/auditoria-repository.js';

describe('Serviço de Auditoria do Backend', () => {
  let repository: InMemoryAuditoriaRepository;

  beforeEach(() => {
    repository = new InMemoryAuditoriaRepository();
  });

  describe('registrarAuditoria', () => {
    it('registra com sucesso uma operação importante gravando usuário, ação, data e dados afetados', async () => {
      const registro = await registrarAuditoria(
        {
          usuarioId: 'admin-123',
          usuarioEmail: 'admin@clinica.com',
          usuarioRole: 'admin',
          acao: 'servico.cadastrado',
          recurso: 'servicos',
          recursoId: 'serv-01',
          dadosAfetados: {
            nome: 'Massagem Relaxante',
            precoTotalEmCentavos: 15000,
          },
          ip: '192.168.1.1',
          userAgent: 'Jest/TestClient',
        },
        repository,
      );

      expect(registro.id).toBeDefined();
      expect(registro.usuarioId).toBe('admin-123');
      expect(registro.usuarioEmail).toBe('admin@clinica.com');
      expect(registro.usuarioRole).toBe('admin');
      expect(registro.acao).toBe('servico.cadastrado');
      expect(registro.recurso).toBe('servicos');
      expect(registro.recursoId).toBe('serv-01');
      expect(registro.dadosAfetados).toEqual({
        nome: 'Massagem Relaxante',
        precoTotalEmCentavos: 15000,
      });
      expect(registro.dataHora).toBeDefined();
    });

    it('falha ao tentar registrar com dados obrigatórios ausentes', async () => {
      await expect(
        registrarAuditoria(
          {
            usuarioId: '',
            acao: '',
            recurso: '',
            recursoId: '',
          },
          repository,
        ),
      ).rejects.toThrow(AuditoriaBusinessError);
    });
  });

  describe('listarLogsAuditoria', () => {
    beforeEach(async () => {
      // Cria registros em datas diferentes
      await registrarAuditoria(
        {
          id: 'log-1',
          usuarioId: 'admin-1',
          acao: 'horarios.atualizados',
          recurso: 'configuracoes',
          recursoId: 'horarios_funcionamento',
          dataHora: '2026-11-10T10:00:00.000Z',
          dadosAfetados: { alteracao: 'adicionado intervalo' },
        },
        repository,
      );

      await registrarAuditoria(
        {
          id: 'log-2',
          usuarioId: 'cliente-1',
          acao: 'agendamento.solicitado',
          recurso: 'agendamentos',
          recursoId: 'agend-01',
          dataHora: '2026-11-12T15:30:00.000Z',
          dadosAfetados: { servico: 'Reiki' },
        },
        repository,
      );

      await registrarAuditoria(
        {
          id: 'log-3',
          usuarioId: 'admin-1',
          acao: 'agendamento.confirmado',
          recurso: 'agendamentos',
          recursoId: 'agend-01',
          dataHora: '2026-11-12T16:00:00.000Z',
          dadosAfetados: { status: 'confirmado' },
        },
        repository,
      );
    });

    it('retorna os logs ordenados do mais recente para o mais antigo', async () => {
      const logs = await listarLogsAuditoria({}, repository);
      expect(logs).toHaveLength(3);
      expect(logs[0].id).toBe('log-3');
      expect(logs[1].id).toBe('log-2');
      expect(logs[2].id).toBe('log-1');
    });

    it('filtra corretamente por recurso', async () => {
      const logs = await listarLogsAuditoria({ recurso: 'agendamentos' }, repository);
      expect(logs).toHaveLength(2);
      expect(logs.every((l) => l.recurso === 'agendamentos')).toBe(true);
    });

    it('filtra corretamente por usuário', async () => {
      const logs = await listarLogsAuditoria({ usuarioId: 'cliente-1' }, repository);
      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe('log-2');
    });

    it('filtra corretamente por intervalo de datas', async () => {
      const logs = await listarLogsAuditoria(
        {
          dataInicio: '2026-11-11T00:00:00.000Z',
          dataFim: '2026-11-12T23:59:59.000Z',
        },
        repository,
      );
      expect(logs).toHaveLength(2);
      expect(logs.map((l) => l.id)).toEqual(['log-3', 'log-2']);
    });

    it('respeita o limite especificado', async () => {
      const logs = await listarLogsAuditoria({ limite: 1 }, repository);
      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe('log-3');
    });
  });

  describe('obterLogAuditoria', () => {
    it('retorna o registro correspondente ao ID informado', async () => {
      await registrarAuditoria(
        {
          id: 'log-especifico',
          usuarioId: 'admin-1',
          acao: 'servico.excluido',
          recurso: 'servicos',
          recursoId: 'serv-99',
          dadosAfetados: { nome: 'Servico Antigo' },
        },
        repository,
      );

      const log = await obterLogAuditoria('log-especifico', repository);
      expect(log.id).toBe('log-especifico');
      expect(log.acao).toBe('servico.excluido');
    });

    it('lança erro 404 para ID inexistente', async () => {
      await expect(obterLogAuditoria('nao-existe', repository)).rejects.toThrow(
        AuditoriaBusinessError,
      );
    });
  });
});
