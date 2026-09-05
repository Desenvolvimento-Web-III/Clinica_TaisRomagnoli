import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { LogoutButton } from './LogoutButton';

vi.mock('@/lib/firebase', () => ({ auth: {} }));

vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
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
    vi.mocked(signOut).mockResolvedValueOnce();
    renderLogoutButton();

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Catálogo público')).toBeInTheDocument();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('mantém a tela atual e informa quando o logout falha', async () => {
    vi.mocked(signOut).mockRejectedValueOnce(new Error('Falha de rede'));
    renderLogoutButton();

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(
      await screen.findByText('Não foi possível encerrar a sessão. Tente novamente.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeEnabled();
    expect(screen.queryByText('Catálogo público')).not.toBeInTheDocument();
  });
});
