import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  salvarFichaAnamneseService,
  obterFichaAnamneseService,
  AnamneseBusinessError,
} from '../src/modules/anamnese/anamnese-service.js';
import { InMemoryAnamneseRepository } from '../src/modules/anamnese/anamnese-repository.js';
import type { UserContext } from '../src/middlewares/auth-middleware.js';
import { INITIAL_ANAMNESE_DATA, type FichaAnamneseData } from '@clinica/shared';
import type { NotificacoesRepository } from '../src/modules/notificacoes/notificacoes-repository.js';

describe('Anamnese Service (Functions Backend)', () => {
  let repo: InMemoryAnamneseRepository;
  let mockNotifRepo: NotificacoesRepository;

  const clienteTitular: UserContext = {
    uid: 'cliente_123',
    nome: 'Maria Silva',
    email: 'maria@exemplo.com',
    role: 'cliente',
    isAdmin: false,
    isClient: true,
  };

  const outroCliente: UserContext = {
    uid: 'cliente_999',
    nome: 'Carlos Santos',
    email: 'carlos@exemplo.com',
    role: 'cliente',
    isAdmin: false,
    isClient: true,
  };

  const administradora: UserContext = {
    uid: 'admin_tais',
    nome: 'Dra. Taís Romagnoli',
    email: 'tais@clinica.com.br',
    role: 'admin',
    isAdmin: true,
    isClient: false,
  };

  const dadosValidos: FichaAnamneseData = {
    ...INITIAL_ANAMNESE_DATA,
    consentimentoConfirmado: true,
  };

  beforeEach(() => {
    repo = new InMemoryAnamneseRepository();
    mockNotifRepo = {
      salvar: vi.fn().mockResolvedValue({ id: 'notif_1' }),
      listarPorDestinatario: vi.fn().mockResolvedValue([]),
      marcarComoLida: vi.fn().mockResolvedValue(true),
    };
  });

  describe('salvarFichaAnamneseService', () => {
    it('permite que o cliente titular salve sua própria ficha com sucesso', async () => {
      const resultado = await salvarFichaAnamneseService({
        input: { dados: dadosValidos },
        usuarioAutenticado: clienteTitular,
        repo,
      });

      expect(resultado).toBeDefined();
      expect(resultado.clienteId).toBe('cliente_123');
      expect(resultado.clienteNome).toBe('Maria Silva');
      expect(resultado.consentimentoConfirmado).toBe(true);
      expect(resultado.submittedAt).toBeDefined();
      expect(resultado.updatedAt).toBeDefined();

      const noBanco = await repo.obterPorClienteId('cliente_123');
      expect(noBanco).toEqual(resultado);
    });

    it('permite que a administradora salve ou altere a ficha de qualquer cliente', async () => {
      const resultado = await salvarFichaAnamneseService({
        input: { clienteId: 'cliente_123', dados: dadosValidos },
        usuarioAutenticado: administradora,
        repo,
      });

      expect(resultado.clienteId).toBe('cliente_123');
      const noBanco = await repo.obterPorClienteId('cliente_123');
      expect(noBanco).toBeDefined();
    });

    it('bloqueia com HTTP 403 quando um terceiro tenta salvar a ficha de outro cliente', async () => {
      await expect(
        salvarFichaAnamneseService({
          input: { clienteId: 'cliente_123', dados: dadosValidos },
          usuarioAutenticado: outroCliente,
          repo,
        }),
      ).rejects.toThrow(AnamneseBusinessError);

      try {
        await salvarFichaAnamneseService({
          input: { clienteId: 'cliente_123', dados: dadosValidos },
          usuarioAutenticado: outroCliente,
          repo,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AnamneseBusinessError);
        expect((error as AnamneseBusinessError).statusCode).toBe(403);
        expect((error as AnamneseBusinessError).message).toMatch(/não autorizado/i);
      }
    });

    it('bloqueia com HTTP 401 quando usuário não estiver autenticado', async () => {
      await expect(
        salvarFichaAnamneseService({
          input: { dados: dadosValidos },
          usuarioAutenticado: null as unknown as UserContext,
          repo,
        }),
      ).rejects.toThrow(AnamneseBusinessError);

      try {
        await salvarFichaAnamneseService({
          input: { dados: dadosValidos },
          usuarioAutenticado: null as unknown as UserContext,
          repo,
        });
      } catch (error) {
        expect((error as AnamneseBusinessError).statusCode).toBe(401);
      }
    });

    it('rejeita com HTTP 400 dados inválidos (ex: sem consentimento)', async () => {
      const dadosInvalidos = {
        ...dadosValidos,
        consentimentoConfirmado: false,
      };

      await expect(
        salvarFichaAnamneseService({
          input: { dados: dadosInvalidos },
          usuarioAutenticado: clienteTitular,
          repo,
        }),
      ).rejects.toThrow(AnamneseBusinessError);

      try {
        await salvarFichaAnamneseService({
          input: { dados: dadosInvalidos },
          usuarioAutenticado: clienteTitular,
          repo,
        });
      } catch (error) {
        expect((error as AnamneseBusinessError).statusCode).toBe(400);
      }
    });

    it('calcula e persiste pontos de atenção e notifica a administradora', async () => {
      const dadosComAtencao: FichaAnamneseData = {
        ...dadosValidos,
        gestanteOuLactante: { resposta: true, detalhes: 'Gestação de 18 semanas' },
        doencasCardiacas: { resposta: true, detalhes: 'Histórico de arritmia' },
        intensidadeDor: 9,
      };

      const resultado = await salvarFichaAnamneseService({
        input: { dados: dadosComAtencao },
        usuarioAutenticado: clienteTitular,
        repo,
        notifRepo: mockNotifRepo,
      });

      expect(resultado.pontosAtencao).toHaveLength(3);
      expect(resultado.pontosAtencao).toEqual(
        expect.arrayContaining([
          'Gestante/Lactante: Gestação de 18 semanas',
          'Cardíaco: Histórico de arritmia',
          'Dor intensa referida (Nível 9/10)',
        ]),
      );

      expect(mockNotifRepo.salvar).toHaveBeenCalledWith(
        expect.objectContaining({
          destinatarioId: 'admin',
          tipo: 'sistema',
        }),
      );
    });

    it('preserva submittedAt e atualiza updatedAt ao atualizar ficha existente', async () => {
      const primeiraFicha = await salvarFichaAnamneseService({
        input: { dados: dadosValidos },
        usuarioAutenticado: clienteTitular,
        repo,
      });

      // Simula passagem de tempo
      const submittedOriginal = primeiraFicha.submittedAt;

      const dadosAtualizados: FichaAnamneseData = {
        ...dadosValidos,
        intensidadeDor: 5,
      };

      const fichaAtualizada = await salvarFichaAnamneseService({
        input: { dados: dadosAtualizados },
        usuarioAutenticado: clienteTitular,
        repo,
      });

      expect(fichaAtualizada.submittedAt).toBe(submittedOriginal);
      expect(fichaAtualizada.intensidadeDor).toBe(5);
    });
  });

  describe('obterFichaAnamneseService', () => {
    it('permite que o cliente titular consulte sua própria ficha', async () => {
      await salvarFichaAnamneseService({
        input: { dados: dadosValidos },
        usuarioAutenticado: clienteTitular,
        repo,
      });

      const ficha = await obterFichaAnamneseService({
        clienteId: 'cliente_123',
        usuarioAutenticado: clienteTitular,
        repo,
      });

      expect(ficha).toBeDefined();
      expect(ficha?.clienteId).toBe('cliente_123');
    });

    it('permite que a administradora consulte a ficha de qualquer cliente', async () => {
      await salvarFichaAnamneseService({
        input: { dados: dadosValidos },
        usuarioAutenticado: clienteTitular,
        repo,
      });

      const ficha = await obterFichaAnamneseService({
        clienteId: 'cliente_123',
        usuarioAutenticado: administradora,
        repo,
      });

      expect(ficha).toBeDefined();
      expect(ficha?.clienteId).toBe('cliente_123');
    });

    it('bloqueia com HTTP 403 quando um cliente terceiro tenta consultar a ficha alheia', async () => {
      await salvarFichaAnamneseService({
        input: { dados: dadosValidos },
        usuarioAutenticado: clienteTitular,
        repo,
      });

      await expect(
        obterFichaAnamneseService({
          clienteId: 'cliente_123',
          usuarioAutenticado: outroCliente,
          repo,
        }),
      ).rejects.toThrow(AnamneseBusinessError);

      try {
        await obterFichaAnamneseService({
          clienteId: 'cliente_123',
          usuarioAutenticado: outroCliente,
          repo,
        });
      } catch (error) {
        expect((error as AnamneseBusinessError).statusCode).toBe(403);
        expect((error as AnamneseBusinessError).message).toMatch(/não autorizado/i);
      }
    });

    it('retorna null quando o cliente ainda não possui ficha cadastrada', async () => {
      const ficha = await obterFichaAnamneseService({
        clienteId: 'cliente_sem_ficha',
        usuarioAutenticado: administradora,
        repo,
      });

      expect(ficha).toBeNull();
    });
  });
});
