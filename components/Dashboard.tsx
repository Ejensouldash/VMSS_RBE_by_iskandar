import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { 
  DollarSign, ShoppingBag, CreditCard, Activity, 
  TrendingUp, Clock, Zap, Award, Filter, Cpu, Wallet, Star,
  Database, FileSpreadsheet, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart as RePie, Pie, Cell, Legend
} from 'recharts';

import ProductCostUploader from '../components/ProductCostUploader'; 
import SmartExcelImport from '../components/SmartExcelImport';

interface DashboardProps {
  transactions: Transaction[];
  onDataImported: (data: any[], inventory: any[]) => void;
}

const PAYMENT_COLORS: Record<string, string> = {
  'Cash': '#10b981',             
  'DuitNow QR': '#ec4899',       
  'MAE by Maybank2u': '#f59e0b', 
  'TNG QR (MYR)': '#3b82f6',     
  'Debit Card': '#8b5cf6',       
  'Other': '#94a3b8'             
};

const formatRM = (val: number) => 
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

const Dashboard: React.FC<DashboardProps> = ({ transactions, onDataImported }) => {
  
  // --- STATE ---
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [activeSection, setActiveSection] = useState<'none' | 'master' | 'import'>('none');

  // --- LOGIC FILTER DATA ---
  const filteredData = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000; 
    const weekStart = todayStart - (7 * 86400000); 
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); 

    return transactions.filter(t => {
      const tTime = new Date(t.timestamp).getTime();
      switch (timeFilter) {
        case 'today': return tTime >= todayStart;
        case 'yesterday': return tTime >= yesterdayStart && tTime < todayStart; 
        case 'week': return tTime >= weekStart;
        case 'month': return tTime >= monthStart;
        default: return true;
      }
    });
  }, [transactions, timeFilter]);

  // --- STATISTIK ---
  const stats = useMemo(() => {
    const totalSales = filteredData.reduce((sum, t) => sum + t.amount, 0);
    const totalProfit = filteredData.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalTransactions = filteredData.length;
    const avgTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    return { totalSales, totalProfit, totalTransactions, avgTransactionValue };
  }, [filteredData]);

  // --- CHART DATA ---
  const paymentMethods = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(t => { 
      const method = t.paymentMethod || 'Other';
      counts[method] = (counts[method] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const salesTrend = useMemo(() => {
    const days: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = 0;
    }
    transactions.forEach(t => { 
      const key = t.timestamp.split('T')[0];
      if (days[key] !== undefined) days[key] += t.amount;
    });
    return Object.entries(days).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' }),
      amount
    }));
  }, [transactions]);

  const hourlyTraffic = useMemo(() => {
    const hours = Array(24).fill(0);
    filteredData.forEach(t => {
      const h = new Date(t.timestamp).getHours();
      hours[h]++;
    });
    return hours.map((count, hour) => ({ hour: `${hour}:00`, count }));
  }, [filteredData]);

  const topProducts = useMemo(() => {
    const products: Record<string, number> = {};
    filteredData.forEach(t => {
      products[t.productName] = (products[t.productName] || 0) + 1;
    });
    return Object.entries(products)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [filteredData]);

  const insights = useMemo(() => {
    const peakHourIndex = hourlyTraffic.reduce((maxIdx, curr, idx, arr) => curr.count > arr[maxIdx].count ? idx : maxIdx, 0);
    const peakHour = hourlyTraffic[peakHourIndex]?.hour || '12:00';
    const lastDaySales = salesTrend[salesTrend.length - 1]?.amount || 0;
    const forecast = lastDaySales * 1.1; 
    return { peak: peakHour, forecast: formatRM(forecast) };
  }, [hourlyTraffic, salesTrend]);

  const getFilterLabel = () => {
      switch(timeFilter) {
          case 'today': return 'Hari Ini';
          case 'yesterday': return 'Semalam';
          case 'week': return 'Minggu Ini';
          case 'month': return 'Bulan Ini';
          default: return 'Keseluruhan';
      }
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
              <Activity size={28} />
            </div>
            Dashboard Jualan
          </h1>
          <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
            <Clock size={14} /> Data: <span className="text-indigo-600 font-bold">{getFilterLabel()}</span>
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            {[
                { id: 'today', label: 'Hari Ini' },
                { id: 'yesterday', label: 'Semalam' },
                { id: 'week', label: 'Minggu Ini' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'all', label: 'Semua' }
            ].map((f) => (
                <button
                    key={f.id}
                    onClick={() => setTimeFilter(f.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                        timeFilter === f.id 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    {f.label}
                </button>
            ))}
        </div>
      </div>

      {/* --- 🌟 MINIMALIST DATA CONTROL PANEL 🌟 --- */}
      <div className="bg-slate-50 rounded-2xl p-2 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
            {/* Button 1: Master Data */}
            <button 
                onClick={() => setActiveSection(activeSection === 'master' ? 'none' : 'master')}
                className={`
                    flex items-center justify-center gap-3 py-3 rounded-xl transition-all border font-bold text-sm
                    ${activeSection === 'master' 
                        ? 'bg-blue-600 text-white border-blue-700 shadow-inner' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm'}
                `}
            >
                <Database size={18} />
                <span>Urus Kos (Master)</span>
                {activeSection === 'master' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>

            {/* Button 2: Import Sales */}
            <button 
                onClick={() => setActiveSection(activeSection === 'import' ? 'none' : 'import')}
                className={`
                    flex items-center justify-center gap-3 py-3 rounded-xl transition-all border font-bold text-sm
                    ${activeSection === 'import' 
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-inner' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600 hover:shadow-sm'}
                `}
            >
                <FileSpreadsheet size={18} />
                <span>Import Jualan</span>
                {activeSection === 'import' ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
        </div>

        {/* EXPANDABLE AREA */}
        {activeSection !== 'none' && (
            <div className="mt-2 p-1 animate-in slide-in-from-top-2 fade-in relative">
                
                {/* Close Button X (Float) */}
                <button 
                    onClick={() => setActiveSection('none')}
                    className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 bg-white/50 hover:bg-white p-1 rounded-full shadow-sm"
                    title="Tutup Panel"
                >
                    <X size={20} />
                </button>

                {activeSection === 'master' && (
                    <div className="pt-2">
                         {/* Terus tunjuk component, tak perlu tajuk tambahan sebab component dah ada tajuk */}
                        <ProductCostUploader />
                    </div>
                )}

                {activeSection === 'import' && (
                    <div className="pt-2">
                        {/* Terus tunjuk component */}
                        <SmartExcelImport onDataImported={(d, i) => {
                            onDataImported(d, i);
                        }} />
                    </div>
                )}
            </div>
        )}
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Sales */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">{getFilterLabel()}</span>
          </div>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Revenue</p>
          <h3 className="text-3xl font-black text-slate-800 mt-1">{formatRM(stats.totalSales)}</h3>
        </div>

        {/* Total Profit */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl group-hover:scale-110 transition-transform">
              <Star size={24} />
            </div>
            <span className="text-xs font-bold bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full">{getFilterLabel()}</span>
          </div>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Untung Bersih</p>
          <h3 className="text-3xl font-black text-yellow-600 mt-1">{formatRM(stats.totalProfit)}</h3>
        </div>

        {/* Total Transactions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <ShoppingBag size={24} />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Transaksi</p>
          <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.totalTransactions}</h3>
        </div>

        {/* Avg Value */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
              <CreditCard size={24} />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Purata Bakul</p>
          <h3 className="text-3xl font-black text-slate-800 mt-1">{formatRM(stats.avgTransactionValue)}</h3>
        </div>
      </div>

      {/* CHART SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="text-indigo-500" size={20}/> Trend Jualan (7 Hari)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `RM${val}`} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{stroke: '#6366f1', strokeWidth: 2}}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Wallet className="text-pink-500" size={20}/> Kaedah Bayaran
          </h3>
          <div className="h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RePie>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name] || '#94a3b8'} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </RePie>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800">{stats.totalTransactions}</span>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Trans</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Clock className="text-blue-500" size={20}/> Trafik Jam ({getFilterLabel()})
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTraffic}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} interval={3} />
                <YAxis axisLine={false} tickLine={false} hide />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px'}} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Award className="text-yellow-500" size={20}/> Produk Laris ({getFilterLabel()})
          </h3>
          <div className="space-y-4">
            {topProducts.length > 0 ? topProducts.map((prod, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${idx === 0 ? 'bg-yellow-400' : 'bg-slate-300'}`}>
                    {idx + 1}
                  </div>
                  <span className="font-medium text-slate-700 text-sm truncate max-w-[180px]">{prod.name}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600 font-bold text-sm">
                  {prod.count} <span className="text-[10px] font-normal text-slate-400">Unit</span>
                </div>
              </div>
            )) : (
              <p className="text-center text-slate-400 text-sm py-10">Tiada jualan pada tempoh ini.</p>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Cpu size={120} />
        </div>
        
        <div className="relative z-10">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Zap className="text-yellow-400" size={20}/> AI Business Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all backdrop-blur-sm">
              <p className="text-xs text-emerald-300 uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
                <Clock size={12} /> Waktu Paling Sibuk
              </p>
              <p className="text-sm leading-relaxed text-slate-200">
                Trafik memuncak jam <span className="font-bold text-white bg-emerald-500/30 px-1.5 py-0.5 rounded border border-emerald-500/50">{insights.peak}</span>.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all backdrop-blur-sm">
              <p className="text-xs text-amber-300 uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
                <TrendingUp size={12} /> Ramalan Esok
              </p>
              <p className="text-sm leading-relaxed text-slate-200">
                Jangkaan jualan esok: <span className="font-bold text-white bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-500/50">{insights.forecast}</span>.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400 font-medium">
          <span>Powered by Gemini Logic v2.0</span>
          <span className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded-full text-green-400 border border-green-500/20">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/> System Online
          </span>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;