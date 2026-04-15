
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Cropper, { Area, Point } from 'react-easy-crop';
import { ICONS } from '../constants';
import { Product, StockHistory } from '../types';
import { useProducts, useCategories } from '../App';

interface ProductEditModalProps {
  product: Product;
  onClose: () => void;
  isNew?: boolean;
}

const ProductEditModal: React.FC<ProductEditModalProps> = ({ product, onClose, isNew = false }) => {
  const { updateProduct, addProduct, fetchProduct } = useProducts();
  const { categories } = useCategories();
  const [activeTab, setActiveTab] = useState<'CADASTRO' | 'ESTOQUE'>('CADASTRO');
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  // Crop state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  
  const [formData, setFormData] = useState<Product>({ 
    ...product,
    promotionalPrice: product.promotionalPrice || undefined,
    barcode: product.barcode || '',
    description: product.description || '',
    isHighlighted: product.isHighlighted || false,
    showInCatalog: product.showInCatalog !== undefined ? product.showInCatalog : true,
    differentPricesByStore: product.differentPricesByStore || false,
    minStockEnabled: product.minStockEnabled || false,
    manageStock: product.manageStock ?? true
  });

  // Sync formData with product prop for real-time updates (stock and history)
  useEffect(() => {
    if (!isNew) {
      setFormData(prev => ({
        ...prev,
        stock: product.stock || 0,
        stockHistory: product.stockHistory || prev.stockHistory || []
      }));
    }
  }, [product.stock, product.stockHistory, isNew]);

  // Fetch full product data when history is requested
  useEffect(() => {
    if (showHistory && !isNew && (!formData.stockHistory || formData.stockHistory.length === 0)) {
      const loadFull = async () => {
        setIsLoadingFull(true);
        try {
          const fullProduct = await fetchProduct(product.id);
          if (fullProduct) {
            setFormData(prev => ({
              ...prev,
              stockHistory: fullProduct.stockHistory || []
            }));
          }
        } finally {
          setIsLoadingFull(false);
        }
      };
      loadFull();
    }
  }, [showHistory, isNew, product.id, fetchProduct]);

  const handleCurrencyInput = (field: keyof Product, value: string) => {
    const rawValue = value.replace(/\D/g, ''); 
    const numericValue = Number(rawValue) / 100;
    setFormData({ ...formData, [field]: numericValue });
  };

  const formatCurrency = (val: number = 0) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (allow up to 5MB for upload)
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem é muito grande. Por favor, escolha uma imagem com menos de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageToCrop(event.target?.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      setFormData({ ...formData, imageUrl: croppedImage });
      setIsCropping(false);
      setImageToCrop(null);
    } catch (e) {
      console.error(e);
      alert("Erro ao cortar a imagem.");
    }
  };

  const changeImage = () => {
    const input = document.getElementById('product-image-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const removeImage = () => {
    if(confirm("Deseja remover a imagem deste produto?")) {
      setFormData({ ...formData, imageUrl: '' });
    }
  };

  const handleSave = async () => {
    // TRAVA DE LUCRATIVIDADE: Preço de Venda não pode ser menor que Custo
    if (formData.price < formData.costPrice) {
      alert("Atenção! O PREÇO DE VENDA não pode ser menor que o PREÇO DE CUSTO. Verifique os valores antes de salvar.");
      return;
    }

    console.log("ProductEditModal: Saving product...", JSON.stringify(formData));
    setIsSaving(true);
    try {
      if (isNew) {
        const newProduct = { 
          ...formData, 
          id: crypto.randomUUID(),
          stockHistory: formData.stock > 0 ? [{
            id: 'initial',
            type: 'ENTRADA' as const,
            quantity: formData.stock,
            date: new Date().toISOString(),
            reason: 'Estoque Inicial',
            balance: formData.stock,
            responsible: 'Sistema'
          }] : []
        };
        console.log("ProductEditModal: Adding new product:", newProduct.id);
        await addProduct(newProduct);
      } else {
        console.log("ProductEditModal: Updating product:", product.id);
        await updateProduct(product.id, formData);
      }
      onClose();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert("Ocorreu um erro ao salvar o produto. Verifique sua conexão e permissões.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeScanner = async () => {
    if (scannerRef.current) {
      try {
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
      const timer = setTimeout(() => {
        const element = document.getElementById("product-barcode-scanner");
        if (!element) return;

        scanner = new Html5Qrcode("product-barcode-scanner");
        scannerRef.current = scanner;
        
        const config = { fps: 10, qrbox: { width: 250, height: 150 } };
        
        scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            setFormData(prev => ({ ...prev, barcode: decodedText }));
            closeScanner();
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
  }, [isScannerOpen]);

  return (
    <>
      <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white rounded-[16px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
        
        {/* Header Estilo App */}
        <div className="p-4 border-b border-slate-100 shrink-0 flex items-center gap-4">
          {!showHistory ? (
            <h2 className="text-xl font-black text-slate-800">{isNew ? 'Adicionar Produto' : 'Editar Produto'}</h2>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <button onClick={() => setShowHistory(false)} className="p-2 text-slate-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <h2 className="text-xl font-black text-slate-800">Movimentações</h2>
              <div className="ml-auto text-slate-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
              </div>
            </div>
          )}
        </div>

        {!showHistory && (
          <div className="flex border-b border-slate-100 shrink-0">
            <button 
              onClick={() => setActiveTab('CADASTRO')} 
              className={`flex-1 py-3 text-sm font-black transition-all border-b-2 ${activeTab === 'CADASTRO' ? 'border-[#00BFA5] text-[#00BFA5]' : 'border-transparent text-slate-400'}`}
            >
              CADASTRO
            </button>
            <button 
              onClick={() => setActiveTab('ESTOQUE')} 
              className={`flex-1 py-3 text-sm font-black transition-all border-b-2 ${activeTab === 'ESTOQUE' ? 'border-[#00BFA5] text-[#00BFA5]' : 'border-transparent text-slate-400'}`}
            >
              ESTOQUE
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <input 
            type="file" 
            id="product-image-upload" 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          {!showHistory ? (
            <div className="p-4 space-y-4 pb-10">
              {activeTab === 'CADASTRO' ? (
                <div className="space-y-4">
                  <div className="flex justify-center relative py-4">
                    <div className="relative w-40 h-40 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner">
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} className="w-full h-full object-contain p-2 animate-in fade-in duration-500" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-slate-200 flex flex-col items-center gap-2">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Sem Foto</span>
                        </div>
                      )}
                      {formData.imageUrl && (
                        <button onClick={removeImage} className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-90 transition-all z-10">
                          ✕
                        </button>
                      )}
                      <button onClick={changeImage} className="absolute bottom-2 right-2 w-12 h-12 bg-[#00BFA5] text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-90 transition-all z-10">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="13" r="4"/><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="relative border border-slate-300 rounded-lg p-2 focus-within:border-[#00BFA5] transition-colors">
                      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-slate-400">Nome *</label>
                      <input type="text" className="w-full bg-transparent outline-none text-slate-700 font-medium pt-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative border border-slate-300 rounded-lg p-2 focus-within:border-[#00BFA5]">
                        <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-slate-400">Preço de Venda *</label>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold">R$</span>
                          <input type="text" inputMode="numeric" className="w-full bg-transparent outline-none text-slate-700 font-black pt-1" value={formatCurrency(formData.price)} onChange={e => handleCurrencyInput('price', e.target.value)} />
                        </div>
                      </div>
                      <div className="relative border border-slate-300 rounded-lg p-2 focus-within:border-[#00BFA5]">
                        <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-slate-400">Preço de Custo *</label>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold">R$</span>
                          <input type="text" inputMode="numeric" className="w-full bg-transparent outline-none text-slate-700 font-black pt-1" value={formatCurrency(formData.costPrice)} onChange={e => handleCurrencyInput('costPrice', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className="relative border border-slate-300 rounded-lg p-2 focus-within:border-[#00BFA5]">
                      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-slate-400">Preço Promocional</label>
                      <input type="text" inputMode="numeric" className="w-full bg-transparent outline-none text-slate-400 font-medium pt-1" placeholder="Preço Promocional" value={formData.promotionalPrice ? formatCurrency(formData.promotionalPrice) : ''} onChange={e => handleCurrencyInput('promotionalPrice', e.target.value)} />
                    </div>

                    <div className="relative border border-slate-300 rounded-lg p-2 focus-within:border-[#00BFA5] flex items-center">
                      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-slate-400">Categoria *</label>
                      <select className="w-full bg-transparent outline-none text-slate-700 font-medium pt-1 appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                      <div className="text-slate-400 pointer-events-none">{ICONS.ChevronDown}</div>
                    </div>

                    <div className="relative border border-slate-300 rounded-lg p-2 focus-within:border-[#00BFA5] flex items-center gap-2">
                      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-slate-400">Código de Barras</label>
                      <input type="text" className="flex-1 bg-transparent outline-none text-slate-700 font-medium pt-1" placeholder="Código de Barras" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                      <button 
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="p-1.5 bg-slate-50 text-[#00BFA5] rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        {ICONS.Barcode}
                      </button>
                    </div>

                    <div className="relative border border-slate-300 rounded-lg p-2 focus-within:border-[#00BFA5]">
                      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-slate-400">Descrição</label>
                      <input type="text" className="w-full bg-transparent outline-none text-slate-700 font-medium pt-1" placeholder="Descrição" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative border border-slate-300 rounded-lg p-2 focus-within:border-[#00BFA5]">
                        <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-slate-400">Estoque *</label>
                        <input type="number" className="w-full bg-transparent outline-none text-slate-700 font-medium pt-1" value={formData.stock === 0 ? '' : formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                      </div>
                      <div className="relative border border-slate-300 rounded-lg p-2 focus-within:border-[#00BFA5]">
                        <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-slate-400">Unidade</label>
                        <input type="text" className="w-full bg-transparent outline-none text-slate-700 font-medium pt-1 uppercase" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value.toUpperCase()})} />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.isHighlighted ? 'bg-[#00BFA5] border-[#00BFA5]' : 'border-slate-300 group-hover:border-[#00BFA5]'}`}>
                          {formData.isHighlighted && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        <input type="checkbox" className="hidden" checked={formData.isHighlighted} onChange={e => setFormData({...formData, isHighlighted: e.target.checked})} />
                        <span className="text-sm font-medium text-slate-700">Destacar produto</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.showInCatalog ? 'bg-[#00BFA5] border-[#00BFA5]' : 'border-slate-300 group-hover:border-[#00BFA5]'}`}>
                          {formData.showInCatalog && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        <input type="checkbox" className="hidden" checked={formData.showInCatalog} onChange={e => setFormData({...formData, showInCatalog: e.target.checked})} />
                        <span className="text-sm font-medium text-slate-700">Exibir no catálogo</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.differentPricesByStore ? 'bg-[#00BFA5] border-[#00BFA5]' : 'border-slate-300 group-hover:border-[#00BFA5]'}`}>
                          {formData.differentPricesByStore && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        <input type="checkbox" className="hidden" checked={formData.differentPricesByStore} onChange={e => setFormData({...formData, differentPricesByStore: e.target.checked})} />
                        <span className="text-sm font-medium text-slate-700">Preço diferente por loja</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className="flex items-center justify-between p-2">
                      <span className="font-black text-slate-800 text-lg">Gerenciar estoque</span>
                      <button onClick={() => setFormData({...formData, manageStock: !formData.manageStock})} className={`w-14 h-7 rounded-full relative transition-all ${formData.manageStock ? 'bg-[#00BFA5]' : 'bg-slate-200'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${formData.manageStock ? 'left-8' : 'left-1'}`} /></button>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="relative border border-slate-300 rounded-lg p-3 focus-within:border-[#00BFA5]">
                        <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-slate-400 tracking-widest uppercase">Estoque *</label>
                        <input type="number" className="w-full bg-transparent outline-none text-slate-700 font-bold text-xl pt-1" value={formData.stock === 0 ? '' : formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                      </div>
                      
                      {!isNew && (
                        <button onClick={() => setShowHistory(true)} className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group shadow-sm">
                          <span className="font-bold text-slate-700">Histórico de movimentações</span>
                          <div className="text-slate-300 group-hover:text-[#00BFA5] transition-colors">{ICONS.ChevronRight}</div>
                        </button>
                      )}
                   </div>

                   <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between p-2">
                        <span className="font-bold text-slate-800 text-sm uppercase tracking-widest">Estoque mínimo p/ alerta</span>
                        <button onClick={() => setFormData({...formData, minStockEnabled: !formData.minStockEnabled})} className={`w-14 h-7 rounded-full relative transition-all ${formData.minStockEnabled ? 'bg-[#00BFA5]' : 'bg-slate-200'}`}>
                          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${formData.minStockEnabled ? 'left-8' : 'left-1'}`} />
                        </button>
                      </div>
                      
                      {formData.minStockEnabled && (
                        <div className="relative border border-slate-300 rounded-lg p-3 animate-in fade-in slide-in-from-top-1">
                          <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-slate-400 tracking-widest uppercase">Valor do Alerta</label>
                          <input type="number" className="w-full bg-transparent outline-none text-slate-700 font-bold pt-1" value={formData.minStock || ''} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} placeholder="Digite o valor..." />
                        </div>
                      )}
                   </div>
                </div>
              )}
              
              <div className="p-4 flex gap-4 shrink-0 bg-white pt-10">
                <button onClick={onClose} className="flex-1 h-12 border border-[#00BFA5] text-[#00BFA5] rounded-full font-bold uppercase transition-all active:scale-95">
                  Cancelar
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className={`flex-1 h-12 bg-[#00BFA5] text-white rounded-full font-bold uppercase shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-[#f9fafb]">
              <div className="bg-white px-4 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-lg p-2 border border-slate-100 flex items-center justify-center">
                    <img src={formData.imageUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <h3 className="text-base font-bold text-slate-600">{formData.name || 'Novo Produto'}</h3>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-800">{formData.stock}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                {isLoadingFull ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <div className="w-8 h-8 border-4 border-[#00BFA5]/20 border-t-[#00BFA5] rounded-full animate-spin mb-4" />
                    <p className="font-bold text-sm uppercase tracking-widest">Carregando histórico...</p>
                  </div>
                ) : (formData.stockHistory || []).length > 0 ? (
                  <div className="divide-y divide-slate-100 bg-white">
                    {[...(formData.stockHistory || [])].reverse().map((h: StockHistory) => (
                      <div key={h.id} className="p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                        <div className={`mt-1.5 ${h.type === 'ENTRADA' ? 'text-emerald-500' : 'text-red-500'}`}>
                          {h.type === 'ENTRADA' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                             <h4 className={`text-xl font-black ${h.type === 'ENTRADA' ? 'text-slate-700' : 'text-red-600'}`}>
                               {h.type === 'ENTRADA' ? 'Entrada' : 'Saída'}: {h.quantity}
                             </h4>
                             <div className="text-right">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo</p>
                               <p className={`text-xl font-black ${h.balance <= 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                 {h.balance}
                               </p>
                             </div>
                          </div>
                          <div className="flex flex-col">
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                               #{h.id} - {new Date(h.date).toLocaleString('pt-BR', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} - {h.responsible}
                             </p>
                             {h.reason && (
                               <p className="text-[10px] text-[#00BFA5] font-black uppercase tracking-widest mt-0.5">
                                 {h.reason}
                               </p>
                             )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                     <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20 mb-4"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                     <p className="font-bold text-sm uppercase tracking-widest">Sem movimentações</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Image Cropper Modal */}
      {isCropping && imageToCrop && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center bg-slate-900 text-white shrink-0">
            <h3 className="font-black uppercase tracking-widest text-sm">Ajustar Imagem</h3>
            <button onClick={() => setIsCropping(false)} className="p-2">✕</button>
          </div>
          
          <div className="relative flex-1 bg-slate-800">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          <div className="p-6 bg-slate-900 space-y-6 shrink-0">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00BFA5]"
              />
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setIsCropping(false)} 
                className="flex-1 h-14 border border-slate-700 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCropSave} 
                className="flex-1 h-14 bg-[#00BFA5] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-900/20"
              >
                Confirmar Corte
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Barcode Scanner Overlay */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center bg-slate-900 text-white shrink-0">
            <h3 className="font-black uppercase tracking-widest text-sm">Escanear Código</h3>
            <button onClick={closeScanner} className="p-2 text-white">✕</button>
          </div>
          <div className="relative flex-1 bg-black flex items-center justify-center">
            <div id="product-barcode-scanner" className="w-full h-full max-w-lg mx-auto"></div>
            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 flex items-center justify-center">
              <div className="w-64 h-40 border-2 border-[#00BFA5] rounded-2xl relative">
                <div className="absolute inset-0 bg-[#00BFA5]/10 animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="p-8 bg-slate-900 text-center shrink-0">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aponte a câmera para o código de barras</p>
          </div>
        </div>
      )}
    </>
  );
};

// Helper functions for image cropping
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Resize if too large
  const MAX_WIDTH = 800;
  const MAX_HEIGHT = 800;
  let finalWidth = canvas.width;
  let finalHeight = canvas.height;

  if (finalWidth > MAX_WIDTH || finalHeight > MAX_HEIGHT) {
    if (finalWidth > finalHeight) {
      finalHeight *= MAX_WIDTH / finalWidth;
      finalWidth = MAX_WIDTH;
    } else {
      finalWidth *= MAX_HEIGHT / finalHeight;
      finalHeight = MAX_HEIGHT;
    }

    const resizeCanvas = document.createElement('canvas');
    resizeCanvas.width = finalWidth;
    resizeCanvas.height = finalHeight;
    const resizeCtx = resizeCanvas.getContext('2d');
    resizeCtx?.drawImage(canvas, 0, 0, finalWidth, finalHeight);
    return resizeCanvas.toDataURL('image/jpeg', 0.7);
  }

  return canvas.toDataURL('image/jpeg', 0.7);
}

export default ProductEditModal;
