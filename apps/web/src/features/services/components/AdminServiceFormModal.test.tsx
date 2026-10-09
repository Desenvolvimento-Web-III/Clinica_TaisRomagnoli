import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminServiceFormModal } from './AdminServiceFormModal';
import type { Service } from '../types';

describe('AdminServiceFormModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockService: Service = {
    id: 'massagem-relaxante',
    name: 'Massagem Relaxante Clássica',
    description: 'Sessão suave para alívio do estresse diário com toques delicados.',
    durationMinutes: 60,
    priceInCents: 15000,
    sinalPercentual: 30,
    sinalInCents: 4500,
    active: true,
    imageSrc: '/assets/services/massagem-relaxante.jpg',
    imageAlt: 'Massagem Relaxante',
    category: 'Corporal',
  };

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <AdminServiceFormModal isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza formulário no modo cadastro com campos limpos e atalhos de duração', () => {
    render(<AdminServiceFormModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cadastrar Novo Serviço')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do Serviço/i)).toHaveValue('');
    expect(screen.getByLabelText(/Duração \(em minutos\)/i)).toHaveValue(60);
    expect(screen.getByLabelText(/Preço Total \(R\$\)/i)).toHaveValue(null);
    expect(screen.getByLabelText(/Sinal para Reserva \(R\$\)/i)).toHaveValue(null);
    expect(screen.getByLabelText(/Descrição do Procedimento/i)).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: /Serviço ativo/i })).toBeChecked();
    expect(screen.getByRole('button', { name: /Cadastrar Serviço/i })).toBeInTheDocument();
  });

  it('calcula automaticamente o sinal de 30% quando o preço é informado', () => {
    render(<AdminServiceFormModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    const inputPreco = screen.getByLabelText(/Preço Total \(R\$\)/i);
    fireEvent.change(inputPreco, { target: { value: '200' } });

    const inputSinal = screen.getByLabelText(/Sinal para Reserva \(R\$\)/i);
    expect(inputSinal).toHaveValue(60); // 30% de 200 = 60
    expect(screen.getByText(/Equivale a 30% do valor total/i)).toBeInTheDocument();
  });

  it('permite personalizar o sinal e depois restaurar para o padrão de 30%', () => {
    render(<AdminServiceFormModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    const inputPreco = screen.getByLabelText(/Preço Total \(R\$\)/i);
    fireEvent.change(inputPreco, { target: { value: '200' } });

    const inputSinal = screen.getByLabelText(/Sinal para Reserva \(R\$\)/i);
    fireEvent.change(inputSinal, { target: { value: '80' } }); // 40%

    expect(inputSinal).toHaveValue(80);
    expect(screen.getByText('Personalizado')).toBeInTheDocument();
    expect(screen.getByText(/Equivale a 40% do valor total/i)).toBeInTheDocument();

    // Botão restaurar padrão
    const btnRestaurar = screen.getByRole('button', { name: /Usar padrão \(30%\)/i });
    fireEvent.click(btnRestaurar);

    expect(inputSinal).toHaveValue(60);
    expect(screen.queryByText('Personalizado')).not.toBeInTheDocument();
  });

  it('permite selecionar atalhos rápidos de duração (ex: 90 min)', () => {
    render(<AdminServiceFormModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    const inputDuracao = screen.getByLabelText(/Duração \(em minutos\)/i);
    expect(inputDuracao).toHaveValue(60);

    const btnAtalho90 = screen.getByRole('button', { name: '90 min' });
    fireEvent.click(btnAtalho90);

    expect(inputDuracao).toHaveValue(90);
  });

  it('renderiza no modo edição pré-preenchido com os dados do serviço', () => {
    render(
      <AdminServiceFormModal
        isOpen={true}
        serviceToEdit={mockService}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />,
    );

    expect(screen.getByText('Editar Serviço')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do Serviço/i)).toHaveValue('Massagem Relaxante Clássica');
    expect(screen.getByLabelText(/Duração \(em minutos\)/i)).toHaveValue(60);
    expect(screen.getByLabelText(/Preço Total \(R\$\)/i)).toHaveValue(150);
    expect(screen.getByLabelText(/Sinal para Reserva \(R\$\)/i)).toHaveValue(45);
    expect(screen.getByLabelText(/Descrição do Procedimento/i)).toHaveValue(
      'Sessão suave para alívio do estresse diário com toques delicados.',
    );
    expect(screen.getByRole('button', { name: /Salvar Alterações/i })).toBeInTheDocument();
  });

  it('valida campos obrigatórios e exibe mensagens de erro com acessibilidade', async () => {
    render(<AdminServiceFormModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Submete formulário vazio
    const btnSubmit = screen.getByRole('button', { name: /Cadastrar Serviço/i });
    fireEvent.click(btnSubmit);

    await waitFor(() => {
      expect(
        screen.getByText(/O nome do serviço deve ter no mínimo 3 caracteres/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/O preço deve ser maior que zero/i)).toBeInTheDocument();
      expect(screen.getByText(/A descrição deve ter no mínimo 5 caracteres/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('valida que o sinal não pode ser superior ao preço total', async () => {
    render(<AdminServiceFormModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.change(screen.getByLabelText(/Nome do Serviço/i), {
      target: { value: 'Massagem Teste' },
    });
    fireEvent.change(screen.getByLabelText(/Preço Total \(R\$\)/i), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(/Sinal para Reserva \(R\$\)/i), {
      target: { value: '150' }, // Maior que preço
    });
    fireEvent.change(screen.getByLabelText(/Descrição do Procedimento/i), {
      target: { value: 'Descrição válida de massagem.' },
    });

    const btnSubmit = screen.getByRole('button', { name: /Cadastrar Serviço/i });
    fireEvent.click(btnSubmit);

    await waitFor(() => {
      expect(
        screen.getByText(/O valor do sinal não pode ser superior ao preço total/i),
      ).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('submete dados com sucesso e invoca callbacks de salvar e fechar', async () => {
    mockOnSave.mockResolvedValueOnce(undefined);

    render(<AdminServiceFormModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.change(screen.getByLabelText(/Nome do Serviço/i), {
      target: { value: 'Drenagem Linfática Pós-Operatória' },
    });
    fireEvent.change(screen.getByLabelText(/Duração \(em minutos\)/i), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText(/Preço Total \(R\$\)/i), {
      target: { value: '180' },
    });
    fireEvent.change(screen.getByLabelText(/Descrição do Procedimento/i), {
      target: { value: 'Procedimento pós-cirúrgico para diminuição de edemas e hematomas.' },
    });

    const btnSubmit = screen.getByRole('button', { name: /Cadastrar Serviço/i });
    fireEvent.click(btnSubmit);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        id: undefined,
        nome: 'Drenagem Linfática Pós-Operatória',
        duracaoMinutos: 50,
        preco: 180,
        sinal: 54, // 30% de 180
        sinalPercentual: 30,
        descricao: 'Procedimento pós-cirúrgico para diminuição de edemas e hematomas.',
        ativo: true,
        categoria: 'Corporal',
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('fecha o modal ao pressionar a tecla Escape ou clicar no botão fechar', () => {
    render(<AdminServiceFormModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();

    const btnFechar = screen.getByRole('button', { name: /Fechar formulário/i });
    fireEvent.click(btnFechar);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});
