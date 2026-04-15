
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import logo from '../src/assets/logo.svg';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSent(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      if (err.code === 'auth/user-not-found') {
        setError('E-mail não encontrado.');
      } else {
        setError(`Erro ao enviar e-mail: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-md space-y-12 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="Mix PDV Logo" className="w-24 h-24 rounded-3xl shadow-lg" />
          </div>
          <div className="space-y-1">
            <h1 className="text-6xl font-black text-[#00BFA5] tracking-tighter">Mix PDV</h1>
            <p className="text-slate-500 text-xl font-medium">Recuperar Senha</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl p-10 space-y-8">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <p className="text-slate-500 text-center font-medium">Informe seu e-mail para receber as instruções de recuperação.</p>
                <input
                  required
                  type="email"
                  placeholder="Seu E-mail"
                  disabled={loading}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#00BFA5] outline-none font-medium disabled:opacity-50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

              <button type="submit" disabled={loading} className="w-full py-5 bg-[#00BFA5] text-white rounded-2xl font-black text-xl shadow-xl hover:brightness-95 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center">
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : 'Enviar Instruções'}
              </button>
              
              <div className="text-center">
                <Link to="/login" className="text-slate-400 font-bold hover:text-[#00BFA5]">Voltar ao Login</Link>
              </div>
            </form>
          ) : (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 bg-emerald-50 text-[#00BFA5] rounded-full flex items-center justify-center mx-auto">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800">E-mail Enviado!</h2>
                <p className="text-slate-400">Verifique sua caixa de entrada para redefinir sua senha.</p>
              </div>
              <Link to="/login" className="block w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs">Voltar Agora</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;
