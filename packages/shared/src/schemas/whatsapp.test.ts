import { describe, it, expect } from 'vitest';
import {
  formatarTelefoneWhatsapp,
  gerarLinkWhatsapp,
  montarTextoMensagemAssistida,
  montarMensagemAssistidaWhatsappCompleta,
  gerarMensagemAssistidaWhatsappInputSchema,
} from './whatsapp.js';

describe('schemas/whatsapp', () => {
  describe('formatarTelefoneWhatsapp', () => {
    it('adiciona DDI 55 para números com DDD e 9 dígitos', () => {
      expect(formatarTelefoneWhatsapp('(11) 98765-4321')).toBe('5511987654321');
    });

    it('adiciona DDI 55 para números fixos com 10 dígitos', () => {
      expect(formatarTelefoneWhatsapp('(11) 3333-4444')).toBe('551133334444');
    });

    it('mantém número que já possui DDI 55', () => {
      expect(formatarTelefoneWhatsapp('5511987654321')).toBe('5511987654321');
      expect(formatarTelefoneWhatsapp('+55 (11) 98765-4321')).toBe('5511987654321');
    });

    it('retorna string vazia quando inválido', () => {
      expect(formatarTelefoneWhatsapp('')).toBe('');
      expect(formatarTelefoneWhatsapp('abc')).toBe('');
    });
  });

  describe('gerarLinkWhatsapp', () => {
    it('monta link seguro wa.me com telefone e mensagem codificada em URI', () => {
      const link = gerarLinkWhatsapp('(11) 98765-4321', 'Olá Mundo!');
      expect(link).toBe('https://wa.me/5511987654321?text=Ol%C3%A1%20Mundo!');
    });

    it('retorna vazio se telefone for inválido', () => {
      expect(gerarLinkWhatsapp('', 'Mensagem')).toBe('');
    });
  });

  describe('montarTextoMensagemAssistida', () => {
    it('monta mensagem de lembrete com antecedência de 3 horas e roupas confortáveis', () => {
      const { texto, dataHoraFormatada } = montarTextoMensagemAssistida({
        clienteNome: 'Mariana Silva',
        servicoNome: 'Massagem Relaxante',
        dataHoraInicio: '2026-11-25T14:30:00.000Z',
        tipo: 'lembrete',
      });

      expect(texto).toContain('Olá, Mariana Silva!');
      expect(texto).toContain('Massagem Relaxante');
      expect(texto).toContain(dataHoraFormatada);
      expect(texto).toContain('3 horas de antecedência');
      expect(texto).toContain('roupas confortáveis');
    });

    it('monta mensagem de confirmação incluindo menção ao sinal', () => {
      const { texto } = montarTextoMensagemAssistida({
        clienteNome: 'Carlos Eduardo',
        servicoNome: 'Liberação Miofascial',
        dataHoraInicio: '2026-11-26T10:00:00.000Z',
        tipo: 'confirmacao',
      });

      expect(texto).toContain('Confirmamos com alegria seu agendamento');
      expect(texto).toContain('sinal de reserva foi recebido');
    });

    it('monta mensagem de dúvida do cliente', () => {
      const { texto } = montarTextoMensagemAssistida({
        clienteNome: 'Ana Carolina',
        servicoNome: 'Massagem com Pedras Quentes',
        dataHoraInicio: '2026-11-27T16:00:00.000Z',
        tipo: 'duvida',
      });

      expect(texto).toContain('Gostaria de tirar uma dúvida sobre o meu agendamento');
      expect(texto).toContain('Massagem com Pedras Quentes');
    });
  });

  describe('montarMensagemAssistidaWhatsappCompleta', () => {
    it('valida input e retorna objeto com texto, link e telefone formatado', () => {
      const resultado = montarMensagemAssistidaWhatsappCompleta({
        clienteNome: 'Mariana Silva',
        clienteTelefone: '(11) 98765-4321',
        servicoNome: 'Massagem Relaxante',
        dataHoraInicio: '2026-11-25T09:00:00.000Z',
        tipo: 'lembrete',
      });

      expect(resultado.clienteNome).toBe('Mariana Silva');
      expect(resultado.telefoneFormatado).toBe('5511987654321');
      expect(resultado.link).toContain('https://wa.me/5511987654321?text=');
      expect(resultado.texto).toContain('Mariana Silva');
      expect(resultado.dataHoraFormatada).toBeDefined();
    });

    it('falha na validação se campos obrigatórios forem omitidos', () => {
      expect(() =>
        montarMensagemAssistidaWhatsappCompleta({
          clienteNome: '',
          clienteTelefone: '123',
          servicoNome: '',
          dataHoraInicio: '',
        }),
      ).toThrow();
    });
  });

  describe('gerarMensagemAssistidaWhatsappInputSchema', () => {
    it('atribui "lembrete" como tipo padrão', () => {
      const parsed = gerarMensagemAssistidaWhatsappInputSchema.parse({
        clienteNome: 'Mariana',
        clienteTelefone: '11999998888',
        servicoNome: 'Reiki',
        dataHoraInicio: '2026-11-25T10:00:00.000Z',
      });
      expect(parsed.tipo).toBe('lembrete');
    });
  });
});
