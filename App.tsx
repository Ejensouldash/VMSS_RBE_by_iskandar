import React, { useEffect, useState } from 'react';
import { initDB, getInventory, resetDB } from './services/db';
import { ProductSlot, Transaction } from './types';
import { VM_CONFIG } from './lib/vm-config';

// Hook Sync
import { useTransactionSync } from './hooks/useTransactionSync';

// Components
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Transactions from './components/Transactions';
import RoutePlanning from './components/RoutePlanning';
import Compliance from './components/Compliance';
import Warehouse from './components/Warehouse';
import Simulator from './components/Simulator';
import Planogram from './components/Planogram';
import StatusMonitoring from './components/StatusMonitoring';
import Alarms from './components/Alarms';
import Suppliers from './components/Suppliers';
import Financials from './components/Financials';
import SalesAnalytics from './components/SalesAnalytics';
import AiAssistant from './components/AiAssistant';
import SuperSettings from './components/SuperSettings';
import Login from './components/Login'; 

// Smart Import
import SmartExcelImport from './components/SmartExcelImport'; 

import { 
  LayoutDashboard, Package, List, RefreshCw, Trash2, ShieldCheck, 
  Map, Truck, Building2, FileText, UserCircle, CreditCard, Scan, 
  LogOut, Monitor, Bell, BarChart3, X, Settings, Users, ChevronDown
} from 'lucide-react';

// Definisi Data User
interface UserData {
  id: string;
  name: string;
  role: 'super_admin' | 'manager';
  email: string;
}

const SESSION_KEY = 'vmms_current_session';

const App: React.FC = () => {
  // --- AUTH STATE (DENGAN AUTO-LOGIN) ---
  const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    return savedSession ? JSON.parse(savedSession) : null;
  });

  // --- APP STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const { transactions, loading, lastUpdated, refresh } = useTransactionSync([]);
  const [inventory, setInventory] = useState<ProductSlot[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    initDB();
    setInventory(getInventory());
  }, []);

  // --- LOGIN HANDLER ---
  const handleLogin = (user: UserData) => {
    setCurrentUser(user); 
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setActiveTab('dashboard'); 
  };

  // --- LOGOUT HANDLER ---
  const handleLogout = () => {
    if (confirm('Anda pasti ingin log keluar?')) {
      localStorage.removeItem(SESSION_KEY);
      setCurrentUser(null);
      setActiveTab('dashboard');
    }
  };

  const userRole = currentUser?.role || 'manager'; 

  // --- DATA HANDLERS ---
  const fetchData = () => {
    setInventory(getInventory());
    refresh(); 
  };

  const handleSmartImport = (importedTransactions: Transaction[], updatedInventory: ProductSlot[]) => {
    setInventory(updatedInventory);
    refresh(); 
    setActiveTab('dashboard');
  };

  const handleReset = () => {
    if (confirm('AMARAN: Ini akan memadam SEMUA data transaksi & reset stok! Teruskan?')) {
      resetDB();
      fetchData(); 
      alert('Sistem telah di-reset ke tetapan kilang.');
    }
  };

  // Logic Permission
  const checkPermission = (tabId: string) => {
    if (userRole === 'super_admin') return true; 
    const managerAllowed = [
      'dashboard', 'status', 'inventory', 'alarms', 
      'sales_analytics', 'history', 'financials', 'compliance'
    ];
    return managerAllowed.includes(tabId);
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string; icon: any; label: string }) => {
    if (!checkPermission(id)) return null;
    return (
      <button
        onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
          activeTab === id 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Icon size={20} className={`${activeTab === id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  // --- JIKA BELUM LOGIN ---
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // --- MAIN APP ---
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header Logo */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <StoreIcon /> 
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">VMMS<span className="text-blue-500">.Pro</span></h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                {userRole === 'super_admin' ? 'Enterprise Edition' : 'Manager View'}
              </p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mb-2 mt-2">Operations</div>
          {/* SAYA DAH UBAH LABEL KE STRING BIASA SUPAYA SENTIASA KELUAR */}
          <NavItem id="dashboard" icon={LayoutDashboard} label="Overview Dashboard" />
          <NavItem id="status" icon={Monitor} label="Live Monitoring" />
          <NavItem id="inventory" icon={Package} label="Machine Stock" />
          <NavItem id="alarms" icon={Bell} label="Alarms & Tickets" />
          
          {userRole === 'super_admin' && (
            <>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mb-2 mt-6">Logistics</div>
              <NavItem id="warehouse" icon={Building2} label="Central Warehouse" />
              <NavItem id="logistics" icon={Truck} label="Route Planning" /> {/* <-- INI YANG HILANG DULU */}
              <NavItem id="suppliers" icon={UserCircle} label="Supplier PO" />
            </>
          )}

          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mb-2 mt-6">Analytics</div>
          <NavItem id="sales_analytics" icon={BarChart3} label="Sales Analytics" />
          <NavItem id="history" icon={List} label="Transaction History" /> {/* <-- INI YANG HILANG DULU */}
          <NavItem id="financials" icon={CreditCard} label="Financial Reports" />
          <NavItem id="compliance" icon={ShieldCheck} label="Audit & Compliance" />
          
          {userRole === 'super_admin' && (
            <>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mb-2 mt-6">System</div>
              <NavItem id="planogram" icon={Scan} label="Planogram Map" />
              <NavItem id="simulator" icon={RefreshCw} label="System Simulator" />
              <NavItem id="settings" icon={Settings} label="Super Settings" />
            </>
          )}
        </div>

        {/* --- PROFILE SECTION --- */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${
                userRole === 'super_admin' ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : 'bg-gradient-to-br from-blue-400 to-indigo-600'
            }`}>
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate" title={currentUser.name}>
                {currentUser.name}
              </p>
              <p className="text-xs text-slate-400 truncate" title={currentUser.email}>
                {currentUser.email}
              </p>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {userRole === 'super_admin' ? (
                <button 
                  onClick={handleReset} 
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
                >
                  <Trash2 size={14} /> Reset
                </button>
            ) : (
                <div className="flex items-center justify-center text-xs text-slate-500 bg-slate-900 rounded-lg border border-slate-800">
                    Read Only
                </div>
            )}
            
            <button 
              onClick={handleLogout} 
              className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        
        {/* Floating AI */}
        <div className="fixed bottom-6 right-6 z-30">
          <AiAssistant 
            inventory={inventory} 
            transactions={transactions} 
            alarms={VM_CONFIG.ALARMS} 
          />
        </div>

        {/* Header Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <List size={24} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 capitalize flex items-center gap-2">
                {activeTab.replace('_', ' ')}
                {loading && <span className="text-xs font-normal text-blue-500 animate-pulse">(Syncing...)</span>}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                 ID: {currentUser.id} | {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Live'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={fetchData} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Force Sync">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            
            {/* Buang selector bahasa sebab kita dah hardcode English */}
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">
               EN (System Default)
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 max-w-7xl mx-auto">
          
          {activeTab === 'dashboard' && (
            <>
              {userRole === 'super_admin' && (
                  <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <SmartExcelImport onDataImported={handleSmartImport} />
                  </div>
              )}
              <Dashboard transactions={transactions} />
            </>
          )}

          {activeTab === 'sales_analytics' && <SalesAnalytics transactions={transactions} inventory={inventory} />}
          {activeTab === 'status' && <StatusMonitoring />} 
          {activeTab === 'alarms' && <Alarms />}
          {activeTab === 'inventory' && <Inventory slots={inventory} />}
          {activeTab === 'history' && <Transactions transactions={transactions} />}
          {activeTab === 'financials' && <Financials transactions={transactions} lang='en' />}
          {activeTab === 'compliance' && <Compliance transactions={transactions} />}

          {userRole === 'super_admin' && (
            <>
                {activeTab === 'logistics' && <RoutePlanning />}
                {activeTab === 'warehouse' && <Warehouse />}
                {activeTab === 'planogram' && <Planogram />}
                {activeTab === 'suppliers' && <Suppliers />}
                {activeTab === 'settings' && <SuperSettings user={currentUser} />} 
                {activeTab === 'simulator' && <Simulator onUpdate={fetchData} />}
            </>
          )}

        </div>
      </main>
    </div>
  );
};

const StoreIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
    <path d="M2 7h20"/>
    <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
  </svg>
);

export default App;