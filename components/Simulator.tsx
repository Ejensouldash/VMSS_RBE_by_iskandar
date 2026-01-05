import React, { useState, useEffect, useRef } from 'react';
import { VM_CONFIG } from '../lib/vm-config';
import { processBackendCallback } from '../services/db';
import { constructResponseSignature, generateSignature } from '../services/crypto';
import { Server, Play, RefreshCw, Terminal, CreditCard, ArrowRight, Trash2 } from 'lucide-react';

interface SimulatorProps {
  onUpdate: () => void;
}

const Simulator: React.FC<SimulatorProps> = ({ onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{timestamp: string, type: 'info' | 'success' | 'error', message: string}[]>([]);
  
  // Simulation Inputs
  const [slotId, setSlotId] = useState(VM_CONFIG.SLOTS[0].id);
  const [amount, setAmount] = useState(VM_CONFIG.SLOTS[0].price.toFixed(2));
  const [status, setStatus] = useState("1"); // Default Success

  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, type, message }]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSlotId = e.target.value;
    setSlotId(newSlotId);
    const product = VM_CONFIG.SLOTS.find(s => s.id === newSlotId);
    if (product) {
      setAmount(product.price.toFixed(2));
    }
  };

  const handleSimulateWebhook = async () => {
    setLoading(true);
    addLog(`Initiating Payment Simulation for ${slotId}...`, 'info');

    try {
      // 1. Construct Simulation Payload
      const refNo = `VM01-${slotId}-${Date.now()}`;
      const paymentId = Math.floor(Math.random() * 100000).toString();
      const currency = 'MYR';

      // 2. Generate Valid Signature
      addLog(`Generating HMACSHA512 Signature...`, 'info');
      
      const sourceStr = constructResponseSignature(
        VM_CONFIG.MERCHANT.KEY, 
        VM_CONFIG.MERCHANT.CODE, 
        paymentId, refNo, amount, currency, status
      );
      
      const signature = await generateSignature(sourceStr, VM_CONFIG.MERCHANT.KEY);
      addLog(`Signature Generated: ${signature.substring(0, 15)}...`, 'info');

      const payload = {
        merchantCode: VM_CONFIG.MERCHANT.CODE,
        paymentId,
        refNo,
        amount,
        currency,
        status,
        signature
      };

      // 3. Call backend endpoint (prefer server route)
      addLog(`POST /api/ipay88/backend (attempting server endpoint)`, 'info');
      try {
        const form = new FormData();
        form.append('MerchantCode', payload.merchantCode);
        form.append('PaymentId', payload.paymentId);
        form.append('RefNo', payload.refNo);
        form.append('Amount', payload.amount);
        form.append('Currency', payload.currency);
        form.append('Status', payload.status);
        form.append('Signature', payload.signature);

        const res = await fetch('/api/ipay88/backend', { method: 'POST', body: form });
        const txt = await res.text();
        if (res.ok && txt && txt.includes('RECEIVEOK')) {
          addLog(`Server Response: 200 RECEIVEOK`, 'success');
          addLog(`Transaction Successful. Inventory Deducted on server.`, 'success');
          onUpdate();
        } else {
          addLog(`Server Response: ${res.status} - ${txt}`, 'error');
          // fallback to client-side processing if server route not available
          addLog(`Falling back to local processing...`, 'info');
          const response = await processBackendCallback(payload);
          if (response.success) {
            addLog(`Local Response: ${response.message}`, 'success');
            onUpdate();
          } else {
            addLog(`Local Response Error: ${response.message}`, 'error');
          }
        }
      } catch (err: any) {
        addLog(`Network error calling server endpoint: ${err?.message || err}`, 'error');
        addLog(`Falling back to local processing...`, 'info');
        const response = await processBackendCallback(payload);
        if (response.success) {
          addLog(`Local Response: ${response.message}`, 'success');
          onUpdate();
        } else {
          addLog(`Local Response Error: ${response.message}`, 'error');
        }
      }

    } catch (e: any) {
      addLog(`System Error: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
      
      {/* Left Panel: Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white border-b border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="text-orange-400" size={24} />
            <h2 className="text-xl font-bold">Payment Gateway Simulator</h2>
          </div>
          <p className="text-slate-400 text-sm">
            Use this tool to simulate incoming callbacks from iPay88. This bypasses the actual banking network but runs the exact same backend logic (Signature Verification &rarr; Inventory Deduction).
          </p>
        </div>

        <div className="p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
           {/* Form Group */}
           <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Product Slot (RefNo Parser)</label>
                <div className="relative">
                  <select 
                    value={slotId} 
                    onChange={handleSlotChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  >
                    {VM_CONFIG.SLOTS.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.id} - {s.name} (RM {s.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-3.5 pointer-events-none text-slate-500">
                    <ArrowRight size={16} className="rotate-90" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Amount (MYR)</label>
                  <input 
                    type="text" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Payment Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 font-bold outline-none ${status === '1' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
                  >
                    <option value="1">Success (1)</option>
                    <option value="0">Failed (0)</option>
                  </select>
                </div>
              </div>
           </div>

           <div className="mt-auto pt-6 border-t border-slate-100">
             <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
               <span>Algorithm: HMACSHA512</span>
               <span>Merchant: {VM_CONFIG.MERCHANT.CODE}</span>
             </div>
             <button
                onClick={handleSimulateWebhook}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] ${
                  loading ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                {loading ? <RefreshCw className="animate-spin" /> : <Play fill="currentColor" />}
                {loading ? 'Processing Transaction...' : 'Simulate Payment'}
              </button>
           </div>
        </div>
      </div>

      {/* Right Panel: Console Logs */}
      <div className="bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden font-mono">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-emerald-500" />
            <span className="text-slate-300 text-sm font-bold">Backend Output Stream</span>
          </div>
          <button onClick={() => setLogs([])} className="text-slate-500 hover:text-white transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-2 text-sm">
          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
              <Server size={32} />
              <p>Ready to receive webhook data...</p>
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-slate-500 min-w-[80px] text-xs pt-1">{log.timestamp}</span>
              <div className={`flex-1 break-all border-l-2 pl-3 ${
                log.type === 'error' ? 'border-rose-500 text-rose-400' : 
                log.type === 'success' ? 'border-emerald-500 text-emerald-400' : 
                'border-blue-500 text-blue-300'
              }`}>
                {log.type === 'info' && <span className="text-blue-500 font-bold mr-2">INFO</span>}
                {log.type === 'success' && <span className="text-emerald-500 font-bold mr-2">OK</span>}
                {log.type === 'error' && <span className="text-rose-500 font-bold mr-2">ERR</span>}
                {log.message}
              </div>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

    </div>
  );
};

export default Simulator;