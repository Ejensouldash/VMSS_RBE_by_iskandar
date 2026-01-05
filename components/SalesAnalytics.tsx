import React, { useMemo } from 'react';
import { Transaction, ProductSlot } from '../types';
import { 
  BarChart3, TrendingUp, Calendar, MapPin, PieChart, 
  ArrowUpRight, Monitor, Award, Filter 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Cell, AreaChart, Area
} from 'recharts';

interface Props {
  transactions: Transaction[];
  inventory: ProductSlot[];
}

// Skema Warna Moden
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const formatRM = (val: number) => 
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

const SalesAnalytics: React.FC<Props> = ({ transactions }) => {
  
  // --- ENGINE ANALYTICS (AUTO-DETECT) ---
  const analytics = useMemo(() => {
    
    // 1. Group by Machine (Nama mesin diambil terus dari Excel)
    const machineStats: Record<string, { total: number, count: number }> = {};
    
    transactions.forEach(t => {
      // Fallback 'Unknown' jika nama mesin kosong
      const mId = t.machineId && t.machineId !== 'undefined' ? t.machineId : 'Unknown Device';
      
      if (!machineStats[mId]) {
        machineStats[mId] = { total: 0, count: 0 };
      }
      machineStats[mId].total += t.amount;
      machineStats[mId].count += 1;
    });
    
    // Convert ke Array & Sort (Paling tinggi sales duduk atas)
    const machineData = Object.keys(machineStats)
      .map(k => ({ 
        name: k, 
        total: machineStats[k].total,
        count: machineStats[k].count
      }))
      .sort((a, b) => b.total - a.total);

    // 2. Group by Date (Trend Harian - Last 7 Days / Available Data)
    const dailyStats: Record<string, number> = {};
    // Sort transaksi ikut masa dulu
    const sortedTxs = [...transactions].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    sortedTxs.forEach(t => {
      const dateObj = new Date(t.timestamp);
      // Format: "04 Jan"
      const dateKey = dateObj.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
      dailyStats[dateKey] = (dailyStats[dateKey] || 0) + t.amount;
    });

    const dailyData = Object.keys(dailyStats).map(k => ({ date: k, total: dailyStats[k] }));

    return { machineData, dailyData };
  }, [transactions]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in zoom-in duration-500 font-sans">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <BarChart3 size={24} /> 
            </div>
            Analisis Prestasi Mesin
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Perbandingan jualan antara lokasi/mesin & trend harian
          </p>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-500">
            Total Mesin Dikesan: <span className="text-indigo-600 text-lg ml-1">{analytics.machineData.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. GRAF PRESTASI MESIN (HORIZONTAL BAR) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <MapPin size={20} className="text-emerald-500" /> 
              Jualan Mengikut Mesin
            </h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">Top Performance</span>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={analytics.machineData} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tick={{fontSize: 11, fontWeight: 600, fill: '#64748b'}} 
                />
                <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0/0.1)'}}
                    formatter={(val: number) => [formatRM(val), 'Jualan']}
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={30} animationDuration={1500}>
                  {analytics.machineData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. GRAF TREND HARIAN (AREA CHART) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Calendar size={20} className="text-blue-500" /> 
              Trend Jualan Harian
            </h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">History</span>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.dailyData}>
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(v)=>`RM${v}`} />
                <Tooltip 
                    contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0/0.1)'}}
                    formatter={(val: number) => [formatRM(val), 'Total']}
                />
                <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorDaily)" 
                    activeDot={{r: 6, strokeWidth: 0}}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* --- JADUAL RANKING (TABLE OF TRUTH) --- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Award className="text-yellow-500" /> Ranking Kedudukan Mesin
          </h3>
          <button className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
            Lihat Laporan Penuh
          </button>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-bold tracking-wider">
                <tr>
                <th className="px-6 py-4">Kedudukan</th>
                <th className="px-6 py-4">Nama Mesin (ID)</th>
                <th className="px-6 py-4 text-center">Bil. Transaksi</th>
                <th className="px-6 py-4 text-right">Jumlah Jualan</th>
                <th className="px-6 py-4 text-center">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {analytics.machineData.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Tiada data mesin dijumpai.</td></tr>
                ) : (
                    analytics.machineData.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm
                                ${i === 0 ? 'bg-yellow-400 ring-2 ring-yellow-200' : 
                                  i === 1 ? 'bg-slate-400' : 
                                  i === 2 ? 'bg-orange-600' : 'bg-slate-200 text-slate-500'}
                            `}>
                                #{i+1}
                            </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                            <Monitor size={16} className="text-slate-400" />
                            {m.name}
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-slate-600">
                            {m.count}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <span className="font-bold text-slate-800 text-lg">{formatRM(m.total)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase border border-emerald-200">
                                <ArrowUpRight size={10} /> Aktif
                            </span>
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>

    </div>
  );
};

export default SalesAnalytics;