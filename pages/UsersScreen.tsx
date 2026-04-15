
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS, COLORS } from '../constants';
import { User, Role } from '../types';
import { useMenu, useAuth, useStores } from '../App';

const PLAN_LIMITS: Record<string, number> = {
  'GRATUITO': 1,
  'BASICO': 3,
  'PRO': 10,
  'PREMIUM': 999,
  'TRIAL_15': 999,
  'VITALICIO': 999
};

const AVAILABLE_PAGES = [
  { path: '/vender', label: 'Vender' },
  { path: '/caixa', label: 'Caixa' },
  { path: '/historico', label: 'Histórico' },
  { path: '/produtos', label: 'Produtos' },
  { path: '/delivery', label: 'Delivery' },
  { path: '/motoboy', label: 'Painel Motoboy' },
  { path: '/usuarios', label: 'Gestão de Equipe' },
  { path: '/lojas', label: 'Gestão de Lojas' },
  { path: '/stats', label: 'Estatísticas' },
  { path: '/planos', label: 'Planos' },
  { path: '/configuracoes', label: 'Configurações' },
];

const UsersScreen = () => {
  const navigate = useNavigate();
  const { toggleMenu } = useMenu();
  const { user: currentUser, plan, allUsers, updateUser, addUser, deleteUser } = useAuth();
  const { stores } = useStores();
  
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Inicialização robusta do estado do formulário
  const [formUser, setFormUser] = useState<User>({
    id: '',
    name: '',
    email: '',
    role: Role.SELLER,
    password: '',
    permissions: ['/vender', '/historico'],
    store: currentUser?.store || '',
    createdAt: '',
    subscriptionPlan: 'GRATUITO'
  });

  const isSuperAdmin = currentUser?.role === Role.SUPER_ADMIN;
  const isAdmin = currentUser?.role === Role.ADMIN || isSuperAdmin;

  // Atualiza a loja do formulário caso o usuário logado mude
  useEffect(() => {
    if (!editingUser && currentUser?.store) {
      setFormUser(prev => ({ ...prev, store: currentUser.store }));
    }
  }, [currentUser, editingUser]);

  const userLimit = PLAN_LIMITS[plan as string] || 1;
  const currentUsersCount = allUsers.length;
  const isLimitReached = currentUsersCount >= userLimit && !isSuperAdmin;

  const filteredUsers = allUsers.filter(u => 
    (isAdmin || u.store === currentUser?.store) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.SUPER_ADMIN: return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-900 text-white">Super Admin</span>;
      case Role.ADMIN: return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-600 border border-purple-100">Administrador</span>;
      case Role.MANAGER: return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100">Gerente</span>;
      case Role.SELLER: return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">Vendedor</span>;
      case Role.MOTOBOY: return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-100">Entregador</span>;
      default: return null;
    }
  };

  const handleTogglePermission = (path: string) => {
    const current = formUser.permissions || [];
    if (current.includes(path)) {
      setFormUser({ ...formUser, permissions: current.filter(p => p !== path) });
    } else {
      setFormUser({ ...formUser, permissions: [...current, path] });
    }
  };

  const handleOpenEdit = (user: User) => {
    if (!isAdmin) return;
    // Permite que Super Admin edite qualquer um, mas Admin normal só edita sua loja e não mexe no Super Admin
    if (user.role === Role.SUPER_ADMIN && !isSuperAdmin) {
      alert("Acesso restrito: Apenas o Super Admin pode alterar dados de sistema.");
      return;
    }
    setEditingUser(user);
    setFormUser({ ...user, password: '' });
    setIsCreateModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    setIsSaving(true);
    try {
      if (editingUser) {
        await updateUser(formUser);
      } else {
        if (isLimitReached) {
          alert(`Seu plano atingiu o limite de ${userLimit} usuários. Considere fazer um upgrade para adicionar mais colaboradores.`);
          setIsSaving(false);
          return;
        }

        const newUser: User = { 
          ...formUser, 
          id: '', // Will be set by addUser from Auth UID
          createdAt: new Date().toISOString(),
          store: formUser.store || currentUser?.store || 'Loja Principal'
        };
        
        await addUser(newUser);
      }
      closeModals();
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      let errorMsg = "Ocorreu um erro ao salvar os dados. Por favor, tente novamente.";
      
      if (error.message) {
        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          errorMsg = "Este e-mail já está em uso por outro usuário.";
        } else if (error.message.includes('permission denied')) {
          errorMsg = "Erro de permissão: Você não tem autorização para realizar esta ação.";
        } else {
          errorMsg = `Erro: ${error.message}`;
        }
      }
      alert(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!editingUser) return;
    
    setIsSaving(true);
    try {
      await deleteUser(editingUser.id);
      alert("Acesso removido com sucesso!");
      closeModals();
    } catch (error: any) {
      console.error("Erro ao remover usuário:", error);
      alert("Erro ao remover acesso. Verifique suas permissões.");
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const closeModals = () => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
    }
    setIsCreateModalOpen(false);
    setEditingUser(null);
    setFormUser({
      id: '',
      name: '',
      email: '',
      role: Role.SELLER,
      password: '',
      permissions: ['/vender', '/historico'],
      store: currentUser?.store || '',
      createdAt: '',
      subscriptionPlan: 'GRATUITO'
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] pb-20">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-0 space-y-6 mt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Equipe e Acessos</h2>
            <p className="text-slate-500 font-medium">
              {isSuperAdmin ? `${allUsers.length} usuários globais` : `${currentUsersCount} de ${userLimit} usuários ativos nesta loja`}
            </p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsCreateModalOpen(true)} 
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black shadow-lg transition-all ${isLimitReached ? 'bg-slate-300 cursor-not-allowed opacity-50' : 'bg-[#00BFA5] text-white hover:scale-105'}`}
            >
              {ICONS.Add} Novo Usuário
            </button>
          )}
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{ICONS.Search}</span>
            <input type="text" placeholder="Filtrar por nome ou e-mail..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl outline-none font-medium text-slate-700" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredUsers.map((u) => (
            <button key={u.id} onClick={() => handleOpenEdit(u)} className={`bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-start justify-between group text-left transition-all ${u.role === Role.SUPER_ADMIN ? 'ring-2 ring-slate-900 shadow-xl' : 'hover:border-[#00BFA5]'}`}>
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl uppercase ${u.role === Role.SUPER_ADMIN ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{u.name.charAt(0)}</div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 leading-none flex items-center gap-2">
                    {u.name} {u.isSystemUser && <span className="text-slate-200">{ICONS.Check}</span>}
                  </p>
                  <p className="text-xs text-slate-400 font-medium truncate w-40">{u.email}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{u.store || 'Nenhuma Loja'}</p>
                  <div className="pt-2 flex gap-1 flex-wrap">
                    {getRoleBadge(u.role)}
                    {u.subscriptionPlan && u.role === Role.ADMIN && (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${u.subscriptionPlan === 'VITALICIO' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>PLANO: {u.subscriptionPlan}</span>
                    )}
                  </div>
                </div>
              </div>
              {isAdmin && (u.role !== Role.SUPER_ADMIN || isSuperAdmin) && <div className="text-slate-200 group-hover:text-[#00BFA5]">{ICONS.Edit}</div>}
            </button>
          ))}
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden p-8 md:p-10 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingUser ? 'Ajustar Acesso' : 'Cadastrar Colaborador'}</h3>
                <button type="button" onClick={closeModals} className="text-slate-400 text-2xl p-2">✕</button>
              </div>
              
              <form onSubmit={handleSaveUser} className="space-y-6 overflow-y-auto no-scrollbar pr-2 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome</label>
                      <input required type="text" className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#00BFA5] font-medium text-slate-700" value={formUser.name} onChange={e => setFormUser({...formUser, name: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail</label>
                      <input required type="email" disabled={editingUser?.isSystemUser && !isSuperAdmin} className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#00BFA5] disabled:opacity-50 font-medium text-slate-700" value={formUser.email} onChange={e => setFormUser({...formUser, email: e.target.value})} />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cargo</label>
                      <select 
                         disabled={editingUser?.isSystemUser && !isSuperAdmin} 
                         className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#00BFA5] appearance-none font-medium text-slate-700" 
                         value={formUser.role} 
                         onChange={e => {
                           const newRole = e.target.value as Role;
                           let newPermissions = [...(formUser.permissions || [])];
                           
                           if (!editingUser) { // Only set defaults for new users
                             if (newRole === Role.ADMIN) {
                               newPermissions = ['/vender', '/caixa', '/historico', '/produtos', '/delivery', '/usuarios', '/lojas', '/stats', '/planos', '/configuracoes'];
                             } else if (newRole === Role.MANAGER) {
                               newPermissions = ['/vender', '/caixa', '/historico', '/produtos', '/delivery', '/stats'];
                             } else if (newRole === Role.SELLER) {
                               newPermissions = ['/vender', '/historico'];
                             } else if (newRole === Role.MOTOBOY) {
                               newPermissions = ['/motoboy'];
                             }
                           }
                           
                           setFormUser({...formUser, role: newRole, permissions: newPermissions});
                         }}
                       >
                        <option value={Role.SELLER}>Vendedor</option>
                        <option value={Role.MANAGER}>Gerente</option>
                        <option value={Role.MOTOBOY}>Entregador</option>
                        {(isSuperAdmin || isAdmin) && <option value={Role.ADMIN}>Administrador</option>}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Loja vinculada</label>
                      <select className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#00BFA5] appearance-none font-medium text-slate-700" value={formUser.store} onChange={e => setFormUser({...formUser, store: e.target.value})}>
                        <option value="">Nenhuma Loja</option>
                        {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                   </div>
                </div>

                {isSuperAdmin && (formUser.role === Role.ADMIN || formUser.role === Role.SUPER_ADMIN) && (
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Plano de Assinatura (Exclusivo Super Admin)</label>
                      <select className="w-full px-5 py-4 bg-amber-50 border border-amber-100 rounded-2xl outline-none focus:ring-2 focus:ring-amber-400 appearance-none font-black text-amber-700" value={formUser.subscriptionPlan} onChange={e => setFormUser({...formUser, subscriptionPlan: e.target.value})}>
                        <option value="GRATUITO">GRATUITO</option>
                        <option value="BASICO">BASICO</option>
                        <option value="PRO">PRO</option>
                        <option value="PREMIUM">PREMIUM</option>
                        <option value="TRIAL_15">TESTE 15 DIAS</option>
                        <option value="VITALICIO">VITALÍCIO (Manual)</option>
                      </select>
                   </div>
                )}

                {(!editingUser?.isSystemUser || isSuperAdmin) && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Senha</label>
                    <input required={!editingUser} type="password" placeholder={editingUser ? "Deixe em branco para manter" : "Definir senha inicial"} className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#00BFA5] font-medium text-slate-700" value={formUser.password || ''} onChange={e => setFormUser({...formUser, password: e.target.value})} />
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Páginas Permitidas</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    {AVAILABLE_PAGES.map(page => (
                      <label key={page.path} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-[#00BFA5] transition-all">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 accent-[#00BFA5]" 
                          checked={formUser.permissions?.includes(page.path)} 
                          onChange={() => handleTogglePermission(page.path)}
                        />
                        <span className="text-xs font-bold text-slate-600">{page.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-4 sticky bottom-0">
                  {editingUser && (!editingUser.isSystemUser || isSuperAdmin) && (
                    <div className="flex-1 relative">
                      {showDeleteConfirm ? (
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-2 border-red-100 rounded-[32px] p-4 shadow-2xl animate-in fade-in zoom-in duration-200 z-10 flex flex-col gap-3">
                          <p className="text-xs font-black text-red-600 text-center leading-tight uppercase tracking-tighter">Confirmar exclusão de {editingUser.name}?</p>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={handleDeleteUser}
                              disabled={isSaving}
                              className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-xs font-black uppercase hover:bg-red-600 transition-colors"
                            >
                              Sim
                            </button>
                            <button 
                              type="button"
                              onClick={() => setShowDeleteConfirm(false)}
                              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="w-full py-5 bg-red-50 text-red-500 rounded-3xl font-black text-lg border border-red-100"
                        >
                          Excluir Usuário
                        </button>
                      )}
                    </div>
                  )}
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="flex-[2] py-5 bg-[#00BFA5] text-white rounded-3xl font-black text-xl shadow-xl shadow-[#00BFA5]/20 transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Salvando...</span>
                      </>
                    ) : (
                      'Confirmar Dados'
                    )}
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersScreen;
