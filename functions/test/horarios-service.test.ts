import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import {
  CONFIGURACAO_HORARIOS_PADRAO,
  type SalvarHorariosInput,
  type Agendamento,
  type ServicoModel,
} from '@clinica/shared';
import {
  obterHorarios,
  salvarHorarios,
  consultarGradeHorariosDisponiveis,
  HorariosBusinessError,
  CONFIGURACOES_COLLECTION,
} from '../src/modules/horarios/horarios-service.js';
import { InMemoryAgendamentosRepository } from '../src/modules/agendamentos/agendamentos-repository.js';
import { InMemoryBloqueiosRepository } from '../src/modules/agenda/bloqueios-repository.js';
import { InMemoryHorariosFixosRepository } from '../src/modules/agenda/horarios-fixos-repository.js';
import { InMemoryServicosRepository } from '../src/modules/servicos/servicos-repository.js';

describe('horarios-service', () => {
  let mockDocGet: ReturnType<typeof vi.fn>;
  let mockDocSet: ReturnType<typeof vi.fn>;
  let mockDocRef: { get: typeof mockDocGet; set: typeof mockDocSet };
  let mockCollection: ReturnType<typeof vi.fn>;
  let mockFirestore: Firestore;

  beforeEach(() => {
    mockDocGet = vi.fn();
    mockDocSet = vi.fn();
    mockDocRef = {
      get: mockDocGet,
      set: mockDocSet,
    };
    mockCollection = vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDocRef),
    });
    mockFirestore = {
      collection: mockCollection,
    } as unknown as Firestore;
  });

  describe('obterHorarios', () => {
    it('retorna a configuração padrão se o documento não existir', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: false,
      });

      const resultado = await obterHorarios(mockFirestore);

      expect(mockCollection).toHaveBeenCalledWith(CONFIGURACOES_COLLECTION);
      expect(resultado).toEqual(CONFIGURACAO_HORARIOS_PADRAO);
    });

    it('retorna os dados do Firestore quando o documento existir e for válido', async () => {
      const dadosSalvos = {
        ...CONFIGURACAO_HORARIOS_PADRAO,
        intervaloPadraoMinutos: 45,
        atualizadoEm: '2026-09-05T15:00:00.000Z',
        atualizadoPor: 'admin-123',
      };

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => dadosSalvos,
      });

      const resultado = await obterHorarios(mockFirestore);

      expect(resultado).toEqual(dadosSalvos);
      expect(resultado.intervaloPadraoMinutos).toBe(45);
    });

    it('retorna configuração padrão caso os dados no banco sejam inválidos', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ dias: 'dado corrompido' }),
      });

      const resultado = await obterHorarios(mockFirestore);

      expect(resultado).toEqual(CONFIGURACAO_HORARIOS_PADRAO);
    });
  });

  describe('salvarHorarios', () => {
    it('valida e persiste nova configuração com metadados de auditoria', async () => {
      mockDocSet.mockResolvedValueOnce(undefined);

      const inputValido: SalvarHorariosInput = {
        intervaloPadraoMinutos: 30,
        dias: CONFIGURACAO_HORARIOS_PADRAO.dias,
        professionalId: 'tais-01',
      };

      const resultado = await salvarHorarios(mockFirestore, inputValido, 'admin-tais');

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          intervaloPadraoMinutos: 30,
          professionalId: 'tais-01',
          atualizadoPor: 'admin-tais',
          atualizadoEm: expect.any(String),
          dias: expect.any(Array),
        }),
        { merge: true },
      );

      expect(resultado.atualizadoPor).toBe('admin-tais');
      expect(resultado.atualizadoEm).toBeDefined();
    });

    it('rejeita payload inválido com erro do Zod', async () => {
      const inputInvalido = {
        intervaloPadraoMinutos: -5,
        dias: [],
      } as unknown as SalvarHorariosInput;

      await expect(salvarHorarios(mockFirestore, inputInvalido, 'admin-tais')).rejects.toThrow();
      expect(mockDocSet).not.toHaveBeenCalled();
    });
  });

  describe('consultarGradeHorariosDisponiveis', () => {
    let agendamentosRepo: InMemoryAgendamentosRepository;
    let bloqueiosRepo: InMemoryBloqueiosRepository;
    let horariosFixosRepo: InMemoryHorariosFixosRepository;
    let servicosRepo: InMemoryServicosRepository;

    beforeEach(() => {
      agendamentosRepo = new InMemoryAgendamentosRepository();
      bloqueiosRepo = new InMemoryBloqueiosRepository();
      horariosFixosRepo = new InMemoryHorariosFixosRepository();
      servicosRepo = new InMemoryServicosRepository();

      mockDocGet.mockResolvedValue({
        exists: false,
      });
    });

    it('retorna grade de horários disponíveis respeitando duração e os 30 min de organização', async () => {
      // 2026-11-16 é Segunda-feira (dia ativo)
      const resultado = await consultarGradeHorariosDisponiveis(
        {
          data: '2026-11-16',
          duracaoMinutos: 60,
          passoMinutos: 30,
        },
        mockFirestore,
        agendamentosRepo,
        bloqueiosRepo,
        horariosFixosRepo,
        servicosRepo,
      );

      expect(resultado.data).toBe('2026-11-16');
      expect(resultado.duracaoMinutos).toBe(60);
      expect(resultado.intervaloMinutos).toBe(30);
      expect(resultado.horarios).toContain('08:00');
      expect(resultado.horarios).toContain('11:00');
      expect(resultado.horarios).not.toContain('11:30'); // com 60 min ultrapassaria 12:00
      expect(resultado.horarios).toContain('14:00');
    });

    it('busca duração a partir do serviço informado no catálogo', async () => {
      const servicoMock: ServicoModel = {
        id: 'serv-pedras',
        nome: 'Massagem com Pedras Quentes',
        descricao: 'Massagem terapêutica com pedras vulcânicas',
        duracaoMinutos: 90,
        preco: 220,
        sinal: 66,
        ativo: true,
        categoria: 'Relaxamento',
        destaque: true,
        ordemExibicao: 1,
        slug: 'massagem-com-pedras-quentes',
        sinalPersonalizado: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      };
      await servicosRepo.salvar(servicoMock);

      const resultado = await consultarGradeHorariosDisponiveis(
        {
          data: '2026-11-16',
          servicoId: 'serv-pedras',
        },
        mockFirestore,
        agendamentosRepo,
        bloqueiosRepo,
        horariosFixosRepo,
        servicosRepo,
      );

      expect(resultado.duracaoMinutos).toBe(90);
      // Turno manhã vai até 12:00, logo 10:30 (90 min -> 12:00) cabe, 11:00 (-> 12:30) não cabe
      expect(resultado.horarios).toContain('10:30');
      expect(resultado.horarios).not.toContain('11:00');
    });

    it('rejeita serviço inexistente com 404', async () => {
      await expect(
        consultarGradeHorariosDisponiveis(
          {
            data: '2026-11-16',
            servicoId: 'servico-inexistente',
          },
          mockFirestore,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          servicosRepo,
        ),
      ).rejects.toThrowError(HorariosBusinessError);
    });

    it('rejeita serviço inativo com 422', async () => {
      const servicoInativo: ServicoModel = {
        id: 'serv-inativo',
        nome: 'Serviço Antigo Desativado',
        descricao: 'Não disponível',
        duracaoMinutos: 60,
        preco: 100,
        sinal: 30,
        ativo: false,
        categoria: 'Geral',
        destaque: false,
        ordemExibicao: 2,
        slug: 'servico-inativo',
        sinalPersonalizado: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      };
      await servicosRepo.salvar(servicoInativo);

      await expect(
        consultarGradeHorariosDisponiveis(
          {
            data: '2026-11-16',
            servicoId: 'serv-inativo',
          },
          mockFirestore,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          servicosRepo,
        ),
      ).rejects.toThrowError(HorariosBusinessError);
    });

    it('respeita o intervalo de 30 min de organização excluindo horários colidentes com sessões existentes', async () => {
      const agendamentoExistente: Agendamento = {
        id: 'ag-1',
        clienteId: 'cli-1',
        clienteNome: 'Mariana',
        servicoId: 'serv-1',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: '2026-11-16T14:00:00.000Z',
        dataHoraFim: '2026-11-16T15:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-tais-romagnoli',
        profissionalNome: 'Tais Romagnoli',
        status: 'confirmado',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      };
      await agendamentosRepo.salvar(agendamentoExistente);

      const resultado = await consultarGradeHorariosDisponiveis(
        {
          data: '2026-11-16',
          duracaoMinutos: 60,
        },
        mockFirestore,
        agendamentosRepo,
        bloqueiosRepo,
        horariosFixosRepo,
        servicosRepo,
      );

      // Sessão das 14:00 às 15:00 com organização até 15:30
      expect(resultado.horarios).not.toContain('14:00');
      expect(resultado.horarios).not.toContain('14:30');
      expect(resultado.horarios).not.toContain('15:00'); // limpeza vai até 15:30
      // Às 15:30 já pode haver novo atendimento
      expect(resultado.horarios).toContain('15:30');
    });

    it('retorna lista vazia de horários quando a data consultada for no passado', async () => {
      const dataRef = new Date('2026-11-13T10:00:00.000Z');
      const resultado = await consultarGradeHorariosDisponiveis(
        {
          data: '2026-10-08',
          duracaoMinutos: 60,
        },
        mockFirestore,
        agendamentosRepo,
        bloqueiosRepo,
        horariosFixosRepo,
        servicosRepo,
        undefined,
        undefined,
        dataRef,
      );

      expect(resultado.data).toBe('2026-10-08');
      expect(resultado.slots).toEqual([]);
      expect(resultado.horarios).toEqual([]);
    });

    it('filtra horários que já passaram quando a data consultada for o dia atual', async () => {
      const dataRef = new Date('2026-11-16T10:15:00.000Z');
      const resultado = await consultarGradeHorariosDisponiveis(
        {
          data: '2026-11-16',
          duracaoMinutos: 60,
        },
        mockFirestore,
        agendamentosRepo,
        bloqueiosRepo,
        horariosFixosRepo,
        servicosRepo,
        undefined,
        undefined,
        dataRef,
      );

      expect(resultado.horarios).not.toContain('08:00');
      expect(resultado.horarios).not.toContain('08:30');
      expect(resultado.horarios).not.toContain('09:00');
      expect(resultado.horarios).not.toContain('09:30');
      expect(resultado.horarios).not.toContain('10:00');
      expect(resultado.horarios).toContain('10:30');
      expect(resultado.horarios).toContain('11:00');
      expect(resultado.horarios).toContain('14:00');
    });
  });
});
