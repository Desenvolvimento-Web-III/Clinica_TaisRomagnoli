import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatarTelefoneWhatsapp,
  gerarMensagemLembreteWhatsapp,
  gerarLinkWhatsapp,
  filtrarLembretes,
  carregarLembretesEnviadosStorage,
  salvarLembretesEnviadosStorage,
  STORAGE_KEY_LEMBRETES_ENVIADOS,
  type LembreteFilaItem,
} from './whatsapp-reminders';

describe('whatsapp-reminders utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('formatarTelefoneWhatsapp', () => {
    it('formata número brasileiro de 11 dígitos adicionando DDI 55', () => {
      expect(formatarTelefoneWhatsapp('(11) 98765-4321')).toBe('5511987654321');
    });

    it('formata número brasileiro de 10 dígitos adicionando DDI 55', () => {
      expect(formatarTelefoneWhatsapp('1133334444')).toBe('551133334444');
    });

    it('preserva número que já começa com 55 e possui tamanho completo', () => {
      expect(formatarTelefoneWhatsapp('+55 (11) 98765-4321')).toBe('5511987654321');
      expect(formatarTelefoneWhatsapp('5511987654321')).toBe('5511987654321');
    });

    it('retorna string vazia quando telefone for inválido ou vazio', () => {
      expect(formatarTelefoneWhatsapp('')).toBe('');
      expect(formatarTelefoneWhatsapp('abc')).toBe('');
    });
  });

  describe('gerarMensagemLembreteWhatsapp', () => {
    it('gera mensagem acolhedora com nome, serviço, data e horário', () => {
      const msg = gerarMensagemLembreteWhatsapp({
        clienteNome: 'Mariana Silva',
        servicoNome: 'Massagem Relaxante',
        horario: '09:00 - 10:00',
        dataFormatada: '25/11/2026',
      });

      expect(msg).toContain('Olá, Mariana Silva!');
      expect(msg).toContain('Massagem Relaxante');
      expect(msg).toContain('no dia 25/11/2026');
      expect(msg).toContain('às 09:00');
      expect(msg).toContain('3 horas de antecedência');
      expect(msg).toContain('Clínica Taís Romagnoli');
    });

    it('gera mensagem com fallback para hoje quando data não for informada', () => {
      const msg = gerarMensagemLembreteWhatsapp({
        clienteNome: 'Carlos Eduardo',
        servicoNome: 'Liberação Miofascial',
        horario: '14:30',
      });

      expect(msg).toContain('agendado hoje às 14:30');
    });
  });

  describe('gerarLinkWhatsapp', () => {
    it('gera link wa.me com número formatado e texto codificado em URI', () => {
      const link = gerarLinkWhatsapp('(11) 98765-4321', 'Olá Mundo!');
      expect(link).toBe('https://wa.me/5511987654321?text=Ol%C3%A1%20Mundo!');
    });

    it('retorna string vazia quando telefone for inválido', () => {
      expect(gerarLinkWhatsapp('', 'Mensagem')).toBe('');
    });
  });

  describe('filtrarLembretes', () => {
    const itens: LembreteFilaItem[] = [
      {
        id: '1',
        clienteNome: 'Mariana Silva',
        clienteTelefone: '(11) 98765-4321',
        servicoNome: 'Massagem Relaxante',
        duracao: '60 min',
        horario: '09:00 - 10:00',
        statusAgendamento: 'confirmado',
        statusLembrete: 'pendente',
      },
      {
        id: '2',
        clienteNome: 'Carlos Eduardo',
        clienteTelefone: '(11) 95432-1098',
        servicoNome: 'Liberação Miofascial',
        duracao: '60 min',
        horario: '10:30 - 11:30',
        statusAgendamento: 'confirmado',
        statusLembrete: 'enviado',
      },
      {
        id: '3',
        clienteNome: 'Ana Carolina Santos',
        clienteTelefone: '(11) 97654-3210',
        servicoNome: 'Massagem com Pedras Quentes',
        duracao: '90 min',
        horario: '14:00 - 15:30',
        statusAgendamento: 'pendente',
        statusLembrete: 'pendente',
      },
    ];

    it('retorna todos os itens quando filtro for "todos"', () => {
      const resultado = filtrarLembretes(itens, 'todos', '');
      expect(resultado).toHaveLength(3);
    });

    it('filtra apenas pendentes', () => {
      const resultado = filtrarLembretes(itens, 'pendentes', '');
      expect(resultado).toHaveLength(2);
      expect(resultado.map((r) => r.id)).toEqual(['1', '3']);
    });

    it('filtra apenas enviados', () => {
      const resultado = filtrarLembretes(itens, 'enviados', '');
      expect(resultado).toHaveLength(1);
      expect(resultado[0]?.id).toBe('2');
    });

    it('filtra por busca de texto insensível a maiúsculas', () => {
      const resultado = filtrarLembretes(itens, 'todos', 'carlos');
      expect(resultado).toHaveLength(1);
      expect(resultado[0]?.clienteNome).toBe('Carlos Eduardo');
    });

    it('filtra por telefone na busca', () => {
      const resultado = filtrarLembretes(itens, 'todos', '97654');
      expect(resultado).toHaveLength(1);
      expect(resultado[0]?.clienteNome).toBe('Ana Carolina Santos');
    });

    it('filtra por serviço na busca', () => {
      const resultado = filtrarLembretes(itens, 'todos', 'Pedras Quentes');
      expect(resultado).toHaveLength(1);
      expect(resultado[0]?.servicoNome).toBe('Massagem com Pedras Quentes');
    });
  });

  describe('armazenamento local de status', () => {
    it('salva e recupera mapa de lembretes enviados no localStorage', () => {
      expect(carregarLembretesEnviadosStorage()).toEqual({});

      salvarLembretesEnviadosStorage({
        'ag-1': '2026-11-25T10:00:00.000Z',
      });

      expect(carregarLembretesEnviadosStorage()).toEqual({
        'ag-1': '2026-11-25T10:00:00.000Z',
      });
      expect(localStorage.getItem(STORAGE_KEY_LEMBRETES_ENVIADOS)).toBeDefined();
    });
  });
});
