
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS, COLORS } from '../constants';
import { User, Role } from '../types';
import { useSales } from '../App';

interface HomeScreenProps {
  user: User;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ user }) => {
  const navigate = useNavigate();
  const { sales } = useSales();

  const totalFaturamento = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const ticketMedio = sales.length > 0 ? totalFaturamento / sales.length : 0;
  const recentSales = sales.slice(0, 4);

  const quickActions = [
    { title: 'Vender Agora', desc: 'Iniciar nova venda no PDV', icon: ICONS.Vender, color: '#00BFA5', path: '/vender', roles: [Role.ADMIN, Role.MANAGER, Role.SELLER] },
    { title: 'Gerenciar Produtos', desc: 'Estoque, categorias e preços', icon: ICONS.Produtos, color: '#4F46E5', path: '/produtos', roles: [Role.ADMIN, Role.MANAGER] },
    { title: 'Painel de Delivery', desc: 'Status de pedidos em rota', icon: ICONS.Entregas, color: '#F59E0B', path: '/delivery', roles: [Role.ADMIN, Role.MANAGER, Role.MOTOBOY] },
    { title: 'Histórico Completo', desc: 'Ver todas as vendas passadas', icon: ICONS.Check, color: '#EC4899', path: '/historico', roles: [Role.ADMIN, Role.MANAGER, Role.SELLER] }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Olá, {user.name}! 👋</h1>
          <p className="text-slate-500 mt-1 font-medium">Bem-vindo ao painel da {user.store}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.filter(a => a.roles.includes(user.role)).map((action, i) => (
          <button key={i} onClick={() => navigate(action.path)} className="group flex flex-col p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#00BFA5] transition-all text-left overflow-hidden relative">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 transition-transform group-hover:scale-110 shadow-lg" style={{ backgroundColor: action.color }}>{action.icon}</div>
            <h3 className="font-bold text-slate-800 text-lg">{action.title}</h3>
            <p className="text-slate-500 text-sm mt-1 leading-snug">{action.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-slate-800">Vendas Recentes</h2>
            <button onClick={() => navigate('/historico')} className="text-[#00BFA5] text-sm font-bold hover:underline">Ver tudo</button>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
            {recentSales.length === 0 ? (
              <p className="p-8 text-center text-slate-400 font-medium">Nenhuma venda realizada hoje</p>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">{ICONS.Vender}</div>
                    <div>
                      <p className="font-bold text-slate-800">Venda Balcão</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">#{sale.id} • {new Date(sale.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <p className="font-black text-slate-900">R$ {sale.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-800 px-2">Resumo de Hoje</h2>
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Faturamento Hoje</p>
                <h3 className="text-3xl font-black">R$ {totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-3 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Pedidos</p>
                  <p className="text-lg font-black">{sales.length}</p>
                </div>
                <div className="bg-white/10 p-3 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Ticket Médio</p>
                  <p className="text-lg font-black">R$ {ticketMedio.toFixed(0)}</p>
                </div>
              </div>
              <button onClick={() => navigate('/stats')} className="w-full py-3 bg-[#00BFA5] rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#00897B] transition-all">Relatório Completo</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
