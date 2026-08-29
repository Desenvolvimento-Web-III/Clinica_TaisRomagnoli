import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { RegisterPage } from './RegisterPage';
import { createUserWithEmailAndPassword, type UserCredential } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';

// Mocks do Firebase
vi.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({ id: 'mock-doc-ref' }),
  setDoc: vi.fn(),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: MemoryRouter });
  };

  it('exibe erros de validação ao submeter o formulário vazio', async () => {
    renderWithRouter(<RegisterPage />);

    const button = screen.getByRole('button', { name: /criar conta/i });
    fireEvent.click(button);

    expect(await screen.findByText('O nome é obrigatório')).toBeInTheDocument();
    expect(await screen.findByText('O telefone é obrigatório')).toBeInTheDocument();
    expect(await screen.findByText('O e-mail é obrigatório')).toBeInTheDocument();
    expect(await screen.findByText('A senha é obrigatória')).toBeInTheDocument();
    expect(await screen.findByText('A confirmação da senha é obrigatória')).toBeInTheDocument();
  });

  it('valida o tamanho mínimo e caracteres do nome', async () => {
    renderWithRouter(<RegisterPage />);

    const nomeInput = screen.getByLabelText(/nome completo/i);
    const button = screen.getByRole('button', { name: /criar conta/i });

    // Nome curto
    fireEvent.change(nomeInput, { target: { value: 'Ab' } });
    fireEvent.click(button);
    expect(await screen.findByText('O nome deve ter pelo menos 3 caracteres')).toBeInTheDocument();

    // Nome com números/caracteres especiais
    fireEvent.change(nomeInput, { target: { value: 'João123' } });
    fireEvent.click(button);
    expect(await screen.findByText('O nome deve conter apenas letras')).toBeInTheDocument();
  });

  it('valida formato de e-mail', async () => {
    renderWithRouter(<RegisterPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const button = screen.getByRole('button', { name: /criar conta/i });

    fireEvent.change(emailInput, { target: { value: 'email-invalido' } });
    fireEvent.click(button);

    expect(await screen.findByText('Insira um e-mail válido')).toBeInTheDocument();
  });

  it('aplica máscara de telefone e valida formato de celular brasileiro', async () => {
    renderWithRouter(<RegisterPage />);

    const telefoneInput = screen.getByLabelText(/telefone/i) as HTMLInputElement;
    const button = screen.getByRole('button', { name: /criar conta/i });

    // Digita número sem formatação
    fireEvent.change(telefoneInput, { target: { value: '11988887777' } });
    // Deve aplicar a máscara (XX)XXXXX-XXXX
    expect(telefoneInput.value).toBe('(11)98888-7777');

    // Testa telefone incompleto/inválido
    fireEvent.change(telefoneInput, { target: { value: '119888' } });
    fireEvent.click(button);
    expect(
      await screen.findByText('Formato de telefone inválido. Use (XX)XXXXX-XXXX'),
    ).toBeInTheDocument();
  });

  it('valida tamanho mínimo da senha', async () => {
    renderWithRouter(<RegisterPage />);

    const senhaInput = screen.getByLabelText(/^senha$/i);
    const button = screen.getByRole('button', { name: /criar conta/i });

    fireEvent.change(senhaInput, { target: { value: '12345' } });
    fireEvent.click(button);

    expect(await screen.findByText('A senha deve ter pelo menos 6 caracteres')).toBeInTheDocument();
  });

  it('valida que as senhas coincidem', async () => {
    renderWithRouter(<RegisterPage />);

    const senhaInput = screen.getByLabelText(/^senha$/i);
    const confirmarSenhaInput = screen.getByLabelText(/confirmar senha/i);
    const button = screen.getByRole('button', { name: /criar conta/i });

    fireEvent.change(senhaInput, { target: { value: 'senha123' } });
    fireEvent.change(confirmarSenhaInput, { target: { value: 'senhaDiferente' } });
    fireEvent.click(button);

    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument();
  });

  it('exibe erro quando o Firebase retorna erro de e-mail duplicado', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce({
      code: 'auth/email-already-in-use',
    });

    renderWithRouter(<RegisterPage />);

    const nomeInput = screen.getByLabelText(/nome completo/i);
    const telefoneInput = screen.getByLabelText(/telefone/i);
    const emailInput = screen.getByLabelText(/email/i);
    const senhaInput = screen.getByLabelText(/^senha$/i);
    const confirmarSenhaInput = screen.getByLabelText(/confirmar senha/i);
    const button = screen.getByRole('button', { name: /criar conta/i });

    fireEvent.change(nomeInput, { target: { value: 'Maria Silva' } });
    fireEvent.change(telefoneInput, { target: { value: '11988887777' } });
    fireEvent.change(emailInput, { target: { value: 'maria.silva@exemplo.com' } });
    fireEvent.change(senhaInput, { target: { value: 'senha123' } });
    fireEvent.change(confirmarSenhaInput, { target: { value: 'senha123' } });

    fireEvent.click(button);

    expect(await screen.findByText('Este e-mail já está em uso')).toBeInTheDocument();
  });

  it('permite cadastro bem-sucedido com dados válidos', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValueOnce({
      user: { uid: 'mock-uid-maria' },
    } as UserCredential);
    vi.mocked(setDoc).mockResolvedValueOnce(undefined);

    renderWithRouter(<RegisterPage />);

    const nomeInput = screen.getByLabelText(/nome completo/i);
    const telefoneInput = screen.getByLabelText(/telefone/i);
    const emailInput = screen.getByLabelText(/email/i);
    const senhaInput = screen.getByLabelText(/^senha$/i);
    const confirmarSenhaInput = screen.getByLabelText(/confirmar senha/i);
    const button = screen.getByRole('button', { name: /criar conta/i });

    fireEvent.change(nomeInput, { target: { value: 'Maria Silva' } });
    fireEvent.change(telefoneInput, { target: { value: '11988887777' } });
    fireEvent.change(emailInput, { target: { value: 'maria.silva@exemplo.com' } });
    fireEvent.change(senhaInput, { target: { value: 'senha123' } });
    fireEvent.change(confirmarSenhaInput, { target: { value: 'senha123' } });

    fireEvent.click(button);

    expect(await screen.findByText('Cadastro realizado com sucesso!')).toBeInTheDocument();

    // Valida que o doc foi criado na coleção e UID certos, e o setDoc usou a referência e modelagem corretas
    expect(doc).toHaveBeenCalledWith({}, 'clientes', 'mock-uid-maria');
    expect(setDoc).toHaveBeenCalledWith(
      { id: 'mock-doc-ref' },
      expect.objectContaining({
        uid: 'mock-uid-maria',
        nome: 'Maria Silva',
        telefone: '(11)98888-7777',
        email: 'maria.silva@exemplo.com',
        role: 'cliente',
        status: 'ativo',
        createdAt: expect.any(String),
      }),
    );

    // Os campos devem ter sido limpos
    expect(nomeInput).toHaveValue('');
    expect(telefoneInput).toHaveValue('');
    expect(emailInput).toHaveValue('');
    expect(senhaInput).toHaveValue('');
    expect(confirmarSenhaInput).toHaveValue('');
  });
});
