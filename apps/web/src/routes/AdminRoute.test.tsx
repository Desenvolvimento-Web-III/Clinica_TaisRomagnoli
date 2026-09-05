import { render, screen } from '@testing-library/react';
import { AdminRoute } from './AdminRoute';

vi.mock('@/lib/firebase', () => ({ auth: null }));

describe('AdminRoute', () => {
  it('exibe o conteúdo para uma conta administrativa autorizada', async () => {
    render(
      <AdminRoute resolveAccess={() => Promise.resolve(true)}>
        <p>Conteúdo protegido</p>
      </AdminRoute>,
    );

    expect(await screen.findByText('Conteúdo protegido')).toBeInTheDocument();
  });

  it('bloqueia o conteúdo quando a conta não é administrativa', async () => {
    render(
      <AdminRoute resolveAccess={() => Promise.resolve(false)}>
        <p>Conteúdo protegido</p>
      </AdminRoute>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Acesso não autorizado' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });
});
