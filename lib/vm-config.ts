
/**
 * VMSRBE MASTER CONFIGURATION
 * --------------------------
 * Enterprise Configuration for Rozita Bina Enterprise.
 * Data updated based on real product list (32 Items).
 */

import { Location, RouteStop, WarehouseItem, Alarm, Supplier, Commodity } from "../types";

export const VM_CONFIG = {
  IS_PRODUCTION: false,
  MERCHANT: {
    CODE: "M46662",
    KEY: "LLBUOQx2Mo"
  },
  
  // REAL PRODUCT LIST (32 ITEMS)
  // Mapped from user image: Produk, Harga Jual, Stok Beli (Used as Max Cap & Initial)
  SLOTS: [
    { id: 'SLOT01', name: 'Maggi Instant Noodles Big Curry (5x111g)', price: 3.50, initialStock: 25, maxCapacity: 25, expiryDate: '2025-01-01', cartonSize: 12 },
    { id: 'SLOT02', name: 'Maggi Cup Kari 58g', price: 4.50, initialStock: 54, maxCapacity: 60, expiryDate: '2025-02-01', cartonSize: 24 },
    { id: 'SLOT03', name: 'Samyang Hot Chicken Ramen Cheese', price: 8.00, initialStock: 25, maxCapacity: 25, expiryDate: '2024-12-30', cartonSize: 10 },
    { id: 'SLOT04', name: 'F&N SEASONS Soya Bean 250ml', price: 2.50, initialStock: 48, maxCapacity: 48, expiryDate: '2025-03-15', cartonSize: 24 },
    { id: 'SLOT05', name: 'Seasons Drinks Ice Lemon Tea', price: 2.50, initialStock: 48, maxCapacity: 48, expiryDate: '2025-03-15', cartonSize: 24 },
    { id: 'SLOT06', name: 'Wonda Coffee Latte 240ml', price: 4.50, initialStock: 48, maxCapacity: 48, expiryDate: '2024-11-20', cartonSize: 24 },
    { id: 'SLOT07', name: 'Wonda Coffee Mocha 240ml', price: 4.50, initialStock: 48, maxCapacity: 48, expiryDate: '2024-11-20', cartonSize: 24 },
    { id: 'SLOT08', name: 'NESCAFE Original Milk Coffee 240ml', price: 4.50, initialStock: 48, maxCapacity: 48, expiryDate: '2024-12-05', cartonSize: 24 },
    { id: 'SLOT09', name: 'F&N TEH TARIK ORI 240ML', price: 4.50, initialStock: 48, maxCapacity: 48, expiryDate: '2025-01-10', cartonSize: 24 },
    { id: 'SLOT10', name: '100PLUS Original 325ml', price: 3.50, initialStock: 56, maxCapacity: 60, expiryDate: '2025-05-20', cartonSize: 24 },
    { id: 'SLOT11', name: 'OLIGO Belgian Cocoa 240ml', price: 3.60, initialStock: 24, maxCapacity: 24, expiryDate: '2025-02-28', cartonSize: 24 },
    { id: 'SLOT12', name: 'NESTLE Milo Activ-Go UHT 200ml', price: 2.80, initialStock: 48, maxCapacity: 48, expiryDate: '2025-04-10', cartonSize: 24 },
    { id: 'SLOT13', name: 'OREO', price: 2.00, initialStock: 36, maxCapacity: 40, expiryDate: '2025-06-01', cartonSize: 12 },
    { id: 'SLOT14', name: 'Sunquick Air 115ml', price: 2.50, initialStock: 72, maxCapacity: 80, expiryDate: '2024-12-15', cartonSize: 40 },
    { id: 'SLOT15', name: 'Goodday Chocolate/FullCream 200ml', price: 2.80, initialStock: 96, maxCapacity: 100, expiryDate: '2024-10-30', cartonSize: 24 },
    { id: 'SLOT16', name: 'Spritzer Mineral Water 550ml', price: 2.50, initialStock: 72, maxCapacity: 72, expiryDate: '2026-01-01', cartonSize: 24 },
    { id: 'SLOT17', name: 'Pepsi Original 320ml', price: 3.00, initialStock: 24, maxCapacity: 30, expiryDate: '2025-02-15', cartonSize: 24 },
    { id: 'SLOT18', name: 'Mountain Dew 320ml', price: 3.00, initialStock: 48, maxCapacity: 48, expiryDate: '2025-02-15', cartonSize: 24 },
    { id: 'SLOT19', name: 'Coca Cola 320ml', price: 3.50, initialStock: 48, maxCapacity: 48, expiryDate: '2025-03-01', cartonSize: 24 },
    { id: 'SLOT20', name: 'Kickapoo 320ml', price: 3.00, initialStock: 48, maxCapacity: 48, expiryDate: '2025-02-20', cartonSize: 24 },
    { id: 'SLOT21', name: '7 Up 320ml', price: 3.00, initialStock: 48, maxCapacity: 48, expiryDate: '2025-02-20', cartonSize: 24 },
    { id: 'SLOT22', name: 'Pepsi Zero 320ml', price: 3.00, initialStock: 24, maxCapacity: 24, expiryDate: '2025-02-15', cartonSize: 24 },
    { id: 'SLOT23', name: 'Nips', price: 3.80, initialStock: 24, maxCapacity: 30, expiryDate: '2025-08-01', cartonSize: 12 },
    { id: 'SLOT24', name: 'Chipsmore Mini campur flavour 72G', price: 3.30, initialStock: 56, maxCapacity: 60, expiryDate: '2025-05-15', cartonSize: 12 },
    { id: 'SLOT25', name: 'Biskut tiger Susu Mini 75G', price: 2.30, initialStock: 48, maxCapacity: 50, expiryDate: '2025-04-20', cartonSize: 12 },
    { id: 'SLOT26', name: 'Instant spagetti Mix Flavour 75G', price: 3.50, initialStock: 30, maxCapacity: 30, expiryDate: '2025-01-30', cartonSize: 10 },
    { id: 'SLOT27', name: 'Ombak Natural Mineral Water 500ML', price: 2.00, initialStock: 72, maxCapacity: 72, expiryDate: '2026-06-01', cartonSize: 24 },
    { id: 'SLOT28', name: 'Biskut Munchys Lexus 418G', price: 1.90, initialStock: 33, maxCapacity: 40, expiryDate: '2025-03-10', cartonSize: 10 },
    { id: 'SLOT29', name: 'NABATI Wafer Mix Flavour', price: 1.60, initialStock: 108, maxCapacity: 120, expiryDate: '2025-07-01', cartonSize: 30 },
    { id: 'SLOT30', name: 'Tropicana Twister Oren 355ml', price: 3.50, initialStock: 24, maxCapacity: 24, expiryDate: '2025-01-20', cartonSize: 12 },
    { id: 'SLOT31', name: 'Vida Vit C Lemon 1000mg 325ml', price: 4.50, initialStock: 24, maxCapacity: 24, expiryDate: '2025-02-28', cartonSize: 24 },
    { id: 'SLOT32', name: 'Cocopie', price: 2.00, initialStock: 30, maxCapacity: 40, expiryDate: '2025-05-05', cartonSize: 12 },
  ],
  
  // DEFAULT LOCATIONS (seed data - prefer TCN cloud when available)
  LOCATIONS: [
    { id: 'LOC01', name: 'UPTM Main Hall', address: 'Cheras, KL', commissionRate: 0.15, totalSales: 4500, picName: 'En. Azman' },
    { id: 'LOC02', name: 'KPTM Bangi - Hostel', address: 'Bangi, Selangor', commissionRate: 0.10, totalSales: 3200, picName: 'Pn. Sarah' },
    { id: 'LOC03', name: 'Rozita Bina HQ', address: 'Kajang, Selangor', commissionRate: 0.0, totalSales: 1200, picName: 'Internal' },
  ] as Location[],

  // WAREHOUSE (Synced with new product list)
  WAREHOUSE: [
    { sku: 'MAG-BIG', name: 'Maggi Instant Noodles Big Curry', hqStock: 200, truckStock: 20 },
    { sku: 'MAG-CUP', name: 'Maggi Cup Kari 58g', hqStock: 500, truckStock: 50 },
    { sku: 'SAM-RAM', name: 'Samyang Hot Chicken Ramen', hqStock: 150, truckStock: 15 },
    { sku: 'FN-SOYA', name: 'F&N SEASONS Soya Bean', hqStock: 300, truckStock: 30 },
    { sku: 'WONA-LA', name: 'Wonda Coffee Latte', hqStock: 240, truckStock: 24 },
    { sku: '100-PLUS', name: '100PLUS Original 325ml', hqStock: 600, truckStock: 60 },
    { sku: 'MILO-UHT', name: 'NESTLE Milo Activ-Go UHT', hqStock: 400, truckStock: 40 },
    { sku: 'OREO-PK', name: 'OREO', hqStock: 100, truckStock: 10 },
  ] as WarehouseItem[],

  // PRODUCT CATALOG FOR PLANOGRAM (Synced with new product list)
  // Categories: Food = Orange/Red, Drinks = Blue/Green/Brown
  PRODUCT_CATALOG: [
    { id: 'P01', name: 'Maggi Big Curry', price: 3.50, color: 'bg-orange-500' },
    { id: 'P02', name: 'Maggi Cup Kari', price: 4.50, color: 'bg-orange-600' },
    { id: 'P03', name: 'Samyang Ramen', price: 8.00, color: 'bg-red-600' },
    { id: 'P04', name: 'Seasons Soya', price: 2.50, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'P05', name: 'Seasons Lemon Tea', price: 2.50, color: 'bg-yellow-300 text-yellow-900' },
    { id: 'P06', name: 'Wonda Latte', price: 4.50, color: 'bg-amber-800 text-white' },
    { id: 'P10', name: '100PLUS', price: 3.50, color: 'bg-indigo-500 text-white' },
    { id: 'P12', name: 'Milo UHT', price: 2.80, color: 'bg-green-700 text-white' },
    { id: 'P13', name: 'OREO', price: 2.00, color: 'bg-blue-900 text-white' },
    { id: 'P16', name: 'Spritzer Water', price: 2.50, color: 'bg-blue-400 text-white' },
    { id: 'P19', name: 'Coca Cola', price: 3.50, color: 'bg-red-700 text-white' },
    { id: 'P24', name: 'Chipsmore Mini', price: 3.30, color: 'bg-purple-600 text-white' },
  ],

  // DEFAULT ROUTES (seed data - AI will re-optimize using live telemetry)
  ROUTES: [
    { id: 'RT01', locationName: 'KPTM Bangi - Hostel', urgency: 'HIGH', distance: '12km', restockNeeded: 45, status: 'PENDING' },
    { id: 'RT02', locationName: 'UPTM Main Hall', urgency: 'MEDIUM', distance: '24km', restockNeeded: 12, status: 'PENDING' },
    { id: 'RT03', locationName: 'Kajang Hospital', urgency: 'LOW', distance: '5km', restockNeeded: 5, status: 'PENDING' },
  ] as RouteStop[],

  // ALARMS
  ALARMS: [
    { id: 'AL-001', machineId: 'VM-1002', severity: 'CRITICAL', errorCode: 'ERR-BILL-JAM', message: 'Bill Acceptor Jammed', timestamp: '2024-05-20T09:30:00', status: 'OPEN' },
    { id: 'AL-002', machineId: 'VM-3001', severity: 'WARNING', errorCode: 'ERR-DOOR-OPEN', message: 'Door Open > 10 mins', timestamp: '2024-05-20T10:15:00', status: 'OPEN' },
    { id: 'AL-003', machineId: 'VM-2001', severity: 'INFO', errorCode: 'INF-PWR-RST', message: 'System Recovered from Power Loss', timestamp: '2024-05-19T14:20:00', status: 'RESOLVED', assignedTechnician: 'Ahmad' },
  ] as Alarm[],

  // SUPPLIERS
  SUPPLIERS: [
    { id: 'SUP-01', name: 'Nestle Products Sdn Bhd', contactPerson: 'Pn. Rohana', phone: '03-7965 6000', email: 'orders@nestle.com', rating: 5, leadTimeDays: 3 },
    { id: 'SUP-02', name: 'F&N Beverages Marketing', contactPerson: 'Mr. Tan', phone: '03-9235 2355', email: 'sales@fn.com.my', rating: 5, leadTimeDays: 2 },
    { id: 'SUP-03', name: 'Etika Sdn Bhd (Pepsi)', contactPerson: 'David Lee', phone: '03-8765 4321', email: 'sales@etika.com.my', rating: 4, leadTimeDays: 4 },
    { id: 'SUP-04', name: 'Munchys / Mondelez', contactPerson: 'Sarah Wong', phone: '03-1122 3344', email: 'orders@mondelez.com', rating: 4, leadTimeDays: 5 },
  ] as Supplier[],

  // COMMODITIES (Mapping Cost Price from User Data)
  // This enables the P&L (Financials) to work accurately.
  COMMODITIES: [
    { sku: 'SLOT01', name: 'Maggi Instant Noodles Big Curry (5x111g)', supplierId: 'SUP-01', costPrice: 1.30, retailPrice: 3.50, marginPct: 169.23, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT02', name: 'Maggi Cup Kari 58g', supplierId: 'SUP-01', costPrice: 2.13, retailPrice: 4.50, marginPct: 111.27, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT03', name: 'Samyang Hot Chicken Ramen Cheese', supplierId: 'SUP-04', costPrice: 4.18, retailPrice: 8.00, marginPct: 91.39, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT04', name: 'F&N SEASONS Soya Bean 250ml', supplierId: 'SUP-02', costPrice: 0.70, retailPrice: 2.50, marginPct: 259.71, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT05', name: 'Seasons Drinks Ice Lemon Tea', supplierId: 'SUP-02', costPrice: 0.70, retailPrice: 2.50, marginPct: 257.14, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT06', name: 'Wonda Coffee Latte 240ml', supplierId: 'SUP-03', costPrice: 1.98, retailPrice: 4.50, marginPct: 127.38, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT07', name: 'Wonda Coffee Mocha 240ml', supplierId: 'SUP-03', costPrice: 1.98, retailPrice: 4.50, marginPct: 127.27, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT08', name: 'NESCAFE Original Milk Coffee 240ml', supplierId: 'SUP-01', costPrice: 2.03, retailPrice: 4.50, marginPct: 121.67, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT09', name: 'F&N TEH TARIK ORI 240ML', supplierId: 'SUP-02', costPrice: 2.16, retailPrice: 4.50, marginPct: 108.33, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT10', name: '100PLUS Original 325ml', supplierId: 'SUP-02', costPrice: 1.14, retailPrice: 3.50, marginPct: 207.21, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT11', name: 'OLIGO Belgian Cocoa 240ml', supplierId: 'SUP-02', costPrice: 2.16, retailPrice: 3.60, marginPct: 66.67, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT12', name: 'NESTLE Milo Activ-Go UHT 200ml', supplierId: 'SUP-01', costPrice: 1.37, retailPrice: 2.80, marginPct: 104.38, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT13', name: 'OREO', supplierId: 'SUP-04', costPrice: 0.87, retailPrice: 2.00, marginPct: 129.89, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT14', name: 'Sunquick Air 115ml', supplierId: 'SUP-02', costPrice: 0.67, retailPrice: 2.50, marginPct: 273.13, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT15', name: 'Goodday Chocolate/FullCream 200ml', supplierId: 'SUP-03', costPrice: 1.45, retailPrice: 2.80, marginPct: 93.10, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT16', name: 'Spritzer Mineral Water 550ml', supplierId: 'SUP-02', costPrice: 1.04, retailPrice: 2.50, marginPct: 140.38, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT17', name: 'Pepsi Original 320ml', supplierId: 'SUP-03', costPrice: 1.07, retailPrice: 3.00, marginPct: 180.37, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT18', name: 'Mountain Dew 320ml', supplierId: 'SUP-03', costPrice: 1.07, retailPrice: 3.00, marginPct: 180.37, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT19', name: 'Coca Cola 320ml', supplierId: 'SUP-02', costPrice: 1.37, retailPrice: 3.50, marginPct: 155.47, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT20', name: 'Kickapoo 320ml', supplierId: 'SUP-03', costPrice: 1.07, retailPrice: 3.00, marginPct: 180.37, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT21', name: '7 Up 320ml', supplierId: 'SUP-03', costPrice: 1.07, retailPrice: 3.00, marginPct: 180.37, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT22', name: 'Pepsi Zero 320ml', supplierId: 'SUP-03', costPrice: 1.07, retailPrice: 3.00, marginPct: 180.37, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT23', name: 'Nips', supplierId: 'SUP-04', costPrice: 2.79, retailPrice: 3.80, marginPct: 36.20, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT24', name: 'Chipsmore Mini campur flavour 72G', supplierId: 'SUP-04', costPrice: 2.30, retailPrice: 3.30, marginPct: 43.48, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT25', name: 'Biskut tiger Susu Mini 75G', supplierId: 'SUP-04', costPrice: 1.25, retailPrice: 2.30, marginPct: 84.00, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT26', name: 'Instant spagetti Mix Flavour 75G', supplierId: 'SUP-04', costPrice: 1.30, retailPrice: 3.50, marginPct: 169.23, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT27', name: 'Ombak Natural Mineral Water 500ML', supplierId: 'SUP-02', costPrice: 0.41, retailPrice: 2.00, marginPct: 390.20, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT28', name: 'Biskut Munchys Lexus 418G', supplierId: 'SUP-04', costPrice: 0.86, retailPrice: 1.90, marginPct: 120.01, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT29', name: 'NABATI Wafer Mix Flavour', supplierId: 'SUP-04', costPrice: 0.49, retailPrice: 1.60, marginPct: 223.62, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT30', name: 'Tropicana Twister Oren 355ml', supplierId: 'SUP-03', costPrice: 2.04, retailPrice: 3.50, marginPct: 71.78, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT31', name: 'Vida Vit C Lemon 1000mg 325ml', supplierId: 'SUP-02', costPrice: 2.24, retailPrice: 4.50, marginPct: 100.89, lastOrderDate: '2024-05-01' },
    { sku: 'SLOT32', name: 'Cocopie', supplierId: 'SUP-04', costPrice: 0.87, retailPrice: 2.00, marginPct: 129.89, lastOrderDate: '2024-05-01' },
  ]
};

export const getProductConfig = (slotId: string) => {
  return VM_CONFIG.SLOTS.find(s => s.id === slotId);
};

export const TRANSLATIONS = {
  en: {
    dashboard: "Overview",
    status: "Machine Status",
    alarms: "Alarm Center",
    inventory: "Machine Stock",
    logistics: "Logistics & Route",
    warehouse: "Warehouse",
    planogram: "Visual Planogram",
    suppliers: "Suppliers & Cost",
    compliance: "LHDN & Tax",
    history: "Transactions",
    financials: "Financial Reports",
    simulator: "Payment Simulator",
    settings: "Super Settings",
    ops: "Operations",
    finance: "Finance & Admin",
    dev: "Development",
    welcome: "VMSRBE Mobile",
    sync: "Last synced",
    logout: "Logout"
  },
  bm: {
    dashboard: "Gambaran Keseluruhan",
    status: "Status Mesin",
    alarms: "Pusat Amaran",
    inventory: "Stok Mesin",
    logistics: "Logistik & Laluan",
    warehouse: "Gudang",
    planogram: "Planogram Visual",
    suppliers: "Pembekal & Kos",
    compliance: "LHDN & Cukai",
    history: "Transaksi",
    financials: "Laporan Kewangan",
    simulator: "Simulator Bayaran",
    settings: "Super Settings",
    ops: "Operasi",
    finance: "Kewangan & Admin",
    dev: "Pembangunan",
    welcome: "Aplikasi VMSRBE",
    sync: "Segerak terakhir",
    logout: "Log Keluar"
  }
};
