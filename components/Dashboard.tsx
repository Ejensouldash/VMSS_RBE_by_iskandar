import React, { useMemo, useState, useEffect } from 'react';
import { Transaction } from '../types';
import {
  DollarSign, Activity, TrendingUp, TrendingDown, Clock,
  Zap, Award, Wallet, Database, FileSpreadsheet, ChevronDown, ChevronUp,
  X, Sparkles, Gauge, Layers, ArrowUpRight, Target, Rocket, Orbit, SignalHigh
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart as RePie, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts';

import ProductCostUploader from '../components/ProductCostUploader';
import SmartExcelImport from '../components/SmartExcelImport';
import TiltCard from './effects/TiltCard';
import LiveTicker from './effects/LiveTicker';
import { computeDashboardMetrics, formatRM, formatCompactRM } from '../services/profit';

interface DashboardProps {
  transactions: Transaction[];
  onDataImported?: (data: any[], inventory: any[]) => void;
}

const PAYMENT_COLORS: Record<string, string> = {
  'Cash': '#10b981',
  'DuitNow QR': '#ec4899',
  'MAE by Maybank2u': '#f59e0b',
  'TNG QR (MYR)': '#22d3ee',
  'Debit Card': '#a855f7',
  'E-Wallet': '#6366f1',
  'Other': '#64748b',
};
const DONUT_FALLBACK = ['#6366f1', '#22d3ee', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#64748b'];

const Dashboard: React.FC<DashboardProps> = ({ transactions, onDataImported }) => {
  const [trendMode, setTrendMode] = useState<'24h' | '7d' | '12m'>('7d');
  const [activeSection, setActiveSection] = useState<'none' | 'master' | 'import'>('none');
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const m = useMemo(() => computeDashboardMetrics(transactions, new Date()), [transactions, clock.getMinutes()]);

  const trendData = useMemo(() => {
    if (trendMode === '24h') return m.hourlyToday.map(p => ({ name: p.label, Revenue: p.revenue, Profit: p.profit }));
    if (trendMode === '12m') return m.last12Months.map(p => ({ name: p.label, Revenue: p.revenue, Profit: p.profit }));
    return m.last7Days.map(p => ({ name: p.label, Revenue: p.revenue, Profit: p.profit }));
  }, [m, trendMode]);

  const paymentData = useMemo(
    () => m.paymentMix.map((p, i) => ({ ...p, color: PAYMENT_COLORS[p.name] || DONUT_FALLBACK[i % DONUT_FALLBACK.length] })),
    [m.paymentMix]
  );

  const maxProductProfit = Math.max(1, ...m.topProducts.map(p => p.profit));
  const peakHour = m.hourlyToday.reduce((best, cur) => (cur.revenue > best.revenue ? cur : best), m.hourlyToday[0]);
  const marginGauge = [{ name: 'Margin', value: Math.max(0, Math.min(100, m.month.margin)), fill: '#22d3ee' }];
  const reactorGauge = [{ name: 'Day', value: m.dayProgressPct, fill: '#22d3ee' }];

  const kpis = [
    { data: m.thisHour, icon: Clock, accent: 'from-cyan-400 to-sky-500', glow: 'vm-glow-cyan', ring: 'text-cyan-300' },
    { data: m.week, icon: Layers, accent: 'from-fuchsia-400 to-purple-500', glow: 'vm-glow-violet', ring: 'text-fuchsia-300' },
    { data: m.month, icon: Award, accent: 'from-emerald-400 to-teal-500', glow: 'vm-glow-emerald', ring: 'text-emerald-300' },
  ];

  return (
    <div className="vm-app-bg vm-grid vm-scanlines -m-6 p-6 min-h-full text-slate-100 space-y-6 font-display">

      {/* ============ TOP STRIP: title + live ticker ============ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 vm-rise">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-cyan-300/80 uppercase">
          <Orbit size={14} className="text-cyan-400" />
          VMMS · Mission Control
          <span className="text-slate-600">/</span>
          <span className="text-slate-500 font-mono-num">{clock.toLocaleTimeString('en-MY')}</span>
        </div>
        <div className="w-full md:w-[420px]">
          <LiveTicker transactions={transactions} />
        </div>
      </div>

      {/* ============ HERO: REACTOR CORE ============ */}
      <div className="relative vm-glass rounded-3xl p-6 md:p-10 overflow-hidden vm-rise">
        <div className="absolute inset-0 opacity-40" style={{
          background: 'radial-gradient(600px circle at 15% 20%, rgba(99,102,241,.18), transparent 60%)'
        }} />
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">

          {/* Reactor visual */}
          <div className="shrink-0 flex flex-col items-center gap-4">
            <div className="vm-reactor">
              <div className="vm-reactor-ring" />
              <div className="vm-reactor-ring r2" />
              <div className="vm-reactor-ring r3" />
              <div className="vm-reactor-core" />
              {/* progress ring overlay */}
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="92%" outerRadius="100%" data={reactorGauge} startAngle={90} endAngle={-270}>
                  <RadialBar background={{ fill: 'rgba(148,163,184,0.08)' }} dataKey="value" cornerRadius={20} fill="#22d3ee" />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6">
                <span className="text-[10px] uppercase tracking-widest text-cyan-300/80 font-bold">Today's Net Profit</span>
                <span key={m.today.profit} className="vm-tick text-3xl font-black text-white vm-glow-text-cyan font-mono-num text-center leading-tight mt-1">
                  {formatRM(m.today.profit)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">{m.dayProgressPct.toFixed(0)}% of day elapsed</span>
              </div>
            </div>
          </div>

          {/* Stats beside reactor */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="vm-glass rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Rocket size={12} className="text-indigo-300" /> Projected End-of-Day</p>
              <p className="text-2xl font-black text-white mt-1 font-mono-num">{formatRM(m.projectedEodProfit)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Revenue pace: {formatCompactRM(m.projectedEodRevenue)}</p>
            </div>
            <div className="vm-glass rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><SignalHigh size={12} className="text-emerald-300" /> Day-over-Day</p>
              <p className={`text-2xl font-black mt-1 font-mono-num flex items-center gap-1.5 ${m.todayVsYesterdayPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {m.todayVsYesterdayPct >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {m.todayVsYesterdayPct >= 0 ? '+' : ''}{m.todayVsYesterdayPct.toFixed(1)}%
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">vs. yesterday, same time</p>
            </div>
            <div className="vm-glass rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Today's Revenue</p>
              <p className="text-2xl font-black text-white mt-1 font-mono-num">{formatRM(m.today.revenue)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{m.today.count} transactions</p>
            </div>
            <div className="vm-glass rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Net Margin Today</p>
              <p className="text-2xl font-black text-cyan-300 mt-1 font-mono-num">{m.today.margin.toFixed(1)}%</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Peak hour: {peakHour?.revenue > 0 ? peakHour.label : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ DATA CONTROL ============ */}
      {onDataImported && (
        <div className="vm-glass rounded-2xl p-2 vm-rise vm-rise-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveSection(activeSection === 'master' ? 'none' : 'master')}
              className={`flex items-center justify-center gap-3 py-3 rounded-xl transition-all border font-bold text-sm ${
                activeSection === 'master'
                  ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/50 vm-glow-indigo'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:border-indigo-400/40 hover:text-indigo-200'
              }`}
            >
              <Database size={18} /> <span>Manage Cost (Master)</span>
              {activeSection === 'master' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={() => setActiveSection(activeSection === 'import' ? 'none' : 'import')}
              className={`flex items-center justify-center gap-3 py-3 rounded-xl transition-all border font-bold text-sm ${
                activeSection === 'import'
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50 vm-glow-emerald'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:border-emerald-400/40 hover:text-emerald-200'
              }`}
            >
              <FileSpreadsheet size={18} /> <span>Import Sales</span>
              {activeSection === 'import' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          {activeSection !== 'none' && (
            <div className="mt-2 p-1 relative">
              <button
                onClick={() => setActiveSection('none')}
                className="absolute top-3 right-3 z-10 text-slate-400 hover:text-white bg-white/10 p-1 rounded-full"
              >
                <X size={18} />
              </button>
              <div className="pt-2">
                {activeSection === 'master' && <ProductCostUploader />}
                {activeSection === 'import' && <SmartExcelImport onDataImported={onDataImported} />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ KPI TILT CARDS ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {kpis.map((k, i) => (
          <TiltCard key={k.data.key} className={`vm-glass rounded-2xl p-5 relative overflow-hidden vm-rise vm-rise-${i + 1}`}>
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${k.accent}`} />
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${k.accent} ${k.glow} text-white`}>
                <k.icon size={22} />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500">{k.data.count} tx</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{k.data.label} · Profit</p>
            <h3 className="text-3xl font-black text-white mt-1 font-mono-num">{formatRM(k.data.profit)}</h3>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Rev <span className="text-slate-200 font-semibold">{formatCompactRM(k.data.revenue)}</span></span>
              <span className={`font-semibold ${k.ring}`}>{k.data.margin.toFixed(1)}% margin</span>
            </div>
          </TiltCard>
        ))}
      </div>

      {/* ============ MAIN TREND + PAYMENT ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 vm-glass rounded-2xl p-6 vm-rise vm-chart-glow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <TrendingUp className="text-cyan-400" size={20} /> Revenue vs Net Profit
            </h3>
            <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
              {([['24h', 'Today'], ['7d', '7 Days'], ['12m', '12 Months']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTrendMode(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    trendMode === id ? 'vm-btn-primary text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip formatter={(v: number) => formatRM(v)} />
                <Area type="monotone" dataKey="Revenue" stroke="#818cf8" strokeWidth={2.5} fill="url(#gRev)" />
                <Area type="monotone" dataKey="Profit" stroke="#22d3ee" strokeWidth={2.5} fill="url(#gPro)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <TiltCard maxTilt={3} className="vm-glass rounded-2xl p-6 vm-rise">
          <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
            <Wallet className="text-fuchsia-400" size={20} /> Payment Mix
          </h3>
          <div className="h-[240px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RePie>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                  {paymentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number, _n, p: any) => [`${v} tx · ${formatRM(p.payload.revenue)}`, p.payload.name]} />
              </RePie>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-3xl font-black text-white font-mono-num">{m.all.count}</span>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Total Tx</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {paymentData.slice(0, 4).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} /> {p.name}
                </span>
                <span className="text-slate-400 font-mono-num">{formatCompactRM(p.revenue)}</span>
              </div>
            ))}
          </div>
        </TiltCard>
      </div>

      {/* ============ HOURLY + TOP PRODUCTS + MARGIN ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hourly profit today */}
        <TiltCard maxTilt={4} className="vm-glass rounded-2xl p-6 vm-rise vm-chart-glow">
          <h3 className="font-bold text-lg text-white mb-1 flex items-center gap-2">
            <Zap className="text-amber-400" size={20} /> Hourly Profit
          </h3>
          <p className="text-xs text-slate-400 mb-4">Today · earnings up to {clock.getHours()}:00</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.hourlyToday.map(p => ({ name: p.label, Profit: p.profit }))}>
                <defs>
                  <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} interval={3} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => formatRM(v)} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="Profit" fill="url(#gBar)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TiltCard>

        {/* Top products by profit */}
        <TiltCard maxTilt={4} className="vm-glass rounded-2xl p-6 vm-rise">
          <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
            <Award className="text-emerald-400" size={20} /> Top Profit Drivers
          </h3>
          <div className="space-y-3">
            {m.topProducts.length ? m.topProducts.map((p, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2 text-slate-200 truncate max-w-[160px]">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                      idx === 0 ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-slate-300'
                    }`}>{idx + 1}</span>
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="text-emerald-300 font-bold font-mono-num">{formatRM(p.profit)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                    style={{ width: `${(p.profit / maxProductProfit) * 100}%` }} />
                </div>
              </div>
            )) : <p className="text-center text-slate-500 text-sm py-10">No sales in this period.</p>}
          </div>
        </TiltCard>

        {/* Margin gauge */}
        <TiltCard maxTilt={4} className="vm-glass rounded-2xl p-6 vm-rise relative overflow-hidden">
          <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
            <Gauge className="text-cyan-400" size={20} /> Net Margin · Month
          </h3>
          <div className="h-[180px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={marginGauge} startAngle={220} endAngle={-40}>
                <defs>
                  <linearGradient id="gGauge" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <RadialBar background={{ fill: 'rgba(148,163,184,0.1)' }} dataKey="value" cornerRadius={12} fill="url(#gGauge)" />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black vm-text-gradient font-mono-num">{m.month.margin.toFixed(1)}%</span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400">Gross Margin</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-center">
            <div className="bg-white/5 rounded-xl py-2">
              <p className="text-[10px] uppercase text-slate-400">Revenue</p>
              <p className="text-sm font-bold text-white font-mono-num">{formatCompactRM(m.month.revenue)}</p>
            </div>
            <div className="bg-white/5 rounded-xl py-2">
              <p className="text-[10px] uppercase text-slate-400">COGS</p>
              <p className="text-sm font-bold text-rose-300 font-mono-num">{formatCompactRM(m.month.cost)}</p>
            </div>
          </div>
        </TiltCard>
      </div>

      {/* ============ INSIGHT FOOTER ============ */}
      <div className="vm-glass vm-neon rounded-2xl p-6 relative overflow-hidden vm-rise">
        <div className="absolute top-0 right-0 opacity-10"><Sparkles size={140} className="text-cyan-400" /></div>
        <div className="relative z-10">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
            <Sparkles className="text-cyan-400" size={20} /> AI Business Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InsightCard icon={Clock} tint="cyan" label="Peak Hour Today"
              value={peakHour && peakHour.revenue > 0 ? peakHour.label : '—'}
              note={peakHour && peakHour.revenue > 0 ? `${formatRM(peakHour.revenue)} in revenue` : 'Awaiting sales'} />
            <InsightCard icon={Target} tint="emerald" label="Best Profit Driver"
              value={m.topProducts[0]?.name?.slice(0, 22) || '—'}
              note={m.topProducts[0] ? `${formatRM(m.topProducts[0].profit)} profit` : 'No data yet'} />
            <InsightCard icon={ArrowUpRight} tint="violet" label="Day-over-Day"
              value={`${m.todayVsYesterdayPct >= 0 ? '+' : ''}${m.todayVsYesterdayPct.toFixed(1)}%`}
              note="Today vs yesterday (same time)" />
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
            <span>VMMS Profit Engine · v4.0</span>
            <span className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-full text-emerald-300 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full vm-pulse text-emerald-400" /> Live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const TINTS: Record<string, string> = {
  cyan: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  violet: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
};

const InsightCard = ({ icon: Icon, tint, label, value, note }: { icon: any; tint: string; label: string; value: string; note: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
    <p className={`text-xs uppercase font-bold tracking-wider mb-2 flex items-center gap-2 ${TINTS[tint].split(' ')[0]}`}>
      <Icon size={13} /> {label}
    </p>
    <p className="text-lg font-black text-white truncate">{value}</p>
    <p className="text-xs text-slate-400 mt-0.5">{note}</p>
  </div>
);

export default Dashboard;
