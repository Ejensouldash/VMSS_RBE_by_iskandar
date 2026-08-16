// --- PRODUCT & INVENTORY ---
export interface ProductSlot {
  id: string;
  name: string;
  price: number;
  initialStock?: number;
  maxCapacity: number;
  currentStock: number;
  expiryDate?: string;
  cartonSize?: number;
  productName?: string;
  image?: string;
}

// [BARU] Interface untuk Master List Kos Produk (Dari Excel Tuan)
export interface ProductCost {
  id: string;
  name: string;      // Nama produk dalam Excel
  costPrice: number; // Harga Beli
  salePrice: number; // Harga Jual
  category: string;  // Kategori
}

// --- TRANSACTIONS ---
export interface Transaction {
  id: string;
  refNo: string;
  paymentId: string;
  productName: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  paymentMethod: string;
  timestamp: string;
  machineId?: string;
  slotId?: string;
  sourceFile?: string;
  
  // [BARU] Field tambahan untuk analisa kewangan
  cost?: number;    // Kos produk semasa transaksi
  profit?: number;  // Untung bersih (Amount - Cost)
}

export interface IPay88CallbackData {
  merchantCode: string;
  paymentId: string;
  refNo: string;
  amount: string;
  currency: string;
  status: string;
  signature: string;
  errDesc?: string;
}

// --- WAREHOUSE & STOCK ---
export interface WarehouseItem {
  sku: string;
  name: string;
  category: string;
  hqStock: number;    // Stok di HQ
  truckStock: number; // Stok dalam Lori (On-the-go)
  minLevel: number;
  unit: string;
}

export interface PurchaseOrder {
  id: string;
  supplierName: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'RECEIVED';
  items: { sku: string; qty: number; cost: number }[] | string;
  totalAmount?: number;
  totalCost?: number;
}

// --- ROUTE PLANNING & LOGISTICS ---
export interface RouteStop {
  id?: string;
  machineId?: string;
  machineName?: string;
  locationName?: string;
  location?: string;
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  distance?: string;
  restockNeeded?: number;
  requiredStock?: { sku: string; name: string; qty: number }[];
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED';
}

export interface Location {
  id: string;
  name: string;
  group?: string;
  address: string;
  type?: string;
  machineCount?: number;
  machines?: string[];
  commissionRate?: number;
  totalSales?: number;
  picName?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  contact?: string;
  phone: string;
  email: string;
  rating?: number;
  leadTimeDays: number;
  paymentTerms?: string;
  commodities?: string[];
}

export interface Commodity {
  sku: string;
  name: string;
  supplierId?: string;
  category?: string;
  unit?: string;
  costPrice: number;
  retailPrice?: number;
  salePrice?: number;
  marginPct?: number;
  lastOrderDate?: string;
  cartonSize?: number;
}

// --- MAINTENANCE & TICKETS ---
export interface ServiceTicket {
  id: string;
  machineId: string;
  alarmId?: string;
  issue: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  reportedBy?: string;
  technician?: string;
  createdAt?: string;
  dispatchedAt?: string;
  resolvedAt?: string;
}

export interface Alarm {
  id: string;
  machineId: string;
  type?: 'TEMPERATURE' | 'STOCK' | 'POWER' | 'DOOR' | 'SYSTEM' | string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'WARNING' | 'INFO';
  errorCode?: string;
  message: string;
  timestamp: string;
  status: 'OPEN' | 'RESOLVED';
  assignedTechnician?: string;
  resolutionNote?: string;
}

// --- MACHINES ---
export interface Machine {
  id: string;
  name: string;
  group: string;
  signal: number; // 0-5 bars
  temp: number;   // Celsius
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'BOOTING';
  door: 'OPEN' | 'CLOSED';
  bill: 'OK' | 'LOW' | 'FULL' | 'JAMMED' | 'UNKNOWN';
  coin: 'OK' | 'LOW' | 'FULL' | 'JAMMED' | 'UNKNOWN';
  card: 'OK' | 'ERR' | 'UNKNOWN';
  stock: number;  // Percentage or count
  lastSync: string;
}

// --- USERS & AUDIT ---
export interface User {
  id: number | string;
  username: string;
  password?: string; // Optional for security when displaying
  name: string;
  role: 'super_admin' | 'admin' | 'manager' | 'technician';
  email: string;
  isActive: boolean;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}