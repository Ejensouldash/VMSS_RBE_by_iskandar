
import React, { useState, useEffect } from 'react';
import { getAlarms, updateAlarmStatus, createServiceTicket, notify } from '../services/db';
import { Alarm } from '../types';
import { 
  AlertTriangle, CheckCircle, Bell, User, Clock, 
  Terminal, ShieldAlert, Wrench, Send, Filter, X 
} from 'lucide-react';

export default function Alarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [activeTab, setActiveTab] = useState<'monitoring' | 'history'>('monitoring');

  // Modals
  const [dispatchModal, setDispatchModal] = useState<Alarm | null>(null);
  const [resolveModal, setResolveModal] = useState<Alarm | null>(null);

  // Form States
  const [techName, setTechName] = useState('Ahmad (Senior Tech)');
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setAlarms(getAlarms());
  };

  const filteredAlarms = alarms.filter(a => {
    if (activeTab === 'monitoring') return a.status === 'OPEN';
    if (activeTab === 'history') return a.status === 'RESOLVED';
    return true;
  });

  const handleSubmitDispatch = () => {
    if (!dispatchModal) return;

    createServiceTicket({
       id: `TKT-${Date.now().toString().slice(-5)}`,
       alarmId: dispatchModal.id,
       machineId: dispatchModal.machineId,
       issue: dispatchModal.message,
       status: 'OPEN',
       technician: techName,
       dispatchedAt: new Date().toISOString()
    });
    
    notify(`Technician ${techName} dispatched for ${dispatchModal.machineId}.`, 'success');
    refreshData();
    setDispatchModal(null);
  };

  const handleSubmitResolve = () => {
    if (!resolveModal) return;

    updateAlarmStatus(resolveModal.id, 'RESOLVED', 'Admin', resolveNote || 'Resolved via Dashboard');
    notify(`Alarm ${resolveModal.id} marked as resolved.`, 'success');
    setResolveNote('');
    refreshData();
    setResolveModal(null);
  };

  const SeverityBadge = ({ level }: { level: string }) => {
    if (level === 'CRITICAL') return <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">CRITICAL</span>;
    if (level === 'WARNING') return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">WARNING</span>;
    return <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">INFO</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-rose-500 rounded-xl p-6 text-white shadow-lg flex items-center justify-between">
           <div>
              <p className="text-white/80 font-bold text-sm">Active Critical Alarms</p>
              <h3 className="text-3xl font-bold mt-1">{alarms.filter(a => a.status === 'OPEN' && a.severity === 'CRITICAL').length}</h3>
           </div>
           <div className="bg-white/20 p-3 rounded-lg"><ShieldAlert size={32} /></div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-slate-500 font-bold text-sm">Pending Technician</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{alarms.filter(a => a.status === 'OPEN' && !a.assignedTechnician).length}</h3>
           </div>
           <div className="bg-slate-100 p-3 rounded-lg text-slate-500"><User size={32} /></div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
           <div>
              <p className="text-slate-500 font-bold text-sm">Avg. Resolution Time</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">2.4 <span className="text-sm font-normal text-slate-400">Hours</span></h3>
           </div>
           <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600"><Clock size={32} /></div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
         
         {/* Toolbar */}
         <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
               <button 
                 onClick={() => setActiveTab('monitoring')}
                 className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'monitoring' ? 'bg-rose-100 text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Bell size={16} /> Live Feed
               </button>
               <button 
                 onClick={() => setActiveTab('history')}
                 className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'history' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <CheckCircle size={16} /> Resolution History
               </button>
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-sm">
               <Filter size={16} />
               <span>Filtering by: {activeTab === 'monitoring' ? 'Active Issues' : 'Resolved Logs'}</span>
            </div>
         </div>

         {/* List */}
         <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
            {filteredAlarms.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <CheckCircle size={64} className="text-emerald-100 mb-4" />
                  <p className="font-medium">No records found for this view.</p>
               </div>
            ) : (
               filteredAlarms.map((alarm) => (
                  <div key={alarm.id} className={`p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition-colors ${alarm.status === 'OPEN' ? 'bg-white' : 'bg-slate-50/50'}`}>
                     
                     {/* Icon status */}
                     <div className="flex-shrink-0 pt-1">
                        {alarm.severity === 'CRITICAL' ? (
                           <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 animate-pulse">
                              <AlertTriangle size={20} />
                           </div>
                        ) : alarm.severity === 'WARNING' ? (
                           <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                              <AlertTriangle size={20} />
                           </div>
                        ) : (
                           <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                              <Terminal size={20} />
                           </div>
                        )}
                     </div>

                     {/* Content */}
                     <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                           <h4 className="font-bold text-slate-900">{alarm.message}</h4>
                           <SeverityBadge level={alarm.severity} />
                           <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 rounded">{alarm.errorCode}</span>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">
                           Machine: <span className="font-bold text-slate-700">{alarm.machineId}</span> • Time: {new Date(alarm.timestamp).toLocaleString()}
                        </p>
                        
                        {alarm.assignedTechnician && (
                           <div className="text-xs text-blue-600 font-medium flex items-center gap-1 bg-blue-50 px-2 py-1 rounded w-fit">
                              <User size={12} /> Tech Dispatched: {alarm.assignedTechnician}
                           </div>
                        )}
                        {alarm.status === 'RESOLVED' && (
                           <div className="space-y-1">
                              <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                 <CheckCircle size={12} /> Resolved
                              </div>
                              {alarm.resolutionNote && (
                                <p className="text-xs text-slate-400 italic">" {alarm.resolutionNote} "</p>
                              )}
                           </div>
                        )}
                     </div>

                     {/* Actions */}
                     {alarm.status === 'OPEN' && (
                        <div className="flex items-center gap-3">
                           {!alarm.assignedTechnician && (
                             <button 
                                onClick={() => setDispatchModal(alarm)}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-bold hover:bg-slate-50 flex items-center gap-2"
                             >
                                <Send size={16} /> Dispatch Tech
                             </button>
                           )}
                           <button 
                              onClick={() => setResolveModal(alarm)}
                              className="px-4 py-2 bg-emerald-600 rounded-lg text-white text-sm font-bold hover:bg-emerald-700 shadow-md flex items-center gap-2"
                           >
                              <Wrench size={16} /> Mark Fixed
                           </button>
                        </div>
                     )}
                  </div>
               ))
            )}
         </div>
      </div>

      {/* DISPATCH MODAL */}
      {dispatchModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
               <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                  <h3 className="font-bold">Dispatch Technician</h3>
                  <button onClick={() => setDispatchModal(null)}><X size={20} className="text-slate-400 hover:text-white" /></button>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Alarm ID</label>
                     <p className="text-slate-900 font-mono text-sm">{dispatchModal.id}</p>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Issue</label>
                     <p className="text-slate-900 font-bold">{dispatchModal.message}</p>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Select Technician</label>
                     <select 
                       value={techName}
                       onChange={(e) => setTechName(e.target.value)}
                       className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                     >
                        <option>Ahmad (Senior Tech)</option>
                        <option>Siva (Field Engineer)</option>
                        <option>Chong (Maintenance)</option>
                     </select>
                  </div>
                  <button 
                    onClick={handleSubmitDispatch}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                     <Send size={16} /> Confirm Dispatch
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* RESOLVE MODAL */}
      {resolveModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
               <div className="bg-emerald-700 p-4 text-white flex justify-between items-center">
                  <h3 className="font-bold">Resolve Alarm</h3>
                  <button onClick={() => setResolveModal(null)}><X size={20} className="text-white/70 hover:text-white" /></button>
               </div>
               <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-600">
                     Are you sure you want to close alarm <span className="font-bold text-slate-900">{resolveModal.id}</span>?
                  </p>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Resolution Notes (Optional)</label>
                     <textarea 
                       value={resolveNote}
                       onChange={(e) => setResolveNote(e.target.value)}
                       placeholder="e.g., Reset sensor, cleared jam..."
                       className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none"
                     />
                  </div>
                  <button 
                    onClick={handleSubmitResolve}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                     <CheckCircle size={16} /> Mark as Resolved
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
