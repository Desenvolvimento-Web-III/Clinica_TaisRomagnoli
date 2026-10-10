import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { sendPasswordResetEmail } from 'firebase/auth';

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
}));

vi.mock('firebase/auth', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
  };

  it('renderiza o titulo, campo de e-mail e botao de envio', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /recupere sua senha/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail cadastrado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar link de recuperação/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /fazer login/i })).toHaveAttribute('href', '/login');
  });

  it('exibe erro de validacao ao submeter com formulario vazio', async () => {
    renderComponent();

    const submitBtn = screen.getByRole('button', { name: /enviar link de recuperação/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('O e-mail é obrigatório')).toBeInTheDocument();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('exibe erro de validacao com formato de e-mail invalido', async () => {
    renderComponent();

    const emailInput = screen.getByLabelText(/e-mail cadastrado/i);
    fireEvent.change(emailInput, { target: { value: 'email-invalido' } });

    const submitBtn = screen.getByRole('button', { name: /enviar link de recuperação/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Insira um e-mail válido')).toBeInTheDocument();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('envia e-mail com sucesso e exibe mensagem de confirmacao com e-mail sanitizado', async () => {
    vi.mocked(sendPasswordResetEmail).mockResolvedValueOnce(undefined);
    renderComponent();

    const emailInput = screen.getByLabelText(/e-mail cadastrado/i);
    fireEvent.change(emailInput, { target: { value: '  cliente@exemplo.com  ' } });

    const submitBtn = screen.getByRole('button', { name: /enviar link de recuperação/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'cliente@exemplo.com');
    });

    expect(
      await screen.findByRole('heading', { name: /instruções enviadas!/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/cliente@exemplo.com/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /voltar para o login/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('permite reiniciar o formulario ao clicar em Enviar para outro e-mail', async () => {
    vi.mocked(sendPasswordResetEmail).mockResolvedValueOnce(undefined);
    renderComponent();

    const emailInput = screen.getByLabelText(/e-mail cadastrado/i);
    fireEvent.change(emailInput, { target: { value: 'cliente@exemplo.com' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar link de recuperação/i }));

    expect(
      await screen.findByRole('heading', { name: /instruções enviadas!/i }),
    ).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /enviar para outro e-mail/i });
    fireEvent.click(resetBtn);

    expect(screen.getByRole('heading', { name: /recupere sua senha/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail cadastrado/i)).toHaveValue('');
  });

  it('exibe erro amigavel quando ocorre excesso de tentativas (too-many-requests)', async () => {
    vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce({
      code: 'auth/too-many-requests',
    });
    renderComponent();

    const emailInput = screen.getByLabelText(/e-mail cadastrado/i);
    fireEvent.change(emailInput, { target: { value: 'cliente@exemplo.com' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar link de recuperação/i }));

    expect(await screen.findByText(/muitas tentativas em pouco tempo/i)).toBeInTheDocument();
  });

  it('exibe erro amigavel quando ocorre falha de conexao (network-request-failed)', async () => {
    vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce({
      code: 'auth/network-request-failed',
    });
    renderComponent();

    const emailInput = screen.getByLabelText(/e-mail cadastrado/i);
    fireEvent.change(emailInput, { target: { value: 'cliente@exemplo.com' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar link de recuperação/i }));

    expect(await screen.findByText(/falha de conexão com o servidor/i)).toBeInTheDocument();
  });
});
