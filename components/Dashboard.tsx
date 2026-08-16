import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, Machine, Alarm, ProductSlot } from '../types';
import {
  DollarSign, Activity, TrendingUp, TrendingDown, Clock,
  AlertTriangle, CheckCircle2, RefreshCw, Upload, FileSpreadsheet,
  X, Layers, ChevronRight, Server, ShieldCheck, ArrowUpRight,
  Filter, Search, Package, Radio, Thermometer, Wifi
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

import ProductCostUploader from '../components/ProductCostUploader';
import SmartExcelImport from '../components/SmartExcelImport';
import { computeDashboardMetrics, formatRM, formatCompactRM } from '../services/profit';
import { getMachines, getAlarms, getInventory } from '../services/db';

interface DashboardProps {
  transactions: Transaction[];
  onDataImported?: (data: any[], inventory: any[]) => void;
}

const PAYMENT_PALETTE: Record<string, string> = {
  'Cash': '#10b981',
  'DuitNow QR': '#3b82f6',
  'MAE by Maybank2u': '#f59e0b',
  'TNG QR (MYR)': '#06b6d4',
  'Debit Card': '#8b5cf6',
  'E-Wallet': '#6366f1',
  'Other': '#64748b',
};
const DONUT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#64748b'];

const Dashboard: React.FC<DashboardProps> = ({ transactions, onDataImported }) => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '12m'>('7d');
  const [modalState, setModalState] = useState<'none' | 'cost' | 'import'>('none');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [inventory, setInventory] = useState<ProductSlot[]>([]);
  const [searchTx, setSearchTx] = useState('');
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getMachines().then(res => setMachines(res || []));
    setAlarms(getAlarms() || []);
    getInventory().then(res => setInventory(res || []));
  }, [transactions]);

  const metrics = useMemo(
    () => computeDashboardMetrics(transactions, new Date()),
    [transactions, clock.getMinutes()]
  );

  const chartSeries = useMemo(() => {
    if (timeRange === '24h') {
      return metrics.hourlyToday.map(p => ({ label: p.label, Revenue: p.revenue, Profit: p.profit }));
    }
    if (timeRange === '12m') {
      return metrics.last12Months.map(p => ({ label: p.label, Revenue: p.revenue, Profit: p.profit }));
    }
    return metrics.last7Days.map(p => ({ label: p.label, Revenue: p.revenue, Profit: p.profit }));
  }, [metrics, timeRange]);

  const paymentData = useMemo(() => {
    return metrics.paymentMix.map((p, idx) => ({
      name: p.name,
      value: p.value,
      revenue: p.revenue,
      color: PAYMENT_PALETTE[p.name] || DONUT_COLORS[idx % DONUT_COLORS.length]
    }));
  }, [metrics.paymentMix]);

  // Operational Attention calculations
  const offlineMachines = useMemo(() => machines.filter(m => m.status === 'OFFLINE' || m.status === 'ERROR'), [machines]);
  const lowStockSlots = useMemo(() => inventory.filter(s => ((s as any).currentStock ?? s.initialStock ?? 10) <= 5), [inventory]);
  const activeAlarms = useMemo(() => alarms.filter(a => a.status === 'OPEN'), [alarms]);
  const onlineMachinesCount = useMemo(() => machines.filter(m => m.status === 'ONLINE').length, [machines]);
  const totalMachines = machines.length || 6;
  const totalAttentionItems = offlineMachines.length + (lowStockSlots.length > 0 ? 1 : 0) + activeAlarms.length;

  const filteredRecentTxs = useMemo(() => {
    const list = transactions.slice(0, 30);
    if (!searchTx.trim()) return list;
    const q = searchTx.toLowerCase();
    return list.filter(t =>
      (t.refNo && t.refNo.toLowerCase().includes(q)) ||
      (t.productName && t.productName.toLowerCase().includes(q)) ||
      (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q))
    );
  }, [transactions, searchTx]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      
      {/* =========================================================
          HEADER: Operational Title, Live Sync, and Compact Actions
          ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-white">Operations Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium op-pill-emerald">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time telemetry, transaction metrics, and fleet health monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setModalState('cost')}
            className="op-btn-secondary text-xs h-9"
          >
            <Layers size={14} className="text-slate-400" />
            <span>Manage Costs</span>
          </button>

          <button
            onClick={() => setModalState('import')}
            className="op-btn-secondary text-xs h-9"
          >
            <FileSpreadsheet size={14} className="text-slate-400" />
            <span>Import Sales</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block"></div>

          <div className="text-xs text-slate-400 font-mono-code hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800">
            <Clock size={12} className="text-slate-400" />
            <span>{clock.toLocaleTimeString('en-MY', { hour12: false })}</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          ROW 1: 4 COMPACT KPI METRIC CARDS
          ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Sales Today */}
        <div className="op-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Sales Today</span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${
              metrics.todayVsYesterdayPct >= 0 ? 'text-emerald-400 bg-emerald-950/40' : 'text-slate-400 bg-slate-800/40'
            }`}>
              {metrics.todayVsYesterdayPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {metrics.todayVsYesterdayPct >= 0 ? `+${metrics.todayVsYesterdayPct}%` : `${metrics.todayVsYesterdayPct}%`}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-white font-mono-code">
              {formatRM(metrics.today.revenue)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
              <span>{metrics.today.count} transactions</span>
              <span className="text-slate-500 font-mono-code">vs yesterday same time</span>
            </div>
          </div>
        </div>

        {/* Card 2: Net Profit Today */}
        <div className="op-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Net Profit Today</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium op-pill-blue">
              {metrics.today.margin}% margin
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-emerald-400 font-mono-code">
              {formatRM(metrics.today.profit)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
              <span>COGS: {formatRM(metrics.today.cost)}</span>
              <span className="text-slate-500 font-mono-code">Proj: {formatCompactRM(metrics.projectedEodProfit)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Machines Online */}
        <div className="op-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Fleet Online</span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
              onlineMachinesCount === totalMachines ? 'op-pill-emerald' : 'op-pill-amber'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${onlineMachinesCount === totalMachines ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              {Math.round((onlineMachinesCount / (totalMachines || 1)) * 100)}% uptime
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-white font-mono-code">
              {onlineMachinesCount} <span className="text-sm font-normal text-slate-400">/ {totalMachines} active</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
              <span>{totalMachines - onlineMachinesCount} offline or alerting</span>
              <span className="text-slate-500 font-mono-code">All gateways OK</span>
            </div>
          </div>
        </div>

        {/* Card 4: Needs Attention */}
        <div className="op-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Needs Attention</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
              totalAttentionItems > 0 ? 'op-pill-amber' : 'op-pill-emerald'
            }`}>
              {totalAttentionItems > 0 ? `${totalAttentionItems} Action Items` : 'All Normal'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-white font-mono-code">
              {totalAttentionItems}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
              <span>{offlineMachines.length} offline · {lowStockSlots.length} low stock</span>
              <span className="text-slate-500 font-mono-code">{activeAlarms.length} open alarms</span>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================
          ROW 2: MAIN ANALYTICS (8 COLS) + PAYMENT MIX & TOP PRODUCTS (4 COLS)
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Revenue vs Net Profit Chart (8 Cols) */}
        <div className="lg:col-span-8 op-card p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
            <div>
              <h2 className="text-sm font-semibold text-white">Revenue vs Net Profit</h2>
              <p className="text-xs text-slate-400 mt-0.5">Dual-layer visual comparison across trading periods</p>
            </div>

            {/* Date range switcher tabs */}
            <div className="inline-flex rounded-lg bg-slate-900/90 p-0.5 border border-slate-800">
              <button
                onClick={() => setTimeRange('24h')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === '24h'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                24 Hours
              </button>
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === '7d'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setTimeRange('12m')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === '12m'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Last 12 Months
              </button>
            </div>
          </div>

          {/* Chart area */}
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="opRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="opProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                  tickFormatter={val => `RM ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [formatRM(Number(val)), name]}
                />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#opRevenueGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="Profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#opProfitGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart footer legend */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                <span>Gross Revenue</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>Net Profit</span>
              </span>
            </div>
            <div className="font-mono-code text-slate-500">
              Total {timeRange === '24h' ? "Today's" : timeRange === '7d' ? '7-Day' : '12-Month'} Profit: <span className="text-emerald-400 font-semibold">{formatRM(timeRange === '24h' ? metrics.today.profit : timeRange === '7d' ? metrics.week.profit : metrics.all.profit)}</span>
            </div>
          </div>
        </div>

        {/* Right: Payment Mix & Top Products (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Payment Method Distribution */}
          <div className="op-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Payment Method Breakdown</h3>
            {paymentData.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No payment data recorded yet</div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={32}
                        outerRadius={48}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any, name: any) => [`${val} transactions`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-1.5 text-xs">
                  {paymentData.slice(0, 4).map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                        <span className="text-slate-300 truncate">{p.name}</span>
                      </div>
                      <span className="font-mono-code text-slate-400">{formatRM(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top Selling Products */}
          <div className="op-card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Top Products by Profit</h3>
            {metrics.topProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No product sales yet</div>
            ) : (
              <div className="space-y-3">
                {metrics.topProducts.slice(0, 4).map((p, idx) => {
                  const maxProfit = metrics.topProducts[0]?.profit || 1;
                  const pct = Math.min(100, Math.round((p.profit / maxProfit) * 100));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 truncate max-w-[170px]">{p.name}</span>
                        <span className="font-mono-code text-emerald-400 font-medium">{formatRM(p.profit)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono-code">
                        <span>{p.units} units sold</span>
                        <span>Rev: {formatCompactRM(p.revenue)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* =========================================================
          ROW 3: OPERATIONAL ACTION QUEUE (NEEDS ATTENTION)
          ========================================================= */}
      <div className="op-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className={totalAttentionItems > 0 ? "text-amber-400" : "text-emerald-400"} />
            <h2 className="text-sm font-semibold text-white">Priority Operations & Action Queue</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono-code">
            {totalAttentionItems === 0 ? 'All 6 machines operating within normal parameters' : `${totalAttentionItems} item(s) require intervention`}
          </span>
        </div>

        {totalAttentionItems === 0 ? (
          <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>All vending machines are synced, stock levels are above threshold, and all payment channels are responsive.</span>
            </div>
            <span className="font-mono-code text-emerald-400 font-semibold">100% HEALTHY</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {offlineMachines.map((m, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/25 flex items-start justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                    <span className="font-mono-code font-bold text-white">{m.id}</span>
                    <span className="op-pill-rose px-1 rounded text-[10px] uppercase">{m.status}</span>
                  </div>
                  <p className="text-slate-400">{m.name || 'Machine Offline'}</p>
                </div>
                <button
                  onClick={() => alert(`Remote reboot signal sent to ${m.id}`)}
                  className="op-btn-ghost text-xs px-2 py-1 bg-rose-900/30 text-rose-300 hover:bg-rose-900/50 rounded"
                >
                  Reboot
                </button>
              </div>
            ))}

            {lowStockSlots.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/25 flex items-start justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                    <span className="font-medium text-white">Low Stock Warning</span>
                    <span className="op-pill-amber px-1 rounded text-[10px]">{lowStockSlots.length} Slots</span>
                  </div>
                  <p className="text-slate-400">Items below threshold (≤5 units remaining)</p>
                </div>
              </div>
            )}

            {activeAlarms.map((a, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/25 flex items-start justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                    <span className="font-mono-code font-bold text-white">{a.machineId}</span>
                    <span className="op-pill-amber px-1 rounded text-[10px]">{a.severity}</span>
                  </div>
                  <p className="text-slate-400">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================
          ROW 4: DATA TABLES (FLEET HEALTH & RECENT TRANSACTIONS)
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Fleet Health Status Table (6 Cols) */}
        <div className="lg:col-span-6 op-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Fleet Machine Health</h3>
                <p className="text-xs text-slate-400 mt-0.5">Live connectivity and hardware status</p>
              </div>
              <span className="text-xs text-slate-500 font-mono-code">{machines.length} Total Units</span>
            </div>

            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-y border-slate-800/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/50">
                    <th className="py-2.5 px-4">Machine</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Hardware</th>
                    <th className="py-2.5 px-4">Stock</th>
                    <th className="py-2.5 px-4">Last Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {machines.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20">
                      <td className="py-3 px-4">
                        <div className="font-mono-code font-medium text-white">{m.id}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{m.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          m.status === 'ONLINE' ? 'op-pill-emerald' : m.status === 'ERROR' ? 'op-pill-rose' : 'op-pill-neutral'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${m.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-slate-400 font-mono-code text-[11px]">
                          <span className="flex items-center gap-0.5"><Wifi size={11} /> {m.signal}/5</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5"><Thermometer size={11} /> {m.temp}°C</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-12 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${m.stock > 40 ? 'bg-emerald-500' : m.stock > 15 ? 'bg-amber-400' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, m.stock)}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-mono-code text-slate-400">{m.stock}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono-code text-[11px]">
                        {m.lastSync || 'Active'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Transactions Stream Table (6 Cols) */}
        <div className="lg:col-span-6 op-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Live Transaction Stream</h3>
                <p className="text-xs text-slate-400 mt-0.5">Real-time sale records and profit margins</p>
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter transactions..."
                  value={searchTx}
                  onChange={e => setSearchTx(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs bg-slate-900/90 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44"
                />
              </div>
            </div>

            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-y border-slate-800/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/50">
                    <th className="py-2.5 px-4">Ref / Time</th>
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredRecentTxs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        No transactions match your search filter
                      </td>
                    </tr>
                  ) : (
                    filteredRecentTxs.slice(0, 7).map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="py-2.5 px-4">
                          <div className="font-mono-code text-[11px] text-slate-300">{t.refNo || t.id.slice(0, 10)}</div>
                          <div className="text-[10px] text-slate-500 font-mono-code">
                            {new Date(t.timestamp).toLocaleTimeString('en-MY', { hour12: false })}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="text-slate-200 truncate max-w-[140px]">{t.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono-code">{t.slotId || 'Slot --'}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="op-pill-neutral text-[10px] px-1.5 py-0.5 rounded font-mono-code">
                            {t.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-code font-medium text-slate-200">
                          {formatRM(t.amount)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono-code font-medium text-emerald-400">
                          {formatRM(typeof t.cost === 'number' ? t.amount - t.cost : t.amount * 0.4)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Showing {Math.min(7, filteredRecentTxs.length)} of {transactions.length} total records</span>
            <span className="font-mono-code text-slate-500">Live feed auto-refreshes</span>
          </div>
        </div>

      </div>

      {/* =========================================================
          MODALS / DRAWERS: Cost Master & Smart Excel Import
          ========================================================= */}
      {modalState !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <button
              onClick={() => setModalState('none')}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>

            {modalState === 'cost' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <h2 className="text-lg font-semibold text-white">Product Cost Master (COGS)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Upload and manage commodity wholesale costs for precise P&L calculations.</p>
                </div>
                <ProductCostUploader onUploaded={() => setModalState('none')} />
              </div>
            )}

            {modalState === 'import' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <h2 className="text-lg font-semibold text-white">Smart Excel / TCN Sales Import</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Import historical machine batches and sync slot configurations.</p>
                </div>
                <SmartExcelImport onImportSuccess={(txs, inv) => {
                  if (onDataImported) onDataImported(txs, inv);
                  setModalState('none');
                }} />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
