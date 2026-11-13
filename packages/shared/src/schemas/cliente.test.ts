import { describe, expect, it } from 'vitest';
import {
  criarPerfilClienteInputSchema,
  perfilClienteSchema,
  recorrenciaClienteSchema,
  PREFERENCIAS_CONTATO_PADRAO,
} from './cliente.js';

describe('Schemas de Perfil de Cliente (@clinica/shared)', () => {
  describe('criarPerfilClienteInputSchema', () => {
    it('valida dados válidos para cadastro de perfil', () => {
      const input = {
        nome: 'Maria Silva',
        email: 'maria@exemplo.com',
        telefone: '(11) 98765-4321',
        preferenciasContato: {
          whatsapp: true,
          email: true,
          lembretesAgendamento: true,
        },
      };

      const parsed = criarPerfilClienteInputSchema.parse(input);
      expect(parsed.nome).toBe('Maria Silva');
      expect(parsed.email).toBe('maria@exemplo.com');
      expect(parsed.telefone).toBe('(11) 98765-4321');
      expect(parsed.preferenciasContato?.whatsapp).toBe(true);
    });

    it('aceita telefone com apenas dígitos numéricos', () => {
      const input = {
        nome: 'Carlos Eduardo',
        email: 'carlos@exemplo.com',
        telefone: '11987654321',
      };

      const parsed = criarPerfilClienteInputSchema.parse(input);
      expect(parsed.telefone).toBe('11987654321');
    });

    it('rejeita nome curto com menos de 2 caracteres', () => {
      const input = {
        nome: 'A',
        email: 'maria@exemplo.com',
        telefone: '(11) 98765-4321',
      };

      expect(() => criarPerfilClienteInputSchema.parse(input)).toThrow(
        /Nome deve ter no mínimo 2 caracteres/,
      );
    });

    it('rejeita e-mail inválido', () => {
      const input = {
        nome: 'Maria Silva',
        email: 'email-invalido',
        telefone: '(11) 98765-4321',
      };

      expect(() => criarPerfilClienteInputSchema.parse(input)).toThrow(/E-mail inválido/);
    });

    it('rejeita telefone com dígitos insuficientes', () => {
      const input = {
        nome: 'Maria Silva',
        email: 'maria@exemplo.com',
        telefone: '12345',
      };

      expect(() => criarPerfilClienteInputSchema.parse(input)).toThrow(
        /Telefone deve conter no mínimo 10 dígitos/,
      );
    });

    it('permite omitir preferências de contato assumindo valores padrão quando aplicável', () => {
      const input = {
        nome: 'Maria Silva',
        email: 'maria@exemplo.com',
        telefone: '(11) 98765-4321',
      };

      const parsed = criarPerfilClienteInputSchema.parse(input);
      expect(parsed.preferenciasContato).toBeUndefined();
      expect(PREFERENCIAS_CONTATO_PADRAO.whatsapp).toBe(true);
      expect(PREFERENCIAS_CONTATO_PADRAO.email).toBe(true);
      expect(PREFERENCIAS_CONTATO_PADRAO.lembretesAgendamento).toBe(true);
    });
  });

  describe('perfilClienteSchema', () => {
    it('valida documento completo de perfil persistido', () => {
      const doc = {
        uid: 'user-123',
        nome: 'Tais Romagnoli',
        email: 'tais@clinica.com',
        telefone: '(11) 99999-8888',
        role: 'cliente' as const,
        status: 'ativo' as const,
        createdAt: new Date().toISOString(),
        preferenciasContato: {
          whatsapp: true,
          email: true,
          lembretesAgendamento: true,
        },
      };

      const validado = perfilClienteSchema.parse(doc);
      expect(validado.uid).toBe('user-123');
      expect(validado.role).toBe('cliente');
      expect(validado.status).toBe('ativo');
    });

    it('rejeita status não suportado', () => {
      const doc = {
        uid: 'user-123',
        nome: 'Tais Romagnoli',
        email: 'tais@clinica.com',
        telefone: '(11) 99999-8888',
        role: 'cliente',
        status: 'banido',
        createdAt: new Date().toISOString(),
      };

      expect(() => perfilClienteSchema.parse(doc)).toThrow();
    });

    it('valida documento com campos opcionais de recorrência mensal', () => {
      const doc = {
        uid: 'user-123',
        nome: 'Tais Romagnoli',
        email: 'tais@clinica.com',
        telefone: '(11) 99999-8888',
        role: 'cliente' as const,
        status: 'ativo' as const,
        createdAt: new Date().toISOString(),
        recorrente: true,
        totalAtendimentosMes: 3,
        mesReferenciaRecorrencia: '2026-11',
        totalAtendimentosConcluidos: 12,
        ultimoAtendimento: new Date().toISOString(),
      };

      const validado = perfilClienteSchema.parse(doc);
      expect(validado.recorrente).toBe(true);
      expect(validado.totalAtendimentosMes).toBe(3);
      expect(validado.mesReferenciaRecorrencia).toBe('2026-11');
      expect(validado.totalAtendimentosConcluidos).toBe(12);
    });
  });

  describe('recorrenciaClienteSchema', () => {
    it('valida payload de recorrência mensal', () => {
      const payload = {
        clienteId: 'cliente-abc',
        recorrente: true,
        totalAtendimentosMes: 2,
        totalAtendimentosConcluidos: 4,
        mesReferencia: '2026-11',
        criterioMinimo: 2,
        ultimoAtendimento: new Date().toISOString(),
      };

      const validado = recorrenciaClienteSchema.parse(payload);
      expect(validado.clienteId).toBe('cliente-abc');
      expect(validado.recorrente).toBe(true);
      expect(validado.totalAtendimentosMes).toBe(2);
      expect(validado.criterioMinimo).toBe(2);
    });

    it('rejeita formato de mês inválido', () => {
      const payload = {
        clienteId: 'cliente-abc',
        recorrente: false,
        totalAtendimentosMes: 0,
        totalAtendimentosConcluidos: 0,
        mesReferencia: 'novembro-2026',
        criterioMinimo: 2,
      };

      expect(() => recorrenciaClienteSchema.parse(payload)).toThrow();
    });
  });
});
