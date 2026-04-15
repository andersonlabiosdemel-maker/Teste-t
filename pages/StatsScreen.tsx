
import React, { useState, useMemo, useEffect } from 'react';
import { ICONS, COLORS } from '../constants';
import { useSales, useMenu, useStores, useAuth, useProducts } from '../App';
import { PaymentMethod, Role } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface StatRowProps {
  title: string;
  value: string | number;
  subtitle: React.ReactNode;
  chartType?: 'line' | 'circle' | 'none';
  valueColor?: string;
  onClick?: () => void;
}

const StatRow: React.FC<StatRowProps> = ({ title, value, subtitle, chartType = 'line', valueColor = '#00BFA5', onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-5 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors text-left group"
  >
    <div className="space-y-1">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="text-2xl font-black" style={{ color: valueColor }}>{value}</p>
      <div className="text-xs text-slate-400 font-medium">{subtitle}</div>
    </div>
    
    <div className="flex items-center gap-6">
      {chartType === 'line' && (
        <div className="hidden sm:block w-24 h-8 relative">
          <svg className="w-full h-full opacity-60" viewBox="0 0 100 20">
            <path 
              d="M0,15 Q10,5 20,12 T40,8 T60,15 T80,5 T100,12" 
              fill="none" 
              stroke={valueColor} 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
      {chartType === 'circle' && (
        <div className="hidden sm:block w-8 h-8 rounded-full border-[3px] border-slate-100 relative">
          <div 
            className="absolute inset-0 rounded-full border-[3px] border-t-transparent border-r-transparent" 
            style={{ borderColor: valueColor, borderTopColor: 'transparent', borderRightColor: 'transparent', transform: 'rotate(45deg)' }}
          ></div>
        </div>
      )}
      <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
        {ICONS.ChevronRight}
      </div>
    </div>
  </button>
);

const StatsScreen = () => {
  const { toggleMenu } = useMenu();
  const { stores } = useStores();
  const { user: currentUser, allUsers } = useAuth();
  const { sales: allSales } = useSales();
  const { products } = useProducts();
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  
  const initialStore = useMemo(() => {
    if (currentUser?.role === Role.SUPER_ADMIN) return 'Todas as Lojas';
    if (currentUser?.role === Role.ADMIN) return 'Todas as Lojas';
    return currentUser?.store || 'Todas as Lojas';
  }, [currentUser]);

  const [selectedStore, setSelectedStore] = useState(initialStore);
  
  useEffect(() => {
    setSelectedStore(initialStore);
  }, [initialStore]);

  const [detailModal, setDetailModal] = useState<{ type: 'products' | 'users' | 'payments' | null; title: string }>({ type: null, title: '' });

  const userNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    allUsers.forEach(u => {
      map[u.id] = u.name;
    });
    return map;
  }, [allUsers]);

  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    label: 'Hoje'
  });

  const productsMap = useMemo(() => {
    const map: Record<string, any> = {};
    products.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  // Fetch stats from Firestore or calculate from local sales
  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser) return;
      setIsLoading(true);
      try {
        let data: any[] = [];
        try {
          const q = query(
            collection(db, 'stats'),
            where('adminId', '==', currentUser.adminId),
            where('date', '>=', dateRange.start),
            where('date', '<=', dateRange.end)
          );
          const snapshot = await getDocs(q);
          const allStats = snapshot.docs.map(doc => doc.data());
          
          if (selectedStore !== 'Todas as Lojas') {
            data = allStats.filter(s => s.store === selectedStore);
          } else {
            data = allStats;
          }
        } catch (e) {
          console.warn("Could not fetch from 'stats' collection, falling back to sales calculation:", e);
        }
        
        if (data.length === 0) {
          const filteredSales = allSales.filter(s => {
            const isSameStore = selectedStore === 'Todas as Lojas' || s.store === selectedStore;
            const saleDate = s.createdAt.split('T')[0];
            const isInRange = saleDate >= dateRange.start && saleDate <= dateRange.end;
            return isSameStore && isInRange && s.status === 'COMPLETED';
          });

          const groupedByDay: Record<string, any> = {};
          filteredSales.forEach(sale => {
            const day = sale.createdAt.split('T')[0];
            if (!groupedByDay[day]) {
              groupedByDay[day] = {
                date: day,
                totalFaturamento: 0,
                totalLucro: 0,
                totalVendas: 0,
                productRanking: {},
                userRanking: {},
                paymentDistribution: {}
              };
            }
            groupedByDay[day].totalFaturamento += sale.totalAmount;
            groupedByDay[day].totalVendas += 1;
            
            const method = sale.paymentMethod || 'CASH';
            groupedByDay[day].paymentDistribution[method] = (groupedByDay[day].paymentDistribution[method] || 0) + 1;
            
            const userId = sale.userId;
            const userName = userNamesMap[userId] || 'Desconhecido';
            if (!groupedByDay[day].userRanking[userId]) {
              groupedByDay[day].userRanking[userId] = { name: userName, total: 0, qty: 0 };
            }
            groupedByDay[day].userRanking[userId].total += sale.totalAmount;
            groupedByDay[day].userRanking[userId].qty += 1;

            if ((sale as any).items) {
              (sale as any).items.forEach((item: any) => {
                const prodId = item.productId;
                const costPrice = item.costPrice || productsMap[prodId]?.costPrice || 0;
                const itemProfit = (item.price - costPrice) * item.quantity;
                groupedByDay[day].totalLucro += itemProfit;

                if (!groupedByDay[day].productRanking[prodId]) {
                  groupedByDay[day].productRanking[prodId] = { name: item.productName, total: 0, qty: 0 };
                }
                groupedByDay[day].productRanking[prodId].total += item.subtotal;
                groupedByDay[day].productRanking[prodId].qty += item.quantity;
              });
            }
          });
          setStatsData(Object.values(groupedByDay));
        } else {
          setStatsData(data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [currentUser, selectedStore, dateRange, allSales, userNamesMap]);

  const totals = useMemo(() => {
    const result = {
      totalFaturamento: 0,
      totalLucro: 0,
      totalVendas: 0,
      productRanking: {} as any,
      userRanking: {} as any,
      paymentDistribution: {} as any
    };

    statsData.forEach(day => {
      result.totalFaturamento += day.totalFaturamento || 0;
      result.totalLucro += day.totalLucro || 0;
      result.totalVendas += day.totalVendas || 0;

      // Merge product ranking
      if (day.productRanking) {
        Object.entries(day.productRanking).forEach(([id, data]: [string, any]) => {
          if (!result.productRanking[id]) result.productRanking[id] = { name: data.name, total: 0, qty: 0 };
          result.productRanking[id].total += data.total || 0;
          result.productRanking[id].qty += data.qty || 0;
        });
      }

      // Merge user ranking
      if (day.userRanking) {
        Object.entries(day.userRanking).forEach(([id, data]: [string, any]) => {
          if (!result.userRanking[id]) result.userRanking[id] = { name: data.name, total: 0, qty: 0 };
          result.userRanking[id].total += data.total || 0;
          result.userRanking[id].qty += data.qty || 0;
        });
      }

      // Merge payment distribution
      if (day.paymentDistribution) {
        Object.entries(day.paymentDistribution).forEach(([method, count]: [string, any]) => {
          result.paymentDistribution[method] = (result.paymentDistribution[method] || 0) + count;
        });
      }
    });

    return result;
  }, [statsData]);

  const totalFaturamento = totals.totalFaturamento;
  const totalVendas = totals.totalVendas;
  const ticketMedio = totalVendas > 0 ? totalFaturamento / totalVendas : 0;
  const totalLucro = totals.totalLucro;
  const margemLucro = totalFaturamento > 0 ? (totalLucro / totalFaturamento) * 100 : 0;

  const productRanking = useMemo(() => {
    return Object.values(totals.productRanking).sort((a: any, b: any) => b.total - a.total);
  }, [totals.productRanking]);

  const userRanking = useMemo(() => {
    return Object.values(totals.userRanking).sort((a: any, b: any) => b.total - a.total);
  }, [totals.userRanking]);

  const paymentDistribution = useMemo(() => {
    const totalCount = Object.values(totals.paymentDistribution).reduce((acc: number, curr: any) => acc + curr, 0) as number || 1;
    return Object.entries(totals.paymentDistribution).map(([method, count]: [string, any]) => ({
      name: method === PaymentMethod.CASH ? 'Dinheiro' : method === PaymentMethod.PIX ? 'Pix' : method === PaymentMethod.DEBIT_CARD ? 'Débito' : 'Crédito',
      method,
      percentage: ((count as number) / totalCount) * 100,
      value: count as number
    })).filter(i => i.value > 0).sort((a, b) => b.value - a.value);
  }, [totals.paymentDistribution]);

  const handleQuickFilter = (period: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'Ontem':
        start.setDate(now.getDate() - 1);
        end.setDate(now.getDate() - 1);
        break;
      case 'Esta semana':
        start.setDate(now.getDate() - now.getDay());
        break;
      case 'Este mês':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'Tudo':
        start = new Date(2020, 0, 1);
        break;
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      label: period
    });
    setIsFilterOpen(false);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const current = new Date(dateRange.start + 'T00:00:00');
    if (direction === 'prev') {
      current.setDate(current.getDate() - 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
    
    const dateStr = current.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let label = '';
    if (dateStr === today) label = 'Hoje';
    else if (dateStr === yesterdayStr) label = 'Ontem';
    else {
      const weekday = current.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];
      label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }

    setDateRange({
      start: dateStr,
      end: dateStr,
      label: label
    });
  };

  const COLORS_CHART = ['#00BFA5', '#FFAB00', '#2979FF', '#9C27B0', '#EC4899', '#8B5CF6'];

  const formatDateDisplay = (start: string, end: string) => {
    const dStart = new Date(start + 'T00:00:00');
    const dEnd = new Date(end + 'T00:00:00');
    
    if (start === end) {
      return dStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    }
    
    return `${dStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - ${dEnd.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 -m-4 md:-m-8 relative">
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between z-30">
        <button onClick={() => navigateDay('prev')} className="p-2 text-[#00BFA5] hover:bg-slate-50 rounded-full transition-colors">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button onClick={() => setIsFilterOpen(true)} className="text-slate-600 font-bold text-lg flex items-center gap-2">
          {dateRange.label ? `${dateRange.label}: ` : ''}{formatDateDisplay(dateRange.start, dateRange.end)}
        </button>
        <button onClick={() => navigateDay('next')} className="p-2 text-[#00BFA5] hover:bg-slate-50 rounded-full transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6 6-6"/></svg>
        </button>
      </div>

      <div className="bg-white px-4 pb-4">
        <div className="max-w-lg mx-auto relative">
          <button 
            onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
            className="w-full h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center gap-2 text-[#00BFA5] font-black"
          >
            <span>{selectedStore.toUpperCase()}</span>
            <div className={`transition-transform ${isStoreMenuOpen ? 'rotate-180' : ''}`}>{ICONS.ChevronDown}</div>
          </button>
          {isStoreMenuOpen && (
             <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95">
               {/* Only Super Admin and Admin can see "Todas as Lojas" */}
               {(currentUser?.role === Role.SUPER_ADMIN || currentUser?.role === Role.ADMIN) && (
                 <button 
                   onClick={() => { setSelectedStore('Todas as Lojas'); setIsStoreMenuOpen(false); }} 
                   className={`w-full px-6 py-4 text-left hover:bg-slate-50 font-bold border-b border-slate-50 last:border-0 ${selectedStore === 'Todas as Lojas' ? 'text-[#00BFA5]' : 'text-slate-700'}`}
                 >
                   Todas as Lojas
                 </button>
               )}
               {stores.map((s) => (
                 <button 
                   key={s.id} 
                   onClick={() => { setSelectedStore(s.name); setIsStoreMenuOpen(false); }} 
                   className={`w-full px-6 py-4 text-left hover:bg-slate-50 font-bold border-b border-slate-50 last:border-0 ${selectedStore === s.name ? 'text-[#00BFA5]' : 'text-slate-700'}`}
                 >
                   {s.name}
                 </button>
               ))}
             </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 pb-24 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#00BFA5] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Carregando estatísticas...</p>
          </div>
        ) : (
          <>
            <section>
              <div className="px-5 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest bg-slate-50">Geral (Vendas Concluídas)</div>
              <StatRow 
                title="Faturamento" 
                value={`R$ ${totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                subtitle={`Melhor dia: ${formatDateDisplay(dateRange.start, dateRange.end)}`} 
              />
              <StatRow 
                title="Vendas" 
                value={totalVendas} 
                subtitle={`Melhor dia: ${formatDateDisplay(dateRange.start, dateRange.end)}`} 
              />
              <StatRow 
                title="Ticket Médio" 
                value={`R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                subtitle={`Melhor dia: ${formatDateDisplay(dateRange.start, dateRange.end)}`} 
              />
              <StatRow 
                title="Lucro" 
                value={`R$ ${totalLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                subtitle={
                  <div className="flex flex-col">
                    <span>Melhor dia: {formatDateDisplay(dateRange.start, dateRange.end)}</span>
                    <span className="text-[10px] text-[#00BFA5] font-black mt-1">Margem: {margemLucro.toFixed(2).replace('.', ',')}%</span>
                  </div>
                } 
              />
            </section>

            <section>
              <div className="px-5 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest bg-slate-50">Performance</div>
              <StatRow 
                title="Meio de Pagamento" 
                value={`${(paymentDistribution[0]?.percentage || 0).toFixed(2).replace('.', ',')}%`} 
                subtitle={`Usam ${paymentDistribution[0]?.name || 'N/A'}`}
                chartType="circle"
                onClick={() => setDetailModal({ type: 'payments', title: 'Meios de Pagamento' })}
              />
              <StatRow 
                title="Ranking de Produtos" 
                value={productRanking[0]?.name || 'Nenhum'} 
                subtitle={`#1 em Vendas: R$ ${(productRanking[0]?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                chartType="none"
                onClick={() => setDetailModal({ type: 'products', title: 'Ranking de Produtos' })}
              />
              <StatRow 
                title="Vendas por usuário" 
                value={userRanking[0]?.name || 'Nenhum'} 
                subtitle={`#1 em Vendas: R$ ${(userRanking[0]?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                chartType="none"
                onClick={() => setDetailModal({ type: 'users', title: 'Vendas por Usuário' })}
              />
            </section>
          </>
        )}
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end justify-center p-0 animate-in fade-in duration-300" onClick={() => setIsFilterOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-t-[32px] overflow-hidden animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">Filtrar período</h3>
              <button onClick={() => setIsFilterOpen(false)} className="text-slate-400 font-bold">FECHAR</button>
            </div>
            <div className="grid grid-cols-2">
              {['Hoje', 'Ontem', 'Esta semana', 'Este mês', 'Tudo'].map((period) => (
                <button key={period} onClick={() => handleQuickFilter(period)} className="py-6 px-4 text-center border-b border-r border-slate-50 font-bold text-slate-600 hover:bg-slate-50">{period}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {detailModal.type && (
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-right duration-300 flex flex-col">
          <header className="p-6 border-b border-slate-100 flex items-center gap-4 shrink-0">
            <button onClick={() => setDetailModal({ type: null, title: '' })} className="p-2 text-slate-600">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 className="text-2xl font-black text-slate-800">{detailModal.title}</h2>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {detailModal.type === 'payments' && (
              <div className="space-y-8">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_CHART[index % COLORS_CHART.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Detalhamento por Meio</h3>
                  {paymentDistribution.map((item, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: COLORS_CHART[idx % COLORS_CHART.length] + '15', color: COLORS_CHART[idx % COLORS_CHART.length] }}>
                          {item.method === PaymentMethod.CASH ? ICONS.Cash : item.method === PaymentMethod.PIX ? ICONS.Pix : ICONS.Card}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 uppercase tracking-tighter">{item.name}</p>
                          <p className="text-xs text-slate-400 font-medium">{item.value} transações</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-800 text-lg">{item.percentage.toFixed(2).replace('.', ',')}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailModal.type === 'products' && (
              <div className="space-y-4">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Top Produtos Vendidos</h3>
                 {productRanking.map((item, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${idx < 3 ? 'bg-emerald-50 text-[#00BFA5]' : 'bg-slate-50 text-slate-400'}`}>#{idx + 1}</div>
                      <div>
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{item.qty} unidades vendidas</p>
                      </div>
                    </div>
                    <p className="font-black text-[#00BFA5]">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            )}

            {detailModal.type === 'users' && (
              <div className="space-y-8">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userRanking}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="total"
                      >
                        {userRanking.map((entry, index) => (
                          <Cell key={`cell-user-${index}`} fill={COLORS_CHART[index % COLORS_CHART.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Performance da Equipe</h3>
                  {userRanking.map((item, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-xs"
                          style={{ backgroundColor: COLORS_CHART[idx % COLORS_CHART.length] }}
                        >
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-400 font-medium">{item.qty} vendas realizadas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-[#00BFA5]">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {((item.total / (totalFaturamento || 1)) * 100).toFixed(1).replace('.', ',')}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsScreen;
