
import React, { useState, useMemo } from 'react';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { ICONS } from '../constants';
import { useAuth, useMenu } from '../App';
import { Category, Product, Role } from '../types';
import { sanitize } from '../src/lib/utils';
import { Navigate } from 'react-router-dom';

const ShareCatalogScreen = () => {
  const { user, allUsers } = useAuth();
  const { toggleMenu } = useMenu();
  const [sourceAdminId, setSourceAdminId] = useState('');
  const [targetAdminId, setTargetAdminId] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState('');

  const [showConfirm, setShowConfirm] = useState(false);

  const addLog = (msg: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    console.log(`[ShareCatalog] ${msg}`);
  };

  React.useEffect(() => {
    console.log("[ShareCatalog] Component mounted. User role:", user?.role);
    console.log("[ShareCatalog] All users in context:", allUsers.length);
  }, [user, allUsers]);

  // Filter users who can have a catalog (Admins and Super Admins)
  const catalogOwners = useMemo(() => {
    const owners = allUsers.filter(u => u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN);
    console.log("[ShareCatalog] Total users in Auth:", allUsers.length);
    console.log("[ShareCatalog] Admins/SuperAdmins found:", owners.length);
    return owners;
  }, [allUsers]);

  const handleTransfer = async () => {
    if (!sourceAdminId || !targetAdminId) {
      setError("Por favor, selecione o usuário de origem e o de destino.");
      return;
    }

    if (sourceAdminId === targetAdminId) {
      setError("O usuário de origem e destino não podem ser o mesmo.");
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setShowConfirm(false);
    setStatus('LOADING');
    setLog([]);
    setError('');
    addLog("Iniciando transferência de catálogo...");
    console.log("Starting transfer from", sourceAdminId, "to", targetAdminId);

    try {
      // 1. Fetch Categories from Source
      addLog("Buscando categorias do catálogo de origem no Firestore...");
      const catQuery = query(collection(db, 'categories'), where('adminId', '==', sourceAdminId));
      const catSnapshot = await getDocs(catQuery);
      const sourceCategories = catSnapshot.docs.map(d => d.data() as Category);
      addLog(`Encontradas ${sourceCategories.length} categorias.`);

      // 2. Fetch Products from Source
      addLog("Buscando produtos do catálogo de origem no Firestore...");
      const prodQuery = query(collection(db, 'products'), where('adminId', '==', sourceAdminId));
      const prodSnapshot = await getDocs(prodQuery);
      const sourceProducts = prodSnapshot.docs.map(d => d.data() as Product);
      addLog(`Encontrados ${sourceProducts.length} produtos.`);

      if (sourceCategories.length === 0 && sourceProducts.length === 0) {
        throw new Error("Nenhum dado encontrado no catálogo de origem.");
      }

      // 3. Import Categories to Target
      addLog(`Importando categorias para o destino no Firestore...`);
      const targetCatQuery = query(collection(db, 'categories'), where('adminId', '==', targetAdminId));
      const targetCatSnapshot = await getDocs(targetCatQuery);
      const targetCategories = targetCatSnapshot.docs.map(d => d.data() as Category);
      
      const categoryMap: Record<string, string> = {}; // sourceName -> targetId

      for (const cat of sourceCategories) {
        const existing = targetCategories.find(tc => tc.name.toUpperCase() === cat.name.toUpperCase());
        if (existing) {
          categoryMap[cat.name.toUpperCase()] = existing.id;
          addLog(`Categoria "${cat.name}" já existe no destino. Pulando criação.`);
          continue;
        }

        const newId = Math.random().toString(36).substr(2, 9);
        const newCat: Category = {
          ...cat,
          id: newId,
          adminId: targetAdminId,
          productCount: 0 
        };
        await setDoc(doc(db, 'categories', newId), sanitize(newCat));
        categoryMap[cat.name.toUpperCase()] = newId;
      }
      addLog("Categorias processadas.");

      // 4. Import Products to Target
      addLog(`Importando produtos para o destino no Firestore...`);
      const targetProdQuery = query(collection(db, 'products'), where('adminId', '==', targetAdminId));
      const targetProdSnapshot = await getDocs(targetProdQuery);
      const targetProducts = targetProdSnapshot.docs.map(d => d.data() as Product);

      for (const prod of sourceProducts) {
        const existing = targetProducts.find(tp => tp.name.toUpperCase() === prod.name.toUpperCase());
        if (existing) {
          addLog(`Produto "${prod.name}" já existe no destino. Pulando.`);
          continue;
        }

        const newId = Math.random().toString(36).substr(2, 9);
        const newProd: Product = {
          ...prod,
          id: newId,
          adminId: targetAdminId,
          stock: 0, 
          stockHistory: []
        };
        await setDoc(doc(db, 'products', newId), sanitize(newProd));
      }
      addLog("Produtos processados.");

      setStatus('SUCCESS');
      addLog("TRANSFERÊNCIA CONCLUÍDA COM SUCESSO!");
    } catch (err: any) {
      console.error("Transfer Error:", err);
      setStatus('ERROR');
      setError(err.message || "Erro ao transferir catálogo.");
      addLog(`ERRO: ${err.message}`);
    }
  };

  if (user?.role !== Role.SUPER_ADMIN) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] -m-4 md:-m-8">
      <div className="bg-slate-800 p-6 pt-10 sticky top-0 z-40">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={toggleMenu} className="text-white lg:hidden">{ICONS.Menu}</button>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Gerenciar Catálogos</h2>
        </div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Transferir produtos e categorias entre usuários</p>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 md:p-8 space-y-8 pb-32">
        {catalogOwners.length === 0 && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-3xl text-red-800 text-sm font-bold text-center">
            Nenhum usuário administrador encontrado para transferência. 
            (Total de usuários carregados: {allUsers.length})
          </div>
        )}
        <section className="bg-white rounded-[40px] shadow-xl p-8 space-y-8">
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl">
            <p className="text-amber-800 text-sm font-bold leading-relaxed">
              ⚠️ ATENÇÃO: Esta ferramenta cria CÓPIAS dos produtos e categorias. 
              Os estoques no destino serão iniciados em zero.
            </p>
          </div>

          <div className="space-y-6">
            {/* Source User */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Usuário de Origem (Quem envia)</label>
              <select 
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 border border-transparent focus:border-[#00BFA5] transition-all appearance-none"
                value={sourceAdminId}
                onChange={e => {
                  setSourceAdminId(e.target.value);
                  setError('');
                  setShowConfirm(false);
                }}
              >
                <option value="">Selecione a origem...</option>
                {catalogOwners.map(u => (
                  <option key={u.id} value={u.adminId || u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
              </div>
            </div>

            {/* Target User */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Usuário de Destino (Quem recebe)</label>
              <select 
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 border border-transparent focus:border-orange-500 transition-all appearance-none"
                value={targetAdminId}
                onChange={e => {
                  setTargetAdminId(e.target.value);
                  setError('');
                  setShowConfirm(false);
                }}
              >
                <option value="">Selecione o destino...</option>
                {catalogOwners.map(u => (
                  <option key={u.id} value={u.adminId || u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleTransfer}
              disabled={status === 'LOADING'}
              className={`w-full py-5 rounded-3xl font-black text-lg shadow-xl transition-all ${
                status === 'LOADING' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 
                showConfirm ? 'bg-red-600 text-white hover:scale-[1.02] shadow-red-600/20 animate-pulse' :
                'bg-[#00BFA5] text-white hover:scale-[1.02] shadow-[#00BFA5]/20'
              }`}
            >
              {status === 'LOADING' ? 'TRANSFERINDO...' : 
               showConfirm ? '⚠️ CLIQUE PARA CONFIRMAR' : 'EXECUTAR TRANSFERÊNCIA'}
            </button>

            {showConfirm && (
              <div className="text-center space-y-2">
                <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">
                  Atenção: Esta ação não pode ser desfeita!
                </p>
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-2 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-xs font-bold text-center">
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Log Section */}
        {(log.length > 0 || error) && (
          <section className="bg-slate-900 rounded-[40px] shadow-xl p-8 space-y-4">
            <h3 className="text-white font-black uppercase text-xs tracking-widest">Relatório de Operação</h3>
            <div className="bg-black/50 rounded-2xl p-4 h-48 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1 no-scrollbar">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {error && <div className="text-red-500 font-bold">ERRO: {error}</div>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ShareCatalogScreen;
