
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ICONS } from '../constants';
import { useConfig, useMenu, useAuth, db } from '../App';
import { doc, setDoc } from 'firebase/firestore';
import { SystemModules, Printer, Role } from '../types';

const ConfigScreen = () => {
  const { toggleMenu } = useMenu();
  const { user: currentUser } = useAuth();
  const { modules, receipt, updateModules, updateReceipt, initializeDatabase } = useConfig();

  const [editField, setEditField] = useState<{ key: string; label: string; value: string | number } | null>(null);
  const [activeConfigTab, setActiveConfigTab] = useState<'DELIVERY' | 'COMPROVANTE' | 'IMPRESSORA'>('DELIVERY');
  const [isAddingPrinter, setIsAddingPrinter] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [bluetoothError, setBluetoothError] = useState('');
  const [newPrinter, setNewPrinter] = useState<Partial<Printer>>({ name: '', type: 'BT', paperSize: '58' });

  const handleToggleModule = (key: keyof SystemModules) => {
    updateModules({ ...modules, [key]: !modules[key] });
  };

  const handleToggleAutoPrint = () => {
    updateReceipt({ ...receipt, autoPrint: !receipt.autoPrint });
  };

  const handleFinancialInput = (value: string) => {
    if (!editField) return;
    const raw = value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    setEditField({ ...editField, value: num });
  };

  const saveReceiptField = () => {
    if (editField) {
      updateReceipt({ ...receipt, [editField.key]: editField.value });
      setEditField(null);
    }
  };

  const handleAddPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    const printer: Printer = {
      id: crypto.randomUUID(),
      name: newPrinter.name || 'Impressora Nova',
      type: 'BT', // Apenas Bluetooth
      paperSize: newPrinter.paperSize as '58' | '80',
      isConnected: true
    };
    updateReceipt({ ...receipt, printers: [...receipt.printers, printer] });
    setIsAddingPrinter(false);
    setNewPrinter({ name: '', type: 'BT', paperSize: '58' });
    setBluetoothError('');
  };

  const scanBluetooth = async () => {
    if (!navigator.bluetooth) {
      setBluetoothError('Bluetooth não suportado neste navegador.');
      return;
    }

    setIsScanning(true);
    setBluetoothError('');

    try {
      // Procurar por dispositivos que aceitem conexões seriais (comum em impressoras térmicas)
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['00001101-0000-1000-8000-00805f9b34fb'] // SPP (Serial Port Profile)
      });

      if (device) {
        setNewPrinter({
          ...newPrinter,
          name: device.name || 'Impressora Bluetooth',
        });
      }
    } catch (error: any) {
      console.error('Bluetooth Error:', error);
      if (error.name === 'SecurityError') {
        setBluetoothError('Permissão Bluetooth negada pela política de segurança.');
      } else if (error.name !== 'NotFoundError') {
        setBluetoothError('Erro ao buscar dispositivos Bluetooth.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const removePrinter = (id: string) => {
    if (confirm("Deseja remover esta impressora da lista?")) {
      updateReceipt({ ...receipt, printers: receipt.printers.filter(p => p.id !== id) });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] -m-4 md:-m-8">
      <div className="bg-[#00BFA5] p-6 pt-10 sticky top-0 z-40">
        <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-6">Configurações</h2>
        <div className="flex bg-white/20 backdrop-blur-md rounded-2xl p-1 shadow-inner">
          <button onClick={() => setActiveConfigTab('DELIVERY')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeConfigTab === 'DELIVERY' ? 'bg-white text-slate-800' : 'text-white'}`}>REGRAS</button>
          <button onClick={() => setActiveConfigTab('COMPROVANTE')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeConfigTab === 'COMPROVANTE' ? 'bg-white text-slate-800' : 'text-white'}`}>COMPROVANTE</button>
          <button onClick={() => setActiveConfigTab('IMPRESSORA')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeConfigTab === 'IMPRESSORA' ? 'bg-white text-slate-800' : 'text-white'}`}>IMPRESSORA</button>
        </div>
      </div>

      <div className="max-w-xl mx-auto w-full p-4 md:p-8 space-y-8 pb-32">
        
        {activeConfigTab === 'DELIVERY' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <section className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden p-8 space-y-10">
              <h3 className="text-lg font-black text-slate-800 border-b pb-4">Módulos do Sistema</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="font-bold text-slate-700">Delivery</span>
                  <button onClick={() => handleToggleModule('delivery')} className={`w-12 h-6 rounded-full relative transition-all ${modules.delivery ? 'bg-[#00BFA5]' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${modules.delivery ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="font-bold text-slate-700">Motoboy</span>
                  <button onClick={() => handleToggleModule('motoboy')} className={`w-12 h-6 rounded-full relative transition-all ${modules.motoboy ? 'bg-[#00BFA5]' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${modules.motoboy ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="font-bold text-slate-700">Caixa</span>
                  <button onClick={() => handleToggleModule('caixa')} className={`w-12 h-6 rounded-full relative transition-all ${modules.caixa ? 'bg-[#00BFA5]' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${modules.caixa ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TAXA DE ENTREGA PADRÃO</p>
                    <p className="text-3xl font-black text-slate-800">R$ {receipt.globalDeliveryFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <button onClick={() => setEditField({ key: 'globalDeliveryFee', label: 'Taxa de Entrega', value: receipt.globalDeliveryFee })} className="px-5 py-3 bg-slate-100 text-[#00BFA5] rounded-2xl font-black text-xs uppercase">Alterar</button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">COMISSÃO MOTOBOY (%)</p>
                    <p className="text-3xl font-black text-[#00BFA5]">{receipt.motoboyCommission}%</p>
                  </div>
                  <button onClick={() => setEditField({ key: 'motoboyCommission', label: 'Comissão (%)', value: receipt.motoboyCommission })} className="px-5 py-3 bg-slate-100 text-[#00BFA5] rounded-2xl font-black text-xs uppercase">Alterar</button>
                </div>
              </div>

              {currentUser?.role === Role.SUPER_ADMIN && (
                <div className="pt-6 border-t border-slate-50 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações do Banco de Dados</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Projeto</p>
                        <p className="text-xs font-black text-slate-700">anderson-23337</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Database ID</p>
                        <p className="text-xs font-black text-slate-700">(default)</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      try {
                        const testRef = doc(db, 'test', 'manual_test_' + Date.now());
                        await setDoc(testRef, { 
                          uid: currentUser.id, 
                          email: currentUser.email,
                          timestamp: new Date().toISOString() 
                        });
                        alert("Teste de escrita realizado com sucesso! Verifique a coleção 'test' no console do Firebase.");
                      } catch (err: any) {
                        console.error("Manual test write failed:", err);
                        alert("Erro no teste de escrita: " + err.message);
                      }
                    }}
                    className="w-full py-4 bg-emerald-50 text-[#00BFA5] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-3"
                  >
                    {ICONS.Check} Testar Escrita no Banco
                  </button>

                  <button 
                    onClick={() => {
                      if (confirm("Deseja sincronizar o banco de dados com os produtos e categorias iniciais? Isso criará os itens padrão se eles não existirem.")) {
                        initializeDatabase();
                      }
                    }}
                    className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                    Sincronizar Banco de Dados
                  </button>
                  <p className="mt-2 text-[10px] text-slate-400 font-bold text-center uppercase tracking-tighter">Use esta opção se o seu banco de dados estiver vazio.</p>
                </div>
              )}

            </section>
          </div>
        )}

        {activeConfigTab === 'COMPROVANTE' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <section className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-8 space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-800">Cabeçalho do Recibo</h3>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Loja</label>
                  <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={receipt.storeName} onChange={e => updateReceipt({...receipt, storeName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações Extras (CNPJ, Endereço)</label>
                  <textarea rows={3} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium text-sm" placeholder="Ex: Av. Brasil, 100 - CNPJ: 00.000.000/0001-00"></textarea>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <h3 className="text-lg font-black text-slate-800">Rodapé do Recibo</h3>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensagem Final</label>
                  <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={receipt.footer} onChange={e => updateReceipt({...receipt, footer: e.target.value})} />
                </div>
              </div>
            </section>
          </div>
        )}

        {activeConfigTab === 'IMPRESSORA' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <section className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-8 space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00BFA5] flex items-center justify-center">{ICONS.Printer}</div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Impressoras Bluetooth</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Gestão de Equipamentos</p>
                </div>
              </div>

              <div className="pt-2 space-y-4 pb-6 border-b border-slate-50">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                   <div className="space-y-1">
                      <span className="font-bold text-slate-700">Impressão automática</span>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Emitir recibo ao vender</p>
                   </div>
                   <button onClick={handleToggleAutoPrint} className={`w-12 h-6 rounded-full relative transition-all ${receipt.autoPrint ? 'bg-[#00BFA5]' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${receipt.autoPrint ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setIsAddingPrinter(true)}
                className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black text-sm uppercase tracking-widest hover:border-[#00BFA5] hover:text-[#00BFA5] transition-all"
              >
                + Adicionar Impressora BT
              </button>

              <div className="space-y-3">
                 {receipt.printers.map(printer => (
                   <div key={printer.id} className="p-5 bg-slate-50 rounded-3xl flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                         <div className={`w-2 h-2 rounded-full ${printer.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                         <div>
                            <p className="font-black text-slate-800">{printer.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Bluetooth • Papel {printer.paperSize}mm</p>
                         </div>
                      </div>
                      <button onClick={() => removePrinter(printer.id)} className="text-red-400 hover:text-red-600 font-black text-xs uppercase transition-colors p-2">Remover</button>
                   </div>
                 ))}
              </div>
            </section>
          </div>
        )}

      </div>

      {isAddingPrinter && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
             <div className="flex justify-between items-center">
               <h3 className="text-xl font-black text-slate-800">Nova Impressora BT</h3>
               <button onClick={() => { setIsAddingPrinter(false); setBluetoothError(''); }} className="text-slate-400">✕</button>
             </div>
             
             <div className="space-y-4">
               <button 
                 onClick={scanBluetooth}
                 disabled={isScanning}
                 className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase transition-all ${isScanning ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-[#00BFA5] hover:bg-emerald-100'}`}
               >
                 {isScanning ? (
                   <div className="w-4 h-4 border-2 border-[#00BFA5] border-t-transparent rounded-full animate-spin"></div>
                 ) : ICONS.Search}
                 {isScanning ? 'Buscando...' : 'Buscar Dispositivos'}
               </button>
               
               {bluetoothError && (
                 <p className="text-red-500 text-[10px] font-black uppercase text-center">{bluetoothError}</p>
               )}
             </div>

             <div className="relative flex items-center gap-4">
               <div className="flex-1 h-px bg-slate-100"></div>
               <span className="text-[10px] font-black text-slate-300 uppercase">Ou digite manualmente</span>
               <div className="flex-1 h-px bg-slate-100"></div>
             </div>

             <form onSubmit={handleAddPrinter} className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome/Modelo</label>
                 <input required type="text" placeholder="Ex: PT-210" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={newPrinter.name} onChange={e => setNewPrinter({...newPrinter, name: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tamanho do Papel</label>
                 <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold appearance-none" value={newPrinter.paperSize} onChange={e => setNewPrinter({...newPrinter, paperSize: e.target.value as any})}>
                   <option value="58">58mm (Pequena)</option>
                   <option value="80">80mm (Grande)</option>
                 </select>
               </div>
               <button type="submit" className="w-full py-5 bg-[#00BFA5] text-white rounded-3xl font-black text-lg shadow-xl shadow-[#00BFA5]/20 mt-4">Confirmar BT</button>
             </form>
           </div>
        </div>
      )}

      {editField && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-[48px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-center text-slate-900">{editField.label}</h3>
            <input 
              autoFocus
              type="text"
              inputMode={(editField.key === 'globalDeliveryFee' || editField.key === 'motoboyCommission') ? "numeric" : "text"}
              className="w-full py-6 bg-slate-50 border-none rounded-3xl text-3xl font-black text-slate-800 text-center"
              value={typeof editField.value === 'number' ? editField.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : editField.value}
              onChange={e => (editField.key === 'globalDeliveryFee' || editField.key === 'motoboyCommission') ? handleFinancialInput(e.target.value) : setEditField({ ...editField, value: e.target.value })}
            />
            <button onClick={saveReceiptField} className="w-full py-5 bg-[#00BFA5] text-white rounded-3xl font-black text-lg">Salvar</button>
            <button onClick={() => setEditField(null)} className="w-full text-slate-400 font-bold text-sm uppercase">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigScreen;
