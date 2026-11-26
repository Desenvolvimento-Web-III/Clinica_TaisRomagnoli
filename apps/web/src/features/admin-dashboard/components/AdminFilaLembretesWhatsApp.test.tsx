import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminFilaLembretesWhatsApp } from './AdminFilaLembretesWhatsApp';
import type { LembreteFilaItem } from '../utils/whatsapp-reminders';

const { gerarFilaMock, salvarEstadoMock } = vi.hoisted(() => ({
  gerarFilaMock: vi.fn(),
  salvarEstadoMock: vi.fn(),
}));

vi.mock('@/services/lembretes-admin-service', () => ({
  gerarFilaLembretesAdmin: gerarFilaMock,
  salvarEstadoLembreteAdmin: salvarEstadoMock,
}));

const MOCK_FILA: LembreteFilaItem[] = [
  {
    id: 'ag-1',
    clienteId: 'cli-1',
    horario: '09:00 - 10:00',
    clienteNome: 'Mariana Silva',
    clienteTelefone: '(11) 98765-4321',
    servicoNome: 'Massagem Relaxante',
    duracao: '60 min',
    statusAgendamento: 'confirmado',
    dataFormatada: '25/11/2026',
    dataHoraInicio: '2026-11-25T12:00:00.000Z',
    statusLembrete: 'pendente',
    mensagemPersonalizada: 'Olá, Mariana Silva! Massagem Relaxante',
  },
  {
    id: 'ag-2',
    clienteId: 'cli-2',
    horario: '10:30 - 12:00',
    clienteNome: 'Carlos Eduardo',
    clienteTelefone: '(11) 95432-1098',
    servicoNome: 'Liberação Miofascial',
    duracao: '90 min',
    statusAgendamento: 'pendente',
    dataFormatada: '25/11/2026',
    dataHoraInicio: '2026-11-25T13:30:00.000Z',
    statusLembrete: 'pendente',
    mensagemPersonalizada: 'Olá, Carlos Eduardo! Liberação Miofascial',
  },
];

describe('AdminFilaLembretesWhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gerarFilaMock.mockResolvedValue(MOCK_FILA);
    salvarEstadoMock.mockResolvedValue(undefined);
  });

  it('carrega e exibe a fila obtida do repositório persistente', async () => {
    render(<AdminFilaLembretesWhatsApp />);
    expect(await screen.findByText('Mariana Silva')).toBeInTheDocument();
    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
    expect(screen.getByTestId('contador-pendentes')).toHaveTextContent('2');
    expect(gerarFilaMock).toHaveBeenCalledOnce();
  });

  it('mostra erros de carregamento retornados pelo serviço', async () => {
    gerarFilaMock.mockRejectedValueOnce(new Error('Acesso negado'));
    render(<AdminFilaLembretesWhatsApp />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso negado');
  });

  it('abre o WhatsApp e persiste o estado do lembrete no Firestore', async () => {
    const spyOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<AdminFilaLembretesWhatsApp />);
    fireEvent.click(await screen.findByTestId('abrir-whatsapp-btn-ag-1'));
    await waitFor(() =>
      expect(salvarEstadoMock).toHaveBeenCalledWith(
        expect.objectContaining({
          agendamentoId: 'ag-1',
          status: 'enviado',
          dataHoraInicio: MOCK_FILA[0]?.dataHoraInicio,
        }),
      ),
    );
    expect(spyOpen).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/5511987654321?text='),
      '_blank',
      'noopener,noreferrer',
    );
    expect(await screen.findByTestId('status-badge-ag-1')).toHaveTextContent('Lembrete Enviado');
    spyOpen.mockRestore();
  });

  it('permite copiar mensagem e atualiza o feedback', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });
    render(<AdminFilaLembretesWhatsApp />);
    fireEvent.click(await screen.findByTestId('copiar-msg-btn-ag-1'));
    await waitFor(() =>
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('Olá, Mariana Silva!')),
    );
  });

  it('altera o status e persiste no repositório', async () => {
    render(<AdminFilaLembretesWhatsApp />);
    const button = await screen.findByTestId('alternar-status-btn-ag-1');
    fireEvent.click(button);
    await waitFor(() =>
      expect(salvarEstadoMock).toHaveBeenCalledWith(
        expect.objectContaining({ agendamentoId: 'ag-1', status: 'enviado' }),
      ),
    );
    expect(await screen.findByTestId('status-badge-ag-1')).toHaveTextContent('Lembrete Enviado');
  });

  it('filtra por status, nome e telefone', async () => {
    render(<AdminFilaLembretesWhatsApp />);
    expect(await screen.findByText('Mariana Silva')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/buscar por cliente/i), {
      target: { value: 'Mariana' },
    });
    expect(screen.queryByText('Carlos Eduardo')).not.toBeInTheDocument();
  });

  it('persiste a edição da mensagem', async () => {
    render(<AdminFilaLembretesWhatsApp />);
    fireEvent.click((await screen.findAllByText(/editar mensagem/i))[0]!);
    fireEvent.change(screen.getByLabelText(/editar mensagem de lembrete/i), {
      target: { value: 'Mensagem personalizada' },
    });
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() =>
      expect(salvarEstadoMock).toHaveBeenCalledWith(
        expect.objectContaining({
          agendamentoId: 'ag-1',
          mensagemPersonalizada: 'Mensagem personalizada',
        }),
      ),
    );
  });

  it('marca todos e redefine estado persistindo as atualizações', async () => {
    render(<AdminFilaLembretesWhatsApp />);
    fireEvent.click(await screen.findByTestId('marcar-todos-enviados-btn'));
    await waitFor(() => expect(salvarEstadoMock).toHaveBeenCalledTimes(2));
    fireEvent.click(await screen.findByTestId('redefinir-fila-btn'));
    await waitFor(() => expect(salvarEstadoMock).toHaveBeenCalledTimes(4));
    expect(salvarEstadoMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'pendente' }),
    );
  });

  it('notifica o pai sobre pendências e permite voltar à agenda', async () => {
    const mockVoltar = vi.fn();
    const mockPendentes = vi.fn();
    render(
      <AdminFilaLembretesWhatsApp onVoltarAgenda={mockVoltar} onPendentesChange={mockPendentes} />,
    );
    fireEvent.click(await screen.findByLabelText(/voltar para a agenda/i));
    expect(mockVoltar).toHaveBeenCalledOnce();
    await waitFor(() => expect(mockPendentes).toHaveBeenLastCalledWith(2));
  });
});
