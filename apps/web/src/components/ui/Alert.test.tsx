import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Alert } from './Alert';
import { Badge } from './Badge';

describe('Alert Component', () => {
  it('renderiza aviso informativo com role status', () => {
    render(
      <Alert variant="info" title="Informação">
        Seu horário foi reservado.
      </Alert>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Informação')).toBeInTheDocument();
    expect(screen.getByText('Seu horário foi reservado.')).toBeInTheDocument();
  });

  it('renderiza alerta de erro com role alert', () => {
    render(
      <Alert variant="error" title="Atenção">
        Contraindicação identificada.
      </Alert>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Atenção')).toBeInTheDocument();
    expect(screen.getByText('Contraindicação identificada.')).toBeInTheDocument();
  });

  it('permite fechar o alerta quando onClose é fornecido', () => {
    const handleClose = vi.fn();
    render(
      <Alert variant="warning" onClose={handleClose}>
        Sessão pendente de confirmação.
      </Alert>,
    );

    const closeButton = screen.getByRole('button', { name: /fechar aviso/i });
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('Badge Component', () => {
  it('renderiza badge com texto e variante', () => {
    render(<Badge variant="success">Confirmado</Badge>);

    const badge = screen.getByText('Confirmado');
    expect(badge).toBeInTheDocument();
  });

  it('suporta indicador dot e variante brand', () => {
    render(
      <Badge variant="brand" dot data-testid="brand-badge">
        Ativo
      </Badge>,
    );

    expect(screen.getByTestId('brand-badge')).toBeInTheDocument();
  });
});
