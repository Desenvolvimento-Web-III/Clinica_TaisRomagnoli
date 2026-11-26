import { describe, it, expect, beforeEach } from 'vitest';
import {
  CONFIGURACAO_HORARIOS_PADRAO,
  type Agendamento,
  type HorariosFuncionamento,
  type ServicoModel,
} from '@clinica/shared';
import {
  calcularDisponibilidadeSlotAgenda,
  calcularGradeDisponibilidadeAgenda,
} from '../src/modules/agenda/calcular-disponibilidade-service.js';
import {
  HorariosBusinessError,
  HORARIOS_DOCUMENT,
} from '../src/modules/horarios/horarios-service.js';
import { InMemoryAgendamentosRepository } from '../src/modules/agendamentos/agendamentos-repository.js';
import { InMemoryBloqueiosRepository } from '../src/modules/agenda/bloqueios-repository.js';
import { InMemoryHorariosFixosRepository } from '../src/modules/agenda/horarios-fixos-repository.js';
import { InMemoryServicosRepository } from '../src/modules/servicos/servicos-repository.js';
import { InMemoryProfissionaisRepository } from '../src/modules/profissionais/profissionais-repository.js';

describe('[Backend] Calcular disponibilidade da agenda', () => {
  let agendamentosRepo: InMemoryAgendamentosRepository;
  let bloqueiosRepo: InMemoryBloqueiosRepository;
  let horariosFixosRepo: InMemoryHorariosFixosRepository;
  let servicosRepo: InMemoryServicosRepository;

  // Mock base de contexto: segunda-feira, 2026-11-16 (dia útil ativo: 08:00-12:00 e 14:00-18:00)
  // Data de referência de teste anterior a 2026-11-16
  const dataReferenciaTeste = new Date('2026-11-10T10:00:00.000Z');

  beforeEach(() => {
    agendamentosRepo = new InMemoryAgendamentosRepository();
    bloqueiosRepo = new InMemoryBloqueiosRepository();
    horariosFixosRepo = new InMemoryHorariosFixosRepository();
    servicosRepo = new InMemoryServicosRepository();
  });

  describe('1. Funcionamento da Clínica', () => {
    it('rejeita agendamento em dia de folga da clínica (ex: domingo ou terça-feira)', async () => {
      // 2026-11-15 é Domingo (dia inativo na configuração padrão)
      const res = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-15T09:00:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(res.disponivel).toBe(false);
      expect(res.conflito).toBe(true);
      expect(res.tipoConflito).toBe('dia_inativo');
      expect(res.motivo).toContain('folga cadastrada');
    });

    it('rejeita agendamento fora do turno de atendimento (antes da abertura ou após o fechamento)', async () => {
      // 2026-11-16 abre às 08:00. Início às 07:30
      const resAntes = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T07:30:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(resAntes.disponivel).toBe(false);
      expect(resAntes.tipoConflito).toBe('fora_do_turno');

      // Turno da tarde fecha às 18:00. Início às 17:30 com 60 min terminaria 18:30
      const resDepois = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T17:30:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(resDepois.disponivel).toBe(false);
      expect(resDepois.tipoConflito).toBe('fora_do_turno');
    });

    it('rejeita agendamento que colide com intervalo de manutenção/almoço dentro do turno ativo', async () => {
      const configComManutencaoInterna: HorariosFuncionamento = {
        ...CONFIGURACAO_HORARIOS_PADRAO,
        dias: CONFIGURACAO_HORARIOS_PADRAO.dias.map((d) =>
          d.dia === 1
            ? {
                ...d,
                ativo: true,
                turnos: [{ inicio: '08:00', fim: '18:00' }],
                intervalosManutencao: [
                  { inicio: '10:00', fim: '10:30', descricao: 'Higienização de sala' },
                ],
              }
            : d,
        ),
      };

      const res = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T09:30:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: configComManutencaoInterna,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(res.disponivel).toBe(false);
      expect(res.tipoConflito).toBe('intervalo_manutencao');
      expect(res.motivo).toContain('Higienização de sala');
    });
  });

  describe('2. Duração do Atendimento', () => {
    it('obtém duração do serviço cadastrado no catálogo e valida encaixe correto', async () => {
      const servicoMock: ServicoModel = {
        id: 'serv-pedras-quentes',
        nome: 'Massagem com Pedras Quentes',
        descricao: 'Massagem profunda relaxante',
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

      // Início às 10:30 com 90 min -> termina exatamente às 12:00 (limite do turno da manhã) -> Disponível
      const resValido = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T10:30:00.000Z',
          servicoId: 'serv-pedras-quentes',
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          servicosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(resValido.disponivel).toBe(true);
      expect(resValido.duracaoMinutos).toBe(90);
      expect(resValido.dataHoraFimIso).toBe('2026-11-16T12:00:00.000Z');

      // Início às 11:00 com 90 min -> terminaria às 12:30 (ultrapassa turno das 12:00) -> Indisponível
      const resInvalido = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T11:00:00.000Z',
          servicoId: 'serv-pedras-quentes',
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          servicosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(resInvalido.disponivel).toBe(false);
      expect(resInvalido.tipoConflito).toBe('fora_do_turno');
    });
  });

  describe('3. Intervalo de 30 minutos de Organização', () => {
    it('rejeita agendamento colidente com os 30 min de higienização após sessão existente', async () => {
      // Agendamento existente: 09:00 às 10:00 (higienização ocupa até 10:30)
      const agendamentoExistente: Agendamento = {
        id: 'ag-existente-1',
        clienteId: 'cli-1',
        clienteNome: 'Mariana',
        servicoId: 'serv-1',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: '2026-11-16T09:00:00.000Z',
        dataHoraFim: '2026-11-16T10:00:00.000Z',
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

      // Tentativa de marcar às 10:00 (logo ao terminar a sessão, mas sala está em higienização)
      const resColideIntervalo = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T10:00:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(resColideIntervalo.disponivel).toBe(false);
      expect(resColideIntervalo.tipoConflito).toBe('conflito_agendamento');
      expect(resColideIntervalo.motivo).toContain('30 min');

      // Tentativa de marcar às 10:30 (higienização terminou) -> Disponível!
      const resAposIntervalo = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T10:30:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(resAposIntervalo.disponivel).toBe(true);
      expect(resAposIntervalo.conflito).toBe(false);
    });

    it('rejeita novo atendimento cujo intervalo pós-sessão invadiria atendimento posterior', async () => {
      // Atendimento às 10:00
      const agendamentoExistente: Agendamento = {
        id: 'ag-existente-2',
        clienteId: 'cli-2',
        clienteNome: 'Fernanda',
        servicoId: 'serv-1',
        servicoNome: 'Drenagem',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 16000,
        valorSinalEmCentavos: 4800,
        saldoRestanteEmCentavos: 11200,
        dataHoraInicio: '2026-11-16T10:00:00.000Z',
        dataHoraFim: '2026-11-16T11:00:00.000Z',
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

      // Sessão das 08:30 às 09:30: termina às 09:30 + 30 min limpeza = 10:00.
      // Início às 08:45 com 60 min terminaria 09:45 + 30 min = 10:15 (invade o início às 10:00)!
      const resInvade = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T08:45:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(resInvade.disponivel).toBe(false);
      expect(resInvade.tipoConflito).toBe('conflito_agendamento');
    });
  });

  describe('4. Bloqueios de Agenda e Horários Fixos', () => {
    it('rejeita agendamento em horário com bloqueio único pontual', async () => {
      await bloqueiosRepo.salvar({
        id: 'bloq-1',
        tipo: 'unico',
        data: '2026-11-16',
        horaInicio: '14:00',
        horaFim: '16:00',
        diaInteiro: false,
        motivo: 'Compromisso externo',
        profissionalId: 'prof-tais-romagnoli',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-01T00:00:00.000Z',
      });

      const res = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T14:30:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(res.disponivel).toBe(false);
      expect(res.tipoConflito).toBe('bloqueio_unico');
      expect(res.motivo).toContain('Compromisso externo');
    });

    it('rejeita agendamento em data com bloqueio de dia inteiro', async () => {
      await bloqueiosRepo.salvar({
        id: 'bloq-dia-inteiro',
        tipo: 'unico',
        data: '2026-11-18', // Quarta-feira
        horaInicio: '08:00',
        horaFim: '18:00',
        diaInteiro: true,
        motivo: 'Congresso de Fisioterapia e Estética',
        profissionalId: 'prof-tais-romagnoli',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-01T00:00:00.000Z',
      });

      const res = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-18T10:00:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(res.disponivel).toBe(false);
      expect(res.tipoConflito).toBe('bloqueio_unico');
      expect(res.motivo).toContain('Congresso');
    });

    it('rejeita agendamento em horário com bloqueio recorrente semanal', async () => {
      await bloqueiosRepo.salvar({
        id: 'bloq-recorrente-segunda',
        tipo: 'recorrente',
        diaSemana: 1, // Segunda-feira
        horaInicio: '08:00',
        horaFim: '09:30',
        frequencia: 'semanal',
        motivo: 'Reunião de alinhamento',
        profissionalId: 'prof-tais-romagnoli',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-01T00:00:00.000Z',
      });

      const res = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T08:30:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(res.disponivel).toBe(false);
      expect(res.tipoConflito).toBe('bloqueio_recorrente');
    });

    it('rejeita agendamento para terceiro em horário fixo reservado mas libera para o titular', async () => {
      await horariosFixosRepo.salvar({
        id: 'fixo-mariana',
        clienteId: 'cliente-mariana-1',
        clienteNome: 'Mariana Souza',
        diaSemana: 1, // Segunda-feira
        horaInicio: '10:00',
        horaFim: '11:00',
        dataInicio: '2026-11-01',
        frequencia: 'semanal',
        profissionalId: 'prof-tais-romagnoli',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-01T00:00:00.000Z',
      });

      // Terceiro cliente tentando agendar
      const resTerceiro = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T10:00:00.000Z',
          duracaoMinutos: 60,
          clienteIdSolicitante: 'outro-cliente-888',
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(resTerceiro.disponivel).toBe(false);
      expect(resTerceiro.tipoConflito).toBe('horario_fixo_outro_cliente');

      // Própria Mariana (titular da reserva fixa) agendando
      const resTitular = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T10:00:00.000Z',
          duracaoMinutos: 60,
          clienteIdSolicitante: 'cliente-mariana-1',
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(resTitular.disponivel).toBe(true);
      expect(resTitular.conflito).toBe(false);
    });
  });

  describe('5. Agendamentos Existentes', () => {
    it('ignora agendamentos cancelados liberando o horário', async () => {
      await agendamentosRepo.salvar({
        id: 'ag-cancelado-1',
        clienteId: 'cli-cancelou',
        clienteNome: 'Lucas',
        servicoId: 'serv-1',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: '2026-11-16T15:00:00.000Z',
        dataHoraFim: '2026-11-16T16:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-tais-romagnoli',
        profissionalNome: 'Tais Romagnoli',
        status: 'cancelado', // CANCELADO!
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      });

      const res = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T15:00:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(res.disponivel).toBe(true);
      expect(res.conflito).toBe(false);
    });

    it('permite reaproveitar o próprio slot quando for reagendamento (agendamentoIdIgnorado)', async () => {
      const agendamentoAtual: Agendamento = {
        id: 'ag-reagendar-123',
        clienteId: 'cli-1',
        clienteNome: 'Mariana',
        servicoId: 'serv-1',
        servicoNome: 'Massagem Relaxante',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: '2026-11-16T16:00:00.000Z',
        dataHoraFim: '2026-11-16T17:00:00.000Z',
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
      await agendamentosRepo.salvar(agendamentoAtual);

      // Sem ignorar: detecta conflito com ele mesmo
      const resComConflito = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T16:00:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );
      expect(resComConflito.disponivel).toBe(false);

      // Com agendamentoIdIgnorado: libera para reagendar/ajustar
      const resLiberado = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T16:00:00.000Z',
          duracaoMinutos: 60,
          agendamentoIdIgnorado: 'ag-reagendar-123',
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );
      expect(resLiberado.disponivel).toBe(true);
      expect(resLiberado.conflito).toBe(false);
    });
  });

  describe('6. Bloqueio de Datas e Horários Passados', () => {
    it('rejeita agendamento em datas passadas', async () => {
      const dataHoje = new Date('2026-11-16T12:00:00.000Z');

      const res = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-10T10:00:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataHoje,
        },
      );

      expect(res.disponivel).toBe(false);
      expect(res.tipoConflito).toBe('data_passada');
    });

    it('rejeita horários anteriores ao horário atual no mesmo dia', async () => {
      // São 10:15 no dia 2026-11-16
      const dataHoje = new Date('2026-11-16T10:15:00.000Z');

      const resPassado = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T09:00:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataHoje,
        },
      );

      expect(resPassado.disponivel).toBe(false);
      expect(resPassado.tipoConflito).toBe('data_passada');

      // Horário futuro no mesmo dia (11:00)
      const resFuturo = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T11:00:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataHoje,
        },
      );

      expect(resFuturo.disponivel).toBe(true);
      expect(resFuturo.conflito).toBe(false);
    });
  });

  describe('7. Sucesso Geral (Combinação dos 5 Critérios)', () => {
    it('aprova horário quando funcionamento, duração, intervalo, bloqueios e agendamentos estão em perfeita harmonia', async () => {
      const res = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T08:00:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(res.disponivel).toBe(true);
      expect(res.conflito).toBe(false);
      expect(res.duracaoMinutos).toBe(60);
      expect(res.intervaloMinutos).toBe(30);
      expect(res.dataHoraInicioIso).toBe('2026-11-16T08:00:00.000Z');
      expect(res.dataHoraFimIso).toBe('2026-11-16T09:00:00.000Z');
    });
  });

  describe('8. Grade de Disponibilidade Completa', () => {
    it('calcula todos os slots disponíveis no dia combinando funcionamento, duração, intervalo e agendamentos', async () => {
      // Agendamento das 09:00 às 10:00
      await agendamentosRepo.salvar({
        id: 'ag-grade-1',
        clienteId: 'cli-grade',
        clienteNome: 'Mariana',
        servicoId: 'serv-1',
        servicoNome: 'Massagem',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: '2026-11-16T09:00:00.000Z',
        dataHoraFim: '2026-11-16T10:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-tais-romagnoli',
        profissionalNome: 'Tais Romagnoli',
        status: 'confirmado',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      });

      const mockFirestore = {
        collection: () => ({
          doc: () => ({
            get: () =>
              Promise.resolve({
                exists: true,
                data: () => CONFIGURACAO_HORARIOS_PADRAO,
              }),
          }),
        }),
      } as unknown as import('firebase-admin/firestore').Firestore;

      const grade = await calcularGradeDisponibilidadeAgenda(
        {
          data: '2026-11-16',
          duracaoMinutos: 60,
        },
        {
          firestore: mockFirestore,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          servicosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(grade.data).toBe('2026-11-16');
      expect(grade.duracaoMinutos).toBe(60);
      expect(grade.intervaloMinutos).toBe(30);
      expect(grade.horarios).not.toContain('09:00');
      expect(grade.horarios).not.toContain('10:00'); // limpeza até 10:30
      expect(grade.horarios).toContain('10:30');
      expect(grade.horarios).toContain('14:00');
    });

    it('aplica fallback para configuracoes/horarios_funcionamento da clínica e combina todos os 5 pilares na grade', async () => {
      // Clínica customizada: segunda-feira abre às 09:00 e fecha às 17:00 com almoço 12:00-13:00
      const configClinica: HorariosFuncionamento = {
        ...CONFIGURACAO_HORARIOS_PADRAO,
        intervaloPadraoMinutos: 30,
        dias: CONFIGURACAO_HORARIOS_PADRAO.dias.map((d) =>
          d.dia === 1
            ? {
                ...d,
                ativo: true,
                turnos: [
                  { inicio: '09:00', fim: '12:00' },
                  { inicio: '13:00', fim: '17:00' },
                ],
                intervalosManutencao: [{ inicio: '12:00', fim: '13:00', descricao: 'Almoço' }],
              }
            : d,
        ),
      };

      // Bloqueio único das 13:00 às 14:00
      await bloqueiosRepo.salvar({
        id: 'bloq-grade-tarde',
        tipo: 'unico',
        data: '2026-11-16',
        horaInicio: '13:00',
        horaFim: '14:00',
        diaInteiro: false,
        motivo: 'Treinamento interno',
        profissionalId: 'prof-tais-romagnoli',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-01T00:00:00.000Z',
      });

      // Horário fixo de outra cliente das 15:00 às 16:00
      await horariosFixosRepo.salvar({
        id: 'fixo-grade-outra',
        clienteId: 'cli-fixa',
        clienteNome: 'Ana',
        diaSemana: 1,
        horaInicio: '15:00',
        horaFim: '16:00',
        dataInicio: '2026-11-01',
        frequencia: 'semanal',
        profissionalId: 'prof-tais-romagnoli',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-01T00:00:00.000Z',
      });

      // Agendamento existente das 09:00 às 10:00 (+30 min limpeza -> 10:30)
      await agendamentosRepo.salvar({
        id: 'ag-grade-manhã',
        clienteId: 'cli-1',
        clienteNome: 'Beatriz',
        servicoId: 'serv-1',
        servicoNome: 'Massagem',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: '2026-11-16T09:00:00.000Z',
        dataHoraFim: '2026-11-16T10:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-tais-romagnoli',
        profissionalNome: 'Tais Romagnoli',
        status: 'confirmado',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      });

      // Firestore tem apenas configuracoes/horarios_funcionamento (sem doc específico da profissional)
      const mockFirestore = {
        collection: () => ({
          doc: (docId: string) => ({
            get: () =>
              docId === HORARIOS_DOCUMENT
                ? Promise.resolve({ exists: true, data: () => configClinica })
                : Promise.resolve({ exists: false }),
          }),
        }),
      } as unknown as import('firebase-admin/firestore').Firestore;

      const grade = await calcularGradeDisponibilidadeAgenda(
        {
          data: '2026-11-16',
          duracaoMinutos: 60,
          clienteIdSolicitante: 'cli-visitante',
        },
        {
          firestore: mockFirestore,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          servicosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      // 08:00 não existe pois clínica customizada abre às 09:00
      expect(grade.horarios).not.toContain('08:00');
      // 09:00 e 10:00 ocupados por agendamento + 30 min de intervalo
      expect(grade.horarios).not.toContain('09:00');
      expect(grade.horarios).not.toContain('10:00');
      // 10:30 e 11:00 livres na manhã
      expect(grade.horarios).toContain('10:30');
      expect(grade.horarios).toContain('11:00');
      // 13:00 e 13:30 bloqueados pelo bloqueio único
      expect(grade.horarios).not.toContain('13:00');
      expect(grade.horarios).not.toContain('13:30');
      // 14:00 livre
      expect(grade.horarios).toContain('14:00');
      // 15:00 bloqueado pelo horário fixo da cliente Ana
      expect(grade.horarios).not.toContain('15:00');
      // 16:00 livre (termina 17:00, fechamento customizado)
      expect(grade.horarios).toContain('16:00');
      expect(grade.horarios).not.toContain('17:00');
    });
  });

  describe('9. Validações de Consistência, Profissional, Serviço e Estados Terminais', () => {
    it('rejeita parâmetros inválidos (data inválida, duração <= 0, término anterior ao início, intervalo negativo)', async () => {
      const ctx = {
        configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
        agendamentosRepo,
        bloqueiosRepo,
        horariosFixosRepo,
        dataReferencia: dataReferenciaTeste,
      };

      await expect(
        calcularDisponibilidadeSlotAgenda(
          { dataHoraInicioIso: 'data-invalida', duracaoMinutos: 60 },
          ctx,
        ),
      ).rejects.toThrow(HorariosBusinessError);

      await expect(
        calcularDisponibilidadeSlotAgenda(
          { dataHoraInicioIso: '2026-11-16T09:00:00.000Z', duracaoMinutos: 0 },
          ctx,
        ),
      ).rejects.toThrow(HorariosBusinessError);

      await expect(
        calcularDisponibilidadeSlotAgenda(
          {
            dataHoraInicioIso: '2026-11-16T10:00:00.000Z',
            dataHoraFimIso: '2026-11-16T09:00:00.000Z',
          },
          ctx,
        ),
      ).rejects.toThrow(HorariosBusinessError);

      await expect(
        calcularDisponibilidadeSlotAgenda(
          {
            dataHoraInicioIso: '2026-11-16T09:00:00.000Z',
            duracaoMinutos: 60,
            intervaloMinutos: -10,
          },
          ctx,
        ),
      ).rejects.toThrow(HorariosBusinessError);

      await expect(
        calcularDisponibilidadeSlotAgenda({ dataHoraInicioIso: '2026-11-16T09:00:00.000Z' }, ctx),
      ).rejects.toThrow(HorariosBusinessError);
    });

    it('rejeita profissional não habilitado para o serviço com 422 e sobrescreve dataHoraFimIso divergente pela duração oficial do serviço', async () => {
      const profissionaisRepo = new InMemoryProfissionaisRepository();
      await profissionaisRepo.salvar({
        id: 'prof-camila',
        nome: 'Camila',
        especialidade: 'Massoterapia',
        ativo: true,
        diasFolga: [0, 2],
        intervaloMinutos: 30,
        createdAt: '2026-09-01T00:00:00.000Z',
      });

      await servicosRepo.salvar({
        id: 'serv-exclusivo-tais',
        nome: 'Terapia Exclusiva',
        descricao: 'Serviço de 90 min realizado apenas pela Tais',
        duracaoMinutos: 90,
        preco: 250,
        sinal: 75,
        ativo: true,
        categoria: 'Especial',
        destaque: false,
        ordemExibicao: 1,
        slug: 'terapia-exclusiva',
        sinalPersonalizado: false,
        profissionaisIds: ['prof-tais-romagnoli'],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      });

      // Profissional não habilitada
      await expect(
        calcularDisponibilidadeSlotAgenda(
          {
            dataHoraInicioIso: '2026-11-16T09:00:00.000Z',
            servicoId: 'serv-exclusivo-tais',
            profissionalId: 'prof-camila',
          },
          {
            configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
            agendamentosRepo,
            bloqueiosRepo,
            horariosFixosRepo,
            servicosRepo,
            profissionaisRepo,
            dataReferencia: dataReferenciaTeste,
          },
        ),
      ).rejects.toMatchObject({ statusCode: 422 });

      // Mesmo se cliente enviar dataHoraFimIso de 30 min, a duração oficial (90 min) prevalece
      const res = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T11:00:00.000Z',
          dataHoraFimIso: '2026-11-16T11:30:00.000Z',
          servicoId: 'serv-exclusivo-tais',
          profissionalId: 'prof-tais-romagnoli',
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          servicosRepo,
          profissionaisRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(res.disponivel).toBe(false);
      expect(res.duracaoMinutos).toBe(90);
      expect(res.dataHoraFimIso).toBe('2026-11-16T12:30:00.000Z');
      expect(res.tipoConflito).toBe('fora_do_turno');
    });

    it('ignora agendamentos com status reagendado liberando o horário antigo', async () => {
      await agendamentosRepo.salvar({
        id: 'ag-reagendado-antigo',
        clienteId: 'cli-1',
        clienteNome: 'Clara',
        servicoId: 'serv-1',
        servicoNome: 'Massagem',
        duracaoMinutos: 60,
        valorTotalEmCentavos: 15000,
        valorSinalEmCentavos: 4500,
        saldoRestanteEmCentavos: 10500,
        dataHoraInicio: '2026-11-16T15:00:00.000Z',
        dataHoraFim: '2026-11-16T16:00:00.000Z',
        intervaloAposMinutos: 30,
        profissionalId: 'prof-tais-romagnoli',
        profissionalNome: 'Tais Romagnoli',
        status: 'reagendado',
        metodoPagamento: 'pix',
        origem: 'app_cliente',
        sinalIsento: false,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      });

      const res = await calcularDisponibilidadeSlotAgenda(
        {
          dataHoraInicioIso: '2026-11-16T15:00:00.000Z',
          duracaoMinutos: 60,
        },
        {
          configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
          agendamentosRepo,
          bloqueiosRepo,
          horariosFixosRepo,
          dataReferencia: dataReferenciaTeste,
        },
      );

      expect(res.disponivel).toBe(true);
      expect(res.conflito).toBe(false);
    });
  });
});
