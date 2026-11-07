import { describe, expect, it } from 'vitest';
import {
  horaParaMinutos,
  minutosParaHora,
  validarEncaixeHorariosFuncionamento,
  gerarHorariosDisponiveis,
  consultarHorariosDisponiveisInputSchema,
} from './disponibilidade-horarios.js';
import { CONFIGURACAO_HORARIOS_PADRAO } from './horarios-funcionamento.js';
import type { BloqueioAgenda, HorarioFixoCliente } from './bloqueios-e-horarios-fixos.js';

describe('disponibilidade-horarios', () => {
  describe('horaParaMinutos e minutosParaHora', () => {
    it('converte corretamente horários para minutos e vice-versa', () => {
      expect(horaParaMinutos('08:00')).toBe(480);
      expect(horaParaMinutos('12:30')).toBe(750);
      expect(horaParaMinutos('18:00')).toBe(1080);
      expect(horaParaMinutos('00:00')).toBe(0);

      expect(minutosParaHora(480)).toBe('08:00');
      expect(minutosParaHora(750)).toBe('12:30');
      expect(minutosParaHora(1080)).toBe('18:00');
      expect(minutosParaHora(0)).toBe('00:00');
    });
  });

  describe('validarEncaixeHorariosFuncionamento', () => {
    // 2026-11-15 é Domingo (dia 0 - folga padrão)
    it('rejeita agendamento em dia de folga da clínica', () => {
      const resultado = validarEncaixeHorariosFuncionamento(
        '2026-11-15T09:00:00.000Z',
        60,
        CONFIGURACAO_HORARIOS_PADRAO,
      );
      expect(resultado.valido).toBe(false);
      expect(resultado.codigoErro).toBe('dia_inativo');
      expect(resultado.motivo).toContain('folga cadastrada');
    });

    // 2026-11-16 é Segunda-feira (dia 1 - turnos 08:00-12:00 e 14:00-18:00)
    it('aceita agendamento que cabe perfeitamente dentro de um turno', () => {
      const resultadoManha = validarEncaixeHorariosFuncionamento(
        '2026-11-16T08:00:00.000Z',
        60,
        CONFIGURACAO_HORARIOS_PADRAO,
      );
      expect(resultadoManha.valido).toBe(true);

      const resultadoTarde = validarEncaixeHorariosFuncionamento(
        '2026-11-16T14:00:00.000Z',
        90,
        CONFIGURACAO_HORARIOS_PADRAO,
      );
      expect(resultadoTarde.valido).toBe(true);
    });

    it('rejeita agendamento que começa antes do turno ou ultrapassa o final do turno', () => {
      // Início às 07:30 (turno abre às 08:00)
      const antesAbertura = validarEncaixeHorariosFuncionamento(
        '2026-11-16T07:30:00.000Z',
        60,
        CONFIGURACAO_HORARIOS_PADRAO,
      );
      expect(antesAbertura.valido).toBe(false);
      expect(antesAbertura.codigoErro).toBe('fora_do_turno');

      // Início às 11:30 com 60 min (ultrapassa o término do turno às 12:00, terminaria 12:30)
      const ultrapassaManha = validarEncaixeHorariosFuncionamento(
        '2026-11-16T11:30:00.000Z',
        60,
        CONFIGURACAO_HORARIOS_PADRAO,
      );
      expect(ultrapassaManha.valido).toBe(false);
      expect(ultrapassaManha.codigoErro).toBe('fora_do_turno');

      // Início às 17:30 com 60 min (turno da tarde fecha às 18:00, terminaria 18:30)
      const ultrapassaTarde = validarEncaixeHorariosFuncionamento(
        '2026-11-16T17:30:00.000Z',
        60,
        CONFIGURACAO_HORARIOS_PADRAO,
      );
      expect(ultrapassaTarde.valido).toBe(false);
      expect(ultrapassaTarde.codigoErro).toBe('fora_do_turno');
    });

    it('rejeita agendamento que colide com intervalo de manutenção ou almoço', () => {
      // Almoço e higienização é de 12:00 às 14:00
      const noAlmoco = validarEncaixeHorariosFuncionamento(
        '2026-11-16T12:30:00.000Z',
        60,
        CONFIGURACAO_HORARIOS_PADRAO,
      );
      expect(noAlmoco.valido).toBe(false);
      expect(noAlmoco.codigoErro).toBe('fora_do_turno');
    });
  });

  describe('gerarHorariosDisponiveis', () => {
    it('retorna lista vazia para dia inativo', () => {
      // 2026-11-17 é Terça-feira (folga padrão)
      const slots = gerarHorariosDisponiveis({
        data: '2026-11-17',
        duracaoMinutos: 60,
        configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
      });
      expect(slots).toEqual([]);
    });

    it('retorna grade de horários respeitando turnos e duração de 60 min', () => {
      // 2026-11-16 (Segunda-feira)
      const slots = gerarHorariosDisponiveis({
        data: '2026-11-16',
        duracaoMinutos: 60,
        configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
      });

      const horariosInicio = slots.map((s) => s.horaInicio);

      // Turno manhã: 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00 (termina 12:00)
      expect(horariosInicio).toContain('08:00');
      expect(horariosInicio).toContain('11:00');
      // 11:30 não pode estar presente porque com 60 min terminaria 12:30 (após 12:00)
      expect(horariosInicio).not.toContain('11:30');

      // Turno tarde: 14:00 a 17:00 (termina 18:00)
      expect(horariosInicio).toContain('14:00');
      expect(horariosInicio).toContain('17:00');
      expect(horariosInicio).not.toContain('17:30');

      // Verifica cálculo da hora de término e intervalo
      const slot8 = slots.find((s) => s.horaInicio === '08:00');
      expect(slot8?.horaFim).toBe('09:00');
      expect(slot8?.horaFimComIntervalo).toBe('09:30');
    });

    it('garante os 30 minutos de organização entre sessões quando há agendamento existente', () => {
      // Agendamento das 09:00 às 10:00 (com 30 min de organização após, ocupado até 10:30)
      const agendamentosExistentes = [
        {
          dataHoraInicio: '2026-11-16T09:00:00.000Z',
          dataHoraFim: '2026-11-16T10:00:00.000Z',
          intervaloAposMinutos: 30,
          status: 'confirmado',
        },
      ];

      const slots = gerarHorariosDisponiveis({
        data: '2026-11-16',
        duracaoMinutos: 60,
        intervaloMinutos: 30,
        configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
        agendamentosExistentes,
      });

      const horariosInicio = slots.map((s) => s.horaInicio);

      // Slot das 08:00 terminaria 09:00 + 30 min intervalo = 09:30, invadindo o início das 09:00!
      // Portanto 08:00 não pode ser gerado porque faltam os 30 min antes das 09:00
      expect(horariosInicio).not.toContain('08:00');
      expect(horariosInicio).not.toContain('08:30');
      expect(horariosInicio).not.toContain('09:00');
      expect(horariosInicio).not.toContain('09:30');
      expect(horariosInicio).not.toContain('10:00'); // sessão anterior terminou às 10:00, mas limpeza vai até 10:30!

      // Às 10:30 a organização terminou -> Disponível!
      expect(horariosInicio).toContain('10:30');
      expect(horariosInicio).toContain('11:00');
    });

    it('ignora agendamentos cancelados ao calcular horários disponíveis', () => {
      const agendamentosExistentes = [
        {
          dataHoraInicio: '2026-11-16T09:00:00.000Z',
          dataHoraFim: '2026-11-16T10:00:00.000Z',
          intervaloAposMinutos: 30,
          status: 'cancelado',
        },
      ];

      const slots = gerarHorariosDisponiveis({
        data: '2026-11-16',
        duracaoMinutos: 60,
        configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
        agendamentosExistentes,
      });

      const horariosInicio = slots.map((s) => s.horaInicio);
      expect(horariosInicio).toContain('09:00');
      expect(horariosInicio).toContain('10:00');
    });

    it('bloqueia horários sobrepostos a bloqueios de agenda da clínica', () => {
      const bloqueios: BloqueioAgenda[] = [
        {
          id: 'bloq-tarde',
          tipo: 'unico',
          data: '2026-11-16',
          horaInicio: '14:00',
          horaFim: '16:00',
          diaInteiro: false,
          motivo: 'Reunião de equipe',
          ativo: true,
          criadoPor: 'admin-1',
          criadoEm: '2026-11-01T00:00:00.000Z',
        },
      ];

      const slots = gerarHorariosDisponiveis({
        data: '2026-11-16',
        duracaoMinutos: 60,
        configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
        bloqueios,
      });

      const horariosInicio = slots.map((s) => s.horaInicio);
      expect(horariosInicio).not.toContain('14:00');
      expect(horariosInicio).not.toContain('14:30');
      expect(horariosInicio).not.toContain('15:00');
      // Às 16:00 o bloqueio terminou -> Disponível
      expect(horariosInicio).toContain('16:00');
      expect(horariosInicio).toContain('16:30');
    });

    it('permite horário fixo para o cliente titular mas bloqueia para terceiros', () => {
      const horariosFixos: HorarioFixoCliente[] = [
        {
          id: 'fixo-mariana',
          clienteId: 'cliente-mariana-1',
          clienteNome: 'Mariana',
          diaSemana: 1, // Segunda-feira
          horaInicio: '10:00',
          horaFim: '11:00',
          dataInicio: '2026-11-01',
          frequencia: 'semanal',
          ativo: true,
          criadoPor: 'admin-1',
          criadoEm: '2026-11-01T00:00:00.000Z',
        },
      ];

      // Consulta como terceiro (outro cliente)
      const slotsTerceiro = gerarHorariosDisponiveis({
        data: '2026-11-16',
        duracaoMinutos: 60,
        configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
        horariosFixos,
        clienteIdSolicitante: 'outro-cliente-2',
      });
      const horariosTerceiro = slotsTerceiro.map((s) => s.horaInicio);
      expect(horariosTerceiro).not.toContain('10:00');

      // Consulta como a própria Mariana (titular)
      const slotsMariana = gerarHorariosDisponiveis({
        data: '2026-11-16',
        duracaoMinutos: 60,
        configuracaoHorarios: CONFIGURACAO_HORARIOS_PADRAO,
        horariosFixos,
        clienteIdSolicitante: 'cliente-mariana-1',
      });
      const horariosMariana = slotsMariana.map((s) => s.horaInicio);
      expect(horariosMariana).toContain('10:00');
    });
  });

  describe('consultarHorariosDisponiveisInputSchema', () => {
    it('valida payload com data e duracaoMinutos', () => {
      const input = { data: '2026-11-20', duracaoMinutos: 60 };
      const parsed = consultarHorariosDisponiveisInputSchema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.passoMinutos).toBe(30);
        expect(parsed.data.profissionalId).toBe('prof-tais-romagnoli');
      }
    });

    it('valida payload com data e servicoId', () => {
      const input = { data: '2026-11-20', servicoId: 'serv-relaxante' };
      const parsed = consultarHorariosDisponiveisInputSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });

    it('rejeita payload sem duracaoMinutos e sem servicoId', () => {
      const input = { data: '2026-11-20' };
      const parsed = consultarHorariosDisponiveisInputSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });

    it('rejeita formato de data inválido', () => {
      const input = { data: '20-11-2026', duracaoMinutos: 60 };
      const parsed = consultarHorariosDisponiveisInputSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });
  });
});
