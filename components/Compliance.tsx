import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { 
  ShieldCheck, FileText, AlertCircle, RefreshCw, CheckCircle, 
  Search, Hash, Server, Calendar, Download, Eye, UploadCloud
} from 'lucide-react';

interface ComplianceProps {
  transactions: Transaction[];
}

// --- CONFIGURATION ---
const USER_TIN = "IG50462506030"; // TIN Tuan
const COMPANY_NAME = "VMMS ENTERPRISE"; // Nama Syarikat Placeholder

const formatRM = (val: number) => 
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

// Mock UUID Generator (Nampak real macam LHDN punya ID)
const generateUUID = (ref: string) => {
  return `F${ref ? ref.substring(0,4) : 'XXXX'}-${Math.random().toString(36).substr(2,4)}-${Math.random().toString(36).substr(2,4)}`.toUpperCase();
};

const Compliance: React.FC<ComplianceProps> = ({ transactions = [] }) => {
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // --- ENGINE: CONVERT SALES TO E-INVOICE FORMAT ---
  const invoiceData = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) return [];

    return transactions.map((t, idx) => {
      const isValid = t.amount > 0;
      return {
        uuid: generateUUID(t.refNo || 'UNK'),
        internalId: t.refNo || `INV-${idx}`,
        dateTime: t.timestamp || new Date().toISOString(),
        buyerName: "General Public (Consolidated)",
        tin: USER_TIN,
        amount: t.amount || 0,
        status: isValid ? 'Valid' : 'Invalid',
        type: '01 - Invoice',
        channel: 'API Integration'
      };
    }).sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [transactions]);

  // Filter Logic
  const filteredInvoices = invoiceData.filter(inv => 
    (inv.uuid || '').toLowerCase().includes(search.toLowerCase()) || 
    (inv.internalId || '').toLowerCase().includes(search.toLowerCase())
  );

  // KPI Calculation
  const totalSubmitted = invoiceData.length;
  const totalValid = invoiceData.filter(i => i.status === 'Valid').length;
  const totalError = invoiceData.filter(i => i.status === 'Invalid').length;
  const totalAmount = invoiceData.reduce((sum, i) => sum + i.amount, 0);

  // Simulate Sync to LHDN
  const handleManualSync = () => {
    setIsSyncing(true);
    // Simulasi loading 2 saat
    setTimeout(() => setIsSyncing(false), 2000); 
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in zoom-in duration-500 font-sans">
      
      {/* --- HEADER MYINVOIS STYLE --- */}
      <div className="vm-glass p-6 rounded-xl border-l-4 border-l-indigo-500 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck size={28} className="text-indigo-400" />
            MyInvois Status Overview
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Status penghantaran e-Invois Penyatuan (Consolidated)
          </p>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="text-right hidden md:block">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tax Identification No (TIN)</p>
                <p className="font-mono text-slate-200 font-bold text-lg">{USER_TIN}</p>
            </div>
            <button 
                onClick={handleManualSync}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-bold transition-all shadow-lg hover:shadow-indigo-950/20 active:scale-95 ${
                    isSyncing ? 'bg-slate-700 cursor-not-allowed text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Menghantar Data...' : 'Sync LHDN'}
            </button>
        </div>
      </div>

      {/* --- KPI STATUS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Submitted */}
        <div className="vm-glass p-5 rounded-xl relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-indigo-950/40 text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-indigo-900/30"><Server size={20}/></div>
                <span className="text-[10px] font-bold bg-indigo-950/40 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900/30">API 2.0</span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Dokumen Dihantar</p>
            <h3 className="text-3xl font-black text-slate-200 mt-1">{totalSubmitted}</h3>
        </div>

        {/* Validated */}
        <div className="vm-glass p-5 rounded-xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-emerald-950/40 text-emerald-400 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors border border-emerald-900/30"><CheckCircle size={20}/></div>
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Status Sah (Valid)</p>
            <h3 className="text-3xl font-black text-emerald-400 mt-1">{totalValid}</h3>
            <div className="w-full bg-slate-950 h-1.5 mt-2 rounded-full overflow-hidden border border-slate-800/40">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: totalSubmitted > 0 ? `${(totalValid/totalSubmitted)*100}%` : '0%' }}></div>
            </div>
        </div>

        {/* Rejected/Error */}
        <div className="vm-glass p-5 rounded-xl relative overflow-hidden group hover:border-red-500/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-red-950/40 text-red-400 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors border border-red-900/30"><AlertCircle size={20}/></div>
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Gagal / Error</p>
            <h3 className="text-3xl font-black text-red-400 mt-1">{totalError}</h3>
        </div>

        {/* Total Tax Amount (Est) */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-5 rounded-xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-10"><FileText size={100}/></div>
            <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Jumlah Nilai Invois</p>
            <h3 className="text-3xl font-black mt-1">{formatRM(totalAmount)}</h3>
            <p className="text-[10px] text-indigo-300 mt-2 flex items-center gap-1">
                <CheckCircle size={10} /> Consolidated e-Invoice
            </p>
        </div>
      </div>

      {/* --- MAIN TABLE (LHDN STYLE) --- */}
      <div className="vm-glass rounded-xl overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-800/40 bg-slate-900/40 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-indigo-400" /> 
                Rekod Penghantaran Terkini
            </h3>
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Cari UUID atau No. Rujukan..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-900/60 text-slate-300 uppercase text-[10px] font-bold border-b border-slate-700/50 tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Tarikh & Masa</th>
                        <th className="px-6 py-4">Butiran Dokumen (UUID)</th>
                        <th className="px-6 py-4">Pembeli / Jenis</th>
                        <th className="px-6 py-4 text-right">Jumlah (MYR)</th>
                        <th className="px-6 py-4 text-center">Status LHDN</th>
                        <th className="px-6 py-4 text-center">Tindakan</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                    {filteredInvoices.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                                    <div className="p-4 bg-slate-900/40 border border-slate-800/50 rounded-full mb-3">
                                        <UploadCloud size={40} className="text-slate-500" />
                                    </div>
                                    <p className="font-bold text-slate-400">Tiada Data e-Invois</p>
                                    <p className="text-xs mt-1">Sila upload fail Excel jualan di menu 'Import Data' dahulu.</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filteredInvoices.slice(0, 50).map((inv, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors group border-b border-slate-800/40">
                                {/* Date */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                                        <Calendar size={14} className="text-slate-500" />
                                        {new Date(inv.dateTime).toLocaleDateString('en-GB')}
                                    </div>
                                    <div className="text-[10px] text-slate-500 pl-6 mt-0.5 font-mono">
                                        {new Date(inv.dateTime).toLocaleTimeString()}
                                    </div>
                                </td>

                                {/* Document UUID */}
                                <td className="px-6 py-4">
                                    <div className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded inline-block border border-indigo-900/30">
                                        {inv.uuid}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-medium">
                                        <Hash size={10} className="text-slate-500" /> Ref: {inv.internalId}
                                    </div>
                                </td>

                                {/* Buyer */}
                                <td className="px-6 py-4">
                                    <p className="font-bold text-slate-200 text-xs">{inv.buyerName}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 font-bold">{inv.type}</p>
                                </td>

                                {/* Amount */}
                                <td className="px-6 py-4 text-right">
                                    <p className="font-black text-slate-100">{formatRM(inv.amount)}</p>
                                </td>

                                {/* Status Badge (The LHDN Look) */}
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm ${
                                        inv.status === 'Valid' 
                                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                                        : 'bg-red-950/40 text-red-400 border-red-900/30'
                                    }`}>
                                        {inv.status === 'Valid' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                        {inv.status}
                                    </span>
                                </td>

                                {/* Action */}
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button title="Lihat Perincian" className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded transition-colors">
                                            <Eye size={16} />
                                        </button>
                                        <button title="Muat Turun XML/PDF" className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded transition-colors">
                                            <Download size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Pagination / Footer */}
        <div className="px-6 py-4 border-t border-slate-800/40 bg-slate-900/40 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
            <p>Memaparkan {Math.min(filteredInvoices.length, 50)} rekod terkini</p>
            <div className="flex gap-4">
                <span className="flex items-center gap-1">System: <strong className="text-emerald-400 font-bold">Connected</strong> <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div></span>
                <span className="flex items-center gap-1">Mode: <strong className="text-slate-300 font-bold">Production</strong></span>
            </div>
        </div>
      </div>

    </div>
  );
};

export default Compliance;