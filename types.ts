
export interface ProductSlot {
  id: string; // e.g., "SLOT01"
  name: string;
  price: number;
  currentStock: number;
  maxCapacity: number;
  imageUrl?: string;
  expiryDate?: string; // FIFO Logic
  cartonSize?: number; // e.g., 24 units per carton
}

export interface Transaction {
  id: string;
  refNo: string;
  paymentId: string;
  productName: string;
  slotId: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED';
  paymentMethod: string;
  timestamp: string;
  lhdnStatus?: 'SUBMITTED' | 'VALIDATED' | 'PENDING'; // LHDN e-Invoice Status
}

export interface Location {
  id: string;
  name: string; // e.g., "KPTM Bangi - Block A"
  address: string;
  commissionRate: number; // e.g., 0.10 for 10%
  totalSales: number;
  picName: string; // Person In Charge
}

export interface WarehouseItem {
  sku: string;
  name: string;
  hqStock: number; // Main Warehouse
  truckStock: number; // Mobile Truck
}

export interface RouteStop {
  id: string;
  locationName: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  distance: string;
  restockNeeded: number; // Total units needed
  status: 'PENDING' | 'COMPLETED';
}

export interface IPay88CallbackData {
  merchantCode: string;
  paymentId: string;
  refNo: string;
  amount: string;
  currency: string;
  status: string;
  signature: string;
}

// PART 7 TYPES
export interface Alarm {
  id: string;
  machineId: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  errorCode: string; // e.g., "ERR-MTR-01"
  message: string;
  timestamp: string;
  status: 'OPEN' | 'RESOLVED';
  assignedTechnician?: string;
  resolutionNote?: string; // Added for resolution details
}

// PART 8 TYPES
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  rating: number; // 1-5 Stars
  leadTimeDays: number;
}

export interface Commodity {
  sku: string;
  name: string;
  supplierId: string;
  costPrice: number; // Buying price
  retailPrice: number; // Selling price
  marginPct: number; // (Retail - Cost) / Retail * 100
  lastOrderDate: string;
}

// NEW FUNCTIONAL TYPES
export interface PurchaseOrder {
  id: string;
  supplierName: string;
  items: string; // Description summary
  totalCost: number;
  status: 'PENDING' | 'APPROVED' | 'RECEIVED';
  date: string;
}

export interface ServiceTicket {
  id: string;
  alarmId: string;
  machineId: string;
  issue: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  technician: string;
  dispatchedAt: string;
}

// NEW: Machine Telemetry Interface
export interface Machine {
  id: string;
  name: string;
  group: string;
  signal: number; // 0-5
  temp: number;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'BOOTING';
  door: 'OPEN' | 'CLOSED';
  bill: 'OK' | 'JAMMED' | 'FULL' | 'UNKNOWN';
  coin: 'OK' | 'LOW' | 'FULL' | 'UNKNOWN';
  card: 'OK' | 'ERR' | 'UNKNOWN';
  stock: number; // Percentage
  lastSync: string;
}

// --- TCN CLOUD REVERSE ENGINEERED INTERFACES ---
export interface TCNMachineRaw {
  id: string;        // The Grid ID (internal)
  MiNoline: string;  // The MacID / Machine Code (e.g., "10015523")
  MiName: string;    // Machine Name
  IsOnline: boolean; // true/false
  GpsAddress: string;
  SignalStrength: number;
  Temp: number;
  // Add other fields as discovered from the JSON response
}

export interface TCNResponse {
  total: number;
  page: number;
  records: number;
  rows: TCNMachineRaw[];
}

// --- SUPER SETTINGS TYPES ---
export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'TECHNICIAN';

export interface User {
  id: string;
  username: string;
  password: string; // In real app, this should be hashed
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string; // Username
  action: string; // e.g., "LOGIN", "UPDATE_PRICE"
  details: string;
  ipAddress?: string;
}
