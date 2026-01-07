import { ProductSlot, Transaction, IPay88CallbackData, WarehouseItem, PurchaseOrder, ServiceTicket, Alarm, Machine, User, AuditLog, ProductCost } from '../types';
import { VM_CONFIG } from '../lib/vm-config';
import { constructResponseSignature, generateSignature } from './crypto';
import * as TCN from './tcn';
import { supabase } from '../lib/supabase'; 

const STORAGE_KEYS = {
  STOCK_COUNTS: 'vmms_stock_counts',
  PRICES: 'vmms_prices',
  NAMES: 'vmms_names',
  TRANSACTIONS: 'vmms_transactions',
  WAREHOUSE: 'vmms_warehouse',
  POS: 'vmms_purchase_orders',
  TICKETS: 'vmms_service_tickets',
  ALARMS: 'vmms_alarms',
  MACHINES: 'vmms_machines',
  USERS: 'vmms_users_V2',         
  AUDIT_LOGS: 'vmms_audit_logs',
  SALES_TODAY: 'vmms_sales_today',      
  TX_RECENT: 'vmms_transactions_recent',
  PRODUCT_COSTS: 'vmms_product_costs_master' // <--- KEY BARU UNTUK KOS
};

// INITIAL SEED MACHINES
const INITIAL_MACHINES: Machine[] = [
  { id: 'VM-1001', name: 'KPTM Bangi - Lobby', group: 'KPTM Bangi', signal: 4, temp: 4, status: 'ONLINE', door: 'CLOSED', bill: 'OK', coin: 'OK', card: 'OK', stock: 85, lastSync: 'Just now' },
  { id: 'VM-1002', name: 'KPTM Bangi - Hostel A', group: 'KPTM Bangi', signal: 3, temp: 5, status: 'ONLINE', door: 'CLOSED', bill: 'OK', coin: 'LOW', card: 'OK', stock: 42, lastSync: '2 mins ago' },
  { id: 'VM-2001', name: 'UPTM Cheras - Main Hall', group: 'UPTM Cheras', signal: 5, temp: 3, status: 'ONLINE', door: 'CLOSED', bill: 'OK', coin: 'OK', card: 'OK', stock: 92, lastSync: '1 min ago' },
  { id: 'VM-2002', name: 'UPTM Cheras - Library', group: 'UPTM Cheras', signal: 0, temp: 0, status: 'OFFLINE', door: 'CLOSED', bill: 'UNKNOWN', coin: 'UNKNOWN', card: 'UNKNOWN', stock: 0, lastSync: '5 hours ago' },
  { id: 'VM-3001', name: 'Rozita HQ - Pantry', group: 'HQ', signal: 5, temp: 12, status: 'ERROR', door: 'OPEN', bill: 'JAMMED', coin: 'OK', card: 'OK', stock: 60, lastSync: '10 mins ago' },
  { id: 'VM-4005', name: 'LRT Station - Entrance', group: 'Public', signal: 2, temp: 6, status: 'ONLINE', door: 'CLOSED', bill: 'OK', coin: 'OK', card: 'ERR', stock: 15, lastSync: '5 mins ago' },
];

// INITIAL USERS
const INITIAL_USERS: any[] = [
  { id: 1, username: 'admin', password: 'admin123', name: 'Super Admin', role: 'super_admin', email: 'admin@vmms.local', isActive: true, status: 'active' },
  { id: 2, username: 'manager', password: 'manager123', name: 'Hafiz Manager', role: 'manager', email: 'manager@vmms.local', isActive: true, status: 'active' },
];

// --- CLOUD SYNC HELPERS ---

const pushToCloud = async (key: string, data: any) => {
  try {
    const { error } = await supabase
      .from('kv_store')
      .upsert({ key, value: data }, { onConflict: 'key' });
    
    if (error) console.error(`[CLOUD] Sync Error (${key}):`, error.message);
  } catch (err) {
    console.error(`[CLOUD] Sync Failed (${key}):`, err);
  }
};

export const syncFromCloud = async () => {
  try {
    console.log("☁️ Syncing with Cloud Database...");
    const { data, error } = await supabase.from('kv_store').select('*');
    
    if (error) throw error;

    if (data) {
      data.forEach(row => {
        if (row.value) {
            localStorage.setItem(row.key, JSON.stringify(row.value));
        }
      });
      console.log("✅ Sync Complete!");
    }
  } catch (err) {
    console.error("❌ Sync Error (Using Offline Data):", err);
  }
};

export const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  const event = new CustomEvent('vmms-toast', { detail: { message, type } });
  window.dispatchEvent(event);
};

export const logAction = (actor: string, action: string, details: string) => {
  const logsData = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
  const logs: AuditLog[] = logsData ? JSON.parse(logsData) : [];
  
  const newLog: AuditLog = {
    id: `LOG-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    details
  };
  
  logs.unshift(newLog);
  if (logs.length > 1000) logs.pop();
  
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  pushToCloud(STORAGE_KEYS.AUDIT_LOGS, logs); 
};

// --- 🧠 AI FUZZY LOGIC & PRODUCT COST ENGINE (NEW) ---

// Algoritma Levenshtein Distance (Ukur persamaan ejaan)
const getSimilarity = (s1: string, s2: string): number => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  
  const costs = new Array();
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i == 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longer.length - costs[shorter.length]) / parseFloat(longer.length);
}

// Fungsi Mencari Kos Paling Padan
export const findProductCost = (txName: string): ProductCost | null => {
  const data = localStorage.getItem(STORAGE_KEYS.PRODUCT_COSTS);
  if (!data) return null;
  
  const products: ProductCost[] = JSON.parse(data);
  const cleanTxName = txName.toLowerCase().replace(/[^a-z0-9]/g, '');

  let bestMatch: ProductCost | null = null;
  let highestScore = 0;

  products.forEach(p => {
    const cleanPName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Kira skor persamaan
    const score = getSimilarity(cleanTxName, cleanPName);
    
    // Simpan skor tertinggi
    if (score > highestScore) {
      highestScore = score;
      bestMatch = p;
    }
  });

  // Threshold: Kalau persamaan lebih 40%, kita anggap match.
  if (highestScore > 0.4) { 
    return bestMatch;
  }
  
  return null;
};

// Simpan Master List (Dari Excel Tuan)
export const saveProductMasterList = (products: ProductCost[]) => {
  localStorage.setItem(STORAGE_KEYS.PRODUCT_COSTS, JSON.stringify(products));
  pushToCloud(STORAGE_KEYS.PRODUCT_COSTS, products); // Sync ke Cloud juga
  console.log(`✅ Saved ${products.length} products to Master Cost DB`);
};

export const getProductMasterList = (): ProductCost[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCT_COSTS);
    return data ? JSON.parse(data) : [];
};

// --- INITIALIZATION ---
export const initDB = async () => {
  if (!localStorage.getItem(STORAGE_KEYS.STOCK_COUNTS)) {
    const initialStockMap: Record<string, number> = {};
    VM_CONFIG.SLOTS.forEach(slot => {
      initialStockMap[slot.id] = slot.initialStock;
    });
    localStorage.setItem(STORAGE_KEYS.STOCK_COUNTS, JSON.stringify(initialStockMap));
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.MACHINES)) {
    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(INITIAL_MACHINES));
  }

  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.PRICES)) {
    const initialPriceMap: Record<string, number> = {};
    VM_CONFIG.SLOTS.forEach(slot => {
      initialPriceMap[slot.id] = slot.price;
    });
    localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(initialPriceMap));
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.NAMES)) {
    const initialNameMap: Record<string, string> = {};
    VM_CONFIG.SLOTS.forEach(slot => {
      initialNameMap[slot.id] = slot.name;
    });
    localStorage.setItem(STORAGE_KEYS.NAMES, JSON.stringify(initialNameMap));
  }

  if (!localStorage.getItem(STORAGE_KEYS.WAREHOUSE)) {
    localStorage.setItem(STORAGE_KEYS.WAREHOUSE, JSON.stringify(VM_CONFIG.WAREHOUSE));
  }

  if (!localStorage.getItem(STORAGE_KEYS.ALARMS)) {
    localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(VM_CONFIG.ALARMS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.PRODUCT_COSTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCT_COSTS, JSON.stringify([]));
  }

  await syncFromCloud();
};

export const syncInitialFromTCN = async (days = 30) => {
  try {
    const sessionResp = await fetch('/session.json', { cache: 'no-store' });
    if (!sessionResp.ok) return false;

    const sessionJson = await sessionResp.json();
    if (!sessionJson?.cookie) return false;

    const machinesResult = await TCN.fetchLiveMachineStatus();
    if (machinesResult.success) {
      localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(machinesResult.data));
    }

    const salesResult = await TCN.fetchSalesHistory(days);
    if (salesResult.success) {
      const txs = salesResult.transactions || [];
      txs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));

      const salesData = {
        total: salesResult.totalSalesToday,
        count: txs.filter(t => new Date(t.timestamp).toDateString() === new Date().toDateString()).length,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.SALES_TODAY, JSON.stringify(salesData));
    }

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('vmms:txs-updated'));

    return true;
  } catch (e: any) {
    console.error('[DB] Error syncing from TCN:', e);
    return false;
  }
};

// --- MACHINES ---
export const getMachines = (): Machine[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MACHINES);
  return data ? JSON.parse(data) : INITIAL_MACHINES;
};

export const updateMachineStatus = (id: string, updates: Partial<Machine>) => {
  const machines = getMachines();
  const updated = machines.map(m => m.id === id ? { ...m, ...updates, lastSync: 'Just now' } : m);
  localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(updated));
  return updated;
};

// --- WAREHOUSE OPERATIONS ---
export const getWarehouseInventory = (): WarehouseItem[] => {
  const data = localStorage.getItem(STORAGE_KEYS.WAREHOUSE);
  return data ? JSON.parse(data) : VM_CONFIG.WAREHOUSE;
};

export const transferStock = (sku: string, from: 'HQ' | 'TRUCK', to: 'HQ' | 'TRUCK', qty: number): boolean => {
  try {
    const items = getWarehouseInventory();
    const idx = items.findIndex(i => i.sku === sku);
    if (idx === -1) return false;

    const item = items[idx];
    if (from === 'HQ') {
       if (item.hqStock < qty) { notify("Insufficient stock in HQ!", 'error'); return false; }
       item.hqStock -= qty;
       item.truckStock += qty;
    } else {
       if (item.truckStock < qty) { notify("Insufficient stock in Truck!", 'error'); return false; }
       item.truckStock -= qty;
       item.hqStock += qty;
    }

    items[idx] = item;
    localStorage.setItem(STORAGE_KEYS.WAREHOUSE, JSON.stringify(items));
    pushToCloud(STORAGE_KEYS.WAREHOUSE, items); 

    logAction('admin', 'TRANSFER_STOCK', `Moved ${qty} of ${sku} from ${from} to ${to}`);
    notify(`Successfully transferred ${qty} units.`, 'success');
    return true;
  } catch (e) {
    return false;
  }
};

// --- PURCHASE ORDERS ---
export const getPurchaseOrders = (): PurchaseOrder[] => {
  const data = localStorage.getItem(STORAGE_KEYS.POS);
  return data ? JSON.parse(data) : [];
};

export const createPurchaseOrder = (po: PurchaseOrder) => {
  const pos = getPurchaseOrders();
  pos.unshift(po);
  localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(pos));
  pushToCloud(STORAGE_KEYS.POS, pos); 

  logAction('admin', 'CREATE_PO', `Created PO ${po.id} for ${po.supplierName}`);
  notify(`PO #${po.id} created for ${po.supplierName}`, 'success');
};

// --- ALARMS & TICKETS ---
export const getAlarms = (): Alarm[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ALARMS);
  return data ? JSON.parse(data) : VM_CONFIG.ALARMS;
};

export const updateAlarmStatus = (alarmId: string, status: 'OPEN' | 'RESOLVED', tech?: string, note?: string) => {
  const alarms = getAlarms();
  const updated = alarms.map(a => a.id === alarmId ? { ...a, status, assignedTechnician: tech, resolutionNote: note } : a);
  localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(updated));
  pushToCloud(STORAGE_KEYS.ALARMS, updated); 

  logAction(tech || 'admin', 'UPDATE_ALARM', `Alarm ${alarmId} set to ${status}`);
  notify(`Alarm ${alarmId} updated to ${status}`, 'success');
};

export const createServiceTicket = (ticket: ServiceTicket) => {
  const ticketsData = localStorage.getItem(STORAGE_KEYS.TICKETS);
  const tickets: ServiceTicket[] = ticketsData ? JSON.parse(ticketsData) : [];
  tickets.unshift(ticket);
  localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  pushToCloud(STORAGE_KEYS.TICKETS, tickets); 
  
  updateAlarmStatus(ticket.alarmId, 'OPEN', ticket.technician);
  logAction('admin', 'DISPATCH_TECH', `Ticket ${ticket.id} assigned to ${ticket.technician}`);
  notify(`Ticket #${ticket.id} dispatched to ${ticket.technician}`, 'success');
};

// --- USER MANAGEMENT ---
export const getUsers = (): any[] => {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!data) return INITIAL_USERS;
  try {
    const users = JSON.parse(data);
    return Array.isArray(users) ? users : INITIAL_USERS;
  } catch(e) { return INITIAL_USERS; }
};

export const saveUser = (user: User) => {
  let users = getUsers();
  const existingIdx = users.findIndex((u:any) => u.id === user.id);
  
  if (existingIdx >= 0) {
    users[existingIdx] = user;
    logAction('admin', 'UPDATE_USER', `Updated user ${user.username}`);
  } else {
    if (!user.id) user.id = `U-${Date.now()}`;
    users.push(user);
    logAction('admin', 'CREATE_USER', `Created user ${user.username}`);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  pushToCloud(STORAGE_KEYS.USERS, users); 
  return true;
};

export const authenticateUser = (username: string, pass: string) => {
  const users = getUsers();
  return users.find((u: any) => u.username === username && u.password === pass);
};

export const addUser = (user: any) => {
  const users = getUsers();
  const maxId = users.length > 0 ? Math.max(...users.map((u:any) => parseInt(String(u.id)) || 0)) : 0;
  const newId = maxId + 1;
  
  const newUser = { ...user, id: newId, email: user.email || `${user.username}@vmms.local`, status: 'active' };
  
  users.push(newUser);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  pushToCloud(STORAGE_KEYS.USERS, users); 
  
  logAction('admin', 'ADD_USER', `Added new user ${user.username}`);
  return newUser;
};

export const deleteUser = (userId: string | number) => {
  let users = getUsers();
  const initialLength = users.length;
  users = users.filter((u:any) => String(u.id) !== String(userId));
  
  if (users.length < initialLength) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      pushToCloud(STORAGE_KEYS.USERS, users); 
      logAction('admin', 'DELETE_USER', `Deleted user ID ${userId}`);
      return true;
  }
  return false;
};

export const getAuditLogs = (): AuditLog[] => {
  const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
  return data ? JSON.parse(data) : [];
};

// --- CORE OPERATIONS ---
export const getInventory = (): ProductSlot[] => {
  const stockData = localStorage.getItem(STORAGE_KEYS.STOCK_COUNTS);
  const stockMap: Record<string, number> = stockData ? JSON.parse(stockData) : {};
  const priceData = localStorage.getItem(STORAGE_KEYS.PRICES);
  const priceMap: Record<string, number> = priceData ? JSON.parse(priceData) : {};
  const nameData = localStorage.getItem(STORAGE_KEYS.NAMES);
  const nameMap: Record<string, string> = nameData ? JSON.parse(nameData) : {};

  return VM_CONFIG.SLOTS.map(config => ({
    id: config.id,
    name: nameMap[config.id] || config.name,
    price: priceMap[config.id] !== undefined ? priceMap[config.id] : config.price, 
    maxCapacity: config.maxCapacity,
    currentStock: stockMap[config.id] !== undefined ? stockMap[config.id] : config.initialStock,
    expiryDate: config.expiryDate
  }));
};

export const updateProductPrice = (slotId: string, newPrice: number): boolean => {
  try {
    const priceData = localStorage.getItem(STORAGE_KEYS.PRICES);
    const priceMap: Record<string, number> = priceData ? JSON.parse(priceData) : {};
    priceMap[slotId] = newPrice;
    localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(priceMap));
    pushToCloud(STORAGE_KEYS.PRICES, priceMap); 

    logAction('admin', 'UPDATE_PRICE', `Updated ${slotId} to RM${newPrice}`);
    return true;
  } catch (e) { return false; }
};

export const updateSlotConfig = (slotId: string, updates: { name?: string, price?: number, currentStock?: number }): boolean => {
  try {
    if (updates.price !== undefined) updateProductPrice(slotId, updates.price);

    if (updates.currentStock !== undefined) {
       const stockData = localStorage.getItem(STORAGE_KEYS.STOCK_COUNTS);
       const stockMap: Record<string, number> = stockData ? JSON.parse(stockData) : {};
       stockMap[slotId] = updates.currentStock;
       
       localStorage.setItem(STORAGE_KEYS.STOCK_COUNTS, JSON.stringify(stockMap));
       pushToCloud(STORAGE_KEYS.STOCK_COUNTS, stockMap); 
       logAction('admin', 'UPDATE_STOCK', `Updated ${slotId} stock to ${updates.currentStock}`);
    }

    if (updates.name !== undefined) {
       const nameData = localStorage.getItem(STORAGE_KEYS.NAMES);
       const nameMap: Record<string, string> = nameData ? JSON.parse(nameData) : {};
       nameMap[slotId] = updates.name;
       
       localStorage.setItem(STORAGE_KEYS.NAMES, JSON.stringify(nameMap));
       pushToCloud(STORAGE_KEYS.NAMES, nameMap); 
       logAction('admin', 'UPDATE_NAME', `Updated ${slotId} name to ${updates.name}`);
    }
    notify(`Slot ${slotId} updated.`, 'success');
    return true;
  } catch (e) { return false; }
};

export const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return data ? JSON.parse(data) : [];
};

export const saveTransaction = (tx: Transaction) => {
    const transactions = getTransactions();
    transactions.unshift(tx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    pushToCloud(STORAGE_KEYS.TRANSACTIONS, transactions); 
}

export const saveBulkTransactions = (newTxs: Transaction[]) => {
  const currentTxs = getTransactions();
  const updatedTxs = [...newTxs, ...currentTxs];
  
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTxs));
  pushToCloud(STORAGE_KEYS.TRANSACTIONS, updatedTxs); 
  
  return updatedTxs.length;
};

export const saveBulkStock = (stockUpdates: Record<string, number>) => {
  const stockData = localStorage.getItem(STORAGE_KEYS.STOCK_COUNTS);
  const stockMap: Record<string, number> = stockData ? JSON.parse(stockData) : {};
  
  Object.keys(stockUpdates).forEach(slotId => {
      stockMap[slotId] = stockUpdates[slotId];
  });
  
  localStorage.setItem(STORAGE_KEYS.STOCK_COUNTS, JSON.stringify(stockMap));
  pushToCloud(STORAGE_KEYS.STOCK_COUNTS, stockMap); 
};

export const mergeTransactions = (newTxs: Transaction[]) => {
  const currentTxs = getTransactions();
  const existingRefs = new Set(currentTxs.map(t => t.refNo));
  let addedCount = 0;
  
  newTxs.forEach(tx => {
    if (!existingRefs.has(tx.refNo)) {
      currentTxs.push(tx);
      addedCount++;
    }
  });

  currentTxs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(currentTxs));
  pushToCloud(STORAGE_KEYS.TRANSACTIONS, currentTxs); 
  return addedCount;
};

// --- DATA MANAGEMENT ---

export const clearSalesData = () => {
    try {
        logAction('admin', 'CLEAR_SALES', 'Cleared all transaction history');
        
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
        localStorage.removeItem(STORAGE_KEYS.SALES_TODAY);
        localStorage.removeItem(STORAGE_KEYS.TX_RECENT);
        
        pushToCloud(STORAGE_KEYS.TRANSACTIONS, []); 
        
        console.log("Sales history cleared from Local & Cloud.");
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const resetProductData = () => {
    try {
        logAction('admin', 'RESET_PRODUCTS', 'Reset products to factory default');
        const initialStockMap: Record<string, number> = {};
        const initialPriceMap: Record<string, number> = {};
        const initialNameMap: Record<string, string> = {};

        VM_CONFIG.SLOTS.forEach(slot => {
          initialStockMap[slot.id] = slot.initialStock;
          initialPriceMap[slot.id] = slot.price;
          initialNameMap[slot.id] = slot.name;
        });

        localStorage.setItem(STORAGE_KEYS.STOCK_COUNTS, JSON.stringify(initialStockMap));
        localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(initialPriceMap));
        localStorage.setItem(STORAGE_KEYS.NAMES, JSON.stringify(initialNameMap));
        
        pushToCloud(STORAGE_KEYS.STOCK_COUNTS, initialStockMap);
        pushToCloud(STORAGE_KEYS.PRICES, initialPriceMap);
        pushToCloud(STORAGE_KEYS.NAMES, initialNameMap);

        console.log("Product data reset to default.");
        return true;
    } catch (e) { return false; }
};

export const resetDatabase = () => {
  try {
    logAction('admin', 'SYSTEM_RESET', 'Database reset to empty state');

    const keysToReset = [
      STORAGE_KEYS.TRANSACTIONS, 
      STORAGE_KEYS.AUDIT_LOGS,   
      STORAGE_KEYS.SALES_TODAY, 
      STORAGE_KEYS.POS,          
      STORAGE_KEYS.TICKETS,
      STORAGE_KEYS.PRODUCT_COSTS // Reset Master Data juga jika perlu bersih
    ];
    
    keysToReset.forEach(key => localStorage.removeItem(key));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
    
    pushToCloud(STORAGE_KEYS.TRANSACTIONS, []);
    pushToCloud(STORAGE_KEYS.AUDIT_LOGS, []);
    pushToCloud(STORAGE_KEYS.POS, []);
    pushToCloud(STORAGE_KEYS.TICKETS, []);
    pushToCloud(STORAGE_KEYS.PRODUCT_COSTS, []);
    
    resetProductData();

    localStorage.setItem(STORAGE_KEYS.MACHINES, JSON.stringify(INITIAL_MACHINES));
    
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    pushToCloud(STORAGE_KEYS.USERS, INITIAL_USERS); 

    console.log("Database & Cloud reset to EMPTY state.");
    return true;
  } catch (error) {
    console.error("Failed to reset database:", error);
    return false;
  }
};

export const resetDB = resetDatabase;

export const processBackendCallback = async (data: IPay88CallbackData): Promise<{ success: boolean; message: string }> => {
  const sourceString = constructResponseSignature(
    VM_CONFIG.MERCHANT.KEY,
    data.merchantCode,
    data.paymentId,
    data.refNo,
    data.amount,
    data.currency,
    data.status
  );

  const calculatedSignature = await generateSignature(sourceString, VM_CONFIG.MERCHANT.KEY);
  
  if (calculatedSignature !== data.signature) {
    return { success: false, message: "Signature verification failed" };
  }

  if (data.status !== "1") {
    return { success: false, message: "Payment failed status" };
  }

  const parts = data.refNo.split('-');
  const slotId = parts.find(p => p.startsWith('SLOT'));
  const productConfig = VM_CONFIG.SLOTS.find(s => s.id === slotId);

  if (!slotId || !productConfig) {
    return { success: false, message: `Invalid Slot ID: ${slotId}` };
  }

  const stockData = localStorage.getItem(STORAGE_KEYS.STOCK_COUNTS);
  const stockMap: Record<string, number> = stockData ? JSON.parse(stockData) : {};
  const currentStock = stockMap[slotId] !== undefined ? stockMap[slotId] : productConfig.initialStock;

  if (currentStock <= 0) {
    return { success: false, message: "Out of stock" };
  }

  stockMap[slotId] = currentStock - 1;
  localStorage.setItem(STORAGE_KEYS.STOCK_COUNTS, JSON.stringify(stockMap));
  pushToCloud(STORAGE_KEYS.STOCK_COUNTS, stockMap); 

  const newTransaction: Transaction = {
    id: crypto.randomUUID(),
    refNo: data.refNo,
    paymentId: data.paymentId,
    productName: productConfig.name,
    slotId: productConfig.id,
    amount: parseFloat(data.amount),
    currency: data.currency,
    status: 'SUCCESS',
    paymentMethod: 'E-Wallet',
    timestamp: new Date().toISOString()
  };

  saveTransaction(newTransaction);

  return { success: true, message: "RECEIVEOK" };
};