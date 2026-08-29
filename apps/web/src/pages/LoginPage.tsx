import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

// Schema de validação de Login usando Zod
const loginSchema = z.object({
  email: z.string().min(1, 'O e-mail é obrigatório').email('Insira um e-mail válido'),
  senha: z
    .string()
    .min(1, 'A senha é obrigatória')
    .min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    senha: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpa erro do campo quando o usuário digita
    if (errors[name as keyof LoginFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setGeneralError(null);

    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof LoginFormData;
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    if (!auth) {
      setGeneralError('Firebase não configurado neste ambiente.');
      return;
    }

    setLoading(true);

    try {
      // Efetua autenticação no Firebase Auth
      await signInWithEmailAndPassword(auth, formData.email, formData.senha);

      setSuccessMessage('Login efetuado com sucesso!');
      setFormData({
        email: '',
        senha: '',
      });
    } catch (err: any) {
      console.error(err);
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        setGeneralError('E-mail ou senha incorretos.');
      } else {
        setGeneralError('Ocorreu um erro ao tentar entrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-[#EDE9FE] px-4 py-8 text-[#000000]">
      <div className="w-full max-w-md flex flex-col space-y-6">
        {/* Imagem da Mandala / Meditação */}
        <div className="flex justify-center">
          <img
            src="/logo-login.png"
            alt="Silhueta de meditação com mandala"
            className="h-44 w-auto object-contain"
          />
        </div>

        <section className="w-full rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#000000]">Login</h1>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {successMessage && (
              <div className="rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
                {successMessage}
              </div>
            )}

            {generalError && (
              <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
                {generalError}
              </div>
            )}

            {/* Campo Email */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  disabled={loading}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Digite aqui"
                  className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-[#8F75D0]/20 focus:border-[#8F75D0] focus:outline-hidden transition-all ${
                    errors.email
                      ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.email && (
                <span className="text-xs text-red-500 font-medium" role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            {/* Campo Senha */}
            <div className="space-y-1">
              <label htmlFor="senha" className="block text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </span>
                <input
                  type={showSenha ? 'text' : 'password'}
                  id="senha"
                  name="senha"
                  disabled={loading}
                  value={formData.senha}
                  onChange={handleChange}
                  placeholder="Digite aqui"
                  className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-[#8F75D0]/20 focus:border-[#8F75D0] focus:outline-hidden transition-all ${
                    errors.senha
                      ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-hidden"
                >
                  {showSenha ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <a
                  href="#"
                  className="text-xs text-slate-500 hover:text-[#8F75D0] transition-colors"
                >
                  Esqueci minha senha
                </a>
              </div>
              {errors.senha && (
                <span className="text-xs text-red-500 font-medium block" role="alert">
                  {errors.senha}
                </span>
              )}
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#8F75D0] hover:bg-[#7a60b8] active:bg-[#6c53a6] text-white font-semibold py-3 text-sm transition-all shadow-xs cursor-pointer mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loading ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : null}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            {/* Link do rodapé */}
            <div className="text-center text-sm text-slate-700 mt-4">
              Não possui uma conta?{' '}
              <Link to="/cadastro" className="text-[#8F75D0] font-bold hover:underline">
                Cadastre-se!
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
