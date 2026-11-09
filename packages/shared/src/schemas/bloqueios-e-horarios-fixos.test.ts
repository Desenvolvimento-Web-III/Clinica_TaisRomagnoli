import { describe, it, expect } from 'vitest';
import {
  bloqueioUnicoSchema,
  bloqueioRecorrenteSchema,
  horarioFixoClienteSchema,
  criarBloqueioInputSchema,
  criarHorarioFixoInputSchema,
  verificarConflitoBloqueioOuHorarioFixo,
  type BloqueioAgenda,
  type HorarioFixoCliente,
} from './bloqueios-e-horarios-fixos.js';

describe('Schemas de Bloqueios e Horários Fixos', () => {
  describe('bloqueioUnicoSchema', () => {
    it('valida com sucesso um bloqueio único pontual', () => {
      const input = {
        id: 'bl-1',
        tipo: 'unico',
        data: '2026-11-20',
        horaInicio: '14:00',
        horaFim: '16:00',
        diaInteiro: false,
        motivo: 'Consulta médica externa',
        profissionalId: 'default',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-07T00:00:00.000Z',
      };

      const parsed = bloqueioUnicoSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });

    it('valida bloqueio único de dia inteiro mesmo sem horaInicio/horaFim restritiva', () => {
      const input = {
        id: 'bl-2',
        tipo: 'unico',
        data: '2026-12-25',
        horaInicio: '00:00',
        horaFim: '23:59',
        diaInteiro: true,
        motivo: 'Feriado de Natal',
        profissionalId: 'default',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-07T00:00:00.000Z',
      };

      const parsed = bloqueioUnicoSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });

    it('rejeita bloqueio único com hora de início posterior ou igual ao término', () => {
      const input = {
        id: 'bl-3',
        tipo: 'unico',
        data: '2026-11-20',
        horaInicio: '16:00',
        horaFim: '14:00',
        diaInteiro: false,
        motivo: 'Inválido',
        profissionalId: 'default',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-07T00:00:00.000Z',
      };

      const parsed = bloqueioUnicoSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });
  });

  describe('bloqueioRecorrenteSchema', () => {
    it('valida bloqueio recorrente semanal', () => {
      const input = {
        id: 'rec-1',
        tipo: 'recorrente',
        diaSemana: 4, // Quinta-feira
        horaInicio: '12:00',
        horaFim: '13:30',
        frequencia: 'semanal',
        motivo: 'Reunião semanal de alinhamento clínico',
        profissionalId: 'default',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-07T00:00:00.000Z',
      };

      const parsed = bloqueioRecorrenteSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });

    it('rejeita bloqueio recorrente com dataInicio posterior a dataFim', () => {
      const input = {
        id: 'rec-2',
        tipo: 'recorrente',
        diaSemana: 1,
        horaInicio: '10:00',
        horaFim: '11:00',
        frequencia: 'semanal',
        dataInicio: '2026-12-01',
        dataFim: '2026-11-01',
        motivo: 'Período inválido',
        profissionalId: 'default',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-07T00:00:00.000Z',
      };

      const parsed = bloqueioRecorrenteSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });
  });

  describe('horarioFixoClienteSchema', () => {
    it('valida reserva de cliente fixo semanal com dados completos', () => {
      const input = {
        id: 'fixo-1',
        clienteId: 'cli-123',
        clienteNome: 'Mariana Silva',
        clienteTelefone: '11999998888',
        clienteEmail: 'mariana@example.com',
        servicoId: 'massagem-relaxante',
        servicoNome: 'Massagem Relaxante',
        diaSemana: 3, // Quarta-feira
        horaInicio: '09:00',
        horaFim: '10:00',
        frequencia: 'semanal',
        dataInicio: '2026-11-01',
        observacoes: 'Cliente fixa semanal desde 2024',
        ativo: true,
        criadoPor: 'admin-1',
        criadoEm: '2026-11-07T00:00:00.000Z',
      };

      const parsed = horarioFixoClienteSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });

    it('rejeita cliente fixo com hora inicial inválida', () => {
      const input = {
        id: 'fixo-2',
        clienteId: 'cli-123',
        clienteNome: 'Mariana Silva',
        diaSemana: 3,
        horaInicio: '10:00',
        horaFim: '09:00',
        dataInicio: '2026-11-01',
        criadoPor: 'admin-1',
        criadoEm: '2026-11-07T00:00:00.000Z',
      };

      const parsed = horarioFixoClienteSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });
  });

  describe('criarBloqueioInputSchema e criarHorarioFixoInputSchema', () => {
    it('valida entrada polimórfica para criação de bloqueio único', () => {
      const input = {
        tipo: 'unico',
        data: '2026-11-20',
        horaInicio: '08:00',
        horaFim: '12:00',
        motivo: 'Manutenção elétrica da clínica',
      };

      const parsed = criarBloqueioInputSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });

    it('valida entrada para criação de reserva de cliente fixo', () => {
      const input = {
        clienteId: 'cli-456',
        clienteNome: 'Carlos Oliveira',
        diaSemana: 5, // Sexta-feira
        horaInicio: '15:00',
        horaFim: '16:00',
        frequencia: 'semanal',
        dataInicio: '2026-11-01',
      };

      const parsed = criarHorarioFixoInputSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });
  });

  describe('verificarConflitoBloqueioOuHorarioFixo', () => {
    const bloqueioUnicoExemplo: BloqueioAgenda = {
      id: 'b-unico-1',
      tipo: 'unico',
      data: '2026-11-20',
      horaInicio: '14:00',
      horaFim: '16:00',
      diaInteiro: false,
      motivo: 'Treinamento presencial',
      profissionalId: 'default',
      ativo: true,
      criadoPor: 'admin-1',
      criadoEm: '2026-11-07T00:00:00.000Z',
    };

    const bloqueioRecorrenteExemplo: BloqueioAgenda = {
      id: 'b-rec-1',
      tipo: 'recorrente',
      diaSemana: 4, // Quinta-feira
      horaInicio: '12:00',
      horaFim: '13:30',
      frequencia: 'semanal',
      motivo: 'Almoço e desinfecção geral',
      profissionalId: 'default',
      ativo: true,
      criadoPor: 'admin-1',
      criadoEm: '2026-11-07T00:00:00.000Z',
    };

    const horarioFixoExemplo: HorarioFixoCliente = {
      id: 'fixo-1',
      clienteId: 'cliente-titular-1',
      clienteNome: 'Fernanda Lima',
      diaSemana: 3, // Quarta-feira (ex: 2026-11-18)
      horaInicio: '09:00',
      horaFim: '10:00',
      frequencia: 'semanal',
      dataInicio: '2026-11-01',
      profissionalId: 'default',
      ativo: true,
      criadoPor: 'admin-1',
      criadoEm: '2026-11-07T00:00:00.000Z',
    };

    it('detecta conflito quando horário pretendido coincide com bloqueio único ativo', () => {
      // 2026-11-20 das 14:30 às 15:30 (dentro de 14:00 às 16:00)
      const resultado = verificarConflitoBloqueioOuHorarioFixo({
        dataHoraInicioIso: '2026-11-20T14:30:00.000Z',
        dataHoraFimIso: '2026-11-20T15:30:00.000Z',
        bloqueios: [bloqueioUnicoExemplo],
        horariosFixos: [],
      });

      expect(resultado.conflito).toBe(true);
      expect(resultado.tipoConflito).toBe('bloqueio_unico');
      expect(resultado.motivo).toContain('Treinamento presencial');
    });

    it('não detecta conflito se o bloqueio único estiver em data diferente', () => {
      // 2026-11-21 no mesmo horário
      const resultado = verificarConflitoBloqueioOuHorarioFixo({
        dataHoraInicioIso: '2026-11-21T14:30:00.000Z',
        dataHoraFimIso: '2026-11-21T15:30:00.000Z',
        bloqueios: [bloqueioUnicoExemplo],
        horariosFixos: [],
      });

      expect(resultado.conflito).toBe(false);
    });

    it('não detecta conflito se o bloqueio estiver inativo', () => {
      const bloqueioInativo = { ...bloqueioUnicoExemplo, ativo: false };
      const resultado = verificarConflitoBloqueioOuHorarioFixo({
        dataHoraInicioIso: '2026-11-20T14:30:00.000Z',
        dataHoraFimIso: '2026-11-20T15:30:00.000Z',
        bloqueios: [bloqueioInativo],
        horariosFixos: [],
      });

      expect(resultado.conflito).toBe(false);
    });

    it('detecta conflito com bloqueio recorrente na quinta-feira (dia 4)', () => {
      // 2026-11-19 é quinta-feira (dia da semana = 4)
      const resultado = verificarConflitoBloqueioOuHorarioFixo({
        dataHoraInicioIso: '2026-11-19T12:15:00.000Z',
        dataHoraFimIso: '2026-11-19T13:15:00.000Z',
        bloqueios: [bloqueioRecorrenteExemplo],
        horariosFixos: [],
      });

      expect(resultado.conflito).toBe(true);
      expect(resultado.tipoConflito).toBe('bloqueio_recorrente');
    });

    it('detecta conflito de horário fixo quando OUTRO cliente tenta agendar', () => {
      // 2026-11-18 é quarta-feira (dia 3), das 09:00 às 10:00
      const resultado = verificarConflitoBloqueioOuHorarioFixo({
        dataHoraInicioIso: '2026-11-18T09:00:00.000Z',
        dataHoraFimIso: '2026-11-18T10:00:00.000Z',
        clienteIdSolicitante: 'outro-cliente-999',
        bloqueios: [],
        horariosFixos: [horarioFixoExemplo],
      });

      expect(resultado.conflito).toBe(true);
      expect(resultado.tipoConflito).toBe('horario_fixo_outro_cliente');
      expect(resultado.motivo).toContain('cliente fixo');
    });

    it('PERMITE agendamento se o cliente solicitante for o próprio titular do horário fixo', () => {
      // 2026-11-18 (quarta-feira), solicitante é 'cliente-titular-1'
      const resultado = verificarConflitoBloqueioOuHorarioFixo({
        dataHoraInicioIso: '2026-11-18T09:00:00.000Z',
        dataHoraFimIso: '2026-11-18T10:00:00.000Z',
        clienteIdSolicitante: 'cliente-titular-1',
        bloqueios: [],
        horariosFixos: [horarioFixoExemplo],
      });

      expect(resultado.conflito).toBe(false);
    });

    it('retorna sem conflito quando não há bloqueios ou horários fixos coincidentes', () => {
      // Horário livre em uma segunda-feira (2026-11-16) às 08:00
      const resultado = verificarConflitoBloqueioOuHorarioFixo({
        dataHoraInicioIso: '2026-11-16T08:00:00.000Z',
        dataHoraFimIso: '2026-11-16T09:00:00.000Z',
        bloqueios: [bloqueioUnicoExemplo, bloqueioRecorrenteExemplo],
        horariosFixos: [horarioFixoExemplo],
      });

      expect(resultado.conflito).toBe(false);
    });
  });
});
