
import React, { useState, useMemo, useEffect } from 'react';
import { onSnapshot, query, collection, where, orderBy, limit } from 'firebase/firestore';
import { ICONS, COLORS } from '../constants';
import { useMenu, useSales, useAuth } from '../App';
import { db } from '../firebase';
import { PaymentMethod, Sale, Role } from '../types';
import ComprovanteGenerator from '../components/ComprovanteGenerator';

const HistoryScreen = () => {
  const { toggleMenu } = useMenu();
  const { sales, hasMoreSales, loadMoreSales, completeSavedSale, setSales, setHasMoreSales } = useSales();
  const { allUsers, user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [showVoucher, setShowVoucher] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [salesLimit, setSalesLimit] = useState(20);

  useEffect(() => {
    // Sales are now managed by App.tsx and provided via context
    // This effect can be removed or used for other purposes
  }, [user, salesLimit, setSales, setHasMoreSales]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await loadMoreSales();
    setIsLoadingMore(false);
  };

  const userNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    allUsers.forEach(u => {
      map[u.id] = u.name;
    });
    return map;
  }, [allUsers]);

  const getPaymentIcon = (method?: PaymentMethod) => {
    if (!method) return ICONS.Clock;
    switch (method) {
      case PaymentMethod.CASH: return ICONS.Cash;
      case PaymentMethod.DEBIT_CARD:
      case PaymentMethod.CREDIT_CARD: return ICONS.Card;
      case PaymentMethod.PIX: return ICONS.Pix;
      default: return ICONS.Cash;
    }
  };

  const filteredSales = sales.filter(s => 
    s.id.includes(search.toUpperCase()) || 
    s.items.some(item => item.productName.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCompleteSale = () => {
    if (selectedSale && selectedPayment) {
      completeSavedSale(selectedSale.id, selectedPayment);
      setSelectedSale(null);
      setCheckoutMode(false);
      setSelectedPayment(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white md:bg-[#F3F4F6] pb-20 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full md:p-4 space-y-0 md:space-y-6">
        <div className="bg-white p-4 md:rounded-2xl border-b md:border border-slate-200 shadow-sm">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{ICONS.Search}</span>
            <input 
              type="text" 
              placeholder="Buscar por código ou produto..." 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#00BFA5] focus:outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="px-4 py-4 md:px-0">
           <h2 className="text-2xl font-bold text-slate-700">Todas as Atividades</h2>
           <p className="text-slate-400 font-medium">{filteredSales.length} registros encontrados</p>
        </div>

        <div className="bg-white md:rounded-3xl border-t border-b md:border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
          {filteredSales.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium">Nenhuma venda encontrada</div>
          ) : (
            filteredSales.map((sale) => (
              <button 
                key={sale.id} 
                onClick={() => { setSelectedSale(sale); setCheckoutMode(false); setShowVoucher(false); }}
                className="w-full flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors text-left group"
              >
                <div className={`mt-1 ${sale.status === 'SAVED' ? 'text-blue-500 animate-pulse' : 'text-[#00BFA5]'}`}>
                  {getPaymentIcon(sale.paymentMethod)}
                </div>
                <div className="flex-1 space-y-1 overflow-hidden">
                  <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-slate-800">R$ {sale.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      {sale.status === 'SAVED' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest">SALVO</span>
                      )}
                    </div>
                    <span className="text-xs font-black text-slate-400">
                      {sale.saleNumber ? '#' + sale.saleNumber.toString().padStart(4, '0') + ' • ' : ''}
                      {new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-end gap-2">
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-medium text-slate-500 truncate">
                        {sale.items.length > 0 ? sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ') : 'Venda Rápida / Sem Itens'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        Vendedor: {userNamesMap[sale.userId] || 'Sistema'}
                      </p>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 shrink-0">#{sale.id}</span>
                  </div>
                </div>
              </button>
            ))
          )}
          {hasMoreSales && !search && (
            <div className="p-4 flex justify-center">
              <button 
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {isLoadingMore ? 'Carregando...' : 'Carregar Mais'}
              </button>
            </div>
          )}
        </div>

        {selectedSale && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-t-[40px] md:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 flex flex-col max-h-[90vh]">
              <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">
                      {selectedSale.status === 'SAVED' ? 'Pedido Salvo' : 'Pedido Concluído'} #{selectedSale.id}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {new Date(selectedSale.createdAt).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[10px] font-black text-[#00BFA5] uppercase tracking-widest mt-1">
                      Vendedor: {userNamesMap[selectedSale.userId] || 'Sistema'}
                    </p>
                  </div>
                  <button onClick={() => { setSelectedSale(null); setCheckoutMode(false); setShowVoucher(false); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">✕</button>
                </div>

                {!checkoutMode ? (
                  <>
                    {showVoucher ? (
                       <div className="animate-in zoom-in duration-300">
                          <ComprovanteGenerator sale={selectedSale} />
                       </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 overflow-y-auto max-h-48">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Itens do Pedido</p>
                          {selectedSale.items.length > 0 ? selectedSale.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-sm py-1 font-medium text-slate-700">
                              <span>{item.quantity}x {item.productName}</span>
                              <span>R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )) : (
                            <p className="text-sm italic text-slate-400">Sem itens registrados.</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-100 rounded-2xl">
                          <span className="font-bold text-slate-600">Total</span>
                          <span className="text-xl font-black text-slate-800">R$ {selectedSale.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3 pt-2">
                       {selectedSale.status === 'SAVED' ? (
                        <button 
                          onClick={() => setCheckoutMode(true)} 
                          className="w-full py-5 bg-blue-500 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 transition-transform active:scale-95"
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                          CONTINUAR PEDIDO
                        </button>
                      ) : (
                        !showVoucher && (
                          <button onClick={() => setShowVoucher(true)} className="w-full py-5 bg-[#00BFA5] text-white rounded-2xl font-black shadow-lg shadow-[#00BFA5]/20 flex items-center justify-center gap-2">
                            {ICONS.Printer} VER COMPROVANTE
                          </button>
                        )
                      )}
                      {showVoucher && (
                        <button onClick={() => setShowVoucher(false)} className="w-full py-3 text-slate-400 font-bold uppercase text-xs">Voltar aos detalhes</button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <h4 className="text-lg font-black text-slate-800 text-center">Forma de Pagamento</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setSelectedPayment(PaymentMethod.CASH)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${selectedPayment === PaymentMethod.CASH ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                      >
                        {ICONS.Cash}
                        <span className="mt-1 text-xs font-bold uppercase">Dinheiro</span>
                      </button>
                      <button 
                        onClick={() => setSelectedPayment(PaymentMethod.PIX)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${selectedPayment === PaymentMethod.PIX ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                      >
                        {ICONS.Pix}
                        <span className="mt-1 text-xs font-bold uppercase">Pix</span>
                      </button>
                      <button 
                        onClick={() => setSelectedPayment(PaymentMethod.DEBIT_CARD)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${selectedPayment === PaymentMethod.DEBIT_CARD ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                      >
                        {ICONS.Card}
                        <span className="mt-1 text-xs font-bold uppercase">Débito</span>
                      </button>
                      <button 
                        onClick={() => setSelectedPayment(PaymentMethod.CREDIT_CARD)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${selectedPayment === PaymentMethod.CREDIT_CARD ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}
                      >
                        {ICONS.Card}
                        <span className="mt-1 text-xs font-bold uppercase">Crédito</span>
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setCheckoutMode(false)} className="flex-1 py-4 text-slate-400 font-bold">Voltar</button>
                      <button 
                        onClick={handleCompleteSale}
                        disabled={!selectedPayment}
                        className={`flex-1 py-4 rounded-2xl font-black shadow-lg transition-all ${selectedPayment ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-slate-100 text-slate-300'}`}
                      >
                        CONCLUIR VENDA
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryScreen;
