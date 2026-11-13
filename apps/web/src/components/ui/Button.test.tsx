import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button, IconButton } from './Button';

describe('Button Component', () => {
  it('renderiza texto do botão e tipo padrão button', () => {
    render(<Button>Confirmar Agendamento</Button>);

    const button = screen.getByRole('button', { name: /confirmar agendamento/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toBeDisabled();
  });

  it('suporta variantes primary, secondary, outline, ghost e danger', () => {
    const { rerender } = render(<Button variant="primary">Ação</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-[var(--color-brand-primary)]');

    rerender(<Button variant="secondary">Ação</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-[var(--color-brand-soft)]');

    rerender(<Button variant="outline">Ação</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');

    rerender(<Button variant="ghost">Ação</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');

    rerender(<Button variant="danger">Ação</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-[var(--color-error-bg)]');
  });

  it('suporta tamanhos sm, md e lg', () => {
    const { rerender } = render(<Button size="sm">Pequeno</Button>);
    expect(screen.getByRole('button')).toHaveClass('min-h-9');

    rerender(<Button size="md">Médio</Button>);
    expect(screen.getByRole('button')).toHaveClass('min-h-11');

    rerender(<Button size="lg">Grande</Button>);
    expect(screen.getByRole('button')).toHaveClass('min-h-12');
  });

  it('exibe estado de carregamento com spinner e bloqueia clique', () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading loadingText="Processando..." onClick={handleClick}>
        Salvar
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Processando...')).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renderiza ícones à esquerda e à direita', () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">←</span>}
        rightIcon={<span data-testid="right-icon">→</span>}
      >
        Continuar
      </Button>,
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('dispara evento onClick quando habilitado', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clicar</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('IconButton Component', () => {
  it('renderiza ícone com aria-label obrigatório para acessibilidade', () => {
    render(
      <IconButton aria-label="Fechar janela">
        <span>✕</span>
      </IconButton>,
    );

    const button = screen.getByRole('button', { name: /fechar janela/i });
    expect(button).toBeInTheDocument();
  });
});
