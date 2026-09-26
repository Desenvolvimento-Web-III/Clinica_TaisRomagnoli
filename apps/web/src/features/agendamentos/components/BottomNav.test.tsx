import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('conecta os 4 destinos disponíveis e identifica a página ativa', () => {
    render(<BottomNav activeTab="notificacoes" />, { wrapper: MemoryRouter });

    expect(screen.getByRole('link', { name: 'Serviços' })).toHaveAttribute('href', '/servicos');
    expect(screen.getByRole('link', { name: 'Agendamentos' })).toHaveAttribute(
      'href',
      '/agendamentos',
    );
    expect(screen.getByRole('link', { name: 'Notificações' })).toHaveAttribute(
      'href',
      '/notificacoes',
    );
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/perfil');

    expect(screen.getByRole('link', { name: 'Notificações' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
