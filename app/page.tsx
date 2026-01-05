
'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Truck, AlertTriangle, FileText, Settings, Users, 
  MapPin, DollarSign, Package, TrendingUp, Activity
} from 'lucide-react';
import AiAssistant from '@/components/AiAssistant';
import { useEffect, useState } from 'react';
import { fetchLiveMachineStatus, fetchSalesHistory } from '@/services/tcn';

// Real-time state will be populated from TCN (proxy or local captures)

export default function DashboardPage() {
  const [revenueData, setRevenueData] = useState<{ name: string; revenue: number; }[]>([]);
  const [machineStatusData, setMachineStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [mRes, sRes] = await Promise.all([
          fetchLiveMachineStatus(),
          fetchSalesHistory(7)
        ]);

        if (mounted && mRes?.success) {
          setMachines(mRes.data || []);
          // derive machine status counts
          const online = (mRes.data || []).filter((m: any) => m.status === 'ONLINE').length;
          const offline = (mRes.data || []).filter((m: any) => m.status !== 'ONLINE').length;
          setMachineStatusData([
            { name: 'Online', value: online, color: '#10b981' },
            { name: 'Offline', value: offline, color: '#ef4444' }
          ]);
        }

        if (mounted && sRes?.success) {
          const txs = sRes.transactions || [];
          setTransactions(txs);

          // Build revenue for last 7 days (Mon..Sun labels)
          const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          const last7: { name: string; revenue: number; }[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const label = weekDays[d.getDay()];
            const dayTotal = txs.filter((t: any) => {
              const tDate = new Date(t.timestamp);
              return tDate.getFullYear() === d.getFullYear() && tDate.getMonth() === d.getMonth() && tDate.getDate() === d.getDate();
            }).reduce((s: number, t: any) => s + (parseFloat(t.amount) || 0), 0);
            last7.push({ name: label, revenue: Math.round(dayTotal * 100) / 100 });
          }
          setRevenueData(last7);
        }
      } catch (e) {
        console.error('Error loading live data', e);
      }
    };

    load();
    const iv = setInterval(load, 30_000); // refresh every 30s
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <AiAssistant />
      
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            RB
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">VMSRBE <span className="text-orange-500">Enterprise</span></h1>
            <p className="text-xs text-slate-500">Rozita Bina Admin Portal</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-700">LHDN MyInvois Status</span>
            <span className="text-xs text-emerald-600 flex items-center justify-end gap-1">
              <Activity size={10} /> Live & Connected
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Rozita" alt="Admin" />
          </div>
        </div>
      </nav>

      <main className="p-6 max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Operational Overview</h2>
          <p className="text-slate-500">Real-time data from 120 Machines across 15 Locations.</p>
        </div>

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
          
          {/* 1. Total Revenue (Large) */}
          <div className="md:col-span-2 md:row-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Total Revenue (Weekly)</p>
                <h3 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                  RM 24,590.00
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full flex items-center">
                    <TrendingUp size={12} className="mr-1" /> +12.5%
                  </span>
                </h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <DollarSign size={24} />
              </div>
            </div>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Fleet Status (Square) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Fleet Health</p>
              <h3 className="text-2xl font-bold mt-1">95/100 Online</h3>
            </div>
            <div className="h-32 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={machineStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {machineStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-slate-400">Status</span>
              </div>
            </div>
          </div>

          {/* 3. AI Insights (Square - Highlight) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-lg flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3 text-orange-400">
                <Settings size={18} className="animate-spin-slow" />
                <span className="text-xs font-bold uppercase tracking-wider">AI Prediction</span>
              </div>
              <p className="text-lg font-medium leading-relaxed">
                "Machine <span className="text-orange-400 font-bold">#04 (UPTM)</span> needs restocking of 100 Plus by 2PM today based on student traffic."
              </p>
            </div>
            <button className="relative z-10 mt-4 bg-white/10 hover:bg-white/20 text-white text-xs py-2 px-4 rounded-lg w-fit backdrop-blur-sm transition-colors">
              Auto-Add to Route
            </button>
            
            {/* Background Decor */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl"></div>
          </div>

          {/* 4. Active Routes (Wide) */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck size={20} className="text-blue-600" />
                Live Logistics (AI Optimized)
              </h3>
              <span className="text-xs font-medium text-slate-500">3 Drivers Active</span>
            </div>
            <div className="space-y-3">
              {machines && machines.length > 0 ? machines.slice(0, 2).map((m, i) => {
                const driver = m.name || `Driver ${i+1}`;
                const loc = m.group || 'Unknown';
                const status = m.status === 'ONLINE' ? 'On Time' : 'Delayed';
                const progress = m.stock ? Math.min(100, Math.round((m.stock / 100) * 100)) : 50;
                return (
                  <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                      {String(driver).charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <h4 className="text-sm font-bold text-slate-900">{driver}</h4>
                        <span className={`text-xs font-bold ${status === 'On Time' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{loc}</p>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-sm text-slate-500">No live route data available.</div>
              )}
            </div>
          </div>

          {/* 5. Inventory Alerts (Square) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-rose-600">
              <AlertTriangle size={20} />
              <h3 className="font-bold text-slate-900">Critical Stock</h3>
            </div>
            <ul className="space-y-3">
              {(machines && machines.length > 0 ? machines.filter(m => typeof m.stock === 'number' && m.stock < 10).slice(0,3).map((m, i) => (
                <li key={i} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0">
                  <div>
                    <span className="font-medium text-slate-800 block">{m.name || m.id}</span>
                    <span className="text-xs text-slate-400">{m.id || m.group}</span>
                  </div>
                  <span className="font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded text-xs">
                    {m.stock} left
                  </span>
                </li>
              )) : (
                <li className="text-sm text-slate-500">No critical stock alerts.</li>
              ))}
            </ul>
          </div>

          {/* 6. Quick Actions (Square) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-3">
            <h3 className="font-bold text-slate-900 mb-2">Quick Actions</h3>
            <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700 text-left">
              <FileText size={16} className="text-blue-600" />
              Generate LHDN Report
            </button>
            <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700 text-left">
              <Package size={16} className="text-orange-500" />
              Upload Bulk Inventory
            </button>
            <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700 text-left">
              <MapPin size={16} className="text-emerald-500" />
              Add New Location
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
