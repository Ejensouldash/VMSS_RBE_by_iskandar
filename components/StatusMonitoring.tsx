import React, { useState, useEffect } from 'react';
import { 
  Wifi, WifiOff, Thermometer, DoorOpen, DoorClosed, 
  Banknote, Coins, CreditCard, AlertTriangle, RefreshCw, 
  MoreVertical, Power, Search, Filter, X, Activity, Server, ShieldAlert, CloudLightning
} from 'lucide-react';
import { notify, getMachines, updateMachineStatus, mergeTransactions } from '../services/db';
import { detectAnomalies } from '../services/ai';
import { fetchLiveMachineStatus, fetchSalesHistory } from '../services/tcn'; 
import { Machine } from '../types';

export default function StatusMonitoring() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [rebootingId, setRebootingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // AI State
  const [healthScore, setHealthScore] = useState(100);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    // Cuba ambil dari localStorage dulu
    const data = getMachines();
    setMachines(data);
    const aiResult = detectAnomalies(data);
    setHealthScore(aiResult.score);
    setAnomalies(aiResult.issues);
  };

  const handleSyncTCN = async () => {
    setIsSyncing(true);
    notify("🚀 Memulakan Deep Sync dengan TCN Cloud...", 'info');
    
    try {
      // 1. Tarik Status Mesin (Live Telemetry)
      const statusResult = await fetchLiveMachineStatus();
      
      if (statusResult.success) {
        // Update State & LocalStorage (Machines)
        setMachines(statusResult.data);
        localStorage.setItem('vmms_machines', JSON.stringify(statusResult.data));
        
        // Update AI Analysis on fresh data
        const aiResult = detectAnomalies(statusResult.data);
        setHealthScore(aiResult.score);
        setAnomalies(aiResult.issues);

        // 2. Tarik Data Jualan 30 Hari Terakhir (Deep Sync)
        notify("📊 Menarik sejarah jualan 30 hari...", 'info');
        const salesResult = await fetchSalesHistory(30);

        if (salesResult.success) {
             // A. Simpan Ringkasan Hari Ini (Untuk Dashboard card)
             const salesData = {
                 total: salesResult.totalSalesToday,
                 count: salesResult.transactions.filter(t => 
                    new Date(t.timestamp).toDateString() === new Date().toDateString()
                 ).length,
                 lastUpdated: new Date().toISOString()
             };
             localStorage.setItem('vmms_sales_today', JSON.stringify(salesData));
             
             // B. Jika session cookie wujud, GANTI semua transaksi dengan data TCN (user requested real-time data)
             try {
               const sessionResp = await fetch('/session.json', { cache: 'no-store' });
               if (sessionResp.ok) {
                 const txs = salesResult.transactions || [];
                 txs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                 localStorage.setItem('vmms_transactions', JSON.stringify(txs));
                 notify(`✅ Sync Selesai! ${statusResult.data.length} Mesin Online. ${txs.length} Transaksi disimpan dari TCN.`, 'success');
               } else {
                 const addedCount = mergeTransactions(salesResult.transactions);
                 notify(`✅ Sync Selesai! ${statusResult.data.length} Mesin Online. ${addedCount} Transaksi baru ditambah.`, 'success');
               }
             } catch (e) {
               const addedCount = mergeTransactions(salesResult.transactions);
               notify(`✅ Sync Selesai! ${statusResult.data.length} Mesin Online. ${addedCount} Transaksi baru ditambah.`, 'success');
             }
             
             // C. Beritahu App.tsx untuk re-render semua komponen
             window.dispatchEvent(new Event('storage'));
             window.dispatchEvent(new Event('vmms:txs-updated'));
        } else {
             notify(`⚠️ Mesin update, tapi Sales gagal tarik.`, 'warning');
        }

      } else {
        notify(`❌ Sync Gagal: ${statusResult.error || "Tiada data diterima"}`, 'error');
      }
    } catch (e: any) {
      console.error(e);
      notify(`❌ Ralat Rangkaian: ${e.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredMachines = machines.filter(m => {
    const matchesFilter = filter === 'ALL' ? true : 
                          filter === 'ERROR' ? (m.status === 'ERROR' || m.bill !== 'OK') :
                          m.status === filter;
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleReboot = (id: string) => {
    setRebootingId(id);
    notify(`Sending reboot signal to ${id}...`, 'info');
    updateMachineStatus(id, { status: 'BOOTING', temp: 0, signal: 0 });
    refreshData();
    setTimeout(() => {
      updateMachineStatus(id, { status: 'ONLINE', temp: 4, signal: 4 });
      refreshData();
      setRebootingId(null);
      notify(`Machine ${id} rebooted successfully.`, 'success');
    }, 3000);
  };

  const StatusIcon = ({ status, ok, err }: { status: string, ok: any, err: any }) => {
    if (status === 'OK' || status === 'CLOSED') return <span className="text-emerald-500" title="Normal">{ok}</span>;
    if (status === 'UNKNOWN') return <span className="text-slate-300" title="Unknown">-</span>;
    return <span className="text-rose-500 animate-pulse" title={status}>{err}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Activity size={150} />
         </div>
         <div className="relative z-10 flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-bold ${healthScore > 80 ? 'border-emerald-500 text-emerald-400' : 'border-rose-500 text-rose-400'}`}>
              {healthScore}%
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                 Fleet Health AI 
                 <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded border border-white/20">Anomaly Detection</span>
              </h3>
              <p className="text-slate-400 text-sm">Real-time telemetry analysis of {machines.length} units.</p>
            </div>
         </div>
         <div className="relative z-10 mt-4 md:mt-0 w-full md:w-1/2">
            {anomalies.length === 0 ? (
               <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg flex items-center gap-3">
                  <Activity className="text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-100">AI Monitor: No anomalies detected. Optimum performance.</span>
               </div>
            ) : (
               <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-sm border-b border-rose-500/20 pb-1">
                     <ShieldAlert size={16} /> {anomalies.length} Anomalies Detected
                  </div>
                  <div className="max-h-20 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                     {anomalies.map((a, i) => (
                        <div key={i} className="text-xs flex justify-between">
                           <span className="text-slate-300">{a.id}: {a.message}</span>
                           <span className="text-rose-400 font-bold uppercase">{a.type}</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search Machine..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-64"
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {['ALL', 'ONLINE', 'OFFLINE', 'ERROR'].map(f => (
               <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={handleSyncTCN}
             disabled={isSyncing}
             className={`px-4 py-2 text-white rounded-lg text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-70 transition-all ${isSyncing ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'}`}
           >
             <CloudLightning size={16} className={isSyncing ? "animate-spin" : ""} />
             {isSyncing ? "Deep Sync (30 Days)..." : "Sync TCN Cloud"}
           </button>

           <button 
             onClick={async () => {
               try {
                 notify('🔁 Fetching live data from TCN...', 'info');
                 const res = await fetch('/api/tcn/fetch?days=30');
                 const json = await res.json();
                 if (json && json.success) {
                   // Directly use fetched data instead of re-fetching via proxy
                   localStorage.setItem('vmms_machines', JSON.stringify(json.machinesData || []));
                   localStorage.setItem('vmms_transactions', JSON.stringify(json.transactions || []));
                   
                   const salesData = {
                     total: json.totalToday || 0,
                     count: (json.transactions || []).filter((t: any) => new Date(t.timestamp).toDateString() === new Date().toDateString()).length,
                     lastUpdated: new Date().toISOString()
                   };
                   localStorage.setItem('vmms_sales_today', JSON.stringify(salesData));

                   // Notify all listeners
                   window.dispatchEvent(new Event('storage'));
                   window.dispatchEvent(new Event('vmms:txs-updated'));

                   notify(`✅ Fetch Complete! ${json.machines} machines, ${json.sales} transactions, Today's Sales: RM ${(json.totalToday || 0).toFixed(2)}`, 'success');
                   refreshData();
                 } else {
                   notify(`❌ Live Fetch failed: ${json.error || 'Unknown'}`, 'error');
                 }
               } catch (e: any) {
                 notify(`❌ Live Fetch Error: ${e.message}`, 'error');
               }
             }}
             className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 flex items-center gap-2"
           >
             <CloudLightning size={16} /> Fetch Live
           </button>

           <button onClick={refreshData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700">
             Refresh
           </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
              <th className="p-4">Machine</th>
              <th className="p-4 text-center">Network</th>
              <th className="p-4 text-center">Temp</th>
              <th className="p-4 text-center">Hardware</th>
              <th className="p-4">Stock</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredMachines.length === 0 ? (
                <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400">
                        {machines.length === 0 ? "Tiada data mesin. Sila tekan 'Sync TCN Cloud'." : "Tiada mesin yang sepadan dengan carian."}
                    </td>
                </tr>
            ) : (
                filteredMachines.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                    <div className="flex items-start gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full ${m.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        <div>
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{m.id}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{m.group}</div>
                        </div>
                    </div>
                    </td>
                    <td className="p-4 text-center">
                    <div className="flex justify-center flex-col items-center">
                        <Wifi className={m.signal >= 3 ? 'text-emerald-500' : 'text-rose-500'} size={20} />
                        <span className="text-[10px] text-slate-400">Signal: {m.signal}/5</span>
                    </div>
                    </td>
                    <td className="p-4 text-center">
                    <span className={`font-bold ${m.temp > 10 ? 'text-rose-600' : 'text-blue-600'}`}>{m.temp}°C</span>
                    </td>
                    <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                        <StatusIcon status={m.door} ok={<DoorClosed size={16}/>} err={<DoorOpen size={16}/>} />
                        <StatusIcon status={m.bill} ok={<Banknote size={16}/>} err={<Banknote size={16}/>} />
                    </div>
                    </td>
                    <td className="p-4">
                    <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full ${m.stock < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{width: `${m.stock}%`}}></div>
                    </div>
                    </td>
                    <td className="p-4 text-right">
                        <button onClick={() => handleReboot(m.id)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600" title="Reboot">
                        <Power size={14} />
                        </button>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}