import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { signInWithEmailAndPassword, type UserCredential } from 'firebase/auth';

// Mocks do Firebase
vi.mock('../lib/firebase', () => ({
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: MemoryRouter });
  };

  it('exibe erros de validação ao tentar logar com formulário vazio', async () => {
    renderWithRouter(<LoginPage />);

    const button = screen.getByRole('button', { name: /entrar/i });
    fireEvent.click(button);

    expect(await screen.findByText('O e-mail é obrigatório')).toBeInTheDocument();
    expect(await screen.findByText('A senha é obrigatória')).toBeInTheDocument();
  });

  it('valida formato de e-mail incorreto', async () => {
    renderWithRouter(<LoginPage />);

    const emailInput = screen.getByLabelText(/e-mail/i);
    const button = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(emailInput, { target: { value: 'email-invalido' } });
    fireEvent.click(button);

    expect(await screen.findByText('Insira um e-mail válido')).toBeInTheDocument();
  });

  it('valida tamanho mínimo da senha', async () => {
    renderWithRouter(<LoginPage />);

    const senhaInput = screen.getByLabelText(/^senha$/i);
    const button = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(senhaInput, { target: { value: '12345' } });
    fireEvent.click(button);

    expect(await screen.findByText('A senha deve ter pelo menos 6 caracteres')).toBeInTheDocument();
  });

  it('exibe erro geral quando o Firebase retorna erro de credenciais', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
      code: 'auth/invalid-credential',
    });

    renderWithRouter(<LoginPage />);

    const emailInput = screen.getByLabelText(/e-mail/i);
    const senhaInput = screen.getByLabelText(/^senha$/i);
    const button = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(emailInput, { target: { value: 'errado@exemplo.com' } });
    fireEvent.change(senhaInput, { target: { value: 'senha123' } });
    fireEvent.click(button);

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument();
  });

  it('leva aos agendamentos após login bem-sucedido', async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({} as UserCredential);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/agendamentos" element={<p>Meus agendamentos</p>} />
        </Routes>
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/e-mail/i);
    const senhaInput = screen.getByLabelText(/^senha$/i);
    const button = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(emailInput, { target: { value: 'cliente@exemplo.com' } });
    fireEvent.change(senhaInput, { target: { value: 'senha123' } });
    fireEvent.click(button);

    expect(await screen.findByText('Meus agendamentos')).toBeInTheDocument();
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, 'cliente@exemplo.com', 'senha123');
  });
});
