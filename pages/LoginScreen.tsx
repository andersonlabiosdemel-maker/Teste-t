
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../App';
import logo from '../src/assets/logo.svg';

const LoginScreen = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redireciona se já estiver autenticado
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      // O listener onAuthStateChanged no App.tsx cuidará do redirecionamento
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas falhas. Tente novamente mais tarde.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Erro de conexão com o Firebase. Verifique sua internet ou se o domínio está autorizado no console do Firebase.');
      } else {
        setError(err.message || 'Erro ao entrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-md space-y-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="Mix PDV Logo" className="w-24 h-24 rounded-3xl shadow-lg" />
          </div>
          <div className="space-y-1">
            <h1 className="text-6xl font-black text-[#00BFA5] tracking-tighter">Mix PDV</h1>
            <p className="text-slate-500 text-xl font-medium">Sistema de Ponto de Venda</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden p-10 md:p-12 space-y-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <input
                  required
                  type="email"
                  placeholder="Email"
                  disabled={loading}
                  className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#00BFA5]/10 focus:border-[#00BFA5] outline-none font-medium text-slate-700 transition-all text-lg disabled:opacity-50"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                />
              </div>

              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  disabled={loading}
                  className="w-full pl-16 pr-16 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#00BFA5]/10 focus:border-[#00BFA5] outline-none font-medium text-slate-700 transition-all text-lg disabled:opacity-50"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-[#00BFA5] text-white rounded-2xl font-black text-xl shadow-xl shadow-[#00BFA5]/20 hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : 'Entrar'}
            </button>
          </form>

          <div className="flex items-center justify-around pt-2">
            <Link to="/registrar" className="text-[#00BFA5] font-black text-lg hover:underline">
              Criar Conta
            </Link>
            <Link to="/recuperar-senha" className="text-[#00BFA5] font-black text-lg hover:underline">
              Esqueci a Senha
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
