import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal Component', () => {
  it('não renderiza nada quando isOpen é false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Título do Modal">
        <p>Conteúdo interno</p>
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza com atributos de acessibilidade (role dialog e aria-modal)', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Confirmar Agendamento"
        description="Verifique os dados da sessão antes de prosseguir."
        footer={<button>Confirmar</button>}
      >
        <p>Massagem Relaxante às 14:00</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Confirmar Agendamento')).toBeInTheDocument();
    expect(
      screen.getByText('Verifique os dados da sessão antes de prosseguir.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante às 14:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão de fechar', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Janela de Teste">
        <p>Conteúdo</p>
      </Modal>,
    );

    const closeButton = screen.getByRole('button', { name: /fechar modal/i });
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao pressionar tecla Escape', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Janela">
        <p>Conteúdo</p>
      </Modal>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose ao clicar no overlay de fundo', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Janela" closeOnOverlayClick={true}>
        <p>Conteúdo</p>
      </Modal>,
    );

    const presentation = screen.getByRole('presentation');
    fireEvent.click(presentation);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
