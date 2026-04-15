
import * as React from 'react';
import { useState, createContext, useContext, useMemo, useEffect, Component, useRef, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { COLORS, ICONS } from './constants';
import { User, Role, Sale, SaleItem, Store, Category, SystemModules, ReceiptConfig, DeliveryOrder, DeliveryStatus, SaleStatus, PaymentMethod, Product, StockHistory, Printer, CaixaSession, CaixaMovement, OperationType } from './types';

const SUPER_ADMIN_EMAILS = ['anderson-coelhos@hotmail.com', 'andersonlabiosdemel@gmail.com'];
import HomeScreen from './pages/HomeScreen';
import SellScreen from './pages/SellScreen';
import DeliveryScreen from './pages/DeliveryScreen';
import ProductsScreen from './pages/ProductsScreen';
import StatsScreen from './pages/StatsScreen';
import PlansScreen from './pages/PlansScreen';
import HistoryScreen from './pages/HistoryScreen';
import UsersScreen from './pages/UsersScreen';
import LojasScreen from './pages/LojasScreen';
import logo from './src/assets/logo.svg';
import MotoboyScreen from './pages/MotoboyScreen';
import ConfigScreen from './pages/ConfigScreen';
import CaixaScreen from './pages/CaixaScreen';
import LoginScreen from './pages/LoginScreen';
import RegisterScreen from './pages/RegisterScreen';
import ForgotPasswordScreen from './pages/ForgotPasswordScreen';

import { db, auth, config } from './firebase';
export { db, auth, config };
import { initializeApp, getApps, getApp } from 'firebase/app';
import ShareCatalogScreen from './pages/ShareCatalogScreen';
import PontoPreview from './pages/PontoPreview';
import { handleFirestoreError, sanitize } from './src/lib/utils';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  limit,
  orderBy,
  getDoc,
  getDocs,
  getDocFromServer,
  runTransaction
} from 'firebase/firestore';
import { onAuthStateChanged, signOut, updatePassword, createUserWithEmailAndPassword, getAuth, setPersistence, inMemoryPersistence, browserLocalPersistence } from 'firebase/auth';

const INITIAL_CATEGORIES: Category[] = [
  { id: '1', adminId: 'super-admin', name: 'BEBIDAS', order: 0, productCount: 0 },
  { id: '2', adminId: 'super-admin', name: 'ALIMENTOS', order: 1, productCount: 0 },
  { id: '3', adminId: 'super-admin', name: 'LIMPEZA', order: 2, productCount: 0 },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    adminId: 'super-admin',
    name: 'Coca-Cola 2L',
    price: 9.50,
    costPrice: 6.50,
    category: 'BEBIDAS',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=200&auto=format&fit=crop',
    stock: 24,
    unit: 'UNIDADE',
    barcode: '7891234567890',
    description: 'Refrigerante de cola 2 litros',
    isHighlighted: true,
    showInCatalog: true,
    manageStock: true,
    stockHistory: []
  },
  {
    id: 'p2',
    adminId: 'super-admin',
    name: 'Pão de Forma',
    price: 7.90,
    costPrice: 4.20,
    category: 'ALIMENTOS',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=200&auto=format&fit=crop',
    stock: 12,
    unit: 'UNIDADE',
    barcode: '7899876543210',
    description: 'Pão de forma tradicional 500g',
    isHighlighted: false,
    showInCatalog: true,
    manageStock: true,
    stockHistory: []
  }
];

const PLAN_FEATURES: Record<string, string[]> = {
  'GRATUITO': ['/vender', '/historico', '/produtos', '/caixa'],
  'BASICO': ['/vender', '/historico', '/produtos', '/caixa', '/configuracoes'],
  'PRO': ['/vender', '/historico', '/produtos', '/caixa', '/delivery', '/stats', '/configuracoes'],
  'PREMIUM': ['/vender', '/historico', '/delivery', '/produtos', '/usuarios', '/stats', '/planos', '/lojas', '/motoboy', '/configuracoes', '/caixa'],
  'TRIAL_15': ['/vender', '/historico', '/delivery', '/produtos', '/usuarios', '/stats', '/planos', '/lojas', '/motoboy', '/configuracoes', '/caixa'],
  'VITALICIO': ['/vender', '/historico', '/delivery', '/produtos', '/usuarios', '/stats', '/planos', '/lojas', '/motoboy', '/configuracoes', '/caixa']
};

// --- Contexts ---
interface AuthContextType {
  user: User | null; isSuperAdmin: boolean; plan: string; trialDaysLeft: number; allUsers: User[]; isAuthenticated: boolean;
  login: (email: string, password?: string) => boolean; logout: () => void; register: (data: any) => void;
  switchUser: (userId: string, password?: string) => boolean; updateUser: (user: User) => void;
  updateUserStatus: (id: string, updates: Partial<User>) => void; addUser: (user: User) => void;
  deleteUser: (id: string) => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('useAuth'); return context; };

interface CaixaContextType {
  sessions: CaixaSession[];
  activeSession: CaixaSession | null;
  setSessions: (sessions: CaixaSession[]) => void;
  openCaixa: (initialValue: number) => void;
  closeCaixa: (finalValue: number) => void;
  addCaixaMovement: (amount: number, type: 'IN' | 'OUT', reason?: string) => void;
}
const CaixaContext = createContext<CaixaContextType | undefined>(undefined);
export const useCaixa = () => { const context = useContext(CaixaContext); if (!context) throw new Error('useCaixa'); return context; };

interface ProductsContextType {
  products: Product[]; updateProduct: (id: string, updates: Partial<Product>) => void; addProduct: (product: Product) => void; deleteProduct: (id: string) => void; setProducts: (products: Product[]) => void;
  fetchProduct: (id: string) => Promise<Product | null>;
}
const ProductsContext = createContext<ProductsContextType | undefined>(undefined);
export const useProducts = () => { const context = useContext(ProductsContext); if (!context) throw new Error('useProducts'); return context; };

interface DeliveryContextType { deliveryOrders: DeliveryOrder[]; addDeliveryOrder: (order: Omit<DeliveryOrder, 'id'>) => void; updateDeliveryStatus: (saleId: string, status: DeliveryStatus, motoboyId?: string) => void; removeDeliveryOrder: (saleId: string) => void; }
const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);
export const useDelivery = () => { const context = useContext(DeliveryContext); if (!context) throw new Error('useDelivery'); return context; };

interface ConfigContextType { 
  modules: SystemModules; 
  receipt: ReceiptConfig; 
  updateModules: (modules: SystemModules) => void; 
  updateReceipt: (receipt: ReceiptConfig) => void;
  initializeDatabase: () => Promise<void>;
}
const ConfigContext = createContext<ConfigContextType | undefined>(undefined);
export const useConfig = () => { const context = useContext(ConfigContext); if (!context) throw new Error('useConfig'); return context; };

interface MenuContextType { isMenuOpen: boolean; toggleMenu: () => void; closeMenu: () => void; setIsSwitchingUser: (val: boolean) => void; }
const MenuContext = createContext<MenuContextType | undefined>(undefined);
export const useMenu = () => { const context = useContext(MenuContext); if (!context) throw new Error('useMenu'); return context; };

interface SalesContextType { 
  sales: Sale[]; 
  hasMoreSales: boolean;
  loadMoreSales: () => Promise<void>;
  setSales: (sales: Sale[]) => void;
  setHasMoreSales: (val: boolean) => void;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => string; 
  completeSavedSale: (saleId: string, paymentMethod: PaymentMethod) => void; 
}
const SalesContext = createContext<SalesContextType | undefined>(undefined);
export const useSales = () => { const context = useContext(SalesContext); if (!context) throw new Error('useSales'); return context; };

interface StoresContextType { stores: Store[]; addStore: (store: Store) => void; updateStore: (store: Store) => void; }
const StoresContext = createContext<StoresContextType | undefined>(undefined);
export const useStores = () => { const context = useContext(StoresContext); if (!context) throw new Error('useStores'); return context; };

interface CategoriesContextType { categories: Category[]; updateCategory: (id: string, name: string) => void; reorderCategories: (startIndex: number, endIndex: number) => void; updateCategoriesOrder: (newOrder: Category[]) => void; addCategory: (name: string) => void; deleteCategory: (id: string) => void; setCategoriesList: (list: Category[]) => void; }
const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);
export const useCategories = () => { const context = useContext(CategoriesContext); if (!context) throw new Error('useCategories'); return context; };

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

const getRoleLabel = (role?: string) => {
  if (!role) return 'Usuário';
  const r = role.toUpperCase();
  switch (r) {
    case 'ADMIN': return 'Administrador';
    case 'MANAGER':
    case 'GERENTE': return 'Gerente';
    case 'SELLER':
    case 'VENDEDOR': return 'Vendedor';
    case 'MOTOBOY':
    case 'ENTREGADOR': return 'Motoboy';
    case 'SUPER_ADMIN': return 'Super Admin';
    default: return 'Usuário';
  }
};

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: any;
}

const PermissionRoute = ({ path, element }: { path: string, element: React.ReactNode }) => {
  const { user, isSuperAdmin } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const plan = user.subscriptionPlan || 'GRATUITO';
  const planAllowed = PLAN_FEATURES[plan] || PLAN_FEATURES['GRATUITO'];
  const hasPlanPermission = planAllowed.includes(path);
  const isAdmin = user.role === Role.ADMIN;
  
  const hasPermission = isSuperAdmin || (hasPlanPermission && (isAdmin || (user.permissions || []).includes(path)));

  if (!hasPermission) {
    console.warn(`App: Access denied to ${path}. Plan: ${plan}, Role: ${user.role}. Redirecting to home.`);
    return <Navigate to="/" replace />;
  }

  return <>{element}</>;
};

// Error Boundary Component
class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    try {
      const info = typeof error.message === 'string' && error.message.startsWith('{') 
        ? JSON.parse(error.message) 
        : { error: error.message || String(error) };
      return { hasError: true, errorInfo: info };
    } catch {
      const message = error.message || String(error);
      return { 
        hasError: true, 
        errorInfo: { 
          error: message,
          isIndexError: message.includes('The query requires an index')
        } 
      };
    }
  }

  render() {
    if ((this as any).state.hasError) {
      const errorInfo = (this as any).state.errorInfo;
      const isQuotaError = errorInfo?.error?.includes('Quota limit exceeded') || errorInfo?.error?.includes('quota exceeded');
      const isNetworkError = errorInfo?.isNetworkError || errorInfo?.error?.includes('Failed to fetch');
      const isAuthError = errorInfo?.isAuthError || errorInfo?.error?.includes('Invalid Refresh Token') || errorInfo?.error?.includes('Refresh Token Not Found');
      const isNetworkAuthError = errorInfo?.error?.includes('auth/network-request-failed');
      const isPermissionError = errorInfo?.error?.includes('Missing or insufficient permissions');
      const isIndexError = errorInfo?.isIndexError || errorInfo?.error?.includes('The query requires an index');

      let indexLink = '#';
      if (isIndexError && errorInfo?.error?.includes('here: ')) {
        try {
          indexLink = errorInfo.error.split('here: ')[1].split('"')[0];
        } catch (e) {
          console.error("ErrorBoundary: Failed to parse index link", e);
        }
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-center space-y-6 border border-slate-100">
            <div className={`w-20 h-20 ${isQuotaError ? 'bg-amber-50 text-amber-500' : (isNetworkError ? 'bg-blue-50 text-blue-500' : (isIndexError ? 'bg-indigo-50 text-indigo-500' : 'bg-red-50 text-red-500'))} rounded-full flex items-center justify-center mx-auto`}>
              {isQuotaError ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              ) : isNetworkError ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
              ) : isIndexError ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                {isQuotaError ? 'Limite de Uso Atingido' : (isNetworkError || isNetworkAuthError ? 'Erro de Conexão' : (isAuthError ? 'Sessão Expirada' : (isPermissionError ? 'Acesso Negado' : (isIndexError ? 'Índice Necessário' : 'Ops! Algo deu errado'))))}
              </h2>
              <p className="text-slate-500 font-medium">
                {isQuotaError 
                  ? 'O limite diário de leituras do banco de dados (Firebase Free Tier) foi atingido. Este limite será resetado automaticamente amanhã.' 
                  : isNetworkError || isNetworkAuthError
                    ? isNetworkAuthError 
                      ? 'O Firebase bloqueou a conexão. Verifique se o domínio "aistudio.google.com" está na lista de "Domínios Autorizados" no Console do Firebase (Autenticação > Configurações).'
                      : 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet ou tente novamente em instantes.'
                    : isAuthError
                      ? 'Sua sessão de login expirou ou é inválida. Por favor, saia e entre novamente.'
                      : isPermissionError
                        ? 'Você não tem permissão para acessar estes dados. Tente sair e entrar novamente com outra conta.'
                        : isIndexError
                          ? 'Esta consulta requer um índice no Firestore para funcionar corretamente. Clique no botão abaixo para criá-lo.'
                          : 'Ocorreu um erro inesperado.'}
              </p>
            </div>

            {isIndexError && indexLink !== '#' && (
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Ação Necessária</p>
                <a 
                  href={indexLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Criar Índice no Firebase
                </a>
              </div>
            )}
            
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={() => {
                  signOut(auth);
                  window.location.href = '/';
                }} 
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
              >
                Sair da Conta / Voltar ao Login
              </button>
              
              <details className="text-left bg-slate-50 p-4 rounded-2xl">
                <summary className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600">Ver Detalhes Técnicos</summary>
                <pre className="text-[10px] text-slate-600 font-mono whitespace-pre-wrap break-all mt-2">
                  {JSON.stringify(errorInfo, (key, value) => key === 'email' ? '***@***.com' : value, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const FatalErrorThrower = ({ error }: { error: any }) => {
  if (error) throw error;
  return null;
};

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fatalError, setFatalError] = useState<any>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLimit, setSalesLimit] = useState(5);
  const [hasMoreSales, setHasMoreSales] = useState(true);
  const [caixaSessions, setCaixaSessions] = useState<CaixaSession[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isFetchingUser, setIsFetchingUser] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);

  const lastUidRef = useRef<string | null>(null);

  const [modules, setModules] = useState<SystemModules>({
    delivery: true, motoboy: true, caixa: true, clientes: true
  });
  
  const [receipt, setReceipt] = useState<ReceiptConfig>({
    storeName: 'Mix PDV', layout: 'COMPACT', footer: 'Muito Obrigado!', globalDeliveryFee: 10.00, motoboyCommission: 60, autoPrint: false,
    printers: [{ id: 'printer1', name: 'PT-210 BT', type: 'BT', paperSize: '58', isConnected: true }]
  });

  // Test connection and write
  useEffect(() => {
    console.log("App: Initializing...");
    const testConnection = async () => {
      try {
        console.log("App: Testing Firestore read...");
        const testDoc = await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("App: Firestore read successful. Doc exists:", testDoc.exists());
        
        if (auth.currentUser) {
          console.log("App: Testing Firestore write for UID:", auth.currentUser.uid);
          await setDoc(doc(db, 'test', 'write_test'), { 
            uid: auth.currentUser.uid, 
            timestamp: new Date().toISOString(),
            dbId: config.firestoreDatabaseId || '(default)'
          });
          console.log("App: Firestore write successful.");
        }
      } catch (error: any) {
        console.warn("App: Firestore test warning (non-fatal):", error.message);
      }
    };
    testConnection();
  }, [isAuthenticated]);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthReady) {
        console.warn("App: Auth ready timeout reached. Forcing ready state.");
        setIsAuthReady(true);
        setIsFetchingUser(false);
      }
    }, 15000); // Increased to 15 seconds for slower connections
    return () => clearTimeout(timer);
  }, [isAuthReady]);

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number = 12000): Promise<T> => {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout operation')), timeoutMs)
    );
    return Promise.race([promise, timeout]) as Promise<T>;
  };

  const catalogSyncLock = useRef<Record<string, boolean>>({});
  const configSyncLock = useRef<Record<string, boolean>>({});

  // Company Config Handlers
  const syncCompanyConfig = useCallback(async (adminId: string) => {
    if (configSyncLock.current[adminId]) return;
    configSyncLock.current[adminId] = true;
    
    try {
      // Get all users for this admin
      const uq = query(collection(db, 'users'), where('adminId', '==', adminId));
      const uSnapshot = await getDocs(uq);
      const allUsers = uSnapshot.docs.map(doc => doc.data() as User);

      // Get all stores for this admin
      const sq = query(collection(db, 'stores'), where('adminId', '==', adminId));
      const sSnapshot = await getDocs(sq);
      const allStores = sSnapshot.docs.map(doc => doc.data() as Store);
      
      const configData = sanitize({
        id: adminId,
        adminId,
        users: allUsers,
        stores: allStores,
        lastUpdated: new Date().toISOString()
      });
      
      await setDoc(doc(db, 'company_configs', adminId), configData);
      console.log(`Company Config synced for admin ${adminId} with ${allUsers.length} users and ${allStores.length} stores`);
    } catch (error) {
      console.error("Error syncing company config:", error);
    } finally {
      // Release lock after a short delay to debounce
      setTimeout(() => {
        delete configSyncLock.current[adminId];
      }, 2000);
    }
  }, []);

  // Product Handlers
  const syncProductCatalog = useCallback(async (adminId: string) => {
    if (catalogSyncLock.current[adminId]) return;
    catalogSyncLock.current[adminId] = true;

    try {
      // Get all products for this admin
      const pq = query(collection(db, 'products'), where('adminId', '==', adminId));
      const pSnapshot = await getDocs(pq);
      const allProducts = pSnapshot.docs.map(doc => doc.data() as Product);

      // Strip heavy fields (like stockHistory) for the aggregate catalog to stay under 1MB limit
      const catalogProducts = allProducts.map(p => ({
        id: p.id,
        adminId: p.adminId,
        name: p.name,
        price: p.price,
        costPrice: p.costPrice,
        promotionalPrice: p.promotionalPrice,
        category: p.category,
        imageUrl: p.imageUrl,
        stock: p.stock,
        unit: p.unit,
        barcode: p.barcode,
        manageStock: p.manageStock,
        showInCatalog: p.showInCatalog,
        minStock: p.minStock,
        minStockEnabled: p.minStockEnabled,
        isHighlighted: p.isHighlighted
      }));

      // Get all categories for this admin
      const cq = query(collection(db, 'categories'), where('adminId', '==', adminId));
      const cSnapshot = await getDocs(cq);
      const allCategories = cSnapshot.docs.map(doc => doc.data() as Category).sort((a, b) => a.order - b.order);
      
      const catalogData = sanitize({
        id: adminId,
        adminId,
        products: catalogProducts,
        categories: allCategories,
        lastUpdated: new Date().toISOString()
      });

      // Check size estimate to avoid Firestore 1MB limit
      const sizeEstimate = JSON.stringify(catalogData).length;
      if (sizeEstimate > 1000000) {
        console.warn(`Catalog size estimate (${sizeEstimate} bytes) is near or over 1MB limit.`);
      }
      
      await setDoc(doc(db, 'catalogs', adminId), catalogData);
      console.log(`Catalog synced for admin ${adminId} with ${allProducts.length} products and ${allCategories.length} categories`);
    } catch (error) {
      console.error("Error syncing product catalog:", error);
    } finally {
      // Release lock after a short delay to debounce
      setTimeout(() => {
        delete catalogSyncLock.current[adminId];
      }, 2000);
    }
  }, []);

  const addProduct = useCallback(async (product: Product) => {
    if (!currentUser) return;
    const id = product.id || Math.random().toString(36).substr(2, 9);
    const newProduct = sanitize({ ...product, id, adminId: currentUser.adminId });
    try {
      await setDoc(doc(db, 'products', id), newProduct);
      syncProductCatalog(currentUser.adminId);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${id}`);
    }
  }, [currentUser, syncProductCatalog]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    if (!currentUser) return;
    const cleanUpdates = sanitize(updates);
    try {
      await updateDoc(doc(db, 'products', id), cleanUpdates);
      syncProductCatalog(currentUser.adminId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  }, [currentUser, syncProductCatalog]);

  const deleteProduct = useCallback(async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      syncProductCatalog(currentUser.adminId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  }, [currentUser, syncProductCatalog]);

  const fetchProduct = useCallback(async (id: string) => {
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Product;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `products/${id}`);
      return null;
    }
  }, []);

    const syncInProgress = useRef<Record<string, boolean>>({});

    // Sync catalog and config if missing or empty (one-time check for admins)
    useEffect(() => {
      if (isAuthenticated && currentUser && (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.ADMIN)) {
        const adminId = currentUser.adminId;
        if (syncInProgress.current[adminId]) return;

        const checkAndSync = async () => {
          syncInProgress.current[adminId] = true;
          try {
            // Check Catalog
            const catalogRef = doc(db, 'catalogs', adminId);
            const catalogSnap = await getDoc(catalogRef);
            if (!catalogSnap.exists()) {
              console.log("App: Catalog missing, syncing...");
              await syncProductCatalog(adminId);
            } else {
              const data = catalogSnap.data();
              if (!data?.products || data.products.length === 0) {
                const q = query(collection(db, 'products'), where('adminId', '==', adminId), limit(1));
                const prodSnap = await getDocs(q);
                if (!prodSnap.empty) {
                  console.log("App: Catalog empty but products exist, syncing...");
                  await syncProductCatalog(adminId);
                }
              }
            }

            // Check Company Config
            const configRef = doc(db, 'company_configs', adminId);
            const configSnap = await getDoc(configRef);
            if (!configSnap.exists()) {
              console.log("App: Company Config missing, syncing...");
              await syncCompanyConfig(adminId);
            }
          } catch (err) {
            console.error("App: Error checking catalog/config:", err);
          } finally {
            // Keep it locked for a while to prevent rapid re-syncs
            setTimeout(() => {
              delete syncInProgress.current[adminId];
            }, 30000); 
          }
        };
        checkAndSync();
      }
    }, [isAuthenticated, currentUser?.id, currentUser?.adminId, currentUser?.role, syncProductCatalog, syncCompanyConfig]);


  // Auth Persistence and Listener
  useEffect(() => {
    // Set persistence to local for better reliability in iframes/PWA
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.error("App: Failed to set auth persistence:", err);
    });

    console.log("App: Setting up Auth listener...");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("App: Auth state changed. User:", firebaseUser?.email, "UID:", firebaseUser?.uid);
      
      const isInitialLoad = !isAuthReady;
      const isUserChanged = firebaseUser?.uid !== lastUidRef.current;

      if (firebaseUser) {
        console.log("App: Auth state changed - User logged in:", firebaseUser.email, "UID:", firebaseUser.uid);
        // Only show full-screen spinner if it's the first load or the user actually changed
        if (isInitialLoad || isUserChanged) {
          setIsFetchingUser(true);
        }
        lastUidRef.current = firebaseUser.uid;
        
        setLoadingError(null);
        try {
          console.log("App: Fetching user profile for UID:", firebaseUser.uid);
          
          let userData: User | null = null;
          
          try {
            const userDoc = await withTimeout(getDoc(doc(db, 'users', firebaseUser.uid)));
            if (userDoc.exists()) {
              userData = userDoc.data() as User;
              console.log("App: User profile found in Firestore for:", userData.email, "Role:", userData.role);
            } else {
              console.log("App: User profile NOT found in Firestore for UID:", firebaseUser.uid, ". Retrying in 2s...");
              // Small delay to allow RegisterScreen to finish writing the document
              await new Promise(resolve => setTimeout(resolve, 2000));
              const retryDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
              if (retryDoc.exists()) {
                userData = retryDoc.data() as User;
                console.log("App: User profile found on retry for:", userData.email);
              } else {
                console.log("App: User profile still NOT found after retry.");
              }
            }
          } catch (firestoreErr: any) {
            console.error("App: Firestore fetch failed:", firestoreErr);
            // Check for quota error to enable emergency mode
            if (firestoreErr.message?.includes('Quota limit exceeded') || firestoreErr.message?.includes('quota exceeded')) {
              const isSuperEmail = firebaseUser.email && SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === firebaseUser.email?.toLowerCase());
              if (isSuperEmail) {
                userData = {
                  id: firebaseUser.uid,
                  adminId: firebaseUser.uid,
                  name: firebaseUser.displayName || 'Admin (Modo Emergência)',
                  email: firebaseUser.email!.toLowerCase(),
                  role: Role.SUPER_ADMIN,
                  store: 'Administração Central',
                  isSystemUser: true,
                  createdAt: new Date().toISOString(),
                  subscriptionPlan: 'VITALICIO',
                  isOnline: true,
                  permissions: ['/vender', '/historico', '/delivery', '/produtos', '/usuarios', '/stats', '/planos', '/lojas', '/motoboy', '/configuracoes', '/caixa']
                };
                setLoadingError("Atenção: Limite de cota do Firestore atingido. Operando em Modo de Emergência.");
              }
            }
          }
          
          const isSuperEmail = firebaseUser.email && SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === firebaseUser.email?.toLowerCase());
          
          if (userData) {
            console.log("App: User profile loaded successfully:", userData.email, "Role:", userData.role);
            
            // Set user first to unblock UI
            setCurrentUser(userData);
            setIsAuthenticated(true);

            // Perform upgrades/syncs in background
            const isSuperEmail = firebaseUser.email && SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === firebaseUser.email?.toLowerCase());
            if (isSuperEmail && userData.role !== Role.SUPER_ADMIN) {
              console.log("App: Upgrading user to SUPER_ADMIN in background.");
              updateDoc(doc(db, 'users', userData.id), { role: Role.SUPER_ADMIN, adminId: userData.id }).catch((err) => {
                console.error("App: Failed to update super admin role in Firestore:", err);
              });
            }

            if (!userData.adminId) {
              updateDoc(doc(db, 'users', userData.id), { adminId: userData.id }).catch(() => {});
            }
          } else if (isSuperEmail) {
            console.log("App: Super Admin email detected but profile missing. Bootstrapping...");
            // Bootstrap Super Admin
            const superAdmin: User = {
              id: firebaseUser.uid,
              adminId: firebaseUser.uid,
              name: firebaseUser.displayName || 'Anderson Coelho',
              email: firebaseUser.email!.toLowerCase(),
              role: Role.SUPER_ADMIN,
              store: 'Administração Central',
              isSystemUser: true,
              createdAt: new Date().toISOString(),
              subscriptionPlan: 'VITALICIO',
              isOnline: true,
              permissions: ['/vender', '/historico', '/delivery', '/produtos', '/usuarios', '/stats', '/planos', '/lojas', '/motoboy', '/configuracoes', '/caixa']
            };
            
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), sanitize(superAdmin));
              console.log("App: Super Admin profile bootstrapped successfully in Firestore.");
              
              // Also initialize a default store for the admin
              const storeId = 'store_' + Math.random().toString(36).substr(2, 5);
              const defaultStore: Store = {
                id: storeId,
                adminId: firebaseUser.uid,
                name: 'Loja Principal',
                address: 'Endereço da Loja',
                city: 'Cidade',
                phone: '(00) 00000-0000',
                isActive: true,
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'stores', storeId), sanitize(defaultStore));
              console.log("App: Default store created for Super Admin.");
              
              // Sync company config
              await syncCompanyConfig(firebaseUser.uid);

              // Auto-initialize database for new Super Admin
              console.log("App: Auto-initializing database for new Super Admin...");
              const adminId = firebaseUser.uid;
              
              // Initialize Categories
              for (const cat of INITIAL_CATEGORIES) {
                const catWithAdmin = { ...cat, adminId };
                await setDoc(doc(db, 'categories', cat.id), sanitize(catWithAdmin));
              }
              
              // Initialize Products
              for (const prod of INITIAL_PRODUCTS) {
                const prodWithAdmin = { ...prod, adminId };
                await setDoc(doc(db, 'products', prod.id), sanitize(prodWithAdmin));
              }

              // Initialize Stats
              const today = new Date().toISOString().split('T')[0];
              const statsId = `${adminId}_${today}`;
              const initialStats = {
                id: statsId,
                adminId: adminId,
                store: 'Loja Principal',
                date: today,
                totalFaturamento: 0,
                totalVendas: 0,
                productRanking: {},
                userRanking: {},
                paymentDistribution: {}
              };
              await setDoc(doc(db, 'stats', statsId), sanitize(initialStats));

              // Initialize a sample Caixa Session (Closed)
              const sessionId = 'init_session_' + adminId;
              const sampleSession = {
                id: sessionId,
                adminId: adminId,
                openedById: superAdmin.id,
                openedByName: superAdmin.name,
                closedById: superAdmin.id,
                closedByName: superAdmin.name,
                startTime: new Date(Date.now() - 3600000).toISOString(),
                endTime: new Date().toISOString(),
                initialValue: 100,
                finalValue: 100,
                expectedValue: 100,
                totalSalesCash: 0,
                totalSalesPix: 0,
                totalSalesCard: 0,
                movements: [],
                status: 'CLOSED',
                store: 'Loja Principal'
              };
              await setDoc(doc(db, 'caixaSessions', sessionId), sanitize(sampleSession));

              // Initialize a sample Sale
              const saleId = 'init_sale_' + adminId;
              const sampleSale = {
                id: saleId,
                saleNumber: 1,
                adminId: adminId,
                userId: superAdmin.id,
                totalAmount: 0,
                amountPaid: 0,
                changeAmount: 0,
                paymentMethod: 'CASH',
                items: [],
                createdAt: new Date().toISOString(),
                store: 'Loja Principal',
                status: 'COMPLETED'
              };
              await setDoc(doc(db, 'sales', saleId), sanitize(sampleSale));

              // Initialize a sample Delivery Order
              const orderId = 'init_order_' + adminId;
              const sampleOrder = {
                id: orderId,
                adminId: adminId,
                saleId: saleId,
                status: 'DELIVERED',
                street: 'Rua de Exemplo',
                number: '123',
                neighborhood: 'Centro',
                city: 'Cidade Exemplo',
                deliveryFee: 0,
                customerName: 'Cliente Exemplo',
                customerPhone: '(00) 00000-0000',
                total: 0
              };
              await setDoc(doc(db, 'deliveryOrders', orderId), sanitize(sampleOrder));

              await syncProductCatalog(adminId);
              console.log("App: Database auto-initialized for Super Admin.");
            } catch (err) {
              console.error("App: Failed to bootstrap Super Admin profile:", err);
            }
            
            setCurrentUser(superAdmin);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
            setLoadingError("Usuário não encontrado. Por favor, registre-se ou contate o suporte.");
          }
        } catch (error: any) {
          console.error("App: Auth listener error:", error);
          setLoadingError(`Erro ao carregar perfil: ${error.message}`);
          setIsAuthenticated(false);
          setCurrentUser(null);
        } finally {
          setIsFetchingUser(false);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setIsFetchingUser(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Prevent flicker by memoizing the loading state
  const showSpinner = useMemo(() => {
    return !isAuthReady || isFetchingUser || !!loadingError;
  }, [isAuthReady, isFetchingUser, loadingError]);

  // Firestore Listeners
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      return;
    }

    const isSuperAdmin = currentUser.role === Role.SUPER_ADMIN;
    const isAdmin = currentUser.role === Role.ADMIN;
    
    const hasPermission = (path: string) => {
      if (isSuperAdmin) return true;
      
      const plan = currentUser.subscriptionPlan || 'GRATUITO';
      const planAllowed = PLAN_FEATURES[plan] || PLAN_FEATURES['GRATUITO'];
      if (!planAllowed.includes(path)) return false;
      
      if (isAdmin) return true;
      return (currentUser.permissions || []).includes(path);
    };
    
    const handleError = (error: any, op: OperationType, path: string, permissionPath?: string) => {
      const isQuotaError = error.message?.includes('Quota limit exceeded') || error.message?.includes('quota exceeded');
      const isPermissionError = error.message?.includes('Missing or insufficient permissions');
      const isIndexError = error.message?.includes('The query requires an index');
      
      if (isQuotaError) {
        setLoadingError("Limite de uso do banco de dados atingido (Quota Exceeded). As leituras do banco de dados foram pausadas até o reset diário.");
        return;
      }
      
      if (isPermissionError) {
        // If the user doesn't have permission for this resource, don't show a fatal error, just log it.
        if (permissionPath && !hasPermission(permissionPath)) {
          console.warn(`App: Permission denied for ${path} (User does not have ${permissionPath} permission). Skipping fatal error.`);
          return;
        }
        setLoadingError(`Erro de Permissão: Você não tem acesso ao recurso "${path}". Tente sair e entrar novamente.`);
        return;
      }

      if (isIndexError) {
        console.error("App: Firestore index required. Providing link in fatal error.");
        // We let it fall through to handleFirestoreError so it shows the link in the ErrorBoundary
      }

      try {
        handleFirestoreError(error, op, path);
      } catch (e: any) {
        setFatalError(e);
      }
    };

    console.log("App: Setting up data subscriptions...");

    // Primary listeners for Products and Categories (Direct Collection)
    // Only subscribe if user has permission or is admin
    let unsubProducts = () => {};
    if (hasPermission('/produtos')) {
      const productsQuery = isSuperAdmin 
        ? collection(db, 'products')
        : query(collection(db, 'products'), where('adminId', '==', currentUser.adminId));
      
      unsubProducts = onSnapshot(productsQuery, (snapshot) => {
        if (!snapshot.empty) {
          const prodList = snapshot.docs.map(doc => doc.data() as Product);
          console.log(`App: Products loaded directly for ${currentUser.adminId}: ${prodList.length}`);
          setProducts(prodList);
        } else {
          // Fallback to catalog if direct collection is empty (might be a new user or sync issue)
          getDoc(doc(db, 'catalogs', currentUser.adminId)).then(snap => {
            if (snap.exists()) {
              const catalog = snap.data() as any;
              setProducts(catalog.products || []);
            }
          });
        }
      }, (error) => handleError(error, OperationType.GET, 'products', '/produtos'));
    }
    
    let unsubCategories = () => {};
    if (hasPermission('/produtos')) {
      const categoriesQuery = isSuperAdmin
        ? collection(db, 'categories')
        : query(collection(db, 'categories'), where('adminId', '==', currentUser.adminId));

      unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
        if (!snapshot.empty) {
          const catList = snapshot.docs.map(doc => doc.data() as Category).sort((a, b) => a.order - b.order);
          console.log(`App: Categories loaded directly for ${currentUser.adminId}: ${catList.length}`);
          setCategories(catList);
        } else {
          // Fallback to catalog
          getDoc(doc(db, 'catalogs', currentUser.adminId)).then(snap => {
            if (snap.exists()) {
              const catalog = snap.data() as any;
              setCategories(catalog.categories || []);
            }
          });
        }
      }, (error) => handleError(error, OperationType.GET, 'categories', '/produtos'));
    }

    let unsubFallbackUsers: (() => void) | null = null;
    let unsubFallbackStores: (() => void) | null = null;

    const unsubConfig = onSnapshot(doc(db, 'company_configs', currentUser.adminId), (snapshot) => {
      if (snapshot.exists()) {
        const config = snapshot.data() as any;
        console.log(`App: Company Config loaded for ${currentUser.adminId} with ${config.users?.length || 0} users and ${config.stores?.length || 0} stores`);
        setUsers(config.users || []);
        setStores(config.stores || []);
        
        // Cleanup fallbacks if they were active
        if (unsubFallbackUsers) { unsubFallbackUsers(); unsubFallbackUsers = null; }
        if (unsubFallbackStores) { unsubFallbackStores(); unsubFallbackStores = null; }
      } else {
        console.log(`App: Company Config missing for ${currentUser.adminId}, using fallbacks`);
        if (!unsubFallbackUsers && hasPermission('/usuarios')) {
          unsubFallbackUsers = onSnapshot(isSuperAdmin ? collection(db, 'users') : query(collection(db, 'users'), where('adminId', '==', currentUser.adminId)), (snapshot) => {
            setUsers(snapshot.docs.map(doc => doc.data() as User));
          }, (error) => handleError(error, OperationType.GET, 'users', '/usuarios'));
        }
        if (!unsubFallbackStores && hasPermission('/lojas')) {
          unsubFallbackStores = onSnapshot(isSuperAdmin ? collection(db, 'stores') : query(collection(db, 'stores'), where('adminId', '==', currentUser.adminId)), (snapshot) => {
            setStores(snapshot.docs.map(doc => doc.data() as Store));
          }, (error) => handleError(error, OperationType.GET, 'stores', '/lojas'));
        }
      }
    }, (error) => handleError(error, OperationType.GET, `company_configs/${currentUser.adminId}`));

    // Delivery: Only listen to active orders (PENDING, PREPARING, OUT_FOR_DELIVERY)
    let unsubDelivery = () => {};
    if (hasPermission('/delivery') || hasPermission('/motoboy')) {
      const activeDeliveryQuery = isSuperAdmin 
        ? query(collection(db, 'deliveryOrders'), where('status', 'in', ['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY']), limit(50))
        : query(collection(db, 'deliveryOrders'), where('adminId', '==', currentUser.adminId), where('status', 'in', ['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY']), limit(50));

      unsubDelivery = onSnapshot(activeDeliveryQuery, (snapshot) => {
        setDeliveryOrders(snapshot.docs.map(doc => doc.data() as DeliveryOrder));
      }, (error) => handleError(error, OperationType.GET, 'deliveryOrders', '/delivery'));
    }

    // Sales: Listen to recent sales
    let unsubSales = () => {};
    if (hasPermission('/historico') || hasPermission('/stats')) {
      const salesQuery = isSuperAdmin 
        ? query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(100))
        : query(collection(db, 'sales'), where('adminId', '==', currentUser.adminId), orderBy('createdAt', 'desc'), limit(100));

      unsubSales = onSnapshot(salesQuery, (snapshot) => {
        const fetchedSales = snapshot.docs.map(doc => doc.data() as Sale);
        setSales(fetchedSales);
        setHasMoreSales(snapshot.docs.length >= 100);
      }, (error) => handleError(error, OperationType.GET, 'sales', '/historico'));
    }

    // Caixa Sessions: Listen to recent sessions
    let unsubCaixa = () => {};
    if (hasPermission('/caixa')) {
      const caixaQuery = isSuperAdmin 
        ? query(collection(db, 'caixaSessions'), limit(50)) 
        : query(collection(db, 'caixaSessions'), where('adminId', '==', currentUser.adminId), limit(50));

      unsubCaixa = onSnapshot(caixaQuery, (snapshot) => {
        const fetchedSessions = snapshot.docs.map(doc => doc.data() as CaixaSession)
          .sort((a, b) => b.startTime.localeCompare(a.startTime));
        setCaixaSessions(fetchedSessions);
      }, (error) => handleError(error, OperationType.GET, 'caixaSessions', '/caixa'));
    }

    return () => {
      unsubProducts();
      unsubCategories();
      unsubDelivery();
      unsubSales();
      unsubCaixa();
      unsubConfig();
      if (unsubFallbackUsers) unsubFallbackUsers();
      if (unsubFallbackStores) unsubFallbackStores();
    };
  }, [isAuthenticated, currentUser?.id, currentUser?.adminId, currentUser?.role]);

  const getRoleLabel = (role?: Role) => {
    switch(role) {
      case Role.SUPER_ADMIN: return 'Super Admin';
      case Role.ADMIN: return 'Administrador';
      case Role.MANAGER: return 'Gerente';
      case Role.SELLER: return 'Vendedor';
      case Role.MOTOBOY: return 'Motoboy';
      default: return 'Usuário';
    }
  };

  const activeSession = useMemo(() => 
    caixaSessions.find(s => s.status === 'OPEN' && (currentUser?.role === Role.SUPER_ADMIN ? true : s.store === currentUser?.store)) || null
  , [caixaSessions, currentUser]);

  const openCaixa = useCallback(async (initialValue: number) => {
    if (!currentUser) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newSession: CaixaSession = {
      id,
      adminId: currentUser.adminId,
      openedById: currentUser.id,
      openedByName: currentUser.name,
      startTime: new Date().toISOString(),
      initialValue,
      totalSalesCash: 0,
      totalSalesPix: 0,
      totalSalesCard: 0,
      movements: [],
      status: 'OPEN',
      store: currentUser.store || 'Loja Principal'
    };
    try {
      await setDoc(doc(db, 'caixaSessions', id), sanitize(newSession));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `caixaSessions/${id}`);
    }
  }, [currentUser]);

  const closeCaixa = useCallback(async (finalValue: number) => {
    if (!activeSession || !currentUser) return;
    const sessionSales = sales.filter(s => s.createdAt >= activeSession.startTime && s.status === 'COMPLETED');
    const cash = sessionSales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((a, b) => a + b.totalAmount, 0);
    const pix = sessionSales.filter(s => s.paymentMethod === PaymentMethod.PIX).reduce((a, b) => a + b.totalAmount, 0);
    const card = sessionSales.filter(s => [PaymentMethod.DEBIT_CARD, PaymentMethod.CREDIT_CARD].includes(s.paymentMethod!)).reduce((a, b) => a + b.totalAmount, 0);
    
    const extraIn = activeSession.movements.filter(m => m.type === 'IN').reduce((a,b) => a + b.amount, 0);
    const extraOut = activeSession.movements.filter(m => m.type === 'OUT').reduce((a,b) => a + b.amount, 0);
    
    const expected = activeSession.initialValue + cash + extraIn - extraOut;

    const updates = sanitize({
      status: 'CLOSED',
      endTime: new Date().toISOString(),
      closedById: currentUser.id,
      closedByName: currentUser.name,
      finalValue,
      expectedValue: expected,
      totalSalesCash: cash,
      totalSalesPix: pix,
      totalSalesCard: card
    });

    try {
      await updateDoc(doc(db, 'caixaSessions', activeSession.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `caixaSessions/${activeSession.id}`);
    }
  }, [activeSession, currentUser, sales]);

  const addCaixaMovement = useCallback(async (amount: number, type: 'IN' | 'OUT', reason?: string) => {
    if (!activeSession) return;
    const movement: CaixaMovement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      amount,
      reason,
      createdAt: new Date().toISOString()
    };
    try {
      await updateDoc(doc(db, 'caixaSessions', activeSession.id), sanitize({
        movements: [...activeSession.movements, movement]
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `caixaSessions/${activeSession.id}`);
    }
  }, [activeSession]);

  const login = (email: string, password?: string) => {
    // This is now handled in LoginScreen.tsx using Firebase Auth
    return false;
  };

  const logout = async () => { 
    try {
      await signOut(auth);
      setCurrentUser(null); 
      setIsAuthenticated(false); 
      setIsMenuOpen(false); 
      setLoadingError(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const switchUser = useCallback((userId: string, password?: string) => {
    const found = users.find(u => u.id === userId && u.password === password);
    if (found) { 
      setCurrentUser(prev => {
        if (prev && JSON.stringify(prev) === JSON.stringify(found)) return prev;
        return found;
      });
      setIsSwitchingUser(false); 
      return true; 
    }
    return false;
  }, [users]);

  // --- Handlers for Contexts ---
  
  // Stock Handlers
  const deductStock = useCallback(async (items: SaleItem[], saleNumber?: number) => {
    if (!currentUser) return;
    
    for (const item of items) {
      try {
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const product = productSnap.data() as Product;
          // Deduct stock if manageStock is not explicitly false
          if (product.manageStock !== false) {
            const newStock = (product.stock || 0) - item.quantity;
            const historyEntry: StockHistory = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'SAIDA',
              quantity: item.quantity,
              date: new Date().toISOString(),
              reason: `Venda ${saleNumber ? '#' + saleNumber : ''}`,
              balance: newStock,
              responsible: currentUser.name
            };
            
            await updateDoc(productRef, sanitize({
              stock: newStock,
              stockHistory: [...(product.stockHistory || []), historyEntry]
            }));
            console.log(`Stock deducted for product ${item.productId}: ${product.stock} -> ${newStock}`);
            
            // Sync catalog after stock update
            await syncProductCatalog(product.adminId);
          }
        }
      } catch (error) {
        console.error(`Error deducting stock for product ${item.productId}:`, error);
        handleFirestoreError(error, OperationType.UPDATE, `products/${item.productId}`);
      }
    }
  }, [currentUser, syncProductCatalog]);

  const loadMoreSales = useCallback(async () => {
    setSalesLimit(prev => prev + 5);
  }, []);

  // Sale Handlers
  const updateDailyStats = useCallback(async (sale: Sale) => {
    if (!currentUser) return;
    
    const date = sale.createdAt.split('T')[0];
    const statsId = `${currentUser.adminId}_${sale.store}_${date}`;
    const statsRef = doc(db, 'stats', statsId);
    
    try {
      await runTransaction(db, async (transaction) => {
        const statsSnap = await transaction.get(statsRef);
        let stats: any;
        
        if (statsSnap.exists()) {
          stats = statsSnap.data();
        } else {
          stats = {
            id: statsId,
            adminId: currentUser.adminId,
            store: sale.store,
            date,
            totalFaturamento: 0,
            totalLucro: 0,
            totalVendas: 0,
            productRanking: {},
            userRanking: {},
            paymentDistribution: {},
            vendas: []
          };
        }
        
        stats.totalFaturamento += sale.totalAmount;
        stats.totalVendas += 1;
        
        let saleProfit = 0;
        sale.items.forEach(item => {
          const costPrice = item.costPrice || 0;
          saleProfit += (item.price - costPrice) * item.quantity;
          
          if (!stats.productRanking[item.productId]) {
            stats.productRanking[item.productId] = { name: item.productName, total: 0, qty: 0 };
          }
          stats.productRanking[item.productId].total += item.subtotal;
          stats.productRanking[item.productId].qty += item.quantity;
        });
        
        stats.totalLucro = (stats.totalLucro || 0) + saleProfit;
        
        const method = sale.paymentMethod || PaymentMethod.CASH;
        stats.paymentDistribution[method] = (stats.paymentDistribution[method] || 0) + 1;
        
        const userName = users.find(u => u.id === sale.userId)?.name || currentUser.name;
        if (!stats.userRanking[sale.userId]) {
          stats.userRanking[sale.userId] = { name: userName, total: 0, qty: 0 };
        }
        stats.userRanking[sale.userId].total += sale.totalAmount;
        stats.userRanking[sale.userId].qty += 1;
        
        if (!stats.vendas) stats.vendas = [];
        // To avoid exceeding 1MB, we could limit the number of sales packaged
        // but for now let's follow the user's request to "package" them.
        stats.vendas.push(sale);
        
        transaction.set(statsRef, sanitize(stats));
      });
      console.log("Daily stats updated successfully");
    } catch (error) {
      console.error("Error updating daily stats:", error);
    }
  }, [currentUser, users]);

  const addSale = useCallback((saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    if (!currentUser) return '';
    const id = Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Calculate next sale number based on current sales list
    const maxNumber = sales.reduce((max, s) => Math.max(max, s.saleNumber || 0), 0);
    const nextNumber = maxNumber + 1;

    const newSale: Sale = {
      ...(saleData as any),
      id,
      saleNumber: nextNumber,
      adminId: currentUser.adminId,
      createdAt: new Date().toISOString(),
    };

    // Write to Firestore
    setDoc(doc(db, 'sales', id), sanitize(newSale))
      .then(() => {
        if (newSale.status === 'COMPLETED') {
          deductStock(newSale.items, newSale.saleNumber);
          updateDailyStats(newSale);
        }
      })
      .catch(e => handleFirestoreError(e, OperationType.CREATE, `sales/${id}`));

    return id;
  }, [currentUser, sales, deductStock]);

  const completeSavedSale = useCallback(async (saleId: string, paymentMethod: PaymentMethod) => {
    try {
      const saleRef = doc(db, 'sales', saleId);
      const saleSnap = await getDoc(saleRef);
      if (saleSnap.exists()) {
        const saleData = saleSnap.data() as Sale;
        await updateDoc(saleRef, sanitize({
          status: 'COMPLETED',
          paymentMethod
        }));
        
        const updatedSale = { ...saleData, status: 'COMPLETED' as SaleStatus, paymentMethod };
        updateDailyStats(updatedSale);

        // Deduct stock
        await deductStock(saleData.items, saleData.saleNumber);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${saleId}`);
    }
  }, [deductStock]);

  // Helper to remove undefined values for Firestore
  // sanitize is now exported

  // Product Handlers
  // Moved to top

  // Delivery Handlers
  const addDeliveryOrder = useCallback(async (order: Omit<DeliveryOrder, 'id'>) => {
    if (!currentUser) return;
    const id = Math.random().toString(36).substr(2, 9).toUpperCase();
    const newOrder: DeliveryOrder = {
      ...(order as any),
      id,
      adminId: currentUser.adminId,
    };
    try {
      await setDoc(doc(db, 'deliveryOrders', id), sanitize(newOrder));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `deliveryOrders/${id}`);
    }
  }, [currentUser]);

  const updateDeliveryStatus = useCallback(async (saleId: string, status: DeliveryStatus, motoboyId?: string) => {
    const order = deliveryOrders.find(o => o.saleId === saleId);
    if (!order) return;
    const updates = sanitize({
      status,
      motoboyId: motoboyId || order.motoboyId
    });
    try {
      await updateDoc(doc(db, 'deliveryOrders', order.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `deliveryOrders/${order.id}`);
    }
  }, [deliveryOrders]);

  const removeDeliveryOrder = useCallback(async (saleId: string) => {
    const order = deliveryOrders.find(o => o.saleId === saleId);
    if (!order) return;
    try {
      await deleteDoc(doc(db, 'deliveryOrders', order.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `deliveryOrders/${order.id}`);
    }
  }, [deliveryOrders]);

  // Category Handlers
  const updateCategory = useCallback(async (id: string, name: string) => {
    try {
      await updateDoc(doc(db, 'categories', id), sanitize({ name }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
    }
  }, []);

  const addCategory = useCallback(async (name: string) => {
    if (!currentUser) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newCat: Category = {
      id,
      adminId: currentUser.adminId,
      name,
      order: categories.length,
      productCount: 0
    };
    try {
      await setDoc(doc(db, 'categories', id), sanitize(newCat));
      syncProductCatalog(currentUser.adminId);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `categories/${id}`);
    }
  }, [currentUser, categories, syncProductCatalog]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      if (currentUser) syncProductCatalog(currentUser.adminId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  }, [currentUser, syncProductCatalog]);

  const reorderCategories = useCallback(async (startIndex: number, endIndex: number) => {
    const result: Category[] = Array.from(categories);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    updateCategoriesOrder(result);
  }, [categories]);

  const updateCategoriesOrder = useCallback(async (newOrder: Category[]) => {
    const updated: Category[] = newOrder.map((c: Category, i) => ({ ...c, order: i }));
    // Update local state immediately for better UX
    setCategories(updated);
    
    try {
      const batch = updated.map(c => updateDoc(doc(db, 'categories', c.id), { order: c.order }));
      await Promise.all(batch);
      if (currentUser) syncProductCatalog(currentUser.adminId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'categories/reorder');
    }
  }, [currentUser, syncProductCatalog]);

  // User Handlers
  const addUser = useCallback(async (newUser: User) => {
    if (!currentUser) {
      console.error("addUser: No current user logged in.");
      return;
    }
    
    console.log("addUser: Starting creation for", newUser.email);
    
    try {
      const userEmail = newUser.email.trim().toLowerCase();
      
      // 1. Verifica se o e-mail já existe no Firestore primeiro
      console.log("addUser: Checking for existing email...");
      let emailExists = false;

      const q = query(collection(db, 'users'), where('email', '==', userEmail), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        emailExists = true;
      }
      
      if (emailExists) {
        console.warn("addUser: Email already exists.");
        throw new Error("Este e-mail já está cadastrado no sistema. Se você não o vê na lista, ele pode pertencer a outra loja ou ser um usuário de sistema.");
      }

      // 2. Cria ou obtém uma instância secundária para não deslogar o admin atual
      console.log("addUser: Initializing secondary Auth instance...");
      const secondaryApp = getApps().find(a => a.name === 'Secondary') || initializeApp(config, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      // Garante que a instância secundária não use persistência local para não interferir na sessão principal
      await setPersistence(secondaryAuth, inMemoryPersistence);
      
      // 3. Cria no Auth
      console.log("addUser: Creating user in Firebase Auth...");
      const userPassword = newUser.password || 'Mudar@123';
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userEmail, userPassword);
      const uid = userCredential.user.uid;
      console.log("addUser: Auth user created with UID:", uid);
      
      // Desloga da instância secundária imediatamente
      await signOut(secondaryAuth);
      
      const adminId = currentUser.adminId || currentUser.id;
      
      const userToSave = { 
        ...newUser, 
        id: uid, 
        email: userEmail,
        adminId, 
        password: userPassword 
      };
      
      console.log("addUser: Saving user document...");
      await setDoc(doc(db, 'users', uid), sanitize(userToSave));
      syncCompanyConfig(adminId);
      console.log("addUser: User saved successfully.");
    } catch (error: any) {
      console.error("addUser: Error occurred:", error);
      
      if (error.code === 'auth/email-already-in-use' || (error.message && error.message.includes('auth/email-already-in-use'))) {
        handleFirestoreError("Este e-mail já possui uma conta de acesso (Auth), mas não foi encontrado no banco de dados da sua loja.", OperationType.CREATE, `users/${newUser.email}`);
      } else if (error.code === 'auth/weak-password') {
        handleFirestoreError("A senha escolhida é muito fraca. Por favor, use pelo menos 6 caracteres.", OperationType.CREATE, `users/${newUser.email}`);
      } else if (error.code === 'auth/invalid-email') {
        handleFirestoreError("O e-mail informado é inválido.", OperationType.CREATE, `users/${newUser.email}`);
      } else {
        handleFirestoreError(error, OperationType.CREATE, `users/${newUser.email}`);
      }
      throw error;
    }
  }, [currentUser, config]);

  const updateUser = useCallback(async (updatedUser: User) => {
    try {
      const dataToSave = sanitize(updatedUser);
      if (!updatedUser.password) {
        delete dataToSave.password;
      }
      
      await setDoc(doc(db, 'users', updatedUser.id), dataToSave, { merge: true });
      if (currentUser) syncCompanyConfig(currentUser.adminId);
      
      if (auth.currentUser && auth.currentUser.uid === updatedUser.id && updatedUser.password) {
        try {
          await updatePassword(auth.currentUser, updatedUser.password);
        } catch (authError: any) {
          console.error("Erro ao atualizar senha no Auth:", authError);
          if (authError.code === 'auth/requires-recent-login') {
            alert("Para alterar sua senha, você precisa ter feito login recentemente.");
            return;
          }
          throw authError;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${updatedUser.id}`);
      throw error;
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      if (currentUser) syncCompanyConfig(currentUser.adminId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
      throw error;
    }
  }, [currentUser, syncCompanyConfig]);

  const updateUserStatus = useCallback(async (id: string, updates: Partial<User>) => {
    try {
      await updateDoc(doc(db, 'users', id), sanitize(updates));
      if (currentUser) syncCompanyConfig(currentUser.adminId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  }, [currentUser, syncCompanyConfig]);

  const register = (data: any) => {
    // This is now handled in RegisterScreen.tsx using Firebase Auth
  };

  // Store Handlers
  const addStore = useCallback(async (store: Store) => {
    if (!currentUser) return;
    try {
      const storeWithAdmin = sanitize({ ...store, adminId: currentUser.adminId });
      await setDoc(doc(db, 'stores', store.id), storeWithAdmin);
      syncCompanyConfig(currentUser.adminId);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `stores/${store.id}`);
    }
  }, [currentUser, syncCompanyConfig]);

  const updateStore = useCallback(async (updatedStore: Store) => {
    try {
      const cleanStore = sanitize(updatedStore);
      await setDoc(doc(db, 'stores', updatedStore.id), cleanStore);
      if (currentUser) syncCompanyConfig(currentUser.adminId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${updatedStore.id}`);
    }
  }, [currentUser, syncCompanyConfig]);

  const trialDaysLeft = useMemo(() => {
    if (!currentUser || !currentUser.createdAt) return 15;
    const created = new Date(currentUser.createdAt);
    const now = new Date();
    const diffTime = now.getTime() - created.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, 15 - diffDays);
  }, [currentUser]);

  const isSuperAdmin = useMemo(() => currentUser?.role === Role.SUPER_ADMIN, [currentUser]);

  const authValue = useMemo(() => ({
    user: currentUser, isSuperAdmin, plan: currentUser?.subscriptionPlan || 'GRATUITO', trialDaysLeft, allUsers: users, isAuthenticated,
    login, logout, register, switchUser, updateUser,
    updateUserStatus, addUser, deleteUser
  }), [currentUser, isSuperAdmin, users, isAuthenticated, trialDaysLeft]);

  const initializeDatabase = useCallback(async () => {
    if (!currentUser || (currentUser.role !== Role.ADMIN && currentUser.role !== Role.SUPER_ADMIN)) {
      alert("Apenas administradores podem inicializar o banco de dados.");
      return;
    }
    
    try {
      const adminId = currentUser.adminId;
      console.log("App: Starting database initialization for admin:", adminId);
      
      // Initialize Categories
      for (const cat of INITIAL_CATEGORIES) {
        const catWithAdmin = { ...cat, adminId };
        const sanitizedCat = sanitize(catWithAdmin);
        await setDoc(doc(db, 'categories', cat.id), sanitizedCat);
      }
      console.log("App: Categories initialized.");
      
      // Initialize Products
      for (const prod of INITIAL_PRODUCTS) {
        const prodWithAdmin = { ...prod, adminId };
        const sanitizedProd = sanitize(prodWithAdmin);
        await setDoc(doc(db, 'products', prod.id), sanitizedProd);
      }
      console.log("App: Products initialized.");
      
      // Ensure at least one store exists
      let mainStoreName = 'Loja Principal';
      if (stores.length === 0) {
        const storeId = 'store_' + Math.random().toString(36).substr(2, 5);
        const defaultStore: Store = {
          id: storeId,
          adminId: adminId,
          name: mainStoreName,
          address: 'Endereço da Loja',
          city: 'Cidade',
          phone: '(00) 00000-0000',
          isActive: true,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'stores', storeId), sanitize(defaultStore));
        console.log("App: Default store created.");
      } else {
        mainStoreName = stores[0].name;
      }

      // Initialize Stats
      const today = new Date().toISOString().split('T')[0];
      const statsId = `${adminId}_${today}`;
      const initialStats = {
        id: statsId,
        adminId: adminId,
        store: mainStoreName,
        date: today,
        totalFaturamento: 0,
        totalVendas: 0,
        productRanking: {},
        userRanking: {},
        paymentDistribution: {}
      };
      await setDoc(doc(db, 'stats', statsId), sanitize(initialStats));
      console.log("App: Stats initialized.");

      // Initialize a sample Caixa Session (Closed)
      const sessionId = 'init_session_' + adminId;
      const sampleSession = {
        id: sessionId,
        adminId: adminId,
        openedById: currentUser.id,
        openedByName: currentUser.name,
        closedById: currentUser.id,
        closedByName: currentUser.name,
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date().toISOString(),
        initialValue: 100,
        finalValue: 100,
        expectedValue: 100,
        totalSalesCash: 0,
        totalSalesPix: 0,
        totalSalesCard: 0,
        movements: [],
        status: 'CLOSED',
        store: mainStoreName
      };
      await setDoc(doc(db, 'caixaSessions', sessionId), sanitize(sampleSession));
      console.log("App: Caixa Sessions initialized.");

      // Initialize a sample Sale
      const saleId = 'init_sale_' + adminId;
      const sampleSale = {
        id: saleId,
        saleNumber: 1,
        adminId: adminId,
        userId: currentUser.id,
        totalAmount: 0,
        amountPaid: 0,
        changeAmount: 0,
        paymentMethod: 'CASH',
        items: [],
        createdAt: new Date().toISOString(),
        store: mainStoreName,
        status: 'COMPLETED'
      };
      await setDoc(doc(db, 'sales', saleId), sanitize(sampleSale));
      console.log("App: Sales initialized.");

      // Initialize a sample Delivery Order
      const orderId = 'init_order_' + adminId;
      const sampleOrder = {
        id: orderId,
        adminId: adminId,
        saleId: saleId,
        status: 'DELIVERED',
        street: 'Rua de Exemplo',
        number: '123',
        neighborhood: 'Centro',
        city: 'Cidade Exemplo',
        deliveryFee: 0,
        customerName: 'Cliente Exemplo',
        customerPhone: '(00) 00000-0000',
        total: 0
      };
      await setDoc(doc(db, 'deliveryOrders', orderId), sanitize(sampleOrder));
      console.log("App: Delivery Orders initialized.");

      // Create a test document to ensure 'test' collection exists
      await setDoc(doc(db, 'test', 'init_' + adminId), {
        initializedAt: new Date().toISOString(),
        adminId: adminId
      });
      
      // Sync catalog and config
      await syncProductCatalog(adminId);
      await syncCompanyConfig(adminId);
      
      alert("Banco de dados inicializado com sucesso! Todas as coleções necessárias (Produtos, Categorias, Lojas, Estatísticas, Vendas, Caixa, Delivery, Configurações) foram criadas com dados iniciais.");
    } catch (error) {
      console.error("App: Initialization failed:", error);
      handleFirestoreError(error, OperationType.WRITE, 'initialization');
    }
  }, [currentUser, stores, syncProductCatalog, syncCompanyConfig]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const updateModules = useCallback((newModules: SystemModules) => {
    setModules(newModules);
    if (currentUser) {
      const adminId = currentUser.adminId;
      // Use the newModules directly to avoid stale state in the async call
      const configData = sanitize({ adminId, users, stores, modules: newModules, receipt });
      setDoc(doc(db, 'company_configs', adminId), configData).catch(err => {
        console.error("App: Failed to sync modules:", err);
      });
    }
  }, [currentUser, users, stores, receipt]);

  const updateReceipt = useCallback((newReceipt: ReceiptConfig) => {
    setReceipt(newReceipt);
    if (currentUser) {
      const adminId = currentUser.adminId;
      // Use the newReceipt directly
      const configData = sanitize({ adminId, users, stores, modules, receipt: newReceipt });
      setDoc(doc(db, 'company_configs', adminId), configData).catch(err => {
        console.error("App: Failed to sync receipt:", err);
      });
    }
  }, [currentUser, users, stores, modules]);

  const configValue = useMemo(() => ({
    modules, receipt, updateModules, updateReceipt, initializeDatabase
  }), [modules, receipt, updateModules, updateReceipt, initializeDatabase]);

  const storesValue = useMemo(() => ({
    stores, addStore, updateStore
  }), [stores]);

  const productsValue = useMemo(() => ({
    products, updateProduct, addProduct, deleteProduct, setProducts, fetchProduct
  }), [products, fetchProduct]);

  const salesValue = useMemo(() => ({
    sales, hasMoreSales, loadMoreSales, addSale, completeSavedSale, setSales, setHasMoreSales
  }), [sales, hasMoreSales, loadMoreSales, addSale, completeSavedSale]);

  const caixaValue = useMemo(() => ({
    sessions: caixaSessions, activeSession, openCaixa, closeCaixa, addCaixaMovement, setSessions: setCaixaSessions
  }), [caixaSessions, activeSession, openCaixa, closeCaixa, addCaixaMovement]);

  const deliveryValue = useMemo(() => ({
    deliveryOrders, addDeliveryOrder, updateDeliveryStatus, removeDeliveryOrder
  }), [deliveryOrders]);

  const categoriesValue = useMemo(() => ({
    categories, updateCategory, reorderCategories, updateCategoriesOrder, addCategory, deleteCategory, setCategoriesList: setCategories
  }), [categories]);

  const menuValue = useMemo(() => ({
    isMenuOpen, toggleMenu, closeMenu, setIsSwitchingUser
  }), [isMenuOpen]);

  console.log("App: Rendering. isAuthReady:", isAuthReady, "isFetchingUser:", isFetchingUser, "isAuthenticated:", isAuthenticated);

  return (
    <ErrorBoundary>
      <FatalErrorThrower error={fatalError} />
      <AuthContext.Provider value={authValue}>
      <ConfigContext.Provider value={configValue}>
        <StoresContext.Provider value={storesValue}>
          <ProductsContext.Provider value={productsValue}>
            <SalesContext.Provider value={salesValue}>
              <CaixaContext.Provider value={caixaValue}>
                <DeliveryContext.Provider value={deliveryValue}>
                  <CategoriesContext.Provider value={categoriesValue}>
                    <MenuContext.Provider value={menuValue}>
                      <Router>
                        {showSpinner && (
                          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white p-4">
                            {!loadingError && (
                              <div className="w-12 h-12 border-4 border-[#00BFA5] border-t-transparent rounded-full animate-spin mb-4"></div>
                            )}
                            {loadingError && (
                              <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-300 border border-slate-100">
                                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                                </div>
                                <h2 className="text-xl font-black text-slate-800 uppercase mb-2">Erro de Carregamento</h2>
                                <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">{loadingError}</p>
                                <div className="grid grid-cols-1 gap-3">
                                  <button 
                                    onClick={() => window.location.reload()}
                                    className="w-full py-4 bg-[#00BFA5] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-lg shadow-[#00BFA5]/20"
                                  >
                                    Tentar Novamente
                                  </button>
                                  <button 
                                    onClick={logout}
                                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                                  >
                                    Sair da Conta
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {!isAuthenticated || !currentUser ? (
                          <Routes>
                            <Route path="/login" element={<LoginScreen />} />
                            <Route path="/registrar" element={<RegisterScreen />} />
                            <Route path="/recuperar-senha" element={<ForgotPasswordScreen />} />
                            <Route path="*" element={<Navigate to="/login" replace />} />
                          </Routes>
                        ) : (
                          <div className="min-h-screen flex bg-[#f9fafb]">
                            <Sidebar />
                            <main className="flex-1 overflow-x-hidden relative flex flex-col">
                              <header className="h-16 bg-white border-b border-slate-100 flex items-center px-4 justify-between shrink-0 sticky top-0 z-50">
                                 <button onClick={() => setIsMenuOpen(true)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                    {ICONS.Menu}
                                 </button>
                                 <div className="flex-1 px-4 text-center">
                                    <h1 className="text-lg font-black text-slate-800 tracking-tight">
                                      <span className="text-[#00BFA5]">{getRoleLabel(currentUser?.role)}</span> - {currentUser?.name}
                                    </h1>
                                 </div>
                                 <div className="w-10"></div>
                              </header>
                              <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
                                <Routes>
                                  <Route path="/" element={<HomeScreen user={currentUser!} />} />
                                  <Route path="/vender" element={<PermissionRoute path="/vender" element={<SellScreen />} />} />
                                  <Route path="/caixa" element={<PermissionRoute path="/caixa" element={<CaixaScreen />} />} />
                                  <Route path="/usuarios" element={<PermissionRoute path="/usuarios" element={<UsersScreen />} />} />
                                  <Route path="/historico" element={<PermissionRoute path="/historico" element={<HistoryScreen />} />} />
                                  <Route path="/produtos" element={<PermissionRoute path="/produtos" element={<ProductsScreen />} />} />
                                  <Route path="/delivery" element={<PermissionRoute path="/delivery" element={<DeliveryScreen />} />} />
                                  <Route path="/motoboy" element={<PermissionRoute path="/motoboy" element={<MotoboyScreen />} />} />
                                  <Route path="/lojas" element={<PermissionRoute path="/lojas" element={<LojasScreen />} />} />
                                  <Route path="/stats" element={<PermissionRoute path="/stats" element={<StatsScreen />} />} />
                                  <Route path="/planos" element={<PermissionRoute path="/planos" element={<PlansScreen />} />} />
                                  <Route path="/configuracoes" element={<ConfigScreen />} />
                                  <Route path="/ponto-preview" element={<PontoPreview />} />
                                  <Route path="/compartilhar" element={<PermissionRoute path="/compartilhar" element={<ShareCatalogScreen />} />} />
                                  <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                              </div>
                            </main>
                            {isMenuOpen && <div className="fixed inset-0 bg-black/50 z-[999]" onClick={() => setIsMenuOpen(false)}></div>}
                            {isSwitchingUser && <SwitchUserModal />}
                          </div>
                        )}
                      </Router>
                    </MenuContext.Provider>
                  </CategoriesContext.Provider>
                </DeliveryContext.Provider>
              </CaixaContext.Provider>
            </SalesContext.Provider>
          </ProductsContext.Provider>
        </StoresContext.Provider>
      </ConfigContext.Provider>
    </AuthContext.Provider>
    </ErrorBoundary>
  );
};

const SwitchUserModal = () => {
  const { switchUser, allUsers: storeUsers } = useAuth();
  const { setIsSwitchingUser } = useMenu();
  const [step, setStep] = useState<'SELECT' | 'PASSWORD'>('SELECT');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSelect = (u: User) => { setSelectedUser(u); setStep('PASSWORD'); };

  const handleSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedUser) {
        const success = switchUser(selectedUser.id, password);
        if (success) {
          // switchUser already calls setIsSwitchingUser(false) and setCurrentUser
        } else {
          setError('Senha incorreta');
        }
      }
    } catch (err) {
      setError('Erro ao trocar usuário');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden p-8">
         <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Trocar Usuário</h2>
            <button onClick={() => setIsSwitchingUser(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">{ICONS.Close}</button>
         </div>

         {step === 'SELECT' ? (
           <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {storeUsers.map(u => (
                <button key={u.id} onClick={() => handleSelect(u)} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-[#00BFA5] hover:bg-slate-50 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-[#00BFA5] group-hover:bg-[#00BFA5] group-hover:text-white transition-colors">{u.name.charAt(0)}</div>
                  <div className="text-left">
                     <p className="font-bold text-slate-700">{u.name}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{getRoleLabel(u.role)}</p>
                  </div>
                </button>
              ))}
           </div>
         ) : (
           <form onSubmit={handleSwitch} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl mb-4">
                 <div className="w-10 h-10 rounded-full bg-[#00BFA5] flex items-center justify-center font-black text-white">{selectedUser?.name.charAt(0)}</div>
                 <div className="text-left">
                    <p className="font-bold text-slate-700">{selectedUser?.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{getRoleLabel(selectedUser?.role)}</p>
                 </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Senha</label>
                <input required autoFocus type="password" placeholder="Digite a senha..." className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:border-[#00BFA5]" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
                {error && <p className="text-red-500 text-[10px] font-black uppercase mt-1 px-1">{error}</p>}
              </div>
              <div className="flex gap-3">
                 <button type="button" onClick={() => setStep('SELECT')} className="flex-1 py-4 text-slate-400 font-bold uppercase text-xs">Voltar</button>
                 <button type="submit" className="flex-[2] py-4 bg-[#00BFA5] text-white rounded-2xl font-black shadow-lg shadow-[#00BFA5]/20">Acessar</button>
              </div>
           </form>
         )}
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { user: currentUser, logout } = useAuth();
  const { isMenuOpen, closeMenu, setIsSwitchingUser } = useMenu();
  const location = useLocation();
  const config = useContext(ConfigContext);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };
  
  const menuItems = [
    { path: '/vender', label: 'Vender', icon: ICONS.Vender, show: true },
    { path: '/caixa', label: 'Caixa', icon: ICONS.Cash, show: config?.modules.caixa },
    { path: '/historico', label: 'Histórico', icon: ICONS.Clock, show: true },
    { path: '/produtos', label: 'Produtos', icon: ICONS.Produtos, show: true },
    { path: '/delivery', label: 'Delivery', icon: ICONS.Entregas, show: config?.modules.delivery },
    { path: '/motoboy', label: 'Motoboys', icon: ICONS.Bike, show: config?.modules.motoboy },
    { path: '/usuarios', label: 'Usuários', icon: ICONS.Usuarios, show: currentUser?.role === Role.SUPER_ADMIN || currentUser?.role === Role.ADMIN },
    { path: '/lojas', label: 'Lojas', icon: ICONS.MapPin, show: currentUser?.role === Role.SUPER_ADMIN || currentUser?.role === Role.ADMIN },
    { path: '/stats', label: 'Estatísticas', icon: ICONS.Estatisticas, show: true },
    { path: '/compartilhar', label: 'Compartilhar', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>, show: currentUser?.role === Role.SUPER_ADMIN },
    { path: '/planos', label: 'Planos', icon: ICONS.Dashboard, show: currentUser?.role === Role.SUPER_ADMIN || currentUser?.role === Role.ADMIN },
  ];

  const allowedItems = menuItems.filter(item => {
    const isVisibleByConfig = item.show;
    const isAdminOrSuper = currentUser?.role === Role.SUPER_ADMIN || currentUser?.role === Role.ADMIN;
    const isPermittedByUser = (currentUser?.permissions || []).includes(item.path) || isAdminOrSuper;
    
    return isVisibleByConfig && isPermittedByUser;
  });

  return (
    <div className={`fixed inset-y-0 left-0 z-[1000] w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-8 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl" />
          <h2 className="text-2xl font-black text-[#00BFA5] tracking-tighter">MIX PDV</h2>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-500 font-black uppercase">Gestão Inteligente</p>
          <button onClick={closeMenu} className="lg:hidden text-slate-500">✕</button>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar pb-4">
        {allowedItems.map(item => (
          <Link 
            key={item.path} 
            to={item.path} 
            onClick={closeMenu}
            className={`flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all font-bold ${location.pathname === item.path ? 'bg-[#00BFA5] text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 bg-slate-800/50 border-t border-white/5 space-y-1">
        {deferredPrompt && (
          <button 
            onClick={handleInstallClick}
            className="w-full flex items-center gap-4 px-6 py-3 rounded-2xl text-emerald-400 font-bold hover:bg-emerald-500/10 transition-all border border-emerald-500/20 mb-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            <span className="text-sm">Instalar Aplicativo</span>
          </button>
        )}
        <button 
          onClick={() => { setIsSwitchingUser(true); closeMenu(); }}
          className="w-full flex items-center gap-4 px-6 py-3 rounded-2xl text-orange-400 font-bold hover:bg-orange-500/10 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/></svg>
          <span className="text-sm">Trocar Usuário</span>
        </button>
        <Link 
          to="/configuracoes" 
          onClick={closeMenu}
          className={`flex items-center gap-4 px-6 py-3 rounded-2xl transition-all font-bold ${location.pathname === '/configuracoes' ? 'bg-[#00BFA5] text-white' : 'text-slate-400 hover:bg-white/5'}`}
        >
          <span className="shrink-0">{ICONS.Settings}</span>
          <span className="text-sm">Configurações</span>
        </Link>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-4 px-6 py-3 rounded-2xl text-red-400 font-bold hover:bg-red-500/10 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          <span className="text-sm">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default App;
