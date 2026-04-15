
import React, { useState, useEffect, useRef } from 'react';
import { ICONS } from '../constants';
import { DeliveryStatus, Role, User, DeliveryOrder } from '../types';
import { useDelivery, useAuth, useConfig } from '../App';

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  [DeliveryStatus.PENDING]: 'PENDENTE',
  [DeliveryStatus.PREPARING]: 'PREPARANDO',
  [DeliveryStatus.ON_ROUTE]: 'EM ROTA',
  [DeliveryStatus.DELIVERED]: 'CONCLUÍDO',
  [DeliveryStatus.CANCELLED]: 'CANCELADO',
};

declare const L: any;

const MotoboyScreen = () => {
  const { user, updateUserStatus } = useAuth();
  const { receipt } = useConfig();
  const { deliveryOrders, updateDeliveryStatus } = useDelivery();
  const [activeFilter, setActiveFilter] = useState<DeliveryStatus | 'TODAS'>('TODAS');
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const isOnline = user?.isOnline || false;

  const visibleDeliveries = deliveryOrders.filter(d => 
    [DeliveryStatus.PREPARING, DeliveryStatus.ON_ROUTE, DeliveryStatus.DELIVERED].includes(d.status)
  );

  const filteredDeliveries = visibleDeliveries.filter(d => activeFilter === 'TODAS' || d.status === activeFilter);
  const commissionFactor = receipt.motoboyCommission / 100;
  const todayEarnings = visibleDeliveries
    .filter(d => d.status === DeliveryStatus.DELIVERED && d.motoboyId === user?.id)
    .reduce((acc, curr) => acc + (curr.deliveryFee * commissionFactor), 0);

  // Toggle Online / Offline
  const toggleOnline = () => {
    const nextStatus = !isOnline;
    updateUserStatus(user?.id!, { isOnline: nextStatus });

    if (nextStatus) {
      if ('geolocation' in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            updateUserStatus(user?.id!, { 
              lat: pos.coords.latitude, 
              lng: pos.coords.longitude 
            });
          },
          (err) => console.error("Erro na geolocalização:", err),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const handleWhatsApp = (order: DeliveryOrder) => {
    const text = `Olá ${order.customerName}, aqui é o entregador da ${receipt.storeName}. Estou saindo para realizar sua entrega em ${order.street}, ${order.number}.`;
    window.open(`https://wa.me/55${order.customerPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleOpenMap = () => {
    setShowMapModal(true);
    setTimeout(() => {
      const mapEl = document.getElementById('motoboy-detail-map');
      if (mapEl && !mapEl.dataset.initialized) {
        const motoboyLat = user?.lat || -23.5505;
        const motoboyLng = user?.lng || -46.6333;
        const map = L.map('motoboy-detail-map').setView([motoboyLat, motoboyLng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        const motoboyPos: [number, number] = [motoboyLat, motoboyLng];
        const clientPos: [number, number] = [motoboyLat - 0.005, motoboyLng - 0.005];
        
        L.marker(motoboyPos).addTo(map).bindPopup("Você").openPopup();
        L.marker(clientPos).addTo(map).bindPopup("Cliente");
        L.polyline([motoboyPos, clientPos], { color: '#00BFA5', weight: 5, dashArray: '10, 10' }).addTo(map);
        
        map.fitBounds([motoboyPos, clientPos], { padding: [50, 50] });
        mapEl.dataset.initialized = "true";
      }
    }, 200);
  };

  const openInGoogleMaps = (order: DeliveryOrder) => {
    const address = encodeURIComponent(`${order.street}, ${order.number}, ${order.neighborhood}, ${order.city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-500 ${isOnline ? 'bg-[#F3F4F6]' : 'bg-slate-200'} -m-4 md:-m-8`}>
      <div className={`px-6 pt-8 pb-16 text-white md:px-12 transition-colors duration-500 ${isOnline ? 'bg-[#00BFA5]' : 'bg-slate-600'}`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Painel do Entregador</h1>
            <p className="opacity-80 text-sm font-medium">Olá, {user?.name}</p>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={toggleOnline}
              className={`w-16 h-8 rounded-full relative transition-all duration-300 ${isOnline ? 'bg-emerald-400' : 'bg-slate-400'}`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${isOnline ? 'left-9' : 'left-1'}`} />
            </button>
            <span className="text-[9px] font-black uppercase tracking-widest">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
        </div>

        <div className="bg-white/20 p-4 rounded-[24px] text-center w-full max-w-xs mx-auto mb-2 border border-white/5 backdrop-blur-sm">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ganhos Hoje</p>
          <p className="text-3xl font-black">R$ {todayEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="px-4 -mt-8 space-y-6 pb-20 max-w-2xl mx-auto w-full">
        {!isOnline && (
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-xl text-center animate-in zoom-in-95 duration-300">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4 italic">
                {ICONS.Clock}
             </div>
             <h3 className="text-xl font-black text-slate-800">Você está Offline</h3>
             <p className="text-slate-500 text-sm mt-1">Fique online para receber novos pedidos e compartilhar sua localização com a loja.</p>
          </div>
        )}

        {isOnline && (
          <>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {['TODAS', DeliveryStatus.PREPARING, DeliveryStatus.ON_ROUTE, DeliveryStatus.DELIVERED].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f as any)}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeFilter === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'
                  }`}
                >
                  {f === 'TODAS' ? 'Tudo' : STATUS_LABELS[f as DeliveryStatus]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredDeliveries.length === 0 ? (
                <p className="text-center py-10 text-slate-400 font-medium italic">Nenhum pedido nesta categoria</p>
              ) : (
                filteredDeliveries.map((order) => (
                  <div 
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow cursor-pointer animate-in fade-in"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                          order.status === DeliveryStatus.PREPARING ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          order.status === DeliveryStatus.ON_ROUTE ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                        <h3 className="text-lg font-black text-slate-800 pt-2 tracking-tight">{order.customerName}</h3>
                        <p className="text-sm text-slate-500 font-medium leading-snug">{order.street}, {order.number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sua Comissão</p>
                        <p className="text-lg font-black text-[#00BFA5]">R$ {(order.deliveryFee * commissionFactor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal de Detalhes do Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-[#00BFA5] uppercase tracking-widest">Detalhes da Entrega</span>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{selectedOrder.customerName}</h2>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400">✕</button>
                </div>

                <div className="space-y-6">
                   <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="text-slate-400">{ICONS.MapPin}</div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Endereço</p>
                        <p className="text-lg font-bold text-slate-800">{selectedOrder.street}, {selectedOrder.number}</p>
                        <p className="text-sm text-slate-500">{selectedOrder.neighborhood}, {selectedOrder.city}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleWhatsApp(selectedOrder)}
                        className="flex flex-col items-center justify-center p-6 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-[32px] hover:bg-emerald-100 transition-all"
                      >
                        <div className="mb-2">{ICONS.WhatsApp}</div>
                        <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
                      </button>
                      <button 
                        onClick={handleOpenMap}
                        className="flex flex-col items-center justify-center p-6 bg-blue-50 border border-blue-100 text-blue-600 rounded-[32px] hover:bg-blue-100 transition-all"
                      >
                        <div className="mb-2">{ICONS.MapPin}</div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Rota</span>
                      </button>
                   </div>
                </div>

                <div className="space-y-3">
                  {selectedOrder.status === DeliveryStatus.PREPARING && (
                    <button 
                      onClick={() => { updateDeliveryStatus(selectedOrder.saleId, DeliveryStatus.ON_ROUTE, user?.id); setSelectedOrder(null); }}
                      className="w-full py-5 bg-[#00BFA5] text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-[#00BFA5]/20"
                    >
                      SAIR PARA ENTREGAR
                    </button>
                  )}
                  {selectedOrder.status === DeliveryStatus.ON_ROUTE && (
                    <button 
                      onClick={() => { updateDeliveryStatus(selectedOrder.saleId, DeliveryStatus.DELIVERED, user?.id); setSelectedOrder(null); }}
                      className="w-full py-5 bg-purple-500 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/20"
                    >
                      CONFIRMAR ENTREGA
                    </button>
                  )}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Mapa/Rota */}
      {showMapModal && selectedOrder && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
           <header className="p-6 bg-white flex items-center justify-between shrink-0">
              <h3 className="text-xl font-black text-slate-800">Caminho para o Cliente</h3>
              <button onClick={() => setShowMapModal(false)} className="p-2 text-slate-400 font-bold">FECHAR</button>
           </header>
           <div className="flex-1 relative">
              <div id="motoboy-detail-map" className="absolute inset-0"></div>
           </div>
           <footer className="p-6 bg-white space-y-4 shrink-0">
              <button 
                onClick={() => openInGoogleMaps(selectedOrder)}
                className="w-full py-5 bg-[#00BFA5] text-white rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl"
              >
                {ICONS.MapPin} ABRIR NO GOOGLE MAPS
              </button>
           </footer>
        </div>
      )}
    </div>
  );
};

export default MotoboyScreen;
