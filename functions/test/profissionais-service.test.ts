import { describe, expect, it, beforeEach } from 'vitest';
import { ID_PROFISSIONAL_PADRAO, type ServicoModel } from '@clinica/shared';
import { InMemoryProfissionaisRepository } from '../src/modules/profissionais/profissionais-repository.js';
import {
  ProfissionalBusinessError,
  listarProfissionais,
  obterProfissionalPorId,
  cadastrarProfissional,
  atualizarProfissional,
  vincularProfissionalAoServico,
} from '../src/modules/profissionais/profissionais-service.js';
import { InMemoryServicosRepository } from '../src/modules/servicos/servicos-repository.js';
import type { UserContext } from '../src/middlewares/auth-middleware.js';

describe('ProfissionaisService - Gestão e Vínculo de Profissionais', () => {
  let profissionaisRepo: InMemoryProfissionaisRepository;
  let servicosRepo: InMemoryServicosRepository;

  const adminUser: UserContext = {
    uid: 'admin-tais',
    nome: 'Tais Romagnoli',
    email: 'admin@clinicataisromagnoli.com.br',
    isAdmin: true,
  };

  const clienteUser: UserContext = {
    uid: 'cliente-123',
    nome: 'Cliente Exemplo',
    email: 'cliente@exemplo.com.br',
    isAdmin: false,
  };

  const servicoExemplo: ServicoModel = {
    id: 'massagem-relaxante',
    nome: 'Massagem Relaxante',
    duracaoMinutos: 60,
    preco: 170,
    precoEmCentavos: 17000,
    sinal: 51,
    sinalEmCentavos: 5100,
    sinalPercentual: 30,
    descricao: 'Massagem relaxante corporal profunda.',
    ativo: true,
    profissionaisHabilitados: [ID_PROFISSIONAL_PADRAO],
    profissionalPadraoId: ID_PROFISSIONAL_PADRAO,
  };

  beforeEach(async () => {
    profissionaisRepo = new InMemoryProfissionaisRepository(true);
    servicosRepo = new InMemoryServicosRepository();
    await servicosRepo.salvar(servicoExemplo);
  });

  describe('listarProfissionais', () => {
    it('retorna a profissional inicial padrão (Tais Romagnoli) na inicialização', async () => {
      const lista = await listarProfissionais(profissionaisRepo);
      expect(lista.length).toBeGreaterThanOrEqual(1);
      const tais = lista.find((p) => p.id === ID_PROFISSIONAL_PADRAO);
      expect(tais).toBeDefined();
      expect(tais?.nome).toBe('Tais Romagnoli');
      expect(tais?.especialidade).toBe('Massoterapeuta');
      expect(tais?.ativo).toBe(true);
      expect(tais?.diasFolga).toEqual([0, 2]);
    });

    it('permite filtrar apenas profissionais ativos', async () => {
      await profissionaisRepo.salvar({
        id: 'prof-inativo',
        nome: 'Profissional Inativo',
        especialidade: 'Acupuntura',
        ativo: false,
        diasFolga: [0],
        intervaloMinutos: 30,
        createdAt: new Date().toISOString(),
      });

      const todos = await listarProfissionais(profissionaisRepo, false);
      expect(todos.some((p) => p.id === 'prof-inativo')).toBe(true);

      const ativos = await listarProfissionais(profissionaisRepo, true);
      expect(ativos.some((p) => p.id === 'prof-inativo')).toBe(false);
      expect(ativos.some((p) => p.id === ID_PROFISSIONAL_PADRAO)).toBe(true);
    });
  });

  describe('obterProfissionalPorId', () => {
    it('retorna os dados da profissional inicial quando solicitado por ID', async () => {
      const prof = await obterProfissionalPorId(ID_PROFISSIONAL_PADRAO, profissionaisRepo);
      expect(prof.id).toBe(ID_PROFISSIONAL_PADRAO);
      expect(prof.nome).toBe('Tais Romagnoli');
    });

    it('lança erro 404 quando o profissional não existe', async () => {
      await expect(obterProfissionalPorId('prof-inexistente', profissionaisRepo)).rejects.toThrow(
        ProfissionalBusinessError,
      );

      try {
        await obterProfissionalPorId('prof-inexistente', profissionaisRepo);
      } catch (err) {
        expect(err).toBeInstanceOf(ProfissionalBusinessError);
        expect((err as ProfissionalBusinessError).statusCode).toBe(404);
      }
    });

    it('lança erro 400 se o identificador estiver vazio', async () => {
      await expect(obterProfissionalPorId('  ', profissionaisRepo)).rejects.toThrow(
        ProfissionalBusinessError,
      );
    });
  });

  describe('cadastrarProfissional', () => {
    it('cadastra com sucesso um novo profissional quando solicitado pela administradora', async () => {
      const input = {
        nome: 'Camila Ferreira',
        especialidade: 'Fisioterapeuta e Quiropraxista',
        diasFolga: [0, 6], // Folga domingo e sábado
        intervaloMinutos: 30,
      };

      const criado = await cadastrarProfissional(input, adminUser, profissionaisRepo);

      expect(criado.id).toContain('camila-ferreira');
      expect(criado.nome).toBe('Camila Ferreira');
      expect(criado.especialidade).toBe('Fisioterapeuta e Quiropraxista');
      expect(criado.ativo).toBe(true);
      expect(criado.diasFolga).toEqual([0, 6]);

      const consultado = await profissionaisRepo.buscarPorId(criado.id);
      expect(consultado).not.toBeNull();
    });

    it('rejeita cadastro com erro 403 se o usuário não for administradora', async () => {
      const input = {
        nome: 'Camila Ferreira',
        especialidade: 'Fisioterapeuta',
      };

      await expect(cadastrarProfissional(input, clienteUser, profissionaisRepo)).rejects.toThrow(
        ProfissionalBusinessError,
      );

      try {
        await cadastrarProfissional(input, clienteUser, profissionaisRepo);
      } catch (err) {
        expect((err as ProfissionalBusinessError).statusCode).toBe(403);
      }
    });

    it('rejeita cadastro com erro 409 se o ID fornecido já existir', async () => {
      const input = {
        id: ID_PROFISSIONAL_PADRAO,
        nome: 'Tais Duplicada',
        especialidade: 'Massoterapeuta',
      };

      await expect(cadastrarProfissional(input, adminUser, profissionaisRepo)).rejects.toThrow(
        ProfissionalBusinessError,
      );

      try {
        await cadastrarProfissional(input, adminUser, profissionaisRepo);
      } catch (err) {
        expect((err as ProfissionalBusinessError).statusCode).toBe(409);
      }
    });
  });

  describe('atualizarProfissional', () => {
    it('atualiza os dados de um profissional existente com sucesso', async () => {
      const input = {
        id: ID_PROFISSIONAL_PADRAO,
        especialidade: 'Massoterapeuta Master e Terapeuta Holística',
        intervaloMinutos: 45,
      };

      const atualizado = await atualizarProfissional(input, adminUser, profissionaisRepo);
      expect(atualizado.id).toBe(ID_PROFISSIONAL_PADRAO);
      expect(atualizado.especialidade).toBe('Massoterapeuta Master e Terapeuta Holística');
      expect(atualizado.intervaloMinutos).toBe(45);
      expect(atualizado.nome).toBe('Tais Romagnoli'); // preservado
      expect(atualizado.updatedAt).toBeDefined();
    });

    it('rejeita atualização com erro 403 se o usuário não for administradora', async () => {
      const input = {
        id: ID_PROFISSIONAL_PADRAO,
        especialidade: 'Tentativa não autorizada',
      };

      await expect(atualizarProfissional(input, clienteUser, profissionaisRepo)).rejects.toThrow(
        ProfissionalBusinessError,
      );
    });

    it('rejeita atualização com erro 404 se o profissional não existir', async () => {
      const input = {
        id: 'prof-inexistente',
        especialidade: 'Quiropraxia',
      };

      await expect(atualizarProfissional(input, adminUser, profissionaisRepo)).rejects.toThrow(
        ProfissionalBusinessError,
      );
    });
  });

  describe('vincularProfissionalAoServico', () => {
    it('adiciona um novo profissional habilitado a um procedimento existente', async () => {
      const novoProf = await cadastrarProfissional(
        {
          id: 'prof-camila',
          nome: 'Camila Ferreira',
          especialidade: 'Massoterapeuta',
        },
        adminUser,
        profissionaisRepo,
      );

      const servicoAtualizado = await vincularProfissionalAoServico(
        {
          servicoId: 'massagem-relaxante',
          profissionalId: novoProf.id,
          habilitado: true,
        },
        adminUser,
        servicosRepo,
        profissionaisRepo,
      );

      expect(servicoAtualizado.profissionaisHabilitados).toContain(ID_PROFISSIONAL_PADRAO);
      expect(servicoAtualizado.profissionaisHabilitados).toContain('prof-camila');
    });

    it('remove um profissional de um procedimento mantendo a profissional padrão caso todos sejam removidos', async () => {
      await vincularProfissionalAoServico(
        {
          servicoId: 'massagem-relaxante',
          profissionalId: ID_PROFISSIONAL_PADRAO,
          habilitado: false,
        },
        adminUser,
        servicosRepo,
        profissionaisRepo,
      );

      const servico = await servicosRepo.buscarPorId('massagem-relaxante');
      // Nunca fica vazio; preserva a profissional inicial
      expect(servico?.profissionaisHabilitados).toContain(ID_PROFISSIONAL_PADRAO);
    });

    it('rejeita vincular profissional desativado com erro 422', async () => {
      await profissionaisRepo.salvar({
        id: 'prof-desativado',
        nome: 'Profissional Desativado',
        especialidade: 'Massagem',
        ativo: false,
        diasFolga: [0],
        intervaloMinutos: 30,
        createdAt: new Date().toISOString(),
      });

      await expect(
        vincularProfissionalAoServico(
          {
            servicoId: 'massagem-relaxante',
            profissionalId: 'prof-desativado',
            habilitado: true,
          },
          adminUser,
          servicosRepo,
          profissionaisRepo,
        ),
      ).rejects.toThrow(ProfissionalBusinessError);

      try {
        await vincularProfissionalAoServico(
          {
            servicoId: 'massagem-relaxante',
            profissionalId: 'prof-desativado',
            habilitado: true,
          },
          adminUser,
          servicosRepo,
          profissionaisRepo,
        );
      } catch (err) {
        expect((err as ProfissionalBusinessError).statusCode).toBe(422);
      }
    });

    it('rejeita vínculo se serviço não existir com erro 404', async () => {
      await expect(
        vincularProfissionalAoServico(
          {
            servicoId: 'servico-inexistente',
            profissionalId: ID_PROFISSIONAL_PADRAO,
            habilitado: true,
          },
          adminUser,
          servicosRepo,
          profissionaisRepo,
        ),
      ).rejects.toThrow(ProfissionalBusinessError);
    });
  });
});
