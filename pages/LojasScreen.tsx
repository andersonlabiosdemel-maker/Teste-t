
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS, COLORS } from '../constants';
import { Store } from '../types';
import { useMenu, useAuth, useStores } from '../App';

const LojasScreen = () => {
  const navigate = useNavigate();
  const { toggleMenu } = useMenu();
  const { user, plan } = useAuth();
  const { stores, addStore, updateStore } = useStores();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  // Fix: Added 'city' to formData state to match Store interface
  const [formData, setFormData] = useState({ name: '', address: '', city: '', phone: '' });

  const isPremium = plan === 'PREMIUM' || plan === 'VITALÍCIO';
  const canAddMore = isPremium;

  const handleOpenCreate = () => {
    setEditingStore(null);
    // Fix: Reset 'city' field on create
    setFormData({ name: '', address: '', city: '', phone: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loja: Store) => {
    setEditingStore(loja);
    // Fix: Map 'city' from store to form data on edit
    setFormData({
      name: loja.name,
      address: loja.address,
      city: loja.city,
      phone: loja.phone
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingStore) {
      updateStore({ 
        ...editingStore, 
        name: formData.name, 
        address: formData.address, 
        city: formData.city,
        phone: formData.phone 
      });
    } else {
      if (!canAddMore) return;
      // Fix: Added missing 'city' property to Store object initialization
      const storeToAdd: Store = {
        id: crypto.randomUUID(),
        adminId: (user as any)?.adminId || '',
        name: formData.name,
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      addStore(storeToAdd);
    }

    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStore(null);
    // Fix: Reset 'city' field on close
    setFormData({ name: '', address: '', city: '', phone: '' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] pb-20">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-0 space-y-6 mt-4 md:mt-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Minhas Lojas</h2>
            <p className="text-slate-500 font-medium">Gerencie suas unidades de negócio</p>
          </div>
          
          <div className="flex items-center gap-3">
            {!isPremium && (
              <button onClick={() => navigate('/planos')} className="flex items-center gap-3 bg-amber-50 border border-amber-100 px-4 py-2 rounded-2xl group">
                <div className="text-amber-500">{ICONS.TrendingUp}</div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-amber-600 uppercase">Multi-Lojas</p>
                  <p className="text-xs font-bold text-amber-700 underline group-hover:no-underline transition-all">Assinar Premium</p>
                </div>
              </button>
            )}
            
            {canAddMore && (
              <button onClick={handleOpenCreate} className="flex items-center gap-2 px-6 py-3 bg-[#00BFA5] text-white rounded-2xl font-black shadow-lg shadow-[#00BFA5]/20 hover:scale-105 transition-all">
                {ICONS.Add} Nova Loja
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map((loja) => (
            <div key={loja.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-[#00BFA5] transition-all">
              <div className="flex items-start justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00BFA5] flex items-center justify-center">{ICONS.MapPin}</div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg leading-tight">{loja.name}</h3>
                      <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Loja Ativa</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-start gap-2 text-slate-400">
                      <div className="mt-0.5">{ICONS.MapPin}</div>
                      {/* Fix: Display city along with address */}
                      <p className="text-sm font-medium leading-snug">{loja.address}, {loja.city}</p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <div>{ICONS.WhatsApp}</div>
                      <p className="text-sm font-medium">{loja.phone}</p>
                    </div>
                  </div>
                </div>

                <button onClick={() => handleOpenEdit(loja)} className="text-slate-200 group-hover:text-[#00BFA5] transition-colors p-2 hover:bg-slate-50 rounded-full">{ICONS.Edit}</button>
              </div>

              {loja.name === 'Loja Principal' && (
                <div className="absolute top-4 right-12">
                   <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Padrao</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {!isPremium && (
          <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden mt-8">
            <div className="relative z-10 space-y-4 max-w-md">
              <h4 className="text-2xl font-black">Expanda seu Império</h4>
              <p className="text-slate-400 leading-relaxed">Com o plano Premium você pode gerenciar múltiplas lojas em um único painel, com estoques e relatórios independentes.</p>
              <button onClick={() => navigate('/planos')} className="px-8 py-3 bg-[#00BFA5] rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all">Conhecer Plano Premium</button>
            </div>
            <div className="absolute -right-10 -bottom-10 text-white/5 rotate-12 scale-150">{React.cloneElement(ICONS.MapPin, { size: 240 })}</div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-800">{editingStore ? 'Editar Unidade' : 'Nova Unidade'}</h3>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Nome da Loja</label>
                  <input required type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#00BFA5] outline-none font-medium text-slate-700" placeholder="Ex: Mix PDV - Filial Sul" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Endereço Completo</label>
                  <input required type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#00BFA5] outline-none font-medium text-slate-700" placeholder="Rua, Número, Bairro" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                {/* Fix: Added City field to the form */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Cidade</label>
                  <input required type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#00BFA5] outline-none font-medium text-slate-700" placeholder="Ex: São Paulo" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Telefone / WhatsApp</label>
                  <input required type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#00BFA5] outline-none font-medium text-slate-700" placeholder="(00) 00000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full py-5 bg-[#00BFA5] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#00BFA5]/20 hover:brightness-95 active:scale-[0.98] transition-all">
                    {editingStore ? 'Salvar Alterações' : 'Cadastrar Unidade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LojasScreen;
