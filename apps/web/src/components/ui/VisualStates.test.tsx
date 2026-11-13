import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState, LoadingState, ErrorState, Skeleton } from './VisualStates';

describe('EmptyState Component', () => {
  it('renderiza título, descrição e botão de ação', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="Nenhum agendamento encontrado"
        description="Você ainda não possui horários marcados para este período."
        action={<button onClick={handleAction}>Agendar Sessão</button>}
      />,
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Nenhum agendamento encontrado')).toBeInTheDocument();
    expect(
      screen.getByText('Você ainda não possui horários marcados para este período.'),
    ).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /agendar sessão/i });
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

describe('LoadingState Component', () => {
  it('renderiza com atributos de acessibilidade (role status e aria-live)', () => {
    render(<LoadingState message="Carregando horários disponíveis..." />);

    const loading = screen.getByRole('status');
    expect(loading).toBeInTheDocument();
    expect(loading).toHaveAttribute('aria-live', 'polite');
    expect(screen.getAllByText('Carregando horários disponíveis...')[0]).toBeInTheDocument();
  });
});

describe('ErrorState Component', () => {
  it('renderiza título de erro, descrição e aciona botão de repetição', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Erro ao sincronizar agenda"
        description="Verifique sua conexão e tente novamente."
        onRetry={handleRetry}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Erro ao sincronizar agenda')).toBeInTheDocument();
    expect(screen.getByText('Verifique sua conexão e tente novamente.')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});

describe('Skeleton Component', () => {
  it('renderiza com animação de pulso e aria-hidden', () => {
    render(<Skeleton variant="rectangular" width={200} height={100} />);

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveStyle({ width: '200px', height: '100px' });
  });
});
