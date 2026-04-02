import React, { useState } from 'react';
import { useAuth } from '../AuthGuard';
import { signInWithPassword, signUpWithPassword, resetPasswordForEmail } from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';
import { loginSchema, signupSchema } from '../../lib/validation';
import { z } from 'zod';

export function ConfigScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#f5f5f0] p-8 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md border border-brand/10">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        </div>
        <h1 className="text-2xl font-serif mb-4 text-[#1a1a1a]">Configuração Necessária</h1>
        <p className="text-brand mb-6">
          As variáveis de ambiente do Supabase não foram encontradas. Por favor, configure as seguintes chaves no menu de configurações do AI Studio:
        </p>
        <div className="bg-[#f5f5f0] p-4 rounded-xl text-left font-mono text-sm mb-6 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400"></span>
            <span>VITE_SUPABASE_URL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400"></span>
            <span>VITE_SUPABASE_ANON_KEY</span>
          </div>
        </div>
        <p className="text-xs text-brand/60">
          Após configurar as variáveis, a aplicação será reiniciada automaticamente.
        </p>
      </div>
    </div>
  );
}

export function AuthForms() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        loginSchema.parse({ email, password });
        await signInWithPassword(email, password);
        // Toast is not needed here as it will redirect
      } else if (authMode === 'signup') {
        signupSchema.parse({ email, password, name });
        await signUpWithPassword(email, password, name);
        toast({ type: 'success', message: 'Conta criada! Verifique seu e-mail para confirmar o cadastro.', duration: 5000 });
      } else if (authMode === 'reset') {
        z.string().email().parse(email);
        await resetPasswordForEmail(email);
        toast({ type: 'info', message: 'E-mail de recuperação enviado!', duration: 5000 });
      }
    } catch (err: any) {
      if (err?.name === 'ZodError' && Array.isArray(err.errors)) {
        toast({ type: 'error', message: err.errors[0]?.message || 'Erro de validação' });
      } else {
        toast({ type: 'error', message: err.message || 'Ocorreu um erro na autenticação.' });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f5f0] p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-brand/10">
        <h1 className="text-3xl font-serif mb-2 text-[#1a1a1a] text-center">Financeiro Corretoriza</h1>
        <p className="text-brand mb-8 text-center text-sm">
          {authMode === 'login' ? 'Entre na sua conta' : authMode === 'signup' ? 'Crie sua conta' : 'Recupere sua senha'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-brand uppercase tracking-wider mb-1">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand/20 focus:outline-none focus:border-brand transition-colors"
                placeholder="Seu nome"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-brand uppercase tracking-wider mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand/20 focus:outline-none focus:border-brand transition-colors"
              placeholder="seu@email.com"
              required
            />
          </div>
          {authMode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-brand uppercase tracking-wider mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand/20 focus:outline-none focus:border-brand transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-brand text-white py-3 rounded-xl font-semibold hover:bg-[#4a4a35] transition-colors shadow-lg disabled:opacity-50 mt-4"
          >
            {authLoading ? 'Processando...' : authMode === 'login' ? 'Entrar' : authMode === 'signup' ? 'Criar Conta' : 'Enviar E-mail'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-brand/10 text-center space-y-2">
          {authMode === 'login' ? (
            <>
              <button onClick={() => setAuthMode('signup')} type="button" className="text-sm text-brand hover:underline">
                Não tem uma conta? Cadastre-se
              </button>
              <br />
              <button onClick={() => setAuthMode('reset')} type="button" className="text-sm text-brand/60 hover:underline">
                Esqueci minha senha
              </button>
            </>
          ) : (
            <button onClick={() => setAuthMode('login')} type="button" className="text-sm text-brand hover:underline">
              Já tem uma conta? Entre aqui
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
