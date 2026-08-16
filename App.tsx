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

import { 
  LayoutDashboard, Package, List, RefreshCw, Trash2, ShieldCheck, 
  Map, Truck, Building2, FileText, UserCircle, CreditCard, Scan, 
  LogOut, Monitor, Bell, BarChart3, X, Settings, Users, ChevronDown,
  Layers, Sliders, Activity, Database, Menu
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
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);
  const { transactions, loading, lastUpdated, refresh } = useTransactionSync([]);
  const [inventory, setInventory] = useState<ProductSlot[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    initDB();
    getInventory().then(data => setInventory(data));
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
  const fetchData = async () => {
    const inv = await getInventory();
    setInventory(inv);
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

  const NavItem = ({ id, icon: Icon, label, badge }: { id: string; icon: any; label: string; badge?: string }) => {
    if (!checkPermission(id)) return null;
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
          isActive 
            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon size={16} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
          <span>{label}</span>
        </div>
        {badge && (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono-code bg-slate-800 text-slate-400">
            {badge}
          </span>
        )}
      </button>
    );
  };

  // --- JIKA BELUM LOGIN ---
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // --- MAIN APP ---
  return (
    <div className="flex h-screen bg-[#090D16] overflow-hidden font-sans text-slate-100">
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0C1220] border-r border-slate-800/80 text-white transform transition-transform duration-200 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header Logo */}
        <div className="h-14 px-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Activity size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                VMMS <span className="text-[10px] font-medium px-1.5 py-0.2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">OPS</span>
              </div>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
          
          {/* Group: Core */}
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">
              Operations
            </div>
            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem id="status" icon={Monitor} label="Fleet Telemetry" />
            <NavItem id="inventory" icon={Package} label="Slot Inventory" />
            <NavItem id="alarms" icon={Bell} label="Alarms & Tickets" />
          </div>

          {/* Group: Analytics */}
          <div className="space-y-1">
            <button
              onClick={() => setIsAnalyticsOpen(prev => !prev)}
              className="w-full flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1 hover:text-slate-300"
            >
              <span>Analytics & Finance</span>
              <ChevronDown size={12} className={`transform transition-transform ${isAnalyticsOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isAnalyticsOpen && (
              <div className="space-y-1 pl-1">
                <NavItem id="sales_analytics" icon={BarChart3} label="Sales Insights" />
                <NavItem id="history" icon={List} label="Transactions" />
                <NavItem id="financials" icon={CreditCard} label="P&L Reports" />
                <NavItem id="compliance" icon={ShieldCheck} label="Compliance" />
              </div>
            )}
          </div>
          
          {/* Group: Management (Super Admin) */}
          {userRole === 'super_admin' && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">
                Fleet Management
              </div>
              <NavItem id="planogram" icon={Layers} label="Planogram Editor" />
              <NavItem id="logistics" icon={Truck} label="Route Restocking" />
              <NavItem id="warehouse" icon={Building2} label="HQ Warehouse" />
              <NavItem id="suppliers" icon={Users} label="Suppliers & PO" />
              <NavItem id="simulator" icon={Sliders} label="Hardware Simulator" />
              <NavItem id="settings" icon={Settings} label="System Settings" />
            </div>
          )}

        </div>

        {/* --- PROFILE FOOTER --- */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-2.5 mb-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate" title={currentUser.name}>
                {currentUser.name}
              </p>
              <p className="text-[10px] text-slate-500 truncate capitalize">
                {currentUser.role.replace('_', ' ')}
              </p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400" title="Connected"></span>
          </div>
          
          <div className="flex items-center gap-1.5">
            {userRole === 'super_admin' && (
              <button 
                onClick={handleReset} 
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 border border-rose-500/20 rounded-md text-[11px] font-medium transition-colors"
                title="Reset Database"
              >
                <Trash2 size={12} /> Reset
              </button>
            )}
            
            <button 
              onClick={handleLogout} 
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-md text-[11px] font-medium transition-colors"
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto bg-[#090D16] relative custom-scrollbar flex flex-col">
        
        {/* Floating AI */}
        <div className="fixed bottom-6 right-6 z-30">
          <AiAssistant 
            inventory={inventory} 
            transactions={transactions} 
            alarms={VM_CONFIG.ALARMS} 
          />
        </div>

        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800/80 px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 hover:bg-slate-800 rounded-md text-slate-400">
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">VMMS</span>
              <span className="text-slate-600">/</span>
              <span className="font-semibold text-slate-200 capitalize">{activeTab.replace('_', ' ')}</span>
              {loading && <span className="text-xs font-normal text-blue-400 animate-pulse">(Syncing...)</span>}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={fetchData} 
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors" 
              title="Sync Telemetry"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-blue-400' : ''} />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1"></div>

            <div className="text-[11px] text-slate-400 px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono-code">
              {lastUpdated ? lastUpdated.toLocaleTimeString('en-MY', { hour12: false }) : 'Live'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 max-w-7xl mx-auto w-full flex-1">
          
          {activeTab === 'dashboard' && (
            <Dashboard
              transactions={transactions}
              onDataImported={userRole === 'super_admin' ? handleSmartImport : undefined}
            />
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

export default App;