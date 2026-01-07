import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, FileSpreadsheet, CheckCircle, RefreshCw, Cpu, 
  BarChart3, ArrowRight, Zap, Loader2, ShieldCheck, 
  AlertCircle, Clock, Split, Trash2, FileText, Layout 
} from 'lucide-react';
import { 
  saveBulkTransactions, 
  saveBulkStock, 
  getInventory, 
  getTransactions, 
  notify 
} from '../services/db'; 
import { Transaction, ProductSlot } from '../types';

interface SmartExcelImportProps {
  onDataImported: (data: any[], inventory: any[]) => void;
}

// --- 🗺️ PETA NAMA MESIN (MAPPING CONFIG) ---
const MACHINE_NAME_MAP: Record<string, string> = {
    "VMCHERAS-T4/iskandar": "VM UPTM CHERAS TINGKAT 4",
    "VMCHERAS-5": "VM UPTM CHERAS TINGKAT 5",
    "test": "KPTM Bangi",
    "HQ-Pantry": "Rozita HQ - Pantry",
    "LRT-KLCC": "LRT Station - KLCC"
};

// --- 🧠 AI PARSER ENGINE V15 (STRICT STRING & DUAL COLUMN) ---
const GEMINI_PARSER = {
  detectHeaders: (headers: string[]) => {
    const map = { machine: -1, product: -1, amount: -1, date: -1, time: -1, payment: -1, id: -1 };
    
    headers.forEach((h, idx) => {
      if (!h) return;
      const textClean = h.toLowerCase().trim(); 
      const textNoSpace = textClean.replace(/[^a-z0-9]/g, '');

      // 1. ID / TRANS ID (Kunci Anti-Duplicate)
      if (['transid', 'transno', 'refno', 'orderno', 'reference', 'id'].some(k => textNoSpace === k)) map.id = idx;
      else if (map.id === -1 && ['trans', 'ref'].some(k => textNoSpace.includes(k))) map.id = idx;

      // 2. MACHINE
      else if (textClean === 'user name' || textClean === 'username') map.machine = idx;
      else if (map.machine === -1 && ['terminalid', 'merchantname', 'machine', 'mesin'].some(k => textNoSpace.includes(k))) map.machine = idx;
      
      // 3. PRODUCT
      else if (['proddesc', 'product', 'item', 'produk'].some(k => textNoSpace.includes(k))) map.product = idx;
      
      // 4. AMOUNT
      else if (['originalamount', 'amount', 'price', 'harga', 'total'].some(k => textNoSpace.includes(k)) && !textNoSpace.includes('qty')) map.amount = idx;
      
      // 5. PAYMENT
      else if (['paymentmethod', 'paytype', 'kaedah'].some(k => textNoSpace.includes(k))) map.payment = idx;

      // 6. DATE (Kolum Berasingan)
      else if (textClean === 'date' || textClean === 'tarikh') map.date = idx;
      else if (map.date === -1 && textNoSpace.includes('date') && !textNoSpace.includes('time')) map.date = idx;

      // 7. TIME (Kolum Berasingan)
      else if (textClean === 'time' || textClean === 'masa') map.time = idx;
      else if (map.time === -1 && textNoSpace.includes('time')) map.time = idx;
    });
    return map;
  },

  cleanAmount: (raw: any): number => {
    if (typeof raw === 'number') return raw;
    if (!raw) return 0;
    const str = raw.toString();
    const clean = str.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
  },

  // 🔥 FUNGSI GABUNGAN: DD/MM/YYYY + HH:MM:SS AM/PM
  mergeDateTime: (rawDate: any, rawTime: any, fileDateFallback: string): string => {
    try {
        let YYYY = "2026", MM = "01", DD = "01";
        let HH = 0, MIN = 0, SEC = 0;

        // 1. PARSE DATE (7/1/2026)
        if (rawDate) {
            if (typeof rawDate === 'number') {
                const dObj = new Date(Math.floor(rawDate - 25569) * 86400 * 1000);
                YYYY = String(dObj.getFullYear());
                MM = String(dObj.getMonth() + 1).padStart(2, '0');
                DD = String(dObj.getDate()).padStart(2, '0');
            } else {
                const dStr = String(rawDate).trim();
                const dParts = dStr.split(/[\/\-\.]/);
                if (dParts.length === 3) {
                    DD = dParts[0].padStart(2, '0');
                    MM = dParts[1].padStart(2, '0');
                    YYYY = dParts[2].length === 2 ? "20" + dParts[2] : dParts[2];
                }
            }
        } else {
            const fd = fileDateFallback.split('-');
            YYYY = fd[0]; MM = fd[1]; DD = fd[2];
        }

        // 2. PARSE TIME (3:51:57 AM)
        if (rawTime !== undefined && rawTime !== null) {
            if (typeof rawTime === 'number') {
                const totalSeconds = Math.round(rawTime * 86400); 
                HH = Math.floor(totalSeconds / 3600);
                MIN = Math.floor((totalSeconds % 3600) / 60);
                SEC = totalSeconds % 60;
            } else {
                const tStr = String(rawTime).trim().toUpperCase();
                const isPM = tStr.includes("PM");
                const isAM = tStr.includes("AM");
                const cleanTime = tStr.replace(/[APM\s]/g, '');
                const tParts = cleanTime.split(':');
                
                if (tParts.length >= 2) {
                    HH = parseInt(tParts[0]);
                    MIN = parseInt(tParts[1]);
                    SEC = tParts[2] ? parseInt(tParts[2]) : 0;
                    if (isPM && HH < 12) HH += 12;
                    if (isAM && HH === 12) HH = 0;
                }
            }
        }

        return `${YYYY}-${MM}-${DD}T${String(HH).padStart(2, '0')}:${String(MIN).padStart(2, '0')}:${String(SEC).padStart(2, '0')}`;
    } catch (e) {
        return `${fileDateFallback}T12:00:00`;
    }
  },

  resolveMachineName: (rawName: string) => {
      if (!rawName) return 'Unknown Machine';
      const cleanRaw = rawName.toString().trim();
      return MACHINE_NAME_MAP[cleanRaw] || cleanRaw;
  }
};

const SmartExcelImport: React.FC<SmartExcelImportProps> = ({ onDataImported }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStats, setImportStats] = useState<any>(null);
  const [parsedRows, setParsedRows] = useState<Transaction[]>([]);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (files.length > 0) processFiles(files);
    else { setParsedRows([]); setImportStats(null); }
  }, [files]);

  const processFiles = async (fileList: File[]) => {
    setIsProcessing(true);
    let allTransactions: Transaction[] = [];
    let grandTotalAmount = 0;

    for (const file of fileList) {
      try {
        const rawData = await readExcelFile(file);
        if (rawData.length === 0) continue;

        const headers = Object.keys(rawData[0]);
        const headerMap = GEMINI_PARSER.detectHeaders(headers);
        const fileDateStr = manualDate;

        rawData.forEach((row: any, rowIndex) => {
            const firstVal = Object.values(row)[0];
            if (firstVal && typeof firstVal === 'string' && (firstVal.toLowerCase().includes('total') || firstVal.toLowerCase().includes('jumlah'))) return;

            const amount = GEMINI_PARSER.cleanAmount(headerMap.amount !== -1 ? row[headers[headerMap.amount]] : (row['Original Amount'] || row['Amount'] || 0));

            if (amount > 0) {
                const rawProdName = String(headerMap.product !== -1 ? row[headers[headerMap.product]] : (row['ProdDesc'] || row['Product'] || 'Item'));
                const rawDateVal = headerMap.date !== -1 ? row[headers[headerMap.date]] : null;
                const rawTimeVal = headerMap.time !== -1 ? row[headers[headerMap.time]] : null;
                const timestamp = GEMINI_PARSER.mergeDateTime(rawDateVal, rawTimeVal, fileDateStr);

                const rawMachine = String(headerMap.machine !== -1 ? row[headers[headerMap.machine]] : (row['User Name'] || row['Username'] || 'Unknown'));
                const finalMachineName = GEMINI_PARSER.resolveMachineName(rawMachine);
                const payMethod = String(headerMap.payment !== -1 ? row[headers[headerMap.payment]] : (row['Payment Method'] || 'Cash')) || 'Cash';

                let uniqueRef = headerMap.id !== -1 ? String(row[headers[headerMap.id]]) : (row['TransId'] || row['No'] || `GEN-${Date.now()}-${rowIndex}`);

                allTransactions.push({
                    id: `IMP-${uniqueRef}`, 
                    refNo: uniqueRef, 
                    paymentId: row['Merchant RefNo'] || `XL-${rowIndex}`,
                    productName: rawProdName,
                    amount: amount,
                    currency: 'MYR',
                    status: 'SUCCESS',
                    paymentMethod: payMethod,
                    timestamp: timestamp, 
                    machineId: finalMachineName,
                    slotId: 'UNKNOWN' 
                });
                grandTotalAmount += amount;
            }
        });
      } catch (err) { console.error("File processing error:", err); }
    }

    if (allTransactions.length > 0) {
      setParsedRows(allTransactions);
      setImportStats({ totalRows: allTransactions.length, totalAmount: grandTotalAmount });
    }
    setIsProcessing(false);
  };

  const commitImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);

    try {
        const currentInventory = getInventory();
        const existingTransactions = getTransactions();
        const existingRefs = new Set(existingTransactions.map(t => String(t.refNo)));
        
        const newUniqueTransactions: Transaction[] = [];
        const stockUpdates: Record<string, number> = {};
        let skippedCount = 0;

        parsedRows.forEach(tx => {
            if (existingRefs.has(String(tx.refNo))) { skippedCount++; return; }

            const txProdNameSafe = (tx.productName || '').toString().toLowerCase().trim();
            const matchedSlot = currentInventory.find(s => {
                const slotNameSafe = (s.productName || '').toString().toLowerCase().trim();
                return slotNameSafe && (slotNameSafe === txProdNameSafe || txProdNameSafe.includes(slotNameSafe));
            });

            if (matchedSlot) {
                const currentCount = stockUpdates[matchedSlot.id] !== undefined ? stockUpdates[matchedSlot.id] : matchedSlot.currentStock;
                stockUpdates[matchedSlot.id] = Math.max(0, currentCount - 1);
                tx.slotId = matchedSlot.id;
            }

            newUniqueTransactions.push(tx);
            existingRefs.add(String(tx.refNo));
        });

        if (newUniqueTransactions.length > 0) {
            saveBulkTransactions(newUniqueTransactions);
            if (Object.keys(stockUpdates).length > 0) saveBulkStock(stockUpdates);
            notify(`Berjaya! ${newUniqueTransactions.length} rekod disimpan.`, 'success');
        } else {
            notify(`Tiada data baru ditambah. (${skippedCount} duplicate)`, 'info');
        }

        if (onDataImported) onDataImported(newUniqueTransactions, getInventory());
        setParsedRows([]);
        setFiles([]);
        setImportStats(null);
        setTimeout(() => window.location.reload(), 1500);

    } catch (e) {
        console.error("COMMIT ERROR:", e);
        notify("Gagal simpan data.", 'error');
    }
    setIsProcessing(false);
  };

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'binary' });
          resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
        } catch (err) { resolve([]); }
      };
      reader.readAsBinaryString(file);
    });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 mb-6 relative overflow-hidden group transition-all duration-500 hover:border-indigo-300 animate-in slide-in-from-top-4">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
        <Cpu size={180} className="text-indigo-600" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-indigo-200 shadow-lg">
              <FileSpreadsheet size={24} />
            </div>
            Smart Import Engine V15
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" /> 
            Anti-Duplicate Active • Separate Column Mode • Bulk Cloud Sync
          </p>
        </div>

        {parsedRows.length > 0 && (
          <button onClick={() => {setFiles([]); setParsedRows([]);}} className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors">
            <Trash2 size={14} /> Padam Pilihan
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dropzone */}
        <div className="relative">
          <div className={`
            border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[220px] transition-all duration-300
            ${files.length > 0 ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-300 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-400'}
          `}>
            <input type="file" accept=".xlsx, .xls, .csv" multiple onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
            {files.length > 0 ? (
              <div className="animate-in zoom-in duration-300 flex flex-col items-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
                  <CheckCircle size={40} />
                </div>
                <p className="text-emerald-900 font-black text-lg">{files.length} Fail Dipilih</p>
                <div className="flex gap-2 mt-2">
                  {files.map((f, i) => <span key={i} className="text-[10px] bg-white border border-emerald-200 px-2 py-0.5 rounded-full text-emerald-600">{f.name}</span>)}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={36} />
                </div>
                <p className="text-slate-700 font-bold text-lg">Hantar Fail Laporan Anda</p>
                <p className="text-xs text-slate-400 mt-2 px-10">Sistem akan analisis kolum <span className="text-indigo-600 font-bold">Date</span> & <span className="text-indigo-600 font-bold">Time</span> secara automatik.</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex flex-col">
          {isProcessing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-100">
              <div className="relative">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-500" size={16} />
              </div>
              <p className="font-bold text-slate-600">Menganalisis Kolum...</p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">AI Engine Processing</p>
            </div>
          ) : parsedRows.length > 0 ? (
            <div className="flex-1 flex flex-col space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                <div className="absolute -bottom-4 -right-4 opacity-10">
                  <BarChart3 size={100} />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={18} className="text-yellow-300 fill-yellow-300" />
                  <span className="font-black tracking-widest text-xs uppercase opacity-80">Data Analysis Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-6 relative z-10">
                  <div className="space-y-1">
                    <p className="text-xs text-indigo-100 font-bold">REKOD DIJUMPA</p>
                    <p className="text-4xl font-black">{importStats?.totalRows}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-indigo-100 font-bold">JUMLAH JUALAN</p>
                    <p className="text-4xl font-black">RM {importStats?.totalAmount?.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-3">
                <ShieldCheck size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Sistem telah ditala untuk format <span className="font-bold">Hari/Bulan/Tahun</span> dan <span className="font-bold">Masa AM/PM</span>. Duplicate berdasarkan <span className="font-bold">TransId</span> akan dibuang secara automatik.
                </p>
              </div>

              <button 
                onClick={commitImport}
                className="group relative w-full bg-slate-900 hover:bg-black text-white font-black py-5 px-6 rounded-2xl shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">SAHKAN & IMPORT KE CLOUD</span>
                <ArrowRight size={20} className="relative z-10 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <Layout size={40} className="mb-3 opacity-20" />
              <p className="text-center text-sm font-medium px-10">Sila pilih fail Excel/CSV untuk memulakan analisis data jualan pintar.</p>
              <div className="flex gap-4 mt-4 opacity-30">
                <div className="flex items-center gap-1 text-[10px]"><FileText size={10}/> .XLSX</div>
                <div className="flex items-center gap-1 text-[10px]"><FileText size={10}/> .CSV</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartExcelImport;