import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input, Textarea, Select, FormField } from './Input';

describe('Input Component', () => {
  it('renderiza campo com label, placeholder e associa id acessível', () => {
    render(<Input label="Nome completo" placeholder="Digite seu nome" />);

    const input = screen.getByLabelText(/nome completo/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Digite seu nome');
  });

  it('exibe mensagem de erro e marca aria-invalid e aria-describedby', () => {
    render(<Input label="E-mail" error="E-mail inválido" id="email-field" />);

    const input = screen.getByLabelText(/e-mail/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-field-error');

    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toHaveTextContent('E-mail inválido');
  });

  it('exibe helperText quando não há erro', () => {
    render(<Input label="Telefone" helperText="Inclua o DDD" id="telefone-field" />);

    expect(screen.getByText('Inclua o DDD')).toBeInTheDocument();
  });

  it('renderiza ícones à esquerda e à direita', () => {
    render(
      <Input
        label="Pesquisar"
        leftIcon={<span data-testid="search-icon">🔍</span>}
        rightIcon={<span data-testid="clear-icon">✕</span>}
      />,
    );

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByTestId('clear-icon')).toBeInTheDocument();
  });

  it('permite digitação e dispara onChange', () => {
    const handleChange = vi.fn();
    render(<Input label="Nome" onChange={handleChange} />);

    const input = screen.getByLabelText(/nome/i);
    fireEvent.change(input, { target: { value: 'Mariana' } });

    expect(handleChange).toHaveBeenCalled();
  });
});

describe('Textarea Component', () => {
  it('renderiza textarea com label, linhas configuráveis e erro', () => {
    render(<Textarea label="Observações" rows={6} error="Campo obrigatório" />);

    const textarea = screen.getByLabelText(/observações/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('rows', '6');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório');
  });
});

describe('Select Component', () => {
  it('renderiza select com opções e dispara seleção', () => {
    const handleChange = vi.fn();
    render(
      <Select label="Serviço" onChange={handleChange}>
        <option value="1">Massagem Relaxante</option>
        <option value="2">Drenagem Linfática</option>
      </Select>,
    );

    const select = screen.getByLabelText(/serviço/i);
    expect(select).toBeInTheDocument();

    fireEvent.change(select, { target: { value: '2' } });
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('FormField Component', () => {
  it('renderiza indicador visual de campo obrigatório (*)', () => {
    render(
      <FormField label="CPF" required id="cpf-field">
        <input id="cpf-field" />
      </FormField>,
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });
});

