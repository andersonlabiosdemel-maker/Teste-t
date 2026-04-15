
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SELLER = 'SELLER',
  MOTOBOY = 'MOTOBOY'
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  ON_ROUTE = 'ON_ROUTE',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  DEBIT_CARD = 'DEBIT_CARD',
  CREDIT_CARD = 'CREDIT_CARD',
  PIX = 'PIX'
}

export interface StockHistory {
  id: string;
  type: 'ENTRADA' | 'SAIDA';
  quantity: number;
  date: string;
  reason: string;
  balance: number;
  responsible: string;
}

export interface Product {
  id: string;
  adminId: string; // ID of the admin who owns this product
  store?: string; // Store associated with this product
  name: string;
  price: number;
  costPrice: number;
  promotionalPrice?: number;
  category: string;
  imageUrl?: string;
  stock: number;
  unit: string;
  barcode?: string;
  description?: string;
  isHighlighted?: boolean;
  showInCatalog?: boolean;
  differentPricesByStore?: boolean;
  manageStock?: boolean;
  minStock?: number;
  minStockEnabled?: boolean;
  stockHistory?: StockHistory[];
}

export interface Category {
  id: string;
  adminId: string; // ID of the admin who owns this category
  store?: string; // Store associated with this category
  name: string;
  order: number;
  productCount: number;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
}

export type SaleStatus = 'COMPLETED' | 'SAVED';

export interface Sale {
  id: string;
  saleNumber?: number;
  adminId: string; // ID of the admin who owns this sale
  userId: string;
  totalAmount: number;
  amountPaid?: number;
  changeAmount?: number;
  paymentMethod?: PaymentMethod; 
  items: SaleItem[];
  createdAt: string;
  store: string;
  status: SaleStatus;
}

export interface CaixaMovement {
  id: string;
  type: 'IN' | 'OUT'; // IN = Reforço, OUT = Sangria
  amount: number;
  reason?: string;
  createdAt: string;
}

export interface CaixaSession {
  id: string;
  adminId: string; // ID of the admin who owns this session
  openedById: string;
  openedByName: string;
  closedById?: string;
  closedByName?: string;
  startTime: string;
  endTime?: string;
  initialValue: number;
  finalValue?: number;
  expectedValue?: number;
  totalSalesCash: number;
  totalSalesPix: number;
  totalSalesCard: number;
  movements: CaixaMovement[];
  status: 'OPEN' | 'CLOSED';
  store: string;
}

export interface DeliveryOrder {
  id: string;
  adminId: string; // ID of the admin who owns this order
  saleId: string;
  status: DeliveryStatus;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  deliveryFee: number;
  customerName: string;
  customerPhone: string;
  total: number;
  motoboyId?: string;
}

export interface User {
  id: string;
  adminId: string; // ID of the root admin for this user's tenant
  name: string;
  email: string;
  password?: string;
  role: Role;
  store: string;
  isSystemUser?: boolean;
  createdAt: string;
  subscriptionPlan?: string;
  isOnline?: boolean;
  permissions?: string[];
  lat?: number;
  lng?: number;
}

export interface Store {
  id: string;
  adminId: string; // ID of the admin who owns this store
  name: string;
  address: string;
  city: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface SystemModules {
  delivery: boolean;
  motoboy: boolean;
  caixa: boolean;
  clientes: boolean;
}

export interface Printer {
  id: string;
  name: string;
  type: 'BT' | 'IP';
  paperSize: '58' | '80';
  isConnected: boolean;
}

export interface ReceiptConfig {
  storeName: string;
  layout: string;
  footer: string;
  globalDeliveryFee: number;
  motoboyCommission: number;
  autoPrint: boolean;
  lastSaleNumber?: number;
  printers: Printer[];
}

export interface ProductCatalog {
  id: string; // adminId
  adminId: string;
  products: Product[];
  lastUpdated: string;
}

export interface SaleStats {
  id: string; // adminId_store_date
  adminId: string;
  store: string;
  date: string; // YYYY-MM-DD
  totalFaturamento: number;
  totalVendas: number;
  productRanking: Record<string, { name: string; total: number; qty: number }>;
  userRanking: Record<string, { name: string; total: number; qty: number }>;
  paymentDistribution: Record<string, number>;
  vendas?: Sale[];
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
