import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Service } from '../types';
import { AdminServicesList } from './AdminServicesList';

const mockServices: Service[] = [
  {
    id: 'srv-1',
    name: 'Massagem Relaxante',
    description: 'Terapia para relaxamento profundo.',
    durationMinutes: 60,
    priceInCents: 15000,
    sinalPercentual: 30,
    sinalInCents: 4500,
    category: 'Corporal',
    active: true,
    imageSrc: '',
    imageAlt: 'Massagem Relaxante',
  },
  {
    id: 'srv-2',
    name: 'Drenagem Linfática',
    description: 'Redução de retenção líquida.',
    durationMinutes: 60,
    priceInCents: 16000,
    sinalPercentual: 30,
    sinalInCents: 4800,
    category: 'Estética',
    active: true,
    imageSrc: '',
    imageAlt: 'Drenagem Linfática',
  },
  {
    id: 'srv-3',
    name: 'Ventosaterapia Especial',
    description: 'Procedimento com copos de sucção.',
    durationMinutes: 45,
    priceInCents: 13000,
    sinalPercentual: 30,
    sinalInCents: 3900,
    category: 'Terapêutica',
    active: false,
    imageSrc: '',
    imageAlt: 'Ventosaterapia Especial',
  },
];

describe('AdminServicesList', () => {
  const renderList = (props?: Partial<React.ComponentProps<typeof AdminServicesList>>) => {
    const defaultProps = {
      services: mockServices,
      onEditService: vi.fn(),
      onToggleStatus: vi.fn(),
      onNewService: vi.fn(),
      ...props,
    };
    return {
      ...render(
        <MemoryRouter>
          <AdminServicesList {...defaultProps} />
        </MemoryRouter>,
      ),
      props: defaultProps,
    };
  };

  it('renderiza o título, métricas de ativos/inativos e os cards de serviço', () => {
    renderList();

    expect(screen.getByRole('heading', { name: /serviços e procedimentos/i })).toBeInTheDocument();
    expect(screen.getByTestId('metric-total-services')).toHaveTextContent('3');
    expect(screen.getByTestId('metric-active-services')).toHaveTextContent('2');
    expect(screen.getByTestId('metric-inactive-services')).toHaveTextContent('1');

    expect(screen.getByText('Massagem Relaxante')).toBeInTheDocument();
    expect(screen.getByText('Drenagem Linfática')).toBeInTheDocument();
    expect(screen.getByText('Ventosaterapia Especial')).toBeInTheDocument();

    expect(screen.getByTestId('badge-status-ativo-srv-1')).toHaveTextContent('Ativo');
    expect(screen.getByTestId('badge-status-inativo-srv-3')).toHaveTextContent('Inativo');
  });

  it('filtra serviços por status: apenas ativos ou apenas inativos', () => {
    renderList();

    // Filtra apenas ativos
    const tabAtivos = screen.getByTestId('filter-tab-ativos');
    fireEvent.click(tabAtivos);

    expect(screen.getByText('Massagem Relaxante')).toBeInTheDocument();
    expect(screen.getByText('Drenagem Linfática')).toBeInTheDocument();
    expect(screen.queryByText('Ventosaterapia Especial')).not.toBeInTheDocument();

    // Filtra apenas inativos
    const tabInativos = screen.getByTestId('filter-tab-inativos');
    fireEvent.click(tabInativos);

    expect(screen.queryByText('Massagem Relaxante')).not.toBeInTheDocument();
    expect(screen.queryByText('Drenagem Linfática')).not.toBeInTheDocument();
    expect(screen.getByText('Ventosaterapia Especial')).toBeInTheDocument();

    // Retorna para todos
    const tabTodos = screen.getByTestId('filter-tab-todos');
    fireEvent.click(tabTodos);
    expect(screen.getByText('Massagem Relaxante')).toBeInTheDocument();
    expect(screen.getByText('Ventosaterapia Especial')).toBeInTheDocument();
  });

  it('permite buscar procedimentos por nome ou categoria', () => {
    renderList();

    const inputBusca = screen.getByPlaceholderText(/buscar por nome ou categoria/i);
    fireEvent.change(inputBusca, { target: { value: 'Drenagem' } });

    expect(screen.getByText('Drenagem Linfática')).toBeInTheDocument();
    expect(screen.queryByText('Massagem Relaxante')).not.toBeInTheDocument();
    expect(screen.queryByText('Ventosaterapia Especial')).not.toBeInTheDocument();

    // Limpa a busca pelo botão
    const btnLimpar = screen.getByRole('button', { name: /limpar busca/i });
    fireEvent.click(btnLimpar);

    expect(screen.getByText('Massagem Relaxante')).toBeInTheDocument();
    expect(screen.getByText('Ventosaterapia Especial')).toBeInTheDocument();
  });

  it('dispara onEditService ao clicar em Editar', () => {
    const { props } = renderList();

    const btnEditar = screen.getByTestId('edit-service-btn-srv-1');
    fireEvent.click(btnEditar);

    expect(props.onEditService).toHaveBeenCalledTimes(1);
    expect(props.onEditService).toHaveBeenCalledWith(mockServices[0]);
  });

  it('dispara onToggleStatus para desativar serviço ativo e para ativar serviço inativo', async () => {
    const { props } = renderList();

    // Clica em desativar serviço ativo (srv-1)
    const btnDesativar = screen.getByTestId('toggle-status-btn-srv-1');
    expect(btnDesativar).toHaveTextContent('Desativar');
    await act(async () => {
      fireEvent.click(btnDesativar);
    });

    expect(props.onToggleStatus).toHaveBeenCalledWith(mockServices[0]);

    // Clica em ativar serviço inativo (srv-3)
    const btnAtivar = screen.getByTestId('toggle-status-btn-srv-3');
    expect(btnAtivar).toHaveTextContent('Ativar');
    await act(async () => {
      fireEvent.click(btnAtivar);
    });

    expect(props.onToggleStatus).toHaveBeenCalledWith(mockServices[2]);
  });

  it('dispara onNewService ao clicar em Novo Serviço', () => {
    const { props } = renderList();

    const btnNovo = screen.getByTestId('novo-servico-btn');
    fireEvent.click(btnNovo);

    expect(props.onNewService).toHaveBeenCalledTimes(1);
  });

  it('exibe estado vazio quando nenhum serviço corresponde ao filtro', () => {
    renderList();

    const inputBusca = screen.getByPlaceholderText(/buscar por nome ou categoria/i);
    fireEvent.change(inputBusca, { target: { value: 'Inexistente' } });

    expect(screen.getByTestId('empty-services-state')).toBeInTheDocument();
    expect(screen.getByText('Nenhum serviço encontrado')).toBeInTheDocument();

    const btnLimpar = screen.getByRole('button', { name: /limpar filtros e busca/i });
    fireEvent.click(btnLimpar);

    expect(screen.queryByTestId('empty-services-state')).not.toBeInTheDocument();
    expect(screen.getByText('Massagem Relaxante')).toBeInTheDocument();
  });
});
