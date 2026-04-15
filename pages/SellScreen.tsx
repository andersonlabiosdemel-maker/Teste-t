
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ICONS } from '../constants';
import { Product, SaleItem, PaymentMethod as PaymentMethodEnum, DeliveryStatus, SaleStatus, Sale } from '../types';
import { useSales, useCategories, useDelivery, useAuth, useConfig, useProducts, useStores } from '../App';
import ProductEditModal from '../components/ProductEditModal';
import ComprovanteGenerator from '../components/ComprovanteGenerator';
import { printToBluetooth } from '../lib/thermalPrinter';

const SellScreen = () => {
  const { addSale, sales } = useSales();
  const { categories } = useCategories();
  const { products } = useProducts();
  const { user } = useAuth();
  const { receipt } = useConfig();
  const { stores } = useStores();
  const { addDeliveryOrder } = useDelivery();
  const categoriesRef = useRef<HTMLDivElement>(null);
  
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('TUDO');
  const [selectedProductToEdit, setSelectedProductToEdit] = useState<Product | null>(null);
  
  const [multiplier, setMultiplier] = useState<number>(1);
  const [isSettingMultiplier, setIsSettingMultiplier] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{ code: string, time: number } | null>(null);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (err) {
      console.error("Error playing beep:", err);
    }
  };

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // First note (pi) - High and short
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6
      gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.1);

      // Second note (linn) - Higher and slightly longer
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1567.98, audioCtx.currentTime + 0.08); // G6
      gain2.gain.setValueAtTime(0, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc2.start(audioCtx.currentTime + 0.08);
      osc2.stop(audioCtx.currentTime + 0.3);
    } catch (err) {
      console.error("Error playing success sound:", err);
    }
  };
  
  const [viewStep, setViewStep] = useState<'items' | 'cart' | 'payment' | 'deliveryForm' | 'comprovante'>('items');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodEnum>(PaymentMethodEnum.CASH);
  const [destination, setDestination] = useState<'BALCAO' | 'DELIVERY'>('BALCAO');
  
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [scanToast, setScanToast] = useState<{ name: string, price: number } | null>(null);

  const currentStore = useMemo(() => stores.find(s => s.name === user?.store), [stores, user?.store]);
  const defaultCity = currentStore?.city || 'São Paulo';
  
  const [deliveryData, setDeliveryData] = useState({
    customerName: '',
    customerPhone: '',
    street: '',
    number: '',
    neighborhood: '',
    city: defaultCity,
    fee: receipt.globalDeliveryFee
  });

  const orderedCategories = useMemo(() => {
    const custom = [...categories]
      .sort((a, b) => a.order - b.order)
      .map(c => c.name.toUpperCase());
    
    // Remove duplicate names to avoid duplicate buttons and key warnings
    const uniqueCustom = Array.from(new Set(custom));
    
    return ['TUDO', 'FAVORITOS', ...uniqueCustom];
  }, [categories]);

  const subtotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0);
  const total = Math.max(0, subtotal - discount);
  const changeAmount = amountPaid > total ? amountPaid - total : 0;

  const handleFinancialInput = (value: string, callback: (v: number) => void) => {
    const raw = value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    callback(num);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const handleCategoryClick = (cat: string, index: number) => {
    setActiveCategory(cat);
    if (categoriesRef.current) {
      const buttons = categoriesRef.current.querySelectorAll('button');
      const targetButton = buttons[index];
      if (targetButton) {
        targetButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const addToCart = (product: Product) => {
    // Vibration feedback for mobile devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    const qtyToAdd = multiplier;
    setCart(prevCart => {
      const existing = prevCart.find(i => i.productId === product.id);
      if (existing) {
        return prevCart.map(i => 
          i.productId === product.id 
            ? { ...i, quantity: i.quantity + qtyToAdd, subtotal: (i.quantity + qtyToAdd) * i.price } 
            : i
        );
      } else {
        return [...prevCart, { 
          id: Math.random().toString(), 
          productId: product.id, 
          productName: product.name, 
          price: product.price, 
          costPrice: product.costPrice || 0,
          quantity: qtyToAdd, 
          subtotal: product.price * qtyToAdd 
        }];
      }
    });
    setMultiplier(1);
  };

  // Add missing updateCartItemQuantity function
  const updateCartItemQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, subtotal: newQty * item.price };
      }
      return item;
    }));
  };

  // Add missing removeFromCart function
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const finalizeSale = (status: SaleStatus) => {
    if (destination === 'DELIVERY' && status === 'COMPLETED' && !deliveryData.customerName) {
      setViewStep('deliveryForm');
      return;
    }

    const saleData = {
      userId: user?.id || 'anon',
      totalAmount: total + (destination === 'DELIVERY' ? deliveryData.fee : 0),
      amountPaid: status === 'COMPLETED' ? (selectedPayment === PaymentMethodEnum.CASH ? amountPaid : total) : 0,
      changeAmount: status === 'COMPLETED' ? (selectedPayment === PaymentMethodEnum.CASH ? changeAmount : 0) : 0,
      paymentMethod: status === 'COMPLETED' ? selectedPayment : undefined,
      items: cart,
      store: user?.store || receipt.storeName,
      status
    };

    const id = addSale(saleData);

    // Impressão automática se configurada
    if (status === 'COMPLETED' && receipt.autoPrint && receipt.printers.some(p => p.type === 'BT' && p.isConnected)) {
      const fullSale: Sale = {
        ...saleData,
        id,
        adminId: user?.adminId || 'anon',
        createdAt: new Date().toISOString()
      };
      printToBluetooth(fullSale, receipt, user?.name || 'Sistema').catch(err => {
        console.error("Erro na impressão automática:", err);
      });
    }

    if (destination === 'DELIVERY') {
      addDeliveryOrder({
        saleId: id,
        status: DeliveryStatus.PENDING,
        ...deliveryData,
        total: saleData.totalAmount
      });
    }

    if (status === 'COMPLETED') {
      playSuccessSound();
    }

    setLastSale({ ...saleData, id, adminId: user?.adminId || 'anon', createdAt: new Date().toISOString() });
    setViewStep('comprovante');
  };

  const resetSale = () => {
    setCart([]);
    setMultiplier(1);
    setAmountPaid(0);
    setDiscount(0);
    setDestination('BALCAO');
    setViewStep('items');
    setLastSale(null);
  };

  const closeScanner = async () => {
    if (scannerRef.current) {
      try {
        // Only stop if it's currently scanning
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScannerOpen(false);
  };

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;

    if (isScannerOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.getElementById("barcode-scanner");
        if (!element) return;

        scanner = new Html5Qrcode("barcode-scanner");
        scannerRef.current = scanner;
        
        const config = { fps: 10, qrbox: { width: 250, height: 150 } };
        
        scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            const now = Date.now();
            // Prevent duplicate scans of the same code within 2 seconds
            if (lastScannedRef.current && lastScannedRef.current.code === decodedText && (now - lastScannedRef.current.time) < 2000) {
              return;
            }
            
            lastScannedRef.current = { code: decodedText, time: now };
            playBeep();
            
            const product = products.find(p => p.barcode === decodedText);
            if (product) {
              addToCart(product);
              setSearch(''); // Clear search for visual feedback
              setScanToast({ name: product.name, price: product.price });
              setTimeout(() => setScanToast(null), 2000);
            } else {
              setSearch(decodedText);
            }
            // We DON'T call closeScanner() here to keep it open for continuous scanning
          },
          (errorMessage) => {
            // console.log(errorMessage);
          }
        ).catch((err) => {
          console.error("Scanner error:", err);
          setIsScannerOpen(false);
        });
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          if (scanner.isScanning) {
            scanner.stop().catch(err => console.error("Cleanup error:", err));
          }
          scannerRef.current = null;
        }
      };
    }
  }, [isScannerOpen, products]);

  const filteredProducts = useMemo(() => {
    console.log(`SellScreen: Products in context: ${products.length}`);
    // Calculate sales count per product
    const salesCountMap: Record<string, number> = {};
    sales.forEach(sale => {
      if (sale.status === 'COMPLETED') {
        sale.items.forEach(item => {
          salesCountMap[item.productId] = (salesCountMap[item.productId] || 0) + item.quantity;
        });
      }
    });

    const filtered = products.filter(p => {
      // 1. Basic search filter
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
      
      // 2. Catalog visibility filter
      const isVisible = p.showInCatalog !== false;

      // 3. Category filter
      let matchesCategory = false;
      if (activeCategory === 'TUDO') {
        matchesCategory = true;
      } else if (activeCategory === 'FAVORITOS') {
        matchesCategory = !!p.isHighlighted;
      } else {
        matchesCategory = p.category && p.category.toUpperCase() === activeCategory;
      }

      const result = matchesSearch && isVisible && matchesCategory;
      
      if (!result && search === '' && activeCategory === 'TUDO') {
        console.log(`SellScreen: Product ${p.name} rejected. Search: ${matchesSearch}, Visible: ${isVisible}, Category: ${matchesCategory}`);
      }
      
      return result;
    });

    // Sort by isHighlighted (favorites first) AND salesCount (most sold first)
    return [...filtered].sort((a, b) => {
      // 1. Favorites first
      if (a.isHighlighted && !b.isHighlighted) return -1;
      if (!a.isHighlighted && b.isHighlighted) return 1;
      
      // 2. Most sold first
      const countA = salesCountMap[a.id] || 0;
      const countB = salesCountMap[b.id] || 0;
      if (countA !== countB) return countB - countA;
      
      // 3. Alphabetical tie-breaker
      return a.name.localeCompare(b.name);
    });
  }, [products, sales, search, activeCategory]);

  return (
    <div className="relative min-h-screen">
      {viewStep === 'items' && (
        <div className="pb-32 space-y-6">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 h-14">
                {isScannerOpen ? (
                  <div className="absolute inset-0 bg-black rounded-2xl overflow-hidden">
                    <div id="barcode-scanner" className="w-full h-full"></div>
                    <button 
                      onClick={closeScanner} 
                      className="absolute top-2 right-2 p-1 bg-white/20 text-white rounded-full backdrop-blur-sm"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{ICONS.Search}</span>
                    <input 
                      type="text" 
                      placeholder="Buscar produtos..." 
                      className="w-full h-full pl-12 pr-4 bg-slate-50 border-none rounded-2xl outline-none font-medium text-slate-700" 
                      value={search} 
                      onChange={e => setSearch(e.target.value)} 
                    />
                  </>
                )}
              </div>
              <button 
                onClick={() => {
                  if (isScannerOpen) {
                    closeScanner();
                  } else {
                    setIsScannerOpen(true);
                  }
                }} 
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isScannerOpen ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-[#00BFA5] hover:bg-emerald-50'}`}
              >
                {ICONS.Barcode}
              </button>
              <button onClick={() => setIsSettingMultiplier(true)} className={`h-14 px-6 rounded-2xl font-black text-xl transition-all ${multiplier > 1 ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>{multiplier}X</button>
            </div>
            <div ref={categoriesRef} className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth px-4">
              {orderedCategories.map((cat, idx) => (
                <button key={cat} onClick={() => handleCategoryClick(cat, idx)} className={`px-8 py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-[#00BFA5] text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{cat}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 p-1">
            {filteredProducts.map(product => {
              const cartItem = cart.find(i => i.productId === product.id);
              const quantity = cartItem ? cartItem.quantity : 0;
              
              return (
                <button key={product.id} onClick={() => addToCart(product)} onContextMenu={(e) => { e.preventDefault(); setSelectedProductToEdit(product); }} className="group bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden text-left relative transition-all active:scale-95 hover:border-[#00BFA5]">
                  <div className="aspect-square w-full bg-slate-50 flex items-center justify-center p-1 sm:p-2 relative">
                    <img src={product.imageUrl || 'https://via.placeholder.com/150?text=Sem+Foto'} alt={product.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    {quantity > 0 && (
                      <div className="absolute bottom-1 right-1 bg-[#00BFA5] text-white w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-base font-black shadow-lg border-2 border-white animate-in zoom-in duration-200">
                        {quantity}
                      </div>
                    )}
                  </div>
                  <div className="p-1.5 sm:p-2 bg-white border-t border-slate-50 flex-1 flex flex-col">
                    <p className="text-[9px] sm:text-[10px] leading-tight font-bold text-slate-800 line-clamp-2 h-5 sm:h-6">{product.name}</p>
                    <p className="text-sm sm:text-lg font-black text-[#00BFA5] mt-auto">R$ {formatCurrency(product.price)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {cart.length > 0 && viewStep === 'items' && (
        <div className="fixed bottom-0 left-0 right-0 z-[55] animate-in slide-in-from-bottom-full duration-300">
          <div className="bg-white/80 backdrop-blur-md p-4 md:p-6 border-t border-slate-100 flex gap-2 max-w-7xl mx-auto">
             <button onClick={() => setCart([])} className="w-16 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0">✕</button>
             <button onClick={() => setViewStep('cart')} className="flex-1 h-14 bg-[#00BFA5] text-white rounded-2xl shadow-xl flex items-center justify-center px-6 transition-transform active:scale-95">
                <span className="text-lg font-black">R$ {formatCurrency(subtotal)}</span>
             </button>
          </div>
        </div>
      )}

      {viewStep === 'cart' && (
        <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-right duration-300 flex flex-col">
          <header className="h-16 flex items-center px-4 justify-between border-b shrink-0">
            <button onClick={() => setViewStep('items')} className="p-2 text-slate-400">✕</button>
            <h2 className="text-xl font-bold">Carrinho</h2>
            <div className="w-10"></div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.map(item => (
              <div key={item.id} className="p-4 flex items-center justify-between bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{item.productName}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => updateCartItemQuantity(item.productId, -1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">{ICONS.Minus}</button>
                    <span className="font-black text-slate-700">{item.quantity}</span>
                    <button onClick={() => updateCartItemQuantity(item.productId, 1)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">{ICONS.Add}</button>
                  </div>
                </div>
                <div className="text-right">
                   <p className="font-black text-[#00BFA5]">R$ {formatCurrency(item.subtotal)}</p>
                   <button onClick={() => removeFromCart(item.productId)} className="text-[10px] text-red-400 font-bold uppercase mt-1">Remover</button>
                </div>
              </div>
            ))}
          </div>
          <footer className="p-6 border-t space-y-4 bg-white">
            <div className="flex justify-between items-center px-2">
               <span className="text-slate-400 font-bold">Subtotal</span>
               <span className="text-2xl font-black text-slate-800">R$ {formatCurrency(subtotal)}</span>
            </div>
            <button onClick={() => setViewStep('payment')} className="w-full py-5 bg-[#00BFA5] text-white rounded-[24px] font-black text-lg shadow-xl shadow-[#00BFA5]/20">PAGAMENTO</button>
          </footer>
        </div>
      )}

      {viewStep === 'payment' && (
        <div className="fixed inset-0 z-[100] bg-[#F3F4F6] animate-in slide-in-from-right duration-300 flex flex-col">
          <header className="p-4 flex items-center gap-4 border-b bg-white shrink-0 h-16">
            <button onClick={() => setViewStep('cart')} className="p-2 text-slate-400">✕</button>
            <h2 className="text-xl font-black text-slate-800">Finalizar Venda</h2>
          </header>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
            <div className="text-center space-y-1">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total a Pagar</p>
              <h3 className="text-5xl font-black text-slate-800">R$ {formatCurrency(total)}</h3>
            </div>

            {/* Toggle Destino */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 flex">
              <button 
                onClick={() => setDestination('BALCAO')}
                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all ${destination === 'BALCAO' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
              >
                Venda Balcão
              </button>
              <button 
                onClick={() => setDestination('DELIVERY')}
                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all ${destination === 'DELIVERY' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}
              >
                Delivery / Entrega
              </button>
            </div>

            {/* Meios de Pagamento */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: PaymentMethodEnum.CASH, label: 'Dinheiro', icon: ICONS.Cash },
                { id: PaymentMethodEnum.PIX, label: 'Pix', icon: ICONS.Pix },
                { id: PaymentMethodEnum.DEBIT_CARD, label: 'Débito', icon: ICONS.Card },
                { id: PaymentMethodEnum.CREDIT_CARD, label: 'Crédito', icon: ICONS.Card },
              ].map(m => (
                <button 
                  key={m.id}
                  onClick={() => setSelectedPayment(m.id)}
                  className={`p-6 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${selectedPayment === m.id ? 'border-[#00BFA5] bg-emerald-50 text-[#00BFA5]' : 'border-white bg-white text-slate-400'}`}
                >
                  {m.icon}
                  <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                </button>
              ))}
            </div>

            {selectedPayment === PaymentMethodEnum.CASH && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 animate-in slide-in-from-top-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor Recebido</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">R$</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        className="w-full pl-16 pr-4 py-5 bg-slate-50 border-none rounded-2xl outline-none text-2xl font-black text-slate-800" 
                        value={formatCurrency(amountPaid)}
                        onChange={e => handleFinancialInput(e.target.value, setAmountPaid)} 
                      />
                    </div>
                 </div>
                 {amountPaid > total && (
                   <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl">
                      <span className="text-emerald-600 font-bold uppercase text-xs">Troco a devolver:</span>
                      <span className="text-xl font-black text-emerald-600">R$ {formatCurrency(changeAmount)}</span>
                   </div>
                 )}
              </div>
            )}

            {/* Campo de Desconto */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 animate-in slide-in-from-top-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Desconto na Venda</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">R$</span>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      className="w-full pl-16 pr-4 py-5 bg-slate-50 border-none rounded-2xl outline-none text-2xl font-black text-red-500" 
                      value={formatCurrency(discount)}
                      onChange={e => handleFinancialInput(e.target.value, setDiscount)} 
                      placeholder="0,00"
                    />
                  </div>
               </div>
            </div>
          </div>

          <footer className="p-6 bg-white border-t border-slate-100 flex gap-3">
            <button 
              onClick={() => finalizeSale('SAVED')}
              className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-[24px] font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              Salvar Pedido
            </button>
            <button 
              onClick={() => finalizeSale('COMPLETED')}
              className="flex-[2] py-5 bg-[#00BFA5] text-white rounded-[24px] font-black text-lg shadow-xl shadow-[#00BFA5]/20 active:scale-95 transition-all"
            >
              {destination === 'DELIVERY' ? 'IR PARA ENTREGA' : 'CONCLUIR VENDA'}
            </button>
          </footer>
        </div>
      )}

      {viewStep === 'deliveryForm' && (
        <div className="fixed inset-0 z-[110] bg-[#F3F4F6] animate-in slide-in-from-right duration-300 flex flex-col">
          <header className="h-16 flex items-center px-4 gap-4 bg-white border-b shrink-0">
             <button onClick={() => setViewStep('payment')} className="p-2 text-slate-400">✕</button>
             <h2 className="text-xl font-black text-slate-800">Dados da Entrega</h2>
          </header>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome do Cliente</label>
                 <input type="text" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={deliveryData.customerName} onChange={e => setDeliveryData({...deliveryData, customerName: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">WhatsApp / Telefone</label>
                 <input type="text" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={deliveryData.customerPhone} onChange={e => setDeliveryData({...deliveryData, customerPhone: e.target.value})} />
               </div>
               <div className="grid grid-cols-4 gap-3">
                 <div className="col-span-3 space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rua / Logradouro</label>
                   <input type="text" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={deliveryData.street} onChange={e => setDeliveryData({...deliveryData, street: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nº</label>
                   <input type="text" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-center" value={deliveryData.number} onChange={e => setDeliveryData({...deliveryData, number: e.target.value})} />
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bairro</label>
                 <input type="text" className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={deliveryData.neighborhood} onChange={e => setDeliveryData({...deliveryData, neighborhood: e.target.value})} />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Taxa de Entrega</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300">R$</span>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      className="w-full pl-16 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-black text-slate-700" 
                      value={formatCurrency(deliveryData.fee)} 
                      onChange={e => handleFinancialInput(e.target.value, (v) => setDeliveryData({...deliveryData, fee: v}))} 
                    />
                  </div>
               </div>
             </div>
          </div>

          <footer className="p-6 bg-white border-t">
            <button 
              onClick={() => finalizeSale('COMPLETED')}
              className="w-full py-5 bg-orange-500 text-white rounded-[24px] font-black text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
            >
              CONFIRMAR DELIVERY
            </button>
          </footer>
        </div>
      )}

      {viewStep === 'comprovante' && lastSale && (
        <div className="fixed inset-0 z-[200] bg-white animate-in fade-in duration-300 flex flex-col items-center justify-center p-6">
           <div className="w-full max-w-sm flex flex-col items-center gap-8">
             <h2 className="text-3xl font-black text-slate-800">
                {lastSale.status === 'SAVED' ? 'Pedido Salvo!' : 'Venda Concluída!'}
             </h2>
             <ComprovanteGenerator sale={lastSale} />
             <button onClick={resetSale} className="w-full h-20 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl transition-all active:scale-95">
                NOVA VENDA
             </button>
           </div>
        </div>
      )}

      {selectedProductToEdit && <ProductEditModal product={selectedProductToEdit} onClose={() => setSelectedProductToEdit(null)} />}
      
      {/* Toast de Scan */}
      {scanToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-full duration-300">
          <div className="w-8 h-8 bg-[#00BFA5] rounded-full flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Adicionado</p>
            <p className="font-bold text-sm">{scanToast.name}</p>
          </div>
        </div>
      )}
      
      {/* Modal de Multiplicador Rápido */}
      {isSettingMultiplier && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
           <div className="w-full max-w-[280px] bg-white rounded-[32px] p-6 space-y-4 shadow-2xl">
              <div className="space-y-1.5">
                <h3 className="text-center font-black text-slate-400 uppercase tracking-widest text-[10px]">Multiplicador</h3>
                <div className="relative">
                  <input 
                    type="number" 
                    value={multiplier || ''} 
                    onChange={(e) => setMultiplier(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full py-3 px-5 bg-slate-50 rounded-2xl text-center font-black text-2xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#00BFA5]/20 transition-all"
                    placeholder="1"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300 text-lg">x</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                 {[1, 2, 3, 4, 5, 6, 10, 12, 24].map(n => (
                   <button 
                    key={n} 
                    onClick={() => { setMultiplier(n); setIsSettingMultiplier(false); }} 
                    className={`py-3 rounded-xl font-black text-base transition-all ${multiplier === n ? 'bg-[#00BFA5] text-white shadow-lg shadow-[#00BFA5]/30' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                   >
                    {n}x
                   </button>
                 ))}
              </div>

              <div className="space-y-1.5 pt-1">
                <button 
                  onClick={() => {
                    if (multiplier <= 0) setMultiplier(1);
                    setIsSettingMultiplier(false);
                  }} 
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all shadow-xl shadow-slate-900/20"
                >
                  Confirmar
                </button>
                <button 
                  onClick={() => setIsSettingMultiplier(false)} 
                  className="w-full py-1.5 text-slate-400 font-bold uppercase text-[9px] tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SellScreen;
