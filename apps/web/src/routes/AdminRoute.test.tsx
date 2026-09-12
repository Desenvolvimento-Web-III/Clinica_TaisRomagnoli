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

  it('bloqueia o conteúdo e orienta quando a conta não possui permissão administrativa', async () => {
    render(
      <AdminRoute resolveAccess={() => Promise.resolve('unauthorized')}>
        <p>Conteúdo protegido</p>
      </AdminRoute>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Acesso não autorizado' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Você não tem permissão para acessar esta área administrativa/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Voltar ao catálogo de serviços' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });

  it('bloqueia o conteúdo e orienta quando o usuário não está autenticado ou a sessão expirou', async () => {
    render(
      <AdminRoute resolveAccess={() => Promise.resolve('unauthenticated')}>
        <p>Conteúdo protegido</p>
      </AdminRoute>,
    );

    expect(await screen.findByRole('heading', { name: 'Sessão expirada' })).toBeInTheDocument();
    expect(
      screen.getByText(/Sua sessão expirou ou você ainda não realizou login/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });
});
