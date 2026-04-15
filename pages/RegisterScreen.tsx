
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Gift, CheckCircle2 } from 'lucide-react';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { auth, db } from '../firebase';
import { Role, User, Store } from '../types';
import { sanitize } from '../src/lib/utils';
import logo from '../src/assets/logo.svg';

const RegisterScreen = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', storeName: '', password: '' });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userEmail = formData.email.trim().toLowerCase();
      
      // 1. Create a secondary app to register without signing in the main session
      // This prevents App.tsx from trying to fetch the user profile before it's created
      const secondaryAppName = 'SecondaryRegistration';
      let secondaryApp;
      const apps = getApps();
      secondaryApp = apps.find(app => app.name === secondaryAppName);
      if (!secondaryApp) {
        secondaryApp = initializeApp(auth.app.options, secondaryAppName);
      }
      
      const secondaryAuth = getAuth(secondaryApp);
      const secondaryDb = getFirestore(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userEmail, formData.password);
      const firebaseUser = userCredential.user;
      const uid = firebaseUser.uid;

      // 2. Create user record
      const newUser: User = {
        id: uid,
        adminId: uid,
        name: formData.name,
        email: userEmail,
        store: formData.storeName || 'Loja Principal',
        role: Role.ADMIN,
        isSystemUser: false,
        createdAt: new Date().toISOString(),
        subscriptionPlan: 'TRIAL_15', // 15-day trial
        isOnline: true,
        permissions: ['/vender', '/historico', '/delivery', '/produtos', '/usuarios', '/stats', '/planos', '/lojas', '/motoboy', '/configuracoes', '/caixa']
      };

      // Save to Firestore using secondaryDb (which has the secondaryAuth state)
      console.log("Register: Saving user document to Firestore...");
      await setDoc(doc(secondaryDb, 'users', uid), sanitize(newUser));
      console.log("Register: User document created successfully.");

      // 3. Initialize basic database for the new user
      const adminId = uid;
      console.log("Register: Initializing database for adminId:", adminId);
      
      // Initialize Categories
      const INITIAL_CATEGORIES = [
        { id: '1', adminId, name: 'BEBIDAS', order: 0, productCount: 0 },
        { id: '2', adminId, name: 'ALIMENTOS', order: 1, productCount: 0 },
        { id: '3', adminId, name: 'LIMPEZA', order: 2, productCount: 0 },
      ];
      for (const cat of INITIAL_CATEGORIES) {
        await setDoc(doc(secondaryDb, 'categories', `${adminId}_${cat.id}`), sanitize(cat));
      }
      console.log("Register: Categories initialized.");

      // Initialize a default store
      const storeId = 'store_' + Math.random().toString(36).substr(2, 5);
      const defaultStore: Store = {
        id: storeId,
        adminId: adminId,
        name: formData.storeName || 'Loja Principal',
        address: 'Endereço da Loja',
        city: 'Cidade',
        phone: '(00) 00000-0000',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(secondaryDb, 'stores', storeId), sanitize(defaultStore));
      console.log("Register: Default store initialized.");

      // Initialize Company Config
      const companyConfig = {
        adminId,
        users: [newUser],
        stores: [defaultStore],
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(secondaryDb, 'company_configs', adminId), sanitize(companyConfig));
      console.log("Register: Company config initialized.");

      console.log("Register: Database initialization complete.");

      // 4. Now sign in the main auth instance
      console.log("Register: Signing in to main auth session...");
      await signInWithEmailAndPassword(auth, userEmail, formData.password);
      console.log("Register: Main auth session signed in.");
      
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      console.error("Registration error details:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(`Erro ao criar conta: ${err.message || 'Tente novamente.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-md space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="Mix PDV Logo" className="w-24 h-24 rounded-3xl shadow-lg" />
          </div>
          <div className="space-y-1">
            <h1 className="text-6xl font-black text-[#00BFA5] tracking-tighter">Mix PDV</h1>
            <p className="text-slate-500 text-xl font-medium">Crie sua conta agora</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl p-10 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#00BFA5]"></div>
          
          {success ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-20 h-20 bg-emerald-50 text-[#00BFA5] rounded-full flex items-center justify-center mx-auto">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="text-2xl font-black text-slate-800">Conta Criada!</h2>
              <p className="text-slate-400">Preparando seu ambiente de 15 dias...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <input required disabled={loading} type="text" placeholder="Nome Completo" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#00BFA5] outline-none font-medium text-lg transition-all disabled:opacity-50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input required disabled={loading} type="email" placeholder="E-mail Administrativo" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#00BFA5] outline-none font-medium text-lg transition-all disabled:opacity-50" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input required disabled={loading} type="text" placeholder="Nome da Sua Empresa" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#00BFA5] outline-none font-medium text-lg transition-all disabled:opacity-50" value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} />
                <input required disabled={loading} type="password" placeholder="Defina sua Senha" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#00BFA5] outline-none font-medium text-lg transition-all disabled:opacity-50" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>

              {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

              <div className="bg-emerald-50/60 border-2 border-[#00BFA5]/20 rounded-[32px] p-6 space-y-4 animate-in slide-in-from-top-2 duration-500 delay-150">
                <div className="flex items-center gap-3 text-[#00BFA5]">
                  <Gift size={28} className="shrink-0" />
                  <h3 className="text-2xl font-black tracking-tight">Teste Grátis - 15 Dias</h3>
                </div>
                
                <p className="text-slate-600 font-medium text-base leading-snug">
                  Você terá acesso completo a todos os recursos do Mix PDV por 15 dias gratuitamente!
                </p>

                <ul className="space-y-2.5 pt-1">
                  {[
                    "Vendas ilimitadas",
                    "Gestão de estoque",
                    "Relatórios e estatísticas",
                    "Sistema de entregas"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 font-semibold">
                      <CheckCircle2 size={20} className="text-[#00BFA5] shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button type="submit" disabled={loading} className="w-full py-5 bg-[#00BFA5] text-white rounded-3xl font-black text-xl shadow-xl shadow-[#00BFA5]/20 hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center">
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : 'Começar Teste Grátis'}
              </button>
              
              <div className="text-center pt-2">
                <Link to="/login" className="text-slate-400 font-bold hover:text-[#00BFA5] transition-colors">Voltar ao login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
