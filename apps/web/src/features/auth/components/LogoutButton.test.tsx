import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LogoutButton } from './LogoutButton';

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }));

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ currentUser: { uid: 'user-1' }, isAuthReady: true, logout: logoutMock }),
}));

function renderLogoutButton() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<LogoutButton />} />
        <Route path="/servicos" element={<p>Catálogo público</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encerra a sessão e redireciona para o catálogo público', async () => {
    logoutMock.mockResolvedValueOnce(undefined);
    renderLogoutButton();

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Catálogo público')).toBeInTheDocument();
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('mantém a tela atual e informa quando o logout falha', async () => {
    logoutMock.mockRejectedValueOnce(new Error('Falha de rede'));
    renderLogoutButton();

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(
      await screen.findByText('Não foi possível encerrar a sessão. Tente novamente.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeEnabled();
    expect(screen.queryByText('Catálogo público')).not.toBeInTheDocument();
  });
});
