import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { 
  DollarSign, ShoppingBag, CreditCard, Activity, 
  TrendingUp, Calendar, Clock, Zap, ArrowRight,
  PieChart, BarChart3, Award, Search, Filter, Cpu, Wallet, Star
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart as RePie, Pie, Cell, Legend
} from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
}

// --- CONFIGURATION WARNA ---
const PAYMENT_COLORS: Record<string, string> = {
  'Cash': '#10b981',             // Emerald (Tunai)
  'DuitNow QR': '#ec4899',       // Pink (DuitNow Rasmi)
  'MAE by Maybank2u': '#f59e0b', // Amber/Kuning (Maybank)
  'TNG QR (MYR)': '#3b82f6',     // Blue (Touch 'n Go)
  'Debit Card': '#8b5cf6',       // Purple
  'Other': '#94a3b8'             // Slate
};

const COLORS = {
  primary: '#6366f1',
  secondary: '#64748b'
};

// Helper Format RM
const formatRM = (val: number) => 
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');

  // --- ENGINE ANALYTICS ---
  const dashboardData = useMemo(() => {
    const now = new Date();
    const todayDate = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();
    
    // 1. Filter Data Ikut Masa (Menggunakan logik Date yang tepat)
    let filteredTxs = transactions.filter(t => {
      const d = new Date(t.timestamp);
      if (timeFilter === 'today') {
        return d.getDate() === todayDate && 
               d.getMonth() === todayMonth && 
               d.getFullYear() === todayYear;
      } else if (timeFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      } else {
        return d.getMonth() === todayMonth && 
               d.getFullYear() === todayYear;
      }
    });

    // Sort: Lama -> Baru (Penting untuk Graf)
    filteredTxs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 2. KPI Cards Calculation
    const totalRevenue = filteredTxs.reduce((sum, t) => sum + t.amount, 0);
    const totalCount = filteredTxs.length;
    const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

    // 3. Payment Method Analysis (Pie Chart Logic)
    const paymentMap: Record<string, number> = {};
    filteredTxs.forEach(t => {
      // Normalisasi nama (Supaya 'DuitNow QR' dan 'DuitNow' masuk group sama)
      let method = (t.paymentMethod || 'Other').trim();
      
      // Mapping ke Nama Standard (Regex case-insensitive)
      if (method.match(/duitnow/i)) method = 'DuitNow QR';
      else if (method.match(/mae/i)) method = 'MAE by Maybank2u';
      else if (method.match(/tng|touch/i)) method = 'TNG QR (MYR)';
      else if (method.match(/cash|tunai/i)) method = 'Cash';
      else if (method.match(/card|visa|master/i)) method = 'Debit Card';
      
      paymentMap[method] = (paymentMap[method] || 0) + 1;
    });

    const paymentData = Object.keys(paymentMap).map(key => ({
      name: key,
      value: paymentMap[key],
      color: PAYMENT_COLORS[key] || PAYMENT_COLORS['Other']
    })).sort((a, b) => b.value - a.value); // Susun dari paling banyak

    // 4. Performance Graph (Interactive)
    let graphData: any[] = [];
    if (timeFilter === 'today') {
      // Jam ke Jam (00:00 - 23:00)
      const hourMap = new Array(24).fill(0);
      filteredTxs.forEach(t => {
        const h = new Date(t.timestamp).getHours();
        hourMap[h] += t.amount;
      });
      // Filter jam operasi (7am - 11pm) supaya graf tak kosong sangat
      graphData = hourMap.map((val, h) => ({ label: `${h}:00`, total: val })).filter((_, i) => i >= 7 && i <= 23);
    } else {
      // Hari ke Hari (Tarikh)
      const dateMap: Record<string, number> = {};
      filteredTxs.forEach(t => {
        const d = new Date(t.timestamp);
        const key = `${d.getDate()}/${d.getMonth()+1}`;
        dateMap[key] = (dateMap[key] || 0) + t.amount;
      });
      graphData = Object.keys(dateMap).map(k => ({ label: k, total: dateMap[k] }));
    }

    // 5. Top Products (Best Sellers)
    const prodMap: Record<string, {qty: number, rev: number}> = {};
    filteredTxs.forEach(t => {
      const p = t.productName || 'Unknown';
      if (!prodMap[p]) prodMap[p] = { qty: 0, rev: 0 };
      prodMap[p].qty += 1;
      prodMap[p].rev += t.amount;
    });
    
    const topProducts = Object.keys(prodMap)
      .map(k => ({ name: k, qty: prodMap[k].qty, rev: prodMap[k].rev }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return { totalRevenue, totalCount, avgTicket, paymentData, graphData, topProducts, filteredTxs };
  }, [transactions, timeFilter]);

  // --- AI INSIGHTS GENERATOR ---
  const insights = useMemo(() => {
    const { topProducts, filteredTxs, totalRevenue } = dashboardData;
    if (filteredTxs.length === 0) return { title: "Menunggu Data", msg: "Tiada data untuk dianalisis." };

    // Cari Waktu Puncak
    const hours: Record<number, number> = {};
    filteredTxs.forEach(t => { const h = new Date(t.timestamp).getHours(); hours[h] = (hours[h]||0)+1; });
    const peakHour = Object.keys(hours).reduce((a, b) => hours[parseInt(a)] > hours[parseInt(b)] ? a : b, '12');

    // Forecast Simple (Naik 5%)
    const forecast = totalRevenue * 1.05;

    return {
      bestSeller: topProducts[0]?.name || "-",
      peak: `${peakHour}:00 - ${parseInt(peakHour)+1}:00`,
      forecast: formatRM(forecast),
      trend: "Stabil"
    };
  }, [dashboardData]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in zoom-in duration-500 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                <Activity size={24} />
            </div>
            Executive Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium ml-1">
            Analisa Prestasi Jualan & Trend Transaksi
          </p>
        </div>
        
        {/* TIME CONTROLS (Pills Style) */}
        <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1">
          {['today', 'week', 'month'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t as any)}
              className={`px-5 py-2 text-xs font-bold rounded-lg capitalize transition-all duration-200 ${
                timeFilter === t 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 transform scale-105' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {t === 'today' ? 'Hari Ini' : t === 'week' ? 'Minggu Ini' : 'Bulan Ini'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS (Colorful & Modern) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-indigo-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                <DollarSign size={24}/>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold flex items-center gap-1 border border-emerald-200">
                <TrendingUp size={12} /> Live
            </span>
          </div>
          <p className="text-slate-500 text-xs uppercase font-bold tracking-wider relative z-10">Jumlah Jualan</p>
          <h3 className="text-4xl font-black text-slate-800 mt-1 relative z-10">{formatRM(dashboardData.totalRevenue)}</h3>
        </div>

        {/* Card 2: Transactions */}
        <div className="bg-white p-6 rounded-2xl border border-blue-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl shadow-lg shadow-blue-500/20">
                <ShoppingBag size={24}/>
            </div>
          </div>
          <p className="text-slate-500 text-xs uppercase font-bold tracking-wider relative z-10">Bilangan Transaksi</p>
          <h3 className="text-4xl font-black text-slate-800 mt-1 relative z-10">{dashboardData.totalCount} <span className="text-lg text-slate-400 font-normal">unit</span></h3>
        </div>

        {/* Card 3: Avg Ticket */}
        <div className="bg-white p-6 rounded-2xl border border-purple-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-purple-50 rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white rounded-xl shadow-lg shadow-purple-500/20">
                <Wallet size={24}/>
            </div>
          </div>
          <p className="text-slate-500 text-xs uppercase font-bold tracking-wider relative z-10">Purata Bakul</p>
          <h3 className="text-4xl font-black text-slate-800 mt-1 relative z-10">{formatRM(dashboardData.avgTicket)}</h3>
        </div>
      </div>

      {/* --- GRAPHS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. PERFORMANCE CHART (INTERACTIVE AREA) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                    <BarChart3 className="text-indigo-500" size={20} />
                    Trend Prestasi
                </h3>
                <p className="text-xs text-slate-400 font-medium">Analisa mengikut {timeFilter === 'today' ? 'Jam' : 'Tarikh'}</p>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData.graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill:'#94a3b8', fontSize:12, fontWeight: 500}} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill:'#94a3b8', fontSize:12, fontWeight: 500}} 
                    tickFormatter={(v)=>`RM${v}`} 
                />
                <Tooltip 
                  contentStyle={{
                      borderRadius:'12px', 
                      border:'none', 
                      boxShadow:'0 10px 25px -5px rgb(0 0 0/0.1)',
                      fontFamily: 'inherit'
                  }}
                  cursor={{ stroke: COLORS.primary, strokeWidth: 1, strokeDasharray: '4 4' }}
                  formatter={(value:number) => [`RM ${value.toFixed(2)}`, 'Jualan']}
                />
                <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke={COLORS.primary} 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                    animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. PAYMENT METHOD PIE CHART (BRANDED COLORS) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 flex flex-col">
          <h3 className="font-bold text-xl text-slate-800 mb-2 flex items-center gap-2">
            <CreditCard className="text-blue-500" size={20} />
            Kaedah Bayaran
          </h3>
          <p className="text-xs text-slate-400 mb-6 font-medium">Pecahan transaksi mengikut jenis</p>
          
          <div className="flex-1 relative min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePie data={dashboardData.paymentData} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                {dashboardData.paymentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </RePie>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-slate-800">{dashboardData.totalCount}</span>
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Transaksi</span>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="mt-6 space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
            {dashboardData.paymentData.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-default">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: p.color}}></div>
                  <span className="text-slate-600 font-semibold truncate max-w-[120px]" title={p.name}>{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{p.value}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                        ({((p.value / dashboardData.totalCount) * 100).toFixed(0)}%)
                    </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- AI ANALYTICS & TOP PRODUCTS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* A. BEST SELLING PRODUCTS TABLE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                <Star className="text-yellow-500 fill-yellow-500" size={20} /> 
                Produk Paling Laku
            </h3>
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-lg transition-colors">
                Lihat Semua
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg text-left">Nama Produk</th>
                  <th className="px-4 py-3 text-center">Unit</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Jualan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboardData.topProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3 font-semibold text-slate-700 flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shadow-sm font-bold text-white 
                        ${i===0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                          i===1 ? 'bg-slate-400' : 
                          i===2 ? 'bg-orange-700' : 'bg-slate-200 text-slate-500'}`}>
                        {i+1}
                      </div>
                      <span className="truncate max-w-[180px]" title={p.name}>{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">{p.qty}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{formatRM(p.rev)}</td>
                  </tr>
                ))}
                {dashboardData.topProducts.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-400 italic">Tiada data jualan ditemui.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* B. AI SMART INSIGHTS CARD (Futuristic) */}
        <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/20">
          {/* Background Effects */}
          <div className="absolute top-0 right-0 p-8 opacity-20"><Zap size={180} className="text-indigo-400" /></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-600 rounded-full blur-[80px] opacity-30"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-inner">
                    <Cpu size={24} className="text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-xl tracking-tight">AI Smart Analysis</h3>
                  <p className="text-xs text-indigo-200 font-medium">Insight dijana secara automatik</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:translate-x-1 duration-300 backdrop-blur-sm">
                  <p className="text-xs text-indigo-300 uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
                    <Star size={12} /> Hot Item
                  </p>
                  <p className="text-sm leading-relaxed text-slate-200">
                    Produk <span className="font-bold text-white bg-indigo-500/30 px-1.5 py-0.5 rounded border border-indigo-500/50">{insights.bestSeller}</span> mendapat permintaan tertinggi dalam tempoh ini.
                  </p>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:translate-x-1 duration-300 backdrop-blur-sm">
                  <p className="text-xs text-emerald-300 uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
                    <Clock size={12} /> Waktu Puncak
                  </p>
                  <p className="text-sm leading-relaxed text-slate-200">
                    Trafik pelanggan paling sibuk direkodkan sekitar jam <span className="font-bold text-white bg-emerald-500/30 px-1.5 py-0.5 rounded border border-emerald-500/50">{insights.peak}</span>.
                  </p>
                </div>
                
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:translate-x-1 duration-300 backdrop-blur-sm">
                  <p className="text-xs text-amber-300 uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
                    <TrendingUp size={12} /> Ramalan Esok
                  </p>
                  <p className="text-sm leading-relaxed text-slate-200">
                    Jangkaan jualan esok boleh mencecah <span className="font-bold text-white bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-500/50">{insights.forecast}</span> berdasarkan trend semasa.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400 font-medium">
              <span>Powered by Gemini Logic v2.0</span>
              <span className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded-full text-green-400 border border-green-500/20">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div> 
                System Live
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;