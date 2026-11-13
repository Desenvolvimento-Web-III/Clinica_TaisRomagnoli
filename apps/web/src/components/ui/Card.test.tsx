import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

describe('Card Component e Subcomponentes', () => {
  it('renderiza estrutura completa de cartão com header, título, conteúdo e rodapé', () => {
    render(
      <Card data-testid="main-card">
        <CardHeader action={<button>Ação</button>}>
          <CardTitle>Massagem Relaxante</CardTitle>
          <CardDescription>Alívio de tensões e estresse corporal</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Duração: 60 minutos</p>
        </CardContent>
        <CardFooter>
          <span>R$ 150,00</span>
          <button>Agendar</button>
        </CardFooter>
      </Card>,
    );

    expect(screen.getByTestId('main-card')).toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante')).toBeInTheDocument();
    expect(screen.getByText('Alívio de tensões e estresse corporal')).toBeInTheDocument();
    expect(screen.getByText('Duração: 60 minutos')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
  });

  it('aplica classes de variantes default, elevated, outline e flat', () => {
    const { rerender } = render(<Card data-testid="card" variant="default" />);
    expect(screen.getByTestId('card')).toHaveClass('shadow-[var(--shadow-card)]');

    rerender(<Card data-testid="card" variant="elevated" />);
    expect(screen.getByTestId('card')).toHaveClass('shadow-[var(--shadow-elevated)]');

    rerender(<Card data-testid="card" variant="outline" />);
    expect(screen.getByTestId('card')).toHaveClass('bg-transparent');

    rerender(<Card data-testid="card" variant="flat" />);
    expect(screen.getByTestId('card')).toHaveClass('bg-[var(--color-canvas-neutral)]');
  });

  it('suporta modo interativo com cursor pointer e hover', () => {
    render(<Card data-testid="interactive-card" interactive />);
    expect(screen.getByTestId('interactive-card')).toHaveClass('cursor-pointer');
  });
});
