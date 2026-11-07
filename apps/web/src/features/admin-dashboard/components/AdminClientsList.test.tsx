import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AdminClientListItem } from '../types';
import { AdminClientsList } from './AdminClientsList';

const mockClients: AdminClientListItem[] = [
  {
    id: 'client-1',
    nome: 'Mariana Silva',
    email: 'mariana.silva@exemplo.com',
    telefone: '(11) 98765-4321',
    status: 'ativo',
    totalAtendimentosMes: 3,
    ultimoAtendimento: '26/09/2026',
  },
  {
    id: 'client-2',
    nome: 'Ana Carolina Santos',
    email: 'ana.santos@exemplo.com',
    telefone: '(11) 97654-3210',
    status: 'ativo',
    totalAtendimentosMes: 2,
    ultimoAtendimento: '25/09/2026',
  },
  {
    id: 'client-3',
    nome: 'Juliana Lima',
    email: 'juliana.lima@exemplo.com',
    telefone: '(11) 96543-2109',
    status: 'ativo',
    totalAtendimentosMes: 1,
    ultimoAtendimento: '20/09/2026',
  },
  {
    id: 'client-4',
    nome: 'Carlos Eduardo',
    email: 'carlos.eduardo@exemplo.com',
    telefone: '(11) 95432-1098',
    status: 'inativo',
    totalAtendimentosMes: 0,
    ultimoAtendimento: '10/08/2026',
  },
];

describe('AdminClientsList', () => {
  const renderComponent = (props?: Partial<React.ComponentProps<typeof AdminClientsList>>) => {
    const defaultProps = {
      clients: mockClients,
      ...props,
    };

    return render(
      <MemoryRouter>
        <AdminClientsList {...defaultProps} />
      </MemoryRouter>,
    );
  };

  it('renderiza o título, métricas resumidas e os clientes da lista', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /gestão de clientes/i })).toBeInTheDocument();
    expect(screen.getByTestId('metric-total-clients')).toHaveTextContent('4');
    expect(screen.getByTestId('metric-recurrent-clients')).toHaveTextContent('2');
    expect(screen.getByTestId('metric-active-clients')).toHaveTextContent('3');
    expect(screen.getByTestId('metric-inactive-clients')).toHaveTextContent('1');

    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();
    expect(screen.getByText('Ana Carolina Santos')).toBeInTheDocument();
    expect(screen.getByText('Juliana Lima')).toBeInTheDocument();
    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
  });

  it('exibe badge de cliente recorrente para clientes com 2 ou mais atendimentos no mês', () => {
    renderComponent();

    expect(screen.getByTestId('badge-recorrente-client-1')).toHaveTextContent('Cliente Recorrente');
    expect(screen.getByTestId('badge-recorrente-client-2')).toHaveTextContent('Cliente Recorrente');
    expect(screen.queryByTestId('badge-recorrente-client-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('badge-recorrente-client-4')).not.toBeInTheDocument();
  });

  it('exibe informações resumidas de contato e atendimentos', () => {
    renderComponent();

    expect(screen.getByText('mariana.silva@exemplo.com')).toBeInTheDocument();
    expect(screen.getByText('(11) 98765-4321')).toBeInTheDocument();
    expect(screen.getAllByText(/atendimentos este mês:/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/último atendimento: 26\/09\/2026/i)).toBeInTheDocument();
  });

  it('permite pesquisar clientes por nome', () => {
    renderComponent();

    const inputBusca = screen.getByTestId('busca-cliente-input');
    fireEvent.change(inputBusca, { target: { value: 'Carolina' } });

    expect(screen.getByText('Ana Carolina Santos')).toBeInTheDocument();
    expect(screen.queryByText('Mariana Silva')).not.toBeInTheDocument();
    expect(screen.queryByText('Carlos Eduardo')).not.toBeInTheDocument();
  });

  it('permite pesquisar clientes por e-mail', () => {
    renderComponent();

    const inputBusca = screen.getByTestId('busca-cliente-input');
    fireEvent.change(inputBusca, { target: { value: 'juliana.lima' } });

    expect(screen.getByText('Juliana Lima')).toBeInTheDocument();
    expect(screen.queryByText('Mariana Silva')).not.toBeInTheDocument();
  });

  it('permite pesquisar clientes por telefone mesmo com dígitos puros', () => {
    renderComponent();

    const inputBusca = screen.getByTestId('busca-cliente-input');
    fireEvent.change(inputBusca, { target: { value: '954321098' } });

    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
    expect(screen.queryByText('Ana Carolina Santos')).not.toBeInTheDocument();
  });

  it('filtra clientes apenas recorrentes quando a aba Recorrentes é acionada', () => {
    renderComponent();

    const btnRecorrentes = screen.getByRole('button', { name: /recorrentes/i });
    fireEvent.click(btnRecorrentes);

    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();
    expect(screen.getByText('Ana Carolina Santos')).toBeInTheDocument();
    expect(screen.queryByText('Juliana Lima')).not.toBeInTheDocument();
    expect(screen.queryByText('Carlos Eduardo')).not.toBeInTheDocument();
  });

  it('filtra clientes apenas inativos quando a aba Inativos é acionada', () => {
    renderComponent();

    const btnInativos = screen.getByRole('button', { name: /inativos/i });
    fireEvent.click(btnInativos);

    expect(screen.getByText('Carlos Eduardo')).toBeInTheDocument();
    expect(screen.queryByText('Mariana Silva')).not.toBeInTheDocument();
  });

  it('exibe estado vazio e botão para limpar busca quando nenhum cliente for encontrado', () => {
    renderComponent();

    const inputBusca = screen.getByTestId('busca-cliente-input');
    fireEvent.change(inputBusca, { target: { value: 'Cliente Inexistente Xpto' } });

    expect(screen.getByTestId('empty-search-state')).toBeInTheDocument();
    expect(screen.getByText(/nenhum cliente encontrado/i)).toBeInTheDocument();

    const btnLimpar = screen.getByRole('button', { name: /limpar filtros e busca/i });
    fireEvent.click(btnLimpar);

    expect(screen.queryByTestId('empty-search-state')).not.toBeInTheDocument();
    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();
  });

  it('renderiza o link de navegação para a ficha completa do cliente', () => {
    renderComponent();

    const links = screen.getAllByRole('link', { name: /ver ficha completa/i });
    expect(links[0]).toHaveAttribute('href', '/admin/clientes/client-1');
  });

  it('exibe skeleton de loading quando isLoading for true e lista estiver vazia', () => {
    renderComponent({ clients: [], isLoading: true });

    expect(screen.getByTestId('clients-loading-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('clients-grid')).not.toBeInTheDocument();
  });

  it('dispara onRefresh quando fornecido e o botão de atualização for clicado', () => {
    const mockRefresh = vi.fn();
    renderComponent({ onRefresh: mockRefresh });

    const btnRefresh = screen.getByRole('button', { name: /atualizar lista/i });
    fireEvent.click(btnRefresh);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
