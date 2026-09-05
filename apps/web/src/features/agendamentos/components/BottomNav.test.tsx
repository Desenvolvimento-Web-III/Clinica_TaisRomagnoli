import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('conecta os destinos disponíveis e identifica a página ativa', () => {
    render(<BottomNav activeTab="agendamentos" />, { wrapper: MemoryRouter });

    expect(screen.getByRole('link', { name: 'Serviços' })).toHaveAttribute('href', '/servicos');
    expect(screen.getByRole('link', { name: 'Agendamentos' })).toHaveAttribute(
      'href',
      '/agendamentos',
    );
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Agendamentos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
