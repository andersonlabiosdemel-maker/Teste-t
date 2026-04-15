
import React, { useState, useMemo, useEffect } from 'react';
import { onSnapshot, query, collection, where, limit } from 'firebase/firestore';
import { ICONS, COLORS } from '../constants';
import { useMenu, useSales, useAuth, useCaixa } from '../App';
import { db } from '../firebase';
import { PaymentMethod, Role, CaixaSession } from '../types';

const CaixaScreen = () => {
  const { toggleMenu } = useMenu();
  const { sales } = useSales();
  const { user } = useAuth();
  const { activeSession, sessions, openCaixa, closeCaixa, addCaixaMovement, setSessions } = useCaixa();

  useEffect(() => {
    // Sessions are now managed by App.tsx and provided via context
  }, [user, setSessions]);

  const [initialInput, setInitialInput] = useState(0);
  const [finalInput, setFinalInput] = useState(0);
  const [isClosingModal, setIsClosingModal] = useState(false);
  
  // Estados para Sangria e Reforço
  const [isMovementModal, setIsMovementModal] = useState<{ open: boolean; type: 'IN' | 'OUT' }>({ open: false, type: 'IN' });
  const [movementAmount, setMovementAmount] = useState(0);
  const [movementReason, setMovementReason] = useState('');

  // Vendas da sessão ativa
  const currentSessionSales = useMemo(() => {
    if (!activeSession) return [];
    return sales.filter(s => s.createdAt >= activeSession.startTime && s.status === 'COMPLETED');
  }, [sales, activeSession]);

  const summary = useMemo(() => {
    const cash = currentSessionSales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((a, b) => a + b.totalAmount, 0);
    const pix = currentSessionSales.filter(s => s.paymentMethod === PaymentMethod.PIX).reduce((a, b) => a + b.totalAmount, 0);
    const card = currentSessionSales.filter(s => [PaymentMethod.DEBIT_CARD, PaymentMethod.CREDIT_CARD].includes(s.paymentMethod!)).reduce((a, b) => a + b.totalAmount, 0);
    
    // Movimentações manuais
    const reinforcements = activeSession?.movements.filter(m => m.type === 'IN').reduce((a, b) => a + b.amount, 0) || 0;
    const withdrawals = activeSession?.movements.filter(m => m.type === 'OUT').reduce((a, b) => a + b.amount, 0) || 0;

    return {
      cash,
      pix,
      card,
      reinforcements,
      withdrawals,
      total: currentSessionSales.reduce((a, b) => a + b.totalAmount, 0)
    };
  }, [currentSessionSales, activeSession]);

  const handleCurrencyInput = (val: string, setter: (n: number) => void) => {
    const raw = val.replace(/\D/g, '');
    setter(Number(raw) / 100);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleMovementSubmit = () => {
    if (movementAmount <= 0) return;
    addCaixaMovement(movementAmount, isMovementModal.type, movementReason);
    setIsMovementModal({ open: false, type: 'IN' });
    setMovementAmount(0);
    setMovementReason('');
  };

  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN || user?.role === Role.MANAGER;

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] -m-4 md:-m-8">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8 pb-32">
        
        {/* Card de Status do Caixa */}
        <header className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-6">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl ${activeSession ? 'bg-[#00BFA5] shadow-[#00BFA5]/20' : 'bg-red-400 shadow-red-400/20'}`}>
                {activeSession ? ICONS.Cash : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">{activeSession ? 'Caixa em Operação' : 'Caixa Fechado'}</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                  {activeSession ? `Aberto por ${activeSession.openedByName} às ${new Date(activeSession.startTime).toLocaleTimeString()}` : 'Aguardando abertura do turno'}
                </p>
              </div>
           </div>
           
           {activeSession && (
             <div className="flex flex-wrap justify-center gap-3">
               <button 
                 onClick={() => setIsMovementModal({ open: true, type: 'IN' })}
                 className="px-6 py-4 bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
               >
                 Adicionar Troco
               </button>
               <button 
                 onClick={() => setIsMovementModal({ open: true, type: 'OUT' })}
                 className="px-6 py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
               >
                 Sangria
               </button>
               <button 
                 onClick={() => setIsClosingModal(true)}
                 className="px-6 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
               >
                 Fechar Turno
               </button>
             </div>
           )}
        </header>

        {/* Dashboards da Sessão Ativa */}
        {!activeSession ? (
          <div className="bg-white rounded-[40px] p-12 text-center border border-slate-100 shadow-xl space-y-8 animate-in zoom-in-95">
             <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800">Início de Turno</h3>
                <p className="text-slate-400 font-medium">Informe o valor inicial (Fundo de Troco) para abrir o PDV.</p>
             </div>
             <div className="max-w-xs mx-auto space-y-6">
                <div className="relative">
                   <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">R$</span>
                   <input 
                     type="text" 
                     className="w-full pl-16 pr-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-3xl font-black text-slate-700 outline-none focus:border-[#00BFA5] transition-all"
                     placeholder="0,00"
                     value={initialInput.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                     onChange={(e) => handleCurrencyInput(e.target.value, setInitialInput)}
                   />
                </div>
                <button 
                  onClick={() => openCaixa(initialInput)}
                  className="w-full py-5 bg-[#00BFA5] text-white rounded-3xl font-black text-xl shadow-xl shadow-[#00BFA5]/20 hover:brightness-95 active:scale-[0.98] transition-all"
                >
                  Abrir Caixa Agora
                </button>
             </div>
          </div>
        ) : (
          isAdmin ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-slate-900 rounded-[40px] p-8 text-white space-y-6 shadow-xl">
                  <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Saldo Esperado (Total)</p>
                    <h3 className="text-4xl font-black tracking-tight">{formatCurrency(activeSession.initialValue + summary.total + summary.reinforcements - summary.withdrawals)}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Fundo Inicial</p>
                        <p className="text-lg font-black">{formatCurrency(activeSession.initialValue)}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Entradas Extras</p>
                        <p className="text-lg font-black text-emerald-400">{formatCurrency(summary.reinforcements)}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Saídas (Sangria)</p>
                        <p className="text-lg font-black text-red-400">{formatCurrency(summary.withdrawals)}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Vendas Totais</p>
                        <p className="text-lg font-black">{formatCurrency(summary.total)}</p>
                    </div>
                  </div>
              </div>

              <div className="bg-white rounded-[40px] p-8 border border-slate-100 space-y-6 shadow-sm">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Resumo Outros Meios</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">{ICONS.Pix}</div>
                          <span className="font-bold text-slate-700">PIX</span>
                        </div>
                        <span className="font-black text-slate-800">{formatCurrency(summary.pix)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">{ICONS.Card}</div>
                          <span className="font-bold text-slate-700">CARTÕES</span>
                        </div>
                        <span className="font-black text-slate-800">{formatCurrency(summary.card)}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-400 uppercase">Faturamento Total</span>
                        <span className="text-xl font-black text-[#00BFA5]">{formatCurrency(summary.total)}</span>
                    </div>
                  </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[40px] text-center border border-slate-100 shadow-sm animate-in fade-in">
               <div className="w-20 h-20 bg-emerald-50 text-[#00BFA5] rounded-full flex items-center justify-center mx-auto mb-6">
                  {ICONS.Check}
               </div>
               <h3 className="text-2xl font-black text-slate-800">Caixa Aberto e Operando</h3>
               <p className="text-slate-500 font-medium mt-2 max-w-md mx-auto">Utilize os botões acima para registrar movimentações manuais ou para realizar o fechamento do seu turno.</p>
            </div>
          )
        )}

        {/* Histórico Administrativo */}
        {isAdmin && (
          <section className="space-y-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Turnos Encerrados</h3>
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                   {ICONS.Filter} Filtrar
                </div>
             </div>

             <div className="grid grid-cols-1 gap-4">
                {sessions.filter(s => s.status === 'CLOSED').map(session => (
                   <div key={session.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 hover:shadow-md transition-all">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">{ICONS.Clock}</div>
                         <div>
                            <p className="text-sm font-bold text-slate-800 leading-tight">Fechado por {session.closedByName}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                               {new Date(session.startTime).toLocaleDateString()} • {new Date(session.startTime).toLocaleTimeString()} às {new Date(session.endTime!).toLocaleTimeString()}
                            </p>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 md:flex md:gap-8 items-center text-center">
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Esperado</p>
                            <p className="font-black text-slate-700">{formatCurrency(session.expectedValue!)}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Informado</p>
                            <p className="font-black text-slate-700">{formatCurrency(session.finalValue!)}</p>
                         </div>
                         <div className="md:border-l md:pl-8">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Diferença</p>
                            {(() => {
                               const diff = session.finalValue! - session.expectedValue!;
                               return <p className={`font-black ${diff === 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(diff)}</p>
                            })()}
                         </div>
                      </div>
                   </div>
                ))}
                {sessions.filter(s => s.status === 'CLOSED').length === 0 && (
                   <div className="py-20 text-center text-slate-300 font-medium italic">Nenhum registro de fechamento.</div>
                )}
             </div>
          </section>
        )}
      </div>

      {/* Modal de Sangria / Reforço */}
      {isMovementModal.open && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-[48px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95">
             <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-800">
                  {isMovementModal.type === 'IN' ? 'Adicionar Troco' : 'Registrar Sangria'}
                </h3>
                <p className="text-slate-400 text-sm font-medium">
                  {isMovementModal.type === 'IN' ? 'Informe o valor para entrada em gaveta.' : 'Informe o valor para retirada do caixa.'}
                </p>
             </div>

             <div className="space-y-4">
                <div className="relative">
                   <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">R$</span>
                   <input 
                     autoFocus
                     type="text" 
                     className="w-full pl-16 pr-8 py-6 bg-slate-50 border-none rounded-[32px] text-4xl font-black text-slate-800 text-center outline-none"
                     placeholder="0,00"
                     value={movementAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                     onChange={(e) => handleCurrencyInput(e.target.value, setMovementAmount)}
                   />
                </div>
                
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Motivo (Opcional)</label>
                   <input 
                     type="text" 
                     className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl outline-none font-medium text-slate-700"
                     placeholder="Ex: Conta de luz, água..."
                     value={movementReason}
                     onChange={(e) => setMovementReason(e.target.value)}
                   />
                </div>

                <div className="flex gap-4 pt-4">
                   <button onClick={() => setIsMovementModal({ open: false, type: 'IN' })} className="flex-1 py-5 text-slate-400 font-black text-xs uppercase tracking-widest">Cancelar</button>
                   <button 
                     onClick={handleMovementSubmit}
                     className={`flex-[2] py-5 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl transition-all ${isMovementModal.type === 'IN' ? 'bg-blue-500 shadow-blue-500/20' : 'bg-orange-500 shadow-orange-500/20'}`}
                   >
                     Confirmar
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Modal de Fechamento */}
      {isClosingModal && activeSession && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-white rounded-[48px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95">
              <div className="text-center space-y-2">
                 <h3 className="text-2xl font-black text-slate-800">Fechamento de Caixa</h3>
                 <p className="text-slate-400 text-sm font-medium">Conte o dinheiro físico na gaveta e informe o valor final.</p>
              </div>

              <div className="space-y-6">
                 <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">R$</span>
                    <input 
                      autoFocus
                      type="text" 
                      className="w-full pl-16 pr-8 py-6 bg-slate-50 border-none rounded-[32px] text-4xl font-black text-slate-800 text-center outline-none focus:ring-4 focus:ring-red-500/10"
                      placeholder="0,00"
                      value={finalInput.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      onChange={(e) => handleCurrencyInput(e.target.value, setFinalInput)}
                    />
                 </div>

                 {isAdmin && (
                   <div className="bg-slate-50 p-6 rounded-3xl space-y-2 animate-in fade-in">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                         <span>Valor Estimado:</span>
                         <span>{formatCurrency(activeSession.initialValue + summary.total + summary.reinforcements - summary.withdrawals)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">Inclui fundo inicial + vendas totais + reforços - sangrias.</p>
                   </div>
                 )}

                 <div className="flex gap-4">
                    <button onClick={() => setIsClosingModal(false)} className="flex-1 py-5 text-slate-400 font-black text-xs uppercase tracking-widest">Cancelar</button>
                    <button 
                      onClick={() => { closeCaixa(finalInput); setIsClosingModal(false); }}
                      className="flex-[2] py-5 bg-red-500 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                    >
                      Finalizar Turno
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CaixaScreen;
