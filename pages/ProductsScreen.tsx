
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { ICONS, COLORS } from '../constants';
import { Product, Category, Role } from '../types';
import { useCategories, useProducts, useAuth } from '../App';
import ProductEditModal from '../components/ProductEditModal';

const CategoryReorderItem = ({ 
  cat, 
  idx, 
  handleOpenCategoryModal, 
  handleDeleteCategoryAction 
}: { 
  cat: Category; 
  idx: number; 
  handleOpenCategoryModal: (cat?: Category) => void; 
  handleDeleteCategoryAction: (e: React.MouseEvent, cat: Category) => void;
  key?: string;
}) => {
  const controls = useDragControls();
  const timerRef = useRef<any>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const isDraggingRef = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  // Bloqueia o scroll da página inteira quando estiver arrastando
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (isDraggingRef.current && e.cancelable) {
        e.preventDefault();
      }
    };

    // Adiciona o listener globalmente uma vez
    window.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      window.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  // Efeito para estilos visuais no body
  useEffect(() => {
    if (isDraggingActive) {
      const originalBodyStyle = document.body.style.overflow;
      const originalBodyTouchAction = document.body.style.touchAction;
      const originalHtmlStyle = document.documentElement.style.overflow;
      
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.body.style.userSelect = 'none';
      (document.body.style as any).webkitUserSelect = 'none';
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalBodyStyle;
        document.body.style.touchAction = originalBodyTouchAction;
        document.body.style.userSelect = '';
        (document.body.style as any).webkitUserSelect = '';
        document.documentElement.style.overflow = originalHtmlStyle;
      };
    }
  }, [isDraggingActive]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const target = e.currentTarget;
    const pointerId = e.pointerId;
    startPos.current = { x: e.clientX, y: e.clientY };
    
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (window.navigator.vibrate) window.navigator.vibrate(40);
      isDraggingRef.current = true;
      setIsDraggingActive(true);
      
      try {
        target.setPointerCapture(pointerId);
      } catch (err) {}

      controls.start(e, { snapToCursor: true });
    }, 300);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingActive && timerRef.current) {
      const dist = Math.sqrt(
        Math.pow(e.clientX - startPos.current.x, 2) +
        Math.pow(e.clientY - startPos.current.y, 2)
      );
      if (dist > 10) {
        clearTimer();
      }
    }
  };

  const clearTimer = (e?: React.PointerEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (e && isDraggingActive) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
    isDraggingRef.current = false;
    setIsDraggingActive(false);
  };

  return (
    <Reorder.Item 
      value={cat}
      dragListener={false}
      dragControls={controls}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearTimer}
      onPointerCancel={clearTimer}
      onDragEnd={() => {
        isDraggingRef.current = false;
        setIsDraggingActive(false);
      }}
      onContextMenu={(e) => isDraggingActive && e.preventDefault()}
      whileDrag={{ 
        scale: 1.05,
        boxShadow: "0px 20px 50px rgba(0,0,0,0.15)",
        zIndex: 100
      }}
      className={`bg-white p-6 rounded-3xl border flex items-center justify-between group select-none ${isDraggingActive ? 'border-[#00BFA5] shadow-xl cursor-grabbing' : 'border-slate-100 shadow-sm cursor-grab'}`}
      style={{ 
        touchAction: isDraggingActive ? 'none' : 'pan-y',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      <div className="flex items-center gap-4">
        <div className={`transition-colors ${isDraggingActive ? 'text-[#00BFA5]' : 'text-slate-300'}`}>{ICONS.Grip}</div>
        <div>
          <h3 className="text-lg font-black text-slate-800 uppercase leading-none">{cat.name}</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Ordem #{idx + 1}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={() => handleOpenCategoryModal(cat)} 
          className="p-3 text-slate-400 hover:text-[#00BFA5] transition-all bg-slate-50 hover:bg-emerald-50 rounded-xl"
        >
          {ICONS.Edit}
        </button>
        <button 
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={(e) => handleDeleteCategoryAction(e, cat)} 
          className="p-3 text-slate-400 hover:text-red-500 transition-all bg-slate-50 hover:bg-red-50 rounded-xl"
        >
          {React.cloneElement(ICONS.Trash as React.ReactElement, { size: 18 })}
        </button>
      </div>
    </Reorder.Item>
  );
};

const ProductsScreen = () => {
  const { categories, addCategory, updateCategory, deleteCategory, updateCategoriesOrder } = useCategories();
  const { products, addProduct, setProducts, deleteProduct, fetchInitial } = useProducts();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN;
  const isSuperAdmin = user?.role === Role.SUPER_ADMIN;
  
  const [activeTab, setActiveTab] = useState<'ITENS' | 'ESTOQUE' | 'CATEGORIAS'>('ITENS');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchInitial();
    } finally {
      setIsRefreshing(false);
    }
  };

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProductToEdit, setSelectedProductToEdit] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const stats = useMemo(() => {
    const filteredForStats = selectedCategories.length === 0 
      ? products 
      : products.filter(p => selectedCategories.includes(p.category));

    const totalEstoque = filteredForStats.reduce((acc, p) => acc + (p.stock * p.price), 0);
    const custoEstoque = filteredForStats.reduce((acc, p) => acc + (p.stock * p.costPrice), 0);
    const lucroPrevisto = totalEstoque - custoEstoque;
    const emEstoque = filteredForStats.reduce((acc, p) => acc + p.stock, 0);
    const baixoEstoque = filteredForStats.filter(p => p.stock > 0 && p.stock <= (p.minStock || 5)).length;
    const semEstoque = filteredForStats.filter(p => p.stock <= 0).length;

    return { totalEstoque, custoEstoque, lucroPrevisto, emEstoque, baixoEstoque, semEstoque };
  }, [products, selectedCategories]);

  const filteredProducts = useMemo(() => {
    console.log(`ProductsScreen: Products in context: ${products.length}`);
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.category);
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategories]);

  const handleExportCSV = () => {
    const header = "Nome,Preço,Preço de Custo,Preço Promocional,Categoria,Código de Barras,Descrição,Unidade,Estoque,Destaque,Mostrar no Catálogo,Preço Diferente por Loja,Preços por Loja (JSON)\n";
    const rows = products.map(p => {
      const clean = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
      return [
        clean(p.name),
        p.price,
        p.costPrice,
        p.promotionalPrice || "",
        clean(p.category),
        clean(p.barcode),
        clean(p.description),
        clean(p.unit),
        p.stock,
        p.isHighlighted ? "true" : "false",
        p.showInCatalog !== false ? "true" : "false",
        p.differentPricesByStore ? "true" : "false",
        '"{}"'
      ].join(",");
    }).join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "produtos_mixpdv.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/);
      const newProducts: Product[] = [];
      const csvRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(csvRegex);
        if (cols.length >= 2) {
          const clean = (val: string) => val ? val.replace(/^"|"$/g, '').trim() : "";
          const importedProduct: Product = {
            id: crypto.randomUUID(),
            adminId: user?.adminId || '',
            name: clean(cols[0]),
            price: Number(cols[1].replace(',', '.')) || 0,
            costPrice: Number(cols[2]?.replace(',', '.')) || 0,
            promotionalPrice: cols[3] ? Number(cols[3].replace(',', '.')) : undefined,
            category: clean(cols[4]).toUpperCase() || "TODOS",
            barcode: clean(cols[5]),
            description: clean(cols[6]),
            unit: clean(cols[7]).toUpperCase() || "UNIDADE",
            stock: Number(cols[8]) || 0,
            isHighlighted: clean(cols[9]).toLowerCase() === 'true',
            showInCatalog: clean(cols[10]).toLowerCase() !== 'false',
            differentPricesByStore: clean(cols[11]).toLowerCase() === 'true',
            manageStock: true,
            imageUrl: 'https://via.placeholder.com/150?text=Importado',
            stockHistory: []
          };
          newProducts.push(importedProduct);
        }
      }

      if (newProducts.length > 0) {
        newProducts.forEach(p => addProduct(p));
        alert(`${newProducts.length} produtos importados com sucesso!`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenCategoryModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryNameInput(cat.name);
    } else {
      setEditingCategory(null);
      setCategoryNameInput('');
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) return;
    
    if (editingCategory) {
      updateCategory(editingCategory.id, categoryNameInput.trim().toUpperCase());
    } else {
      addCategory(categoryNameInput.trim().toUpperCase());
    }
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategoryAction = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    setCategoryToDelete(cat);
  };

  const handleOpenAddProduct = () => {
    setIsAddingNew(true);
    const newProductTemplate: Product = {
      id: '',
      adminId: user?.adminId || '',
      name: '',
      price: 0,
      costPrice: 0,
      category: categories[0]?.name || 'TODOS',
      stock: 0,
      unit: 'UNIDADE',
      imageUrl: '',
      manageStock: true,
      showInCatalog: true,
      minStock: 0,
      minStockEnabled: false,
      stockHistory: []
    };
    setSelectedProductToEdit(newProductTemplate);
  };

  const selectedProduct = useMemo(() => {
    if (!selectedProductToEdit) return null;
    return products.find(p => p.id === selectedProductToEdit.id) || selectedProductToEdit;
  }, [products, selectedProductToEdit]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] -m-4 md:-m-8">
      <div className="bg-[#00BFA5] p-4 pt-10 sticky top-0 z-40">
        <div className="flex bg-white/20 backdrop-blur-md rounded-2xl p-1 shadow-inner">
          <button onClick={() => setActiveTab('ITENS')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'ITENS' ? 'bg-white text-slate-800 shadow-sm' : 'text-white'}`}>ITENS</button>
          <button onClick={() => setActiveTab('ESTOQUE')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'ESTOQUE' ? 'bg-white text-slate-800 shadow-sm' : 'text-white'}`}>ESTOQUE</button>
          <button onClick={() => setActiveTab('CATEGORIAS')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'CATEGORIAS' ? 'bg-white text-slate-800 shadow-sm' : 'text-white'}`}>CATEGORIAS</button>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 pb-24">
        {activeTab === 'ITENS' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{ICONS.Search}</span>
                  <input type="text" placeholder="Buscar produtos..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none font-medium text-slate-700" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  title="Sincronizar dados"
                >
                  <div className={isRefreshing ? 'animate-spin' : ''}>{ICONS.Refresh}</div>
                </button>
              </div>
              <button onClick={handleOpenAddProduct} className="w-full py-4 bg-[#00BFA5] text-white rounded-2xl font-black text-lg shadow-lg hover:brightness-95 active:scale-[0.98] transition-all">+ Novo Produto</button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4">
              {filteredProducts.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative group transition-all hover:border-[#00BFA5] hover:shadow-md">
                  <div className="aspect-square bg-slate-50 flex items-center justify-center p-2 sm:p-4">
                    <img src={p.imageUrl || 'https://via.placeholder.com/150?text=Sem+Foto'} alt={p.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-2 sm:p-3 space-y-0.5 sm:space-y-1 flex-1 flex flex-col">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-700 line-clamp-2 leading-tight h-6 sm:h-8">{p.name || 'Sem nome'}</p>
                    <p className="text-sm sm:text-base font-black text-[#00BFA5] mt-auto">{formatCurrency(p.price)}</p>
                    <div className="flex border-t border-slate-50 mt-1 sm:mt-2 pt-1 sm:pt-2 gap-1">
                      <button onClick={() => { setIsAddingNew(false); setSelectedProductToEdit(p); }} className="flex-1 text-[8px] sm:text-[10px] font-black text-[#00BFA5] py-1 border border-emerald-50 rounded-lg uppercase hover:bg-emerald-50 transition-colors">Editar</button>
                      <button onClick={() => setProductToDelete(p)} className="flex-1 text-[8px] sm:text-[10px] font-black text-red-400 py-1 border border-red-50 rounded-lg uppercase hover:bg-red-50 transition-colors">Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ESTOQUE' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filtrar Categorias</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button 
                  onClick={() => setSelectedCategories([])}
                  className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase transition-all whitespace-nowrap shadow-sm border ${selectedCategories.length === 0 ? 'bg-[#00BFA5] text-white border-[#00BFA5]' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                >
                  TODAS
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategories(prev => 
                        prev.includes(cat.name) 
                          ? prev.filter(c => c !== cat.name) 
                          : [...prev, cat.name]
                      );
                    }}
                    className={`px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase transition-all whitespace-nowrap shadow-sm border ${selectedCategories.includes(cat.name) ? 'bg-[#00BFA5] text-white border-[#00BFA5]' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
              <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Valor em Estoque</p><h3 className="text-4xl font-black text-[#00BFA5]">{formatCurrency(stats.totalEstoque)}</h3></div>
              <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-6">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">Custo do estoque</p><p className="text-sm font-black text-slate-800">{formatCurrency(stats.custoEstoque)}</p></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">Lucro previsto</p><p className="text-sm font-black text-[#00BFA5]">{formatCurrency(stats.lucroPrevisto)}</p></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">Total</p><p className="text-sm font-black text-[#00BFA5]">{formatCurrency(stats.totalEstoque)}</p></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'CATEGORIAS' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <button onClick={() => handleOpenCategoryModal()} className="w-full py-4 bg-[#00BFA5] text-white rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 hover:brightness-95 active:scale-[0.98] transition-all">{ICONS.Add} Nova Categoria</button>
            <Reorder.Group axis="y" values={categories} onReorder={updateCategoriesOrder} className="space-y-3">
              {categories.map((cat, idx) => (
                <CategoryReorderItem 
                  key={cat.id}
                  cat={cat}
                  idx={idx}
                  handleOpenCategoryModal={handleOpenCategoryModal}
                  handleDeleteCategoryAction={handleDeleteCategoryAction}
                />
              ))}
            </Reorder.Group>
          </div>
        )}
      </div>

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
             <div className="flex justify-between items-center"><h3 className="text-xl font-black text-slate-800 tracking-tight">{editingCategory ? 'Renomear Categoria' : 'Nova Categoria'}</h3><button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 p-2 text-xl font-bold">✕</button></div>
             <form onSubmit={handleSaveCategory} className="space-y-6">
               <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome da Categoria</label><input required autoFocus type="text" placeholder="Ex: BEBIDAS" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-black text-slate-800 uppercase focus:ring-2 focus:ring-[#00BFA5] transition-all" value={categoryNameInput} onChange={e => setCategoryNameInput(e.target.value)} /></div>
               <button type="submit" className="w-full py-5 bg-[#00BFA5] text-white rounded-[24px] font-black text-lg shadow-xl shadow-[#00BFA5]/20 active:scale-95 transition-all">Confirmar</button>
             </form>
           </div>
        </div>
      )}

      {selectedProduct && (
        <ProductEditModal 
          product={selectedProduct} 
          isNew={isAddingNew}
          onClose={() => { setSelectedProductToEdit(null); setIsAddingNew(false); }} 
        />
      )}

      {productToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl">
                {ICONS.Trash}
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Excluir Produto?</h3>
              <p className="text-slate-500 font-medium text-sm">
                Tem certeza que deseja remover <span className="font-bold text-slate-800">"{productToDelete.name}"</span>? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm active:scale-95 transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                EXCLUIR
              </button>
            </div>
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl">
                {ICONS.Trash}
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Excluir Categoria?</h3>
              <p className="text-slate-500 font-medium text-sm">
                Deseja apagar a categoria <span className="font-bold text-slate-800">"{categoryToDelete.name}"</span>? Os produtos serão movidos para "TODOS".
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm active:scale-95 transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={() => {
                  deleteCategory(categoryToDelete.id);
                  setCategoryToDelete(null);
                }}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                EXCLUIR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsScreen;
