
import React, { useState, useEffect, useRef } from 'react';
import { ICONS } from '../constants';
import { DeliveryStatus, Role, User, DeliveryOrder } from '../types';
import { useDelivery, useAuth, useSales } from '../App';

declare const L: any;

const DeliveryScreen = () => {
  const { deliveryOrders, updateDeliveryStatus } = useDelivery();
  const { allUsers } = useAuth();
  const { sales } = useSales();
  
  const [activeTab, setActiveTab] = useState<'LISTA' | 'MAPA'>('LISTA');
  const [filter, setFilter] = useState<DeliveryStatus | 'ALL'>('ALL');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<DeliveryOrder | null>(null);
  
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  const counts = {
    pending: deliveryOrders.filter(o => o.status === DeliveryStatus.PENDING).length,
    onRoute: deliveryOrders.filter(o => o.status === DeliveryStatus.PREPARING || o.status === DeliveryStatus.ON_ROUTE).length,
    delivered: deliveryOrders.filter(o => o.status === DeliveryStatus.DELIVERED).length,
  };

  const filteredOrders = deliveryOrders.filter(o => filter === 'ALL' || o.status === filter);

  // Filtra motoboys reais que estão online ou têm localização salva
  const onlineMotoboys = allUsers.filter(u => 
    u.role === Role.MOTOBOY && (u.isOnline || (u.lat !== undefined && u.lng !== undefined))
  );

  useEffect(() => {
    if (activeTab === 'MAPA' && !mapRef.current) {
      setTimeout(() => {
        const mapContainer = document.getElementById('delivery-map');
        if (!mapContainer) return;
        mapRef.current = L.map('delivery-map').setView([-23.5505, -46.6333], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapRef.current);
      }, 100);
    }

    if (mapRef.current && activeTab === 'MAPA') {
      // Limpa marcadores de motoboys que não estão mais online
      Object.keys(markersRef.current).forEach(id => {
        if (!onlineMotoboys.find(m => m.id === id)) {
          mapRef.current.removeLayer(markersRef.current[id]);
          delete markersRef.current[id];
        }
      });

      // Atualiza ou adiciona marcadores para motoboys online
      onlineMotoboys.forEach(m => {
        if (m.lat === undefined || m.lng === undefined) return;

        const isActualOnline = m.isOnline;
        const color = isActualOnline ? '#10B981' : '#94A3B8';
        const iconHtml = `
          <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-weight: bold; font-size: 10px; ${isActualOnline ? 'animation: pulse 2s infinite;' : ''}">
            ${m.name.charAt(0)}
          </div>
          <style>
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
              70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
              100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
          </style>
        `;
        const customIcon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        if (markersRef.current[m.id]) {
          markersRef.current[m.id].setLatLng([m.lat, m.lng]);
          markersRef.current[m.id].setIcon(customIcon);
        } else {
          const marker = L.marker([m.lat, m.lng], { icon: customIcon })
            .addTo(mapRef.current)
            .bindPopup(`<b>${m.name}</b><br>Status: ${isActualOnline ? 'Online' : 'Offline'}`);
          markersRef.current[m.id] = marker;
        }
      });
    }

    return () => {
      if (activeTab !== 'MAPA' && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }
    };
  }, [activeTab, onlineMotoboys]);

  const StatusCard = ({ 
    label, 
    status, 
    bgColor, 
    isActive 
  }: { 
    label: string, 
    status: DeliveryStatus | 'ALL', 
    bgColor: string, 
    isActive: boolean 
  }) => (
    <button 
      onClick={() => setFilter(status)}
      className={`min-w-[140px] h-[160px] rounded-[32px] flex flex-col p-5 transition-all relative overflow-hidden text-left ${isActive ? 'ring-4 ring-[#00BFA5]/20 scale-105 shadow-2xl' : 'opacity-90 hover:opacity-100 hover:scale-[1.02] shadow-lg'}`}
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full flex flex-col items-start mb-2">
        <span className="text-white font-black text-[10px] uppercase tracking-widest leading-none">{label}</span>
        <div className="w-6 h-1 rounded-full bg-white/30 mt-2"></div>
      </div>
      
      <div className="mt-2 space-y-1 overflow-y-auto flex-1 no-scrollbar pr-1 w-full flex flex-col items-start text-white">
        {deliveryOrders
          .filter(o => status === 'ALL' || o.status === status)
          .sort((a, b) => b.saleId.localeCompare(a.saleId))
          .slice(0, 5)
          .map(o => (
            <div key={o.saleId} className="bg-black/10 rounded-md py-0.5 px-2 w-full flex justify-start items-center mb-0.5">
              <span className="text-[10px] font-black tracking-wider">#{o.saleId}</span>
            </div>
          ))}
      </div>
    </button>
  );

  const selectedSale = selectedOrderDetail ? sales.find(s => s.id === selectedOrderDetail.saleId) : null;
  const selectedMotoboy = selectedOrderDetail?.motoboyId ? allUsers.find(u => u.id === selectedOrderDetail.motoboyId) : null;

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] -m-4 md:-m-8">
      <div className="bg-[#00BFA5] text-white pt-10 pb-16 px-6 md:px-12 relative overflow-hidden shrink-0">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Central de Delivery</h1>
            <p className="opacity-70 text-sm font-bold tracking-widest uppercase mt-1">Gestão de Pedidos e Motoboys</p>
          </div>
          
          <div className="flex justify-around items-center text-center gap-8 md:gap-12 bg-white/10 px-8 py-4 rounded-3xl backdrop-blur-sm border border-white/5">
            <div>
              <p className="text-3xl font-black">{counts.pending}</p>
              <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-1">Pendentes</p>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div>
              <p className="text-3xl font-black">{counts.onRoute}</p>
              <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-1">Em Rota</p>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div>
              <p className="text-3xl font-black">{counts.delivered}</p>
              <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-1">Concluídos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-100 flex justify-center sticky top-0 z-30 shrink-0">
        <div className="flex max-w-4xl w-full">
          <button 
            onClick={() => setActiveTab('LISTA')}
            className={`flex-1 py-5 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'LISTA' ? 'border-[#00BFA5] text-[#00BFA5]' : 'border-transparent text-slate-400'}`}
          >
            {ICONS.Dashboard} LISTA DE PEDIDOS
          </button>
          <button 
            onClick={() => setActiveTab('MAPA')}
            className={`flex-1 py-5 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'MAPA' ? 'border-[#00BFA5] text-[#00BFA5]' : 'border-transparent text-slate-400'}`}
          >
            {ICONS.Bike} MAPA EM TEMPO REAL
          </button>
        </div>
      </div>

      {activeTab === 'LISTA' && (
        <div className="p-4 md:p-10 max-w-6xl mx-auto w-full space-y-10">
          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4">
            <StatusCard label="Todos" status="ALL" bgColor="#00E5FF" isActive={filter === 'ALL'} />
            <StatusCard label="Pendentes" status={DeliveryStatus.PENDING} bgColor="#FFAB00" isActive={filter === DeliveryStatus.PENDING} />
            <StatusCard label="Preparando" status={DeliveryStatus.PREPARING} bgColor="#2979FF" isActive={filter === DeliveryStatus.PREPARING} />
            <StatusCard label="Em Rota" status={DeliveryStatus.ON_ROUTE} bgColor="#9C27B0" isActive={filter === DeliveryStatus.ON_ROUTE} />
            <StatusCard label="Concluídos" status={DeliveryStatus.DELIVERED} bgColor="#4CAF50" isActive={filter === DeliveryStatus.DELIVERED} />
          </div>

          <div className="space-y-4 pb-24">
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <div className="w-32 h-32 bg-slate-200/50 rounded-full flex items-center justify-center mb-6">
                  {React.cloneElement(ICONS.Entregas, { size: 64, className: "opacity-20" })}
                </div>
                <p className="font-black text-sm uppercase tracking-widest">Nenhum pedido encontrado</p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div 
                  key={order.saleId} 
                  onClick={() => setSelectedOrderDetail(order)}
                  className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-8 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6 hover:shadow-xl hover:border-[#00BFA5]/30 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-4"
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 tracking-wider">#{order.saleId}</div>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        order.status === DeliveryStatus.PENDING ? 'bg-orange-50 text-orange-600' :
                        order.status === DeliveryStatus.PREPARING ? 'bg-blue-50 text-blue-600' :
                        order.status === DeliveryStatus.ON_ROUTE ? 'bg-purple-50 text-purple-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {order.status === DeliveryStatus.PENDING ? 'PENDENTE' : 
                         order.status === DeliveryStatus.PREPARING ? 'PREPARANDO' :
                         order.status === DeliveryStatus.ON_ROUTE ? 'EM ROTA' : 'CONCLUÍDO'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{order.customerName}</h3>
                      <p className="text-slate-500 font-medium flex items-center gap-2 mt-1 truncate max-w-md">
                        {React.cloneElement(ICONS.MapPin, { size: 16 })} {order.street}, {order.number} - {order.neighborhood}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[200px]" onClick={e => e.stopPropagation()}>
                    {order.status === DeliveryStatus.PENDING && (
                      <button 
                        onClick={() => updateDeliveryStatus(order.saleId, DeliveryStatus.PREPARING)}
                        className="w-full py-5 bg-[#00BFA5] text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#00BFA5]/20 hover:brightness-95 active:scale-95 transition-all"
                      >
                        ACEITAR PEDIDO
                      </button>
                    )}
                    <div className="text-center">
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Valor Total</p>
                       <p className="text-2xl font-black text-slate-800">R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedOrderDetail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="p-8 space-y-6 overflow-y-auto">
                 <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 tracking-wider">#{selectedOrderDetail.saleId}</span>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{selectedOrderDetail.customerName}</h2>
                      </div>
                      <p className="text-[#00BFA5] font-bold text-sm">{selectedOrderDetail.customerPhone}</p>
                    </div>
                    <button onClick={() => setSelectedOrderDetail(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all">✕</button>
                 </div>

                 {selectedMotoboy && (
                   <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex items-center gap-4 animate-in slide-in-from-top-2">
                     <div className="w-12 h-12 rounded-2xl bg-[#00BFA5] text-white flex items-center justify-center">
                       {ICONS.Bike}
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Entregador Responsável</p>
                       <p className="text-lg font-black text-slate-800">{selectedMotoboy.name}</p>
                     </div>
                   </div>
                 )}

                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                    <div className="flex items-start gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400">{ICONS.MapPin}</div>
                       <div>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Local de Entrega</p>
                          <p className="text-lg font-bold text-slate-700 leading-tight">
                            {selectedOrderDetail.street}, {selectedOrderDetail.number}<br/>
                            {selectedOrderDetail.neighborhood} - {selectedOrderDetail.city}
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Itens do Pedido</h3>
                    <div className="space-y-2">
                      {selectedSale?.items.length ? selectedSale.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-sm font-medium text-slate-700 p-2 bg-slate-50 rounded-xl">
                          <div className="flex gap-3">
                            <span className="font-black text-[#00BFA5]">{item.quantity}x</span>
                            <span>{item.productName}</span>
                          </div>
                          <span className="font-bold">R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )) : (
                        <p className="text-slate-400 text-sm italic">Nenhum item encontrado.</p>
                      )}
                    </div>
                 </div>

                 <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa: R$ {selectedOrderDetail.deliveryFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       <p className="text-2xl font-black text-[#00BFA5]">Total: R$ {selectedOrderDetail.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    {selectedOrderDetail.status === DeliveryStatus.PENDING && (
                      <button 
                        onClick={() => {
                          updateDeliveryStatus(selectedOrderDetail.saleId, DeliveryStatus.PREPARING);
                          setSelectedOrderDetail(null);
                        }}
                        className="px-10 py-5 bg-[#00BFA5] text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#00BFA5]/20 active:scale-95 transition-all"
                      >
                        Aceitar Agora
                      </button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'MAPA' && (
        <div className="flex-1 min-h-[500px] flex flex-col animate-in fade-in duration-500 overflow-hidden">
          <div className="bg-white px-8 py-4 border-b border-slate-100 flex items-center justify-between shadow-sm shrink-0">
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motoboy Ativo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motoboy Offline</span>
                </div>
             </div>
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Acompanhando {onlineMotoboys.length} entregadores</p>
          </div>
          <div className="flex-1 relative">
            <div id="delivery-map" className="absolute inset-0 z-0"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryScreen;
