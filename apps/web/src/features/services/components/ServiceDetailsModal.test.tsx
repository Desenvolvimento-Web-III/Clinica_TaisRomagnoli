import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ServiceDetailsModal } from './ServiceDetailsModal';
import type { Service } from '../types';

const mockService: Service = {
  id: 'massagem-relaxante',
  name: 'Massagem Relaxante',
  description: 'Técnica suave com movimentos contínuos para alívio de tensões.',
  durationMinutes: 60,
  priceInCents: 17000,
  imageSrc: '/relaxante.jpg',
  imageAlt: 'Sessão de massagem relaxante',
  active: true,
};

describe('ServiceDetailsModal', () => {
  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <MemoryRouter>
        <ServiceDetailsModal service={mockService} isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza nada quando service é null', () => {
    const { container } = render(
      <MemoryRouter>
        <ServiceDetailsModal service={null} isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('exibe nome, descrição, duração, valor, sinal e botão para agendar', () => {
    render(
      <MemoryRouter>
        <ServiceDetailsModal service={mockService} isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    // Modal role
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Nome
    expect(screen.getByRole('heading', { name: 'Massagem Relaxante' })).toBeInTheDocument();

    // Imagem
    expect(screen.getByAltText('Sessão de massagem relaxante')).toHaveAttribute(
      'src',
      '/relaxante.jpg',
    );

    // Descrição
    expect(
      screen.getByText('Técnica suave com movimentos contínuos para alívio de tensões.'),
    ).toBeInTheDocument();

    // Duração
    expect(screen.getByText('60 min')).toBeInTheDocument();

    // Valor total (R$ 170,00)
    expect(screen.getByText(/R\$\s*170,00/)).toBeInTheDocument();

    // Sinal de reserva (30% de 170 = R$ 51,00)
    expect(screen.getByText('Sinal para reserva (30%)')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*51,00/)).toBeInTheDocument();

    // Saldo restante (170 - 51 = 119)
    expect(screen.getByText(/R\$\s*119,00/)).toBeInTheDocument();

    // Botão para agendar
    const agendarBtn = screen.getByRole('link', { name: /agendar horário/i });
    expect(agendarBtn).toBeInTheDocument();
    expect(agendarBtn).toHaveAttribute('href', '/agendar/massagem-relaxante');
  });

  it('chama onClose ao clicar no botão fechar e no backdrop', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <ServiceDetailsModal service={mockService} isOpen={true} onClose={handleClose} />
      </MemoryRouter>,
    );

    // Fecha pelo botão X
    fireEvent.click(screen.getByLabelText('Fechar detalhes do serviço'));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Fecha pelo botão "Voltar ao catálogo"
    fireEvent.click(screen.getByRole('button', { name: /voltar ao catálogo/i }));
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Fecha pelo clique no backdrop
    fireEvent.click(screen.getByRole('dialog'));
    expect(handleClose).toHaveBeenCalledTimes(3);
  });

  it('chama onClose ao pressionar a tecla Escape', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <ServiceDetailsModal service={mockService} isOpen={true} onClose={handleClose} />
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('invoca onAgendarClick quando fornecido como callback', () => {
    const handleAgendar = vi.fn();
    render(
      <MemoryRouter>
        <ServiceDetailsModal
          service={mockService}
          isOpen={true}
          onClose={vi.fn()}
          onAgendarClick={handleAgendar}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /agendar horário/i }));
    expect(handleAgendar).toHaveBeenCalledWith(mockService);
  });
});
