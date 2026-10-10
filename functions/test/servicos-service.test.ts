import { describe, it, expect, beforeEach } from 'vitest';
import {
  cadastrarNovoServico,
  editarServicoExistente,
  desativarServicoExistente,
  reativarServicoExistente,
  excluirServicoComProtecaoHistorico,
  listarServicosCatalog,
  obterDetalhesServico,
  ServicoBusinessError,
} from '../src/modules/servicos/servicos-service.js';
import { InMemoryServicosRepository } from '../src/modules/servicos/servicos-repository.js';
import { InMemoryAgendamentosRepository } from '../src/modules/agendamentos/agendamentos-repository.js';
import {
  solicitarNovoAgendamento,
  type UserContext,
} from '../src/modules/agendamentos/agendamentos-service.js';
import type { Agendamento, ServicoModel } from '@clinica/shared';

describe('Serviços Service (Backend Functions)', () => {
  let servicosRepo: InMemoryServicosRepository;
  let agendamentosRepo: InMemoryAgendamentosRepository;

  const adminUser: UserContext = {
    uid: 'admin-tais-1',
    nome: 'Tais Romagnoli',
    email: 'admin@clinicataisromagnoli.com.br',
    isAdmin: true,
  };

  const clienteUser: UserContext = {
    uid: 'cliente-mariana-1',
    nome: 'Mariana Souza',
    email: 'mariana@exemplo.com',
    telefone: '(11) 98888-7777',
    isAdmin: false,
  };

  const servicoInicial: ServicoModel = {
    id: 'massagem-relaxante',
    nome: 'Massagem Relaxante',
    duracaoMinutos: 60,
    preco: 150,
    precoEmCentavos: 15000,
    sinal: 45,
    sinalEmCentavos: 4500,
    sinalPercentual: 30,
    descricao: 'Massagem com movimentos suaves para relaxamento muscular profundo.',
    ativo: true,
    categoria: 'Corporal',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
  };

  beforeEach(() => {
    servicosRepo = new InMemoryServicosRepository();
    agendamentosRepo = new InMemoryAgendamentosRepository();
    servicosRepo.popular([servicoInicial]);
  });

  describe('cadastrarNovoServico', () => {
    it('permite que a administradora cadastre um novo serviço com cálculo automático de sinal', async () => {
      const input = {
        nome: 'Massagem Terapêutica',
        duracaoMinutos: 50,
        preco: 180,
        descricao: 'Alívio de dores crônicas e contraturas musculares.',
        categoria: 'Corporal',
      };

      const criado = await cadastrarNovoServico(input, adminUser, servicosRepo);

      expect(criado.id).toBeDefined();
      expect(criado.nome).toBe('Massagem Terapêutica');
      expect(criado.duracaoMinutos).toBe(50);
      expect(criado.preco).toBe(180);
      expect(criado.precoEmCentavos).toBe(18000);
      expect(criado.sinal).toBe(54); // 30% de 180
      expect(criado.sinalEmCentavos).toBe(5400);
      expect(criado.sinalPercentual).toBe(30);
      expect(criado.ativo).toBe(true);
      expect(criado.createdAt).toBeDefined();
    });

    it('bloqueia o cadastro de serviços por clientes não administradores', async () => {
      const input = {
        nome: 'Drenagem Linfática',
        duracaoMinutos: 60,
        preco: 160,
        descricao: 'Massagem corporal para redução de edemas.',
      };

      await expect(cadastrarNovoServico(input, clienteUser, servicosRepo)).rejects.toThrow(
        ServicoBusinessError,
      );
      await expect(cadastrarNovoServico(input, clienteUser, servicosRepo)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('rejeita cadastro com ID duplicado', async () => {
      const input = {
        id: 'massagem-relaxante',
        nome: 'Outra Relaxante',
        duracaoMinutos: 60,
        preco: 150,
        descricao: 'Tentativa de colisão de ID.',
      };

      await expect(cadastrarNovoServico(input, adminUser, servicosRepo)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('cadastra serviço já com status inativo quando especificado', async () => {
      const input = {
        nome: 'Serviço Experimental',
        duracaoMinutos: 45,
        preco: 120,
        descricao: 'Procedimento piloto para testes clínicos.',
        ativo: false,
      };

      const criado = await cadastrarNovoServico(input, adminUser, servicosRepo);

      expect(criado.ativo).toBe(false);
      expect(criado.nome).toBe('Serviço Experimental');
      expect(criado.duracaoMinutos).toBe(45);
      expect(criado.preco).toBe(120);
    });

    it('cadastra serviço com valor customizado de sinal em Reais', async () => {
      const input = {
        nome: 'Shiatsu Terapêutico',
        duracaoMinutos: 60,
        preco: 200,
        sinal: 80, // 40%
        descricao: 'Aplicação de pressão com os dedos ao longo dos meridianos corporais.',
      };

      const criado = await cadastrarNovoServico(input, adminUser, servicosRepo);

      expect(criado.sinal).toBe(80);
      expect(criado.sinalEmCentavos).toBe(8000);
      expect(criado.sinalPercentual).toBe(40);
      expect(criado.preco).toBe(200);
    });

    it('cadastra serviço com percentual customizado de sinal', async () => {
      const input = {
        nome: 'Reflexologia Podal',
        duracaoMinutos: 45,
        preco: 140,
        sinalPercentual: 50,
        descricao: 'Estímulo de zonas reflexas nos pés para alívio e equilíbrio.',
      };

      const criado = await cadastrarNovoServico(input, adminUser, servicosRepo);

      expect(criado.sinal).toBe(70); // 50% de 140
      expect(criado.sinalEmCentavos).toBe(7000);
      expect(criado.sinalPercentual).toBe(50);
    });

    it('rejeita cadastro com nome duplicado (case-insensitive) com status 409', async () => {
      const input = {
        nome: 'massagem relaxante', // Mesmo nome do servicoInicial com casing diferente
        duracaoMinutos: 60,
        preco: 170,
        descricao: 'Tentativa de duplicar serviço existente pelo nome.',
      };

      await expect(cadastrarNovoServico(input, adminUser, servicosRepo)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Já existe um serviço cadastrado com este nome.',
      });
    });

    it('rejeita cadastro se o usuário não estiver autenticado (401)', async () => {
      const input = {
        nome: 'Massagem sem login',
        duracaoMinutos: 60,
        preco: 150,
        descricao: 'Descrição longa para o teste de autenticação.',
      };

      // @ts-expect-error testando ausência de autenticação
      await expect(cadastrarNovoServico(input, null, servicosRepo)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('gera id slugificado automaticamente quando não fornecido', async () => {
      const input = {
        nome: 'Ventosaterapia Integrativa',
        duracaoMinutos: 40,
        preco: 130,
        descricao: 'Aplicação de ventosas para descompressão e circulação.',
      };

      const criado = await cadastrarNovoServico(input, adminUser, servicosRepo);

      expect(criado.id).toBe('ventosaterapia-integrativa');
    });
  });

  describe('editarServicoExistente', () => {
    it('atualiza nome, duração, preço e descrição com permissão de administradora', async () => {
      const input = {
        id: 'massagem-relaxante',
        nome: 'Massagem Relaxante Aromática',
        duracaoMinutos: 75,
        preco: 190,
        sinal: 57,
        descricao: 'Sessão com óleos essenciais nobres para relaxamento.',
        categoria: 'Corporal',
        ativo: true,
      };

      const atualizado = await editarServicoExistente(input, adminUser, servicosRepo);

      expect(atualizado.nome).toBe('Massagem Relaxante Aromática');
      expect(atualizado.duracaoMinutos).toBe(75);
      expect(atualizado.preco).toBe(190);
      expect(atualizado.precoEmCentavos).toBe(19000);
      expect(atualizado.sinal).toBe(57);
      expect(atualizado.sinalEmCentavos).toBe(5700);
      expect(atualizado.sinalPercentual).toBe(30);
      expect(atualizado.descricao).toBe('Sessão com óleos essenciais nobres para relaxamento.');
      expect(new Date(atualizado.updatedAt!).getTime()).toBeGreaterThanOrEqual(
        new Date(servicoInicial.updatedAt!).getTime(),
      );
    });

    it('bloqueia edição solicitada por cliente comum', async () => {
      const input = {
        id: 'massagem-relaxante',
        nome: 'Massagem Hackeada',
        duracaoMinutos: 60,
        preco: 10,
        descricao: 'Tentativa indevida de alterar preço.',
      };

      await expect(editarServicoExistente(input, clienteUser, servicosRepo)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('retorna erro 404 ao tentar editar serviço inexistente', async () => {
      const input = {
        id: 'servico-que-nao-existe',
        nome: 'Massagem Inexistente',
        duracaoMinutos: 60,
        preco: 150,
        descricao: 'Descrição válida qualquer.',
      };

      await expect(editarServicoExistente(input, adminUser, servicosRepo)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('Preservação de Dados de Agendamentos Históricos', () => {
    it('mantém intactos e inalterados os dados de agendamentos antigos após a edição do serviço', async () => {
      // 1. Simula agendamento histórico criado antes da alteração
      const agendamentoAntigo: Agendamento = {
        id: 'ag-historico-1',
        clienteId: clienteUser.uid,
        clienteNome: clienteUser.nome,
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        dataHoraFim: '2026-10-22T11:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-tais',
        profissionalNome: 'Dra. Taís Romagnoli',
        status: 'concluido',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      };
      await agendamentosRepo.salvar(agendamentoAntigo);

      // 2. Administradora edita o serviço alterando nome, duração e aumentando o preço
      const alteracao = {
        id: 'massagem-relaxante',
        nome: 'Massagem Relaxante Premium',
        duracaoMinutos: 90,
        preco: 250,
        descricao: 'Sessão ampliada de 90 minutos com técnicas avançadas.',
        categoria: 'Corporal',
        ativo: true,
      };
      await editarServicoExistente(alteracao, adminUser, servicosRepo);

      // 3. Verifica que no catálogo o serviço foi atualizado
      const servicoNoCatalogo = await servicosRepo.buscarPorId('massagem-relaxante');
      expect(servicoNoCatalogo?.nome).toBe('Massagem Relaxante Premium');
      expect(servicoNoCatalogo?.preco).toBe(250);
      expect(servicoNoCatalogo?.precoEmCentavos).toBe(25000);
      expect(servicoNoCatalogo?.duracaoMinutos).toBe(90);

      // 4. VERIFICAÇÃO CRUCIAL: O agendamento histórico permanece com seus valores originais intactos
      const agendamentoRecuperado = await agendamentosRepo.buscarPorId('ag-historico-1');
      expect(agendamentoRecuperado).not.toBeNull();
      expect(agendamentoRecuperado?.servicoNome).toBe('Massagem Relaxante'); // Nome antigo preservado
      expect(agendamentoRecuperado?.duracaoMinutos).toBe(60); // Duração antiga preservada
      expect(agendamentoRecuperado?.valorTotalEmCentavos).toBe(15000); // R$ 150 preservado
      expect(agendamentoRecuperado?.valorSinalEmCentavos).toBe(4500); // R$ 45 preservado
      expect(agendamentoRecuperado?.saldoRestanteEmCentavos).toBe(10500); // Saldo preservado
    });
  });

  describe('desativarServicoExistente e reativarServicoExistente', () => {
    it('desativa o serviço (soft delete) e impede novos agendamentos sem apagar dados históricos', async () => {
      // 1. Cria agendamento prévio com o serviço
      const agendamentoAntigo: Agendamento = {
        id: 'ag-existente-2',
        clienteId: clienteUser.uid,
        clienteNome: clienteUser.nome,
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: '2026-10-22T14:00:00.000Z',
        dataHoraFim: '2026-10-22T15:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-tais',
        profissionalNome: 'Dra. Taís Romagnoli',
        status: 'confirmado',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-10-05T10:00:00.000Z',
        updatedAt: '2026-10-05T10:00:00.000Z',
      };
      await agendamentosRepo.salvar(agendamentoAntigo);

      // 2. Administradora desativa o serviço
      const desativado = await desativarServicoExistente(
        'massagem-relaxante',
        adminUser,
        servicosRepo,
      );
      expect(desativado.ativo).toBe(false);

      // 3. O agendamento anterior continua perfeitamente legível e inalterado
      const agendamentoAposDesativacao = await agendamentosRepo.buscarPorId('ag-existente-2');
      expect(agendamentoAposDesativacao?.servicoId).toBe('massagem-relaxante');
      expect(agendamentoAposDesativacao?.status).toBe('confirmado');

      // 4. Nova tentativa de agendamento usando o serviço desativado é rejeitada
      const novoInput = {
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        dataHoraInicio: '2026-10-23T10:00:00.000Z',
        metodoPagamento: 'pix' as const,
      };

      await expect(
        solicitarNovoAgendamento(novoInput, clienteUser, agendamentosRepo, undefined, servicosRepo),
      ).rejects.toThrow('desativado');

      // 5. Administradora reativa o serviço
      const reativado = await reativarServicoExistente(
        'massagem-relaxante',
        adminUser,
        servicosRepo,
      );
      expect(reativado.ativo).toBe(true);

      // 6. Novo agendamento é aceito com sucesso após a reativação
      const agendamentoNovo = await solicitarNovoAgendamento(
        novoInput,
        clienteUser,
        agendamentosRepo,
        undefined,
        servicosRepo,
      );
      expect(agendamentoNovo.id).toBeDefined();
    });

    it('bloqueia desativação solicitada por cliente comum', async () => {
      await expect(
        desativarServicoExistente('massagem-relaxante', clienteUser, servicosRepo),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('retorna 404 ao tentar desativar serviço inexistente', async () => {
      await expect(
        desativarServicoExistente('id-inexistente', adminUser, servicosRepo),
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('excluirServicoComProtecaoHistorico', () => {
    it('bloqueia exclusão física com erro 409 quando há agendamentos vinculados ao serviço', async () => {
      // Vincula um agendamento ao serviço
      await agendamentosRepo.salvar({
        id: 'ag-100',
        clienteId: clienteUser.uid,
        clienteNome: clienteUser.nome,
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: '2026-10-22T10:00:00.000Z',
        dataHoraFim: '2026-10-22T11:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-tais',
        profissionalNome: 'Dra. Taís Romagnoli',
        status: 'concluido',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      });

      // Tenta excluir fisicamente o serviço
      await expect(
        excluirServicoComProtecaoHistorico(
          'massagem-relaxante',
          adminUser,
          servicosRepo,
          agendamentosRepo,
        ),
      ).rejects.toMatchObject({
        statusCode: 409,
      });

      // O serviço ainda deve existir no repositório
      const servico = await servicosRepo.buscarPorId('massagem-relaxante');
      expect(servico).not.toBeNull();
    });

    it('permite exclusão física quando o serviço não possui nenhum agendamento vinculado', async () => {
      // Cadastra serviço sem agendamentos
      const novo = await cadastrarNovoServico(
        {
          id: 'servico-sem-agendamentos',
          nome: 'Procedimento Teste',
          duracaoMinutos: 30,
          preco: 100,
          descricao: 'Serviço para teste de exclusão.',
        },
        adminUser,
        servicosRepo,
      );

      expect(await servicosRepo.buscarPorId(novo.id)).not.toBeNull();

      // Exclui com sucesso
      await excluirServicoComProtecaoHistorico(novo.id, adminUser, servicosRepo, agendamentosRepo);

      expect(await servicosRepo.buscarPorId(novo.id)).toBeNull();
    });

    it('bloqueia exclusão física para usuário cliente comum', async () => {
      await expect(
        excluirServicoComProtecaoHistorico(
          'massagem-relaxante',
          clienteUser,
          servicosRepo,
          agendamentosRepo,
        ),
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('listarServicosCatalog e obterDetalhesServico', () => {
    it('retorna apenas serviços ativos para clientes e visitantes', async () => {
      // Desativa o serviço existente
      await desativarServicoExistente('massagem-relaxante', adminUser, servicosRepo);

      // Adiciona um serviço ativo
      await cadastrarNovoServico(
        {
          id: 'servico-ativo-1',
          nome: 'Reiki Terapia',
          duracaoMinutos: 45,
          preco: 130,
          descricao: 'Equilíbrio energético.',
          ativo: true,
        },
        adminUser,
        servicosRepo,
      );

      // Consulta como cliente: apenas Reiki deve aparecer
      const catalogoCliente = await listarServicosCatalog(clienteUser, false, servicosRepo);
      expect(catalogoCliente).toHaveLength(1);
      expect(catalogoCliente[0]?.id).toBe('servico-ativo-1');

      // Consulta como visitante (sem usuário): apenas ativos
      const catalogoVisitante = await listarServicosCatalog(null, false, servicosRepo);
      expect(catalogoVisitante).toHaveLength(1);
      expect(catalogoVisitante[0]?.id).toBe('servico-ativo-1');

      // Administradora consultando todos (incluindo inativos)
      const catalogoAdmin = await listarServicosCatalog(adminUser, false, servicosRepo);
      expect(catalogoAdmin).toHaveLength(2);
    });

    it('permite obter detalhes de um serviço existente ou lança 404', async () => {
      const detalhe = await obterDetalhesServico('massagem-relaxante', servicosRepo);
      expect(detalhe.nome).toBe('Massagem Relaxante');

      await expect(obterDetalhesServico('inexistente', servicosRepo)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
