import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { AdminRoute } from '@/routes/AdminRoute';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({ id: 'mock-doc-ref' }),
  setDoc: vi.fn(),
}));

function TestAuthNavigationApp({ initialPath = '/login' }: { initialPath?: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        <Route path="/servicos" element={<p>Catálogo de Serviços</p>} />
        <Route path="/agendamentos" element={<p>Tela de Agendamentos</p>} />
        <Route
          path="/admin/horarios"
          element={
            <AdminRoute resolveAccess={() => Promise.resolve('unauthenticated')}>
              <p>Área Administrativa de Horários</p>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/restrito"
          element={
            <AdminRoute resolveAccess={() => Promise.resolve('unauthorized')}>
              <p>Área Protegida por Perfil Admin</p>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/autorizado"
          element={
            <AdminRoute resolveAccess={() => Promise.resolve(true)}>
              <p>Painel Administrativo Autorizado</p>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('Fluxos de Autenticação, Erros e Sessões Expiradas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Navegação entre fluxos de autenticação', () => {
    it('permite alternar entre Login e Cadastro através dos links da tela', async () => {
      render(<TestAuthNavigationApp initialPath="/login" />);

      expect(screen.getByRole('heading', { name: /entre na sua conta/i })).toBeInTheDocument();

      // Clica para ir para o cadastro
      const registerLink = screen.getByRole('link', { name: /cadastre-se/i });
      fireEvent.click(registerLink);

      expect(await screen.findByRole('heading', { name: /crie sua conta/i })).toBeInTheDocument();

      // Clica para voltar ao login
      const backToLoginLink = screen.getByRole('link', { name: /^entre$/i });
      fireEvent.click(backToLoginLink);

      expect(
        await screen.findByRole('heading', { name: /entre na sua conta/i }),
      ).toBeInTheDocument();
    });

    it('permite alternar entre Login e Recuperação de Senha', async () => {
      render(<TestAuthNavigationApp initialPath="/login" />);

      // Clica em "Esqueceu a senha?"
      const forgotPasswordLink = screen.getByRole('link', { name: /esqueceu a senha\?/i });
      fireEvent.click(forgotPasswordLink);

      expect(
        await screen.findByRole('heading', { name: /recupere sua senha/i }),
      ).toBeInTheDocument();

      // Clica em "Fazer login" para retornar
      const loginLink = screen.getByRole('link', { name: /fazer login/i });
      fireEvent.click(loginLink);

      expect(
        await screen.findByRole('heading', { name: /entre na sua conta/i }),
      ).toBeInTheDocument();
    });

    it('executa o ciclo completo de solicitação de recuperação de senha e retorno ao login', async () => {
      vi.mocked(sendPasswordResetEmail).mockResolvedValueOnce(undefined);
      render(<TestAuthNavigationApp initialPath="/recuperar-senha" />);

      const emailInput = screen.getByLabelText(/e-mail cadastrado/i);
      fireEvent.change(emailInput, { target: { value: 'usuario@exemplo.com' } });

      const submitBtn = screen.getByRole('button', { name: /enviar link de recuperação/i });
      fireEvent.click(submitBtn);

      // Deve exibir mensagem de sucesso
      expect(
        await screen.findByRole('heading', { name: /instruções enviadas!/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/usuario@exemplo.com/)).toBeInTheDocument();

      // Clica em "Voltar para o login"
      const backToLoginBtn = screen.getByRole('link', { name: /voltar para o login/i });
      fireEvent.click(backToLoginBtn);

      expect(
        await screen.findByRole('heading', { name: /entre na sua conta/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Sessões expiradas e controle de acesso a rotas protegidas', () => {
    it('exibe tela de sessão expirada e permite ir para o login quando o acesso administrativo requer autenticação', async () => {
      render(<TestAuthNavigationApp initialPath="/admin/horarios" />);

      expect(await screen.findByRole('heading', { name: /sessão expirada/i })).toBeInTheDocument();
      expect(
        screen.getByText(/sua sessão expirou ou você ainda não realizou login/i),
      ).toBeInTheDocument();
      expect(screen.queryByText('Área Administrativa de Horários')).not.toBeInTheDocument();

      // Botão para ir para o login
      const goToLoginLink = screen.getByRole('link', { name: /ir para o login/i });
      expect(goToLoginLink).toHaveAttribute('href', '/login');
    });

    it('exibe tela de acesso não autorizado quando usuário logado não tem perfil admin', async () => {
      render(<TestAuthNavigationApp initialPath="/admin/restrito" />);

      expect(
        await screen.findByRole('heading', { name: /acesso não autorizado/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/você não tem permissão para acessar esta área administrativa/i),
      ).toBeInTheDocument();
      expect(screen.queryByText('Área Protegida por Perfil Admin')).not.toBeInTheDocument();

      // Botão para voltar aos serviços
      const backToServicesLink = screen.getByRole('link', {
        name: /voltar ao catálogo de serviços/i,
      });
      expect(backToServicesLink).toHaveAttribute('href', '/servicos');
    });

    it('libera o conteúdo administrativo quando o acesso é autorizado', async () => {
      render(<TestAuthNavigationApp initialPath="/admin/autorizado" />);

      expect(await screen.findByText('Painel Administrativo Autorizado')).toBeInTheDocument();
    });
  });

  describe('Tratamento de erros e exceções de autenticação', () => {
    it('trata erro de conta desativada no login', async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
        code: 'auth/user-disabled',
      });

      render(<TestAuthNavigationApp initialPath="/login" />);

      fireEvent.change(screen.getByLabelText(/e-mail/i), {
        target: { value: 'inativo@exemplo.com' },
      });
      fireEvent.change(screen.getByLabelText(/^senha$/i), {
        target: { value: 'senha123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

      expect(
        await screen.findByText('Esta conta foi desativada. Entre em contato com a clínica.'),
      ).toBeInTheDocument();
    });

    it('trata erro de rede (network-request-failed) na recuperação de senha', async () => {
      vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce({
        code: 'auth/network-request-failed',
      });

      render(<TestAuthNavigationApp initialPath="/recuperar-senha" />);

      fireEvent.change(screen.getByLabelText(/e-mail cadastrado/i), {
        target: { value: 'offline@exemplo.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /enviar link de recuperação/i }));

      expect(await screen.findByText(/falha de conexão com o servidor/i)).toBeInTheDocument();
    });

    it('trata bloqueio por excesso de tentativas (too-many-requests) no login', async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
        code: 'auth/too-many-requests',
      });

      render(<TestAuthNavigationApp initialPath="/login" />);

      fireEvent.change(screen.getByLabelText(/e-mail/i), {
        target: { value: 'bloqueado@exemplo.com' },
      });
      fireEvent.change(screen.getByLabelText(/^senha$/i), {
        target: { value: 'senha123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

      expect(await screen.findByText(/muitas tentativas sem sucesso/i)).toBeInTheDocument();
    });
  });
});
