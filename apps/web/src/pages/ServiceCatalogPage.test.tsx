import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Service } from '@/features/services/types';
import { ServiceCatalogPage } from './ServiceCatalogPage';

const activeService: Service = {
  id: 'active-service',
  name: 'Massagem relaxante',
  description: 'Uma descrição acolhedora para o serviço.',
  durationMinutes: 60,
  priceInCents: 12000,
  imageSrc: '/active-service.png',
  imageAlt: 'Ambiente preparado para a sessão',
  active: true,
};

const secondActiveService: Service = {
  id: 'drenagem-service',
  name: 'Drenagem Linfática',
  description: 'Reduz inchaço e retenção de líquidos.',
  durationMinutes: 50,
  priceInCents: 16000,
  imageSrc: '/drenagem.png',
  imageAlt: 'Sessão de drenagem linfática',
  active: true,
};

const inactiveService: Service = {
  ...activeService,
  id: 'inactive-service',
  name: 'Serviço indisponível',
  active: false,
};

describe('ServiceCatalogPage', () => {
  const renderPage = (services: readonly Service[]) =>
    render(<ServiceCatalogPage services={services} />, { wrapper: MemoryRouter });

  it('lista somente serviços ativos com nome, duração, preço e imagem', () => {
    renderPage([activeService, inactiveService]);

    const card = screen.getByRole('article');

    expect(within(card).getByRole('heading', { name: 'Massagem relaxante' })).toBeInTheDocument();
    expect(within(card).getByText('60 min')).toBeInTheDocument();
    expect(card).toHaveTextContent('R$ 120,00');
    expect(
      within(card).getByRole('img', { name: 'Ambiente preparado para a sessão' }),
    ).toHaveAttribute('src', '/active-service.png');
    expect(screen.queryByText('Serviço indisponível')).not.toBeInTheDocument();
  });

  it('permite buscar serviços pelo campo de pesquisa e limpar a busca', () => {
    renderPage([activeService, secondActiveService]);

    expect(screen.getByText('Massagem relaxante')).toBeInTheDocument();
    expect(screen.getByText('Drenagem Linfática')).toBeInTheDocument();

    const searchInput = screen.getByTestId('search-services-input');
    fireEvent.change(searchInput, { target: { value: 'drenagem' } });

    expect(screen.queryByText('Massagem relaxante')).not.toBeInTheDocument();
    expect(screen.getByText('Drenagem Linfática')).toBeInTheDocument();

    const clearBtn = screen.getByTestId('clear-search-btn');
    fireEvent.click(clearBtn);

    expect(screen.getByText('Massagem relaxante')).toBeInTheDocument();
    expect(screen.getByText('Drenagem Linfática')).toBeInTheDocument();
  });

  it('orienta o cliente quando não há serviços ativos', () => {
    renderPage([inactiveService]);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Nenhum serviço está disponível no momento.',
    );
  });
});
