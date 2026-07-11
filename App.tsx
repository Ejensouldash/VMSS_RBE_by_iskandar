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
  const [isAnalyticsHovered, setIsAnalyticsHovered] = useState(false);
  const [isAnalyticsClicked, setIsAnalyticsClicked] = useState(false);
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

  const NavItem = ({ id, icon: Icon, label }: { id: string; icon: any; label: string }) => {
    if (!checkPermission(id)) return null;
    return (
      <button
        onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
          activeTab === id 
            ? 'vm-sidebar-active text-white' 
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`}
      >
        <Icon size={20} className={`${activeTab === id ? 'text-white' : 'text-slate-400 group-hover:text-cyan-300'}`} />
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
    <div className="flex h-screen bg-[#060b18] overflow-hidden font-sans">
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 vm-sidebar text-white transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header Logo */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center vm-glow-indigo relative">
              <StoreIcon />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 vm-pulse border-2 border-[#070c18]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight font-display">VMMS<span className="text-cyan-400">.Pro</span></h1>
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
          
          <NavItem id="dashboard" icon={LayoutDashboard} label="Overview Dashboard" />
          
          <div 
            className="group/analytics"
            onMouseEnter={() => setIsAnalyticsHovered(true)}
            onMouseLeave={() => setIsAnalyticsHovered(false)}
          >
            <button
              onClick={() => setIsAnalyticsClicked(prev => !prev)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                ['sales_analytics', 'history', 'financials', 'compliance'].includes(activeTab)
                  ? 'vm-sidebar-active text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <BarChart3 size={20} className={['sales_analytics', 'history', 'financials', 'compliance'].includes(activeTab) ? 'text-white' : 'text-slate-400 group-hover/analytics:text-cyan-300'} />
                <span className="font-medium">Analytics</span>
              </div>
              <ChevronDown 
                size={14} 
                className={`transform transition-transform duration-200 ${(isAnalyticsHovered || isAnalyticsClicked || ['sales_analytics', 'history', 'financials', 'compliance'].includes(activeTab)) ? 'rotate-180 text-cyan-400' : 'text-slate-500'}`} 
              />
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 pl-4 ${(isAnalyticsHovered || isAnalyticsClicked || ['sales_analytics', 'history', 'financials', 'compliance'].includes(activeTab)) ? 'max-h-[300px] opacity-100 mt-1 space-y-1' : 'max-h-0 opacity-0'}`}>
              <NavItem id="sales_analytics" icon={BarChart3} label="Sales Analytics" />
              <NavItem id="history" icon={List} label="Transaction History" />
              <NavItem id="financials" icon={CreditCard} label="Financial Reports" />
              <NavItem id="compliance" icon={ShieldCheck} label="Audit & Compliance" />
            </div>
          </div>
          
          {userRole === 'super_admin' && (
            <>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mb-2 mt-6">System</div>
              <NavItem id="settings" icon={Settings} label="Super Settings" />
            </>
          )}
        </div>

        {/* --- PROFILE SECTION --- */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${
                userRole === 'super_admin' ? 'bg-gradient-to-br from-emerald-400 to-teal-600 vm-glow-emerald' : 'bg-gradient-to-br from-indigo-400 to-cyan-600 vm-glow-indigo'
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
            <div className="h-2 w-2 rounded-full bg-emerald-400 vm-pulse"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {userRole === 'super_admin' ? (
                <button 
                  onClick={handleReset} 
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg text-xs font-medium transition-colors"
                >
                  <Trash2 size={14} /> Reset
                </button>
            ) : (
                <div className="flex items-center justify-center text-xs text-slate-500 bg-white/5 rounded-lg border border-white/10">
                    Read Only
                </div>
            )}
            
            <button 
              onClick={handleLogout} 
              className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-xs font-medium transition-colors"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto bg-[#060b18] relative custom-scrollbar">
        
        {/* Floating AI */}
        <div className="fixed bottom-6 right-6 z-30">
          <AiAssistant 
            inventory={inventory} 
            transactions={transactions} 
            alarms={VM_CONFIG.ALARMS} 
          />
        </div>

        {/* Header Bar */}
        <header className="sticky top-0 z-20 bg-[#0b1424]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg text-slate-300">
              <List size={24} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white capitalize flex items-center gap-2">
                {activeTab.replace('_', ' ')}
                {loading && <span className="text-xs font-normal text-cyan-400 animate-pulse">(Syncing...)</span>}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                 ID: {currentUser.id} | {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Live'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={fetchData} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-white/10 rounded-full transition-all" title="Force Sync">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="h-8 w-[1px] bg-white/10 mx-2"></div>

            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-slate-400">
               EN (System Default)
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 max-w-7xl mx-auto">
          
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