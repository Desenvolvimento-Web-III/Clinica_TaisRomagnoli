import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AdminFilaLembretesWhatsApp,
  type AdminFilaAgendamentoInput,
} from './AdminFilaLembretesWhatsApp';

const MOCK_AGENDAMENTOS: AdminFilaAgendamentoInput[] = [
  {
    id: 'ag-1',
    clienteId: 'cli-1',
    horario: '09:00 - 10:00',
    clienteNome: 'Mariana Silva',
    clienteTelefone: '(11) 98765-4321',
    servicoNome: 'Massagem Relaxante',
    duracao: '60 min',
    status: 'confirmado',
    dataFormatada: '25/11/2026',
  },
  {
    id: 'ag-2',
    clienteId: 'cli-2',
    horario: '10:30 - 12:00',
    clienteNome: 'Carlos Eduardo',
    clienteTelefone: '(11) 95432-1098',
    servicoNome: 'Liberação Miofascial',
    duracao: '90 min',
    status: 'pendente',
    dataFormatada: '25/11/2026',
  },
  {
    id: 'ag-3',
    clienteId: 'cli-3',
    horario: '14:00 - 15:00',
    clienteNome: 'Ana Carolina Santos',
    clienteTelefone: '(11) 97654-3210',
    servicoNome: 'Massagem com Pedras Quentes',
    duracao: '60 min',
    status: 'cancelado', // deve ser ignorado da fila
    dataFormatada: '25/11/2026',
  },
];

describe('AdminFilaLembretesWhatsApp', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renderiza o cabeçalho, indicadores e a lista de contatos pendentes ignorando cancelados', () => {
    render(<AdminFilaLembretesWhatsApp agendamentos={MOCK_AGENDAMENTOS} />);

    expect(
      screen.getByRole('heading', { name: /fila de lembretes pelo whatsapp/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/envio assistido/i).length).toBeGreaterThan(0);

    // Contadores
    expect(screen.getByTestId('contador-pendentes')).toHaveTextContent('2');
    expect(screen.getByTestId('contador-enviados')).toHaveTextContent('0');

    // Clientes
    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();
    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
    // Ana Carolina está cancelada, não deve aparecer
    expect(screen.queryByText('Ana Carolina Santos')).not.toBeInTheDocument();
  });

  it('exibe a mensagem pronta com dados acolhedores do atendimento', () => {
    render(<AdminFilaLembretesWhatsApp agendamentos={MOCK_AGENDAMENTOS} />);

    expect(
      screen.getByText(
        (content) =>
          content.includes('Olá, Mariana Silva!') && content.includes('Massagem Relaxante'),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText((content) => content.includes('3 horas de antecedência')).length,
    ).toBeGreaterThan(0);
  });

  it('abre o WhatsApp com a URL correta e atualiza status para enviado', () => {
    const spyOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<AdminFilaLembretesWhatsApp agendamentos={MOCK_AGENDAMENTOS} />);

    const botaoWhatsapp = screen.getByTestId('abrir-whatsapp-btn-ag-1');
    fireEvent.click(botaoWhatsapp);

    expect(spyOpen).toHaveBeenCalledTimes(1);
    const urlChamada = spyOpen.mock.calls[0]?.[0] as string;
    expect(urlChamada).toContain('https://wa.me/5511987654321?text=');
    expect(urlChamada).toContain(encodeURIComponent('Mariana Silva'));

    // Status atualizado
    expect(screen.getByTestId('status-badge-ag-1')).toHaveTextContent('Lembrete Enviado');
    expect(screen.getByTestId('contador-enviados')).toHaveTextContent('1');
    expect(screen.getByTestId('whatsapp-aberto-toast')).toBeInTheDocument();

    spyOpen.mockRestore();
  });

  it('permite copiar a mensagem pronta para a área de transferência', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<AdminFilaLembretesWhatsApp agendamentos={MOCK_AGENDAMENTOS} />);

    const botaoCopiar = screen.getByTestId('copiar-msg-btn-ag-1');
    fireEvent.click(botaoCopiar);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('Olá, Mariana Silva!'));
      expect(screen.getByText('Copiado!')).toBeInTheDocument();
    });
  });

  it('permite alternar manualmente entre pendente e enviado', () => {
    render(<AdminFilaLembretesWhatsApp agendamentos={MOCK_AGENDAMENTOS} />);

    expect(screen.getByTestId('status-badge-ag-1')).toHaveTextContent('Pendente');

    // Clica em "Marcar como enviado"
    const botaoAlternar = screen.getByTestId('alternar-status-btn-ag-1');
    fireEvent.click(botaoAlternar);

    expect(screen.getByTestId('status-badge-ag-1')).toHaveTextContent('Lembrete Enviado');
    expect(botaoAlternar).toHaveTextContent('Marcar como pendente');

    // Clica de volta
    fireEvent.click(botaoAlternar);
    expect(screen.getByTestId('status-badge-ag-1')).toHaveTextContent('Pendente');
  });

  it('permite filtrar por status através das abas', () => {
    render(<AdminFilaLembretesWhatsApp agendamentos={MOCK_AGENDAMENTOS} />);

    // Marca ag-1 como enviado
    fireEvent.click(screen.getByTestId('alternar-status-btn-ag-1'));

    // Alterna para aba Pendentes: só deve mostrar ag-2
    fireEvent.click(screen.getByRole('tab', { name: /pendentes/i }));
    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
    expect(screen.queryByText('Mariana Silva')).not.toBeInTheDocument();

    // Alterna para aba Enviados: só deve mostrar ag-1
    fireEvent.click(screen.getByRole('tab', { name: /enviados/i }));
    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Eduardo')).not.toBeInTheDocument();

    // Alterna para aba Todos
    fireEvent.click(screen.getByRole('tab', { name: /todos/i }));
    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();
    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
  });

  it('filtra contatos por nome e telefone no campo de busca', () => {
    render(<AdminFilaLembretesWhatsApp agendamentos={MOCK_AGENDAMENTOS} />);

    const inputBusca = screen.getByPlaceholderText(/buscar por cliente/i);
    fireEvent.change(inputBusca, { target: { value: 'Mariana' } });

    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Eduardo')).not.toBeInTheDocument();

    // Limpa busca e filtra por telefone
    fireEvent.change(inputBusca, { target: { value: '95432' } });
    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
    expect(screen.queryByText('Mariana Silva')).not.toBeInTheDocument();
  });

  it('permite editar a mensagem antes do envio', () => {
    render(<AdminFilaLembretesWhatsApp agendamentos={MOCK_AGENDAMENTOS} />);

    // Inicia edição no primeiro item
    const botoesEditar = screen.getAllByText(/editar mensagem/i);
    fireEvent.click(botoesEditar[0]!);

    const textarea = screen.getByLabelText(/editar mensagem de lembrete/i);
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, {
      target: { value: 'Mensagem customizada: favor trazer toalha extra.' },
    });

    // Salva
    fireEvent.click(screen.getByText('Salvar'));

    expect(
      screen.getByText('Mensagem customizada: favor trazer toalha extra.'),
    ).toBeInTheDocument();
  });

  it('permite marcar todos como enviados e redefinir a fila', () => {
    render(<AdminFilaLembretesWhatsApp agendamentos={MOCK_AGENDAMENTOS} />);

    const btnMarcarTodos = screen.getByTestId('marcar-todos-enviados-btn');
    fireEvent.click(btnMarcarTodos);

    expect(screen.getByTestId('contador-enviados')).toHaveTextContent('2');
    expect(screen.getByTestId('contador-pendentes')).toHaveTextContent('0');

    // Botão redefinir aparece
    const btnRedefinir = screen.getByTestId('redefinir-fila-btn');
    fireEvent.click(btnRedefinir);

    expect(screen.getByTestId('contador-pendentes')).toHaveTextContent('2');
    expect(screen.getByTestId('contador-enviados')).toHaveTextContent('0');
  });

  it('chama onVoltarAgenda quando o botão de voltar é clicado', () => {
    const mockVoltar = vi.fn();
    render(
      <AdminFilaLembretesWhatsApp agendamentos={MOCK_AGENDAMENTOS} onVoltarAgenda={mockVoltar} />,
    );

    const btnVoltar = screen.getByLabelText(/voltar para a agenda/i);
    fireEvent.click(btnVoltar);

    expect(mockVoltar).toHaveBeenCalledTimes(1);
  });
});
