import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { 
  Search, Filter, ArrowDownRight, Calendar, CreditCard, 
  Monitor, ShoppingCart, Hash, Smartphone, XCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight 
} from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
}

// Helper Format Duit
const formatRM = (val: number) => 
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

const Transactions: React.FC<TransactionsProps> = ({ transactions }) => {
  // --- STATE FILTER ---
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- STATE PAGINATION (BARU) ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Tuan boleh ubah ni kalau nak paparan lebih panjang (contoh: 50)

  // Auto Reset ke Page 1 bila filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, startDate, endDate]);

  // --- LOGIC FILTER ---
  const filtered = transactions.filter(t => {
    const term = search.toLowerCase();
    
    // 1. Carian Teks
    const matchSearch = 
      (t.refNo || '').toLowerCase().includes(term) || 
      (t.productName || '').toLowerCase().includes(term) ||
      (t.machineId || '').toLowerCase().includes(term) ||
      (t.paymentMethod || '').toLowerCase().includes(term);
    
    // 2. Filter Payment Type
    let matchType = true;
    if (filterType !== 'ALL') {
        const method = (t.paymentMethod || '').toLowerCase();
        if (filterType === 'Cash') matchType = method.includes('cash') || method.includes('tunai');
        else if (filterType === 'DuitNow') matchType = method.includes('duitnow');
        else if (filterType === 'MAE') matchType = method.includes('mae');
        else if (filterType === 'TNG') matchType = method.includes('tng') || method.includes('touch');
        else if (filterType === 'Card') matchType = method.includes('card') || method.includes('debit');
    }

    // 3. Filter Date Range
    let matchDate = true;
    const txDate = new Date(t.timestamp);

    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); 
        if (txDate < start) matchDate = false;
    }

    if (endDate && matchDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); 
        if (txDate > end) matchDate = false;
    }
    
    return matchSearch && matchType && matchDate;
  });

  // --- LOGIC PAGINATION ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Helper Warna Badge Payment
  const getPaymentStyle = (method: string) => {
      const m = (method || '').toLowerCase();
      if (m.includes('cash') || m.includes('tunai')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      if (m.includes('duitnow')) return 'bg-pink-100 text-pink-700 border-pink-200'; 
      if (m.includes('mae')) return 'bg-amber-100 text-amber-700 border-amber-200'; 
      if (m.includes('tng') || m.includes('touch')) return 'bg-blue-100 text-blue-700 border-blue-200'; 
      if (m.includes('card')) return 'bg-purple-100 text-purple-700 border-purple-200';
      return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  // Fungsi Reset Date
  const clearDates = () => {
      setStartDate('');
      setEndDate('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="text-indigo-600" />
            Sejarah Transaksi
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Menunjukkan {filtered.length} rekod transaksi.
          </p>
        </div>
        
        {/* TOOLS BAR */}
        <div className="flex flex-col lg:flex-row gap-3 w-full xl:w-auto">
          
          {/* DATE RANGE PICKER */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
             <div className="relative group">
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-3 pr-2 py-1.5 text-xs font-bold text-slate-600 bg-transparent outline-none cursor-pointer uppercase"
                />
             </div>
             <span className="text-slate-300">-</span>
             <div className="relative group">
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-2 pr-3 py-1.5 text-xs font-bold text-slate-600 bg-transparent outline-none cursor-pointer uppercase"
                />
             </div>
             {(startDate || endDate) && (
                 <button onClick={clearDates} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                     <XCircle size={14} />
                 </button>
             )}
          </div>

          {/* SEARCH BOX */}
          <div className="relative group flex-1 lg:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Cari Ref, Produk..." 
              className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* FILTER DROPDOWN */}
          <div className="relative lg:w-48">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-slate-400" />
             </div>
             <select 
                className="pl-10 pr-8 py-2.5 w-full border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none cursor-pointer shadow-sm font-medium text-slate-600"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
             >
                <option value="ALL">Semua Bayaran</option>
                <option value="Cash">Tunai (Cash)</option>
                <option value="DuitNow">DuitNow QR</option>
                <option value="MAE">MAE Maybank</option>
                <option value="TNG">Touch 'n Go</option>
                <option value="Card">Debit Card</option>
             </select>
          </div>
        </div>
      </div>

      {/* --- TABLE SECTION --- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden flex flex-col min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs tracking-wider sticky top-0">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg">Tarikh & Masa</th>
                <th className="px-6 py-4">Info Transaksi</th>
                <th className="px-6 py-4">Mesin / Lokasi</th>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Kaedah Bayaran</th>
                <th className="px-6 py-4 text-right rounded-tr-lg">Amaun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="p-4 bg-slate-50 rounded-full mb-3">
                            <Search size={32} className="opacity-50" />
                        </div>
                        <p className="font-medium">Tiada rekod dijumpai.</p>
                        <p className="text-xs mt-1">Cuba ubah tarikh atau carian anda.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                    
                    {/* TARIKH */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                            <Calendar size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-700">
                                {new Date(t.timestamp).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                {new Date(t.timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                      </div>
                    </td>

                    {/* INFO TRANSAKSI */}
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <Hash size={12} className="text-slate-400" />
                                <span className="font-mono text-xs">{t.refNo}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5">ID: {t.id ? t.id.substring(0,8) : '-'}...</span>
                        </div>
                    </td>

                    {/* MESIN */}
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <Monitor size={14} className="text-slate-400" />
                            <span className="font-medium text-slate-700 truncate max-w-[140px]" title={t.machineId}>
                                {t.machineId || 'Unknown Machine'}
                            </span>
                        </div>
                    </td>

                    {/* PRODUK */}
                    <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700">{t.productName || 'Item'}</span>
                    </td>

                    {/* PAYMENT METHOD */}
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase border shadow-sm ${getPaymentStyle(t.paymentMethod || '')}`}>
                            {(t.paymentMethod || '').match(/card/i) ? <CreditCard size={10} /> : <Smartphone size={10} />}
                            {t.paymentMethod || 'Lain-lain'}
                        </span>
                    </td>

                    {/* AMOUNT */}
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 font-bold text-slate-800">
                            {formatRM(t.amount)}
                            <div className="text-emerald-500 bg-emerald-50 rounded-full p-0.5">
                                <ArrowDownRight size={12} />
                            </div>
                        </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* --- PAGINATION FOOTER (BARU) --- */}
        {filtered.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* Info Text */}
                <div className="text-xs text-slate-500 font-medium">
                    Menunjukkan <span className="font-bold text-slate-700">{indexOfFirstItem + 1}</span> hingga <span className="font-bold text-slate-700">{Math.min(indexOfLastItem, filtered.length)}</span> daripada <span className="font-bold text-slate-700">{filtered.length}</span> rekod
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                    
                    {/* First Page */}
                    <button 
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Halaman Pertama"
                    >
                        <ChevronsLeft size={16} />
                    </button>

                    {/* Previous */}
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {/* Page Indicator */}
                    <span className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs rounded-lg shadow-sm">
                        Muka {currentPage} / {totalPages}
                    </span>

                    {/* Next */}
                    <button 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>

                    {/* Last Page */}
                    <button 
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Halaman Terakhir"
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;