
import React, { useState, useEffect } from 'react';
import { ICONS, COLORS } from '../constants';

const PontoPreview = () => {
  const [time, setTime] = useState(new Date());
  const [status, setStatus] = useState<'OUT' | 'IN'>('OUT');
  const [logs, setLogs] = useState([
    { type: 'Entrada', time: '08:00', icon: ICONS.Check, color: 'text-emerald-500' },
    { type: 'Almoço', time: '--:--', icon: ICONS.Clock, color: 'text-slate-300' },
    { type: 'Retorno', time: '--:--', icon: ICONS.Clock, color: 'text-slate-300' },
    { type: 'Saída', time: '--:--', icon: ICONS.Clock, color: 'text-slate-300' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRegister = () => {
    setStatus(status === 'OUT' ? 'IN' : 'OUT');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center space-y-8 font-sans">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Registro de Ponto</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Controle de Jornada • Mix PDV</p>
      </div>

      {/* Clock Card */}
      <div className="w-full max-w-sm bg-white rounded-[48px] shadow-2xl shadow-slate-200/50 p-10 flex flex-col items-center space-y-6 border border-slate-100">
        <div className="text-6xl font-black text-slate-900 tracking-tighter tabular-nums">
          {time.toLocaleTimeString('pt-BR', { hour12: false })}
        </div>
        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </div>
        
        <button 
          onClick={handleRegister}
          className={`w-full py-8 rounded-[32px] font-black text-xl shadow-xl transition-all active:scale-95 ${
            status === 'OUT' 
              ? 'bg-[#00BFA5] text-white shadow-[#00BFA5]/20' 
              : 'bg-red-500 text-white shadow-red-500/20'
          }`}
        >
          {status === 'OUT' ? 'REGISTRAR ENTRADA' : 'REGISTRAR SAÍDA'}
        </button>
      </div>

      {/* History Card */}
      <div className="w-full max-w-sm bg-white rounded-[40px] border border-slate-100 shadow-xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800">Histórico de Hoje</h3>
          <div className="px-3 py-1 bg-emerald-50 text-[#00BFA5] rounded-full text-[10px] font-black uppercase tracking-widest">
            Em Dia
          </div>
        </div>

        <div className="space-y-4">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm ${log.color}`}>
                  {log.icon}
                </div>
                <div>
                  <p className="font-bold text-slate-700">{log.type}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Status: Confirmado</p>
                </div>
              </div>
              <span className="text-xl font-black text-slate-800 tabular-nums">{log.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center gap-2 text-slate-400">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-[10px] font-black uppercase tracking-widest">Localização Ativada • GPS Seguro</span>
      </div>
    </div>
  );
};

export default PontoPreview;
