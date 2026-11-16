import { describe, it, expect } from 'vitest';
import {
  registroAuditoriaSchema,
  criarRegistroAuditoriaInputSchema,
  filtroAuditoriaSchema,
} from './auditoria.js';

describe('Schemas de Auditoria', () => {
  it('valida com sucesso um registro de auditoria completo', () => {
    const registroValido = {
      id: 'audit-123',
      usuarioId: 'admin-001',
      usuarioEmail: 'admin@clinica.com',
      usuarioRole: 'admin',
      acao: 'servico.cadastrado',
      recurso: 'servicos',
      recursoId: 'serv-001',
      dataHora: '2026-11-16T14:00:00.000Z',
      dadosAfetados: {
        nome: 'Massagem Relaxante',
        precoTotalEmCentavos: 15000,
      },
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    };

    const resultado = registroAuditoriaSchema.safeParse(registroValido);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.id).toBe('audit-123');
      expect(resultado.data.usuarioRole).toBe('admin');
      expect(resultado.data.dadosAfetados).toEqual({
        nome: 'Massagem Relaxante',
        precoTotalEmCentavos: 15000,
      });
    }
  });

  it('rejeita registro de auditoria com campos obrigatórios ausentes', () => {
    const semUsuario = {
      id: 'audit-123',
      acao: 'servico.cadastrado',
      recurso: 'servicos',
      recursoId: 'serv-001',
      dataHora: '2026-11-16T14:00:00.000Z',
    };

    const resultado = registroAuditoriaSchema.safeParse(semUsuario);
    expect(resultado.success).toBe(false);
  });

  it('valida input de criação com campos padrão', () => {
    const input = {
      usuarioId: 'client-456',
      acao: 'agendamento.solicitado',
      recurso: 'agendamentos',
      recursoId: 'agend-999',
      dadosAfetados: {
        servicoId: 'serv-1',
        data: '2026-11-20',
      },
    };

    const resultado = criarRegistroAuditoriaInputSchema.safeParse(input);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.usuarioRole).toBe('sistema');
      expect(resultado.data.dadosAfetados).toHaveProperty('servicoId', 'serv-1');
    }
  });

  it('valida filtros de auditoria com limite padrão', () => {
    const filtro = {
      recurso: 'agendamentos',
      dataInicio: '2026-11-01T00:00:00.000Z',
      dataFim: '2026-11-30T23:59:59.000Z',
    };

    const resultado = filtroAuditoriaSchema.safeParse(filtro);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.recurso).toBe('agendamentos');
      expect(resultado.data.limite).toBe(50);
    }
  });
});
