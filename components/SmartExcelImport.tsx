import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, FileSpreadsheet, CheckCircle, RefreshCw, Cpu, 
  BarChart3, ArrowRight, Zap, Loader2, ShieldCheck, AlertCircle, Clock, Split 
} from 'lucide-react';
import { saveBulkTransactions, saveBulkStock, getInventory, getTransactions, notify } from '../services/db'; 
import { Transaction } from '../types';

interface SmartExcelImportProps {
  onDataImported: (data: any[], inventory: any[]) => void;
}

// --- 🗺️ PETA NAMA MESIN (MAPPING CONFIG) ---
const MACHINE_NAME_MAP: Record<string, string> = {
    "VMCHERAS-T4/iskandar": "VM UPTM CHERAS TINGKAT 4",
    "VMCHERAS-5": "VM UPTM CHERAS TINGKAT 5",
    "test": "KPTM Bangi",
    "HQ-Pantry": "Rozita HQ - Pantry"
};

// --- 🧠 AI PARSER ENGINE V13 (SPLIT DATE & TIME) ---
const GEMINI_PARSER = {
  detectHeaders: (headers: string[]) => {
    const map = { machine: -1, product: -1, amount: -1, date: -1, time: -1, payment: -1, id: -1 };
    
    headers.forEach((h, idx) => {
      if (!h) return;
      const textClean = h.toLowerCase().trim(); 
      const textNoSpace = textClean.replace(/[^a-z0-9]/g, '');

      // 1. ID
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

      // 6. DATE (Kolum Khas Date)
      else if (['date', 'transdate', 'tarikh'].some(k => textNoSpace === k)) map.date = idx;
      else if (map.date === -1 && textNoSpace.includes('date') && !textNoSpace.includes('time')) map.date = idx;

      // 7. TIME (Kolum Khas Time)
      else if (['time', 'transtime', 'masa', 'jam'].some(k => textNoSpace === k)) map.time = idx;
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

  // 🔥 FUNGSI GABUNGAN TARIKH & MASA DARI DUA KOLUM BERBEZA
  mergeDateTime: (rawDate: any, rawTime: any, fileDateFallback: string): string => {
    try {
        // --- 1. PROSES DATE ---
        let YYYY = "2026", MM = "01", DD = "01";
        
        if (rawDate) {
            // Jika Excel Serial Number (e.g. 45664)
            if (typeof rawDate === 'number') {
                const dateInfo = new Date(Math.floor(rawDate - 25569) * 86400 * 1000);
                YYYY = String(dateInfo.getFullYear());
                MM = String(dateInfo.getMonth() + 1).padStart(2, '0');
                DD = String(dateInfo.getDate()).padStart(2, '0');
            } else {
                // Jika String "7/1/2026"
                const dStr = String(rawDate).trim();
                const parts = dStr.split(/[\/\-\.]/);
                if (parts.length === 3) {
                    DD = parts[0].padStart(2, '0');
                    MM = parts[1].padStart(2, '0');
                    YYYY = parts[2];
                    if (YYYY.length === 2) YYYY = "20" + YYYY;
                } else {
                    // Fallback guna tarikh fail
                    const fd = fileDateFallback.split('-');
                    YYYY = fd[0]; MM = fd[1]; DD = fd[2];
                }
            }
        } else {
             const fd = fileDateFallback.split('-');
             YYYY = fd[0]; MM = fd[1]; DD = fd[2];
        }

        // --- 2. PROSES TIME ---
        let HH = 0, MIN = 0, SEC = 0;

        if (rawTime !== undefined && rawTime !== null) {
            // Jika Excel Fraction (e.g. 0.3180555 = 7:38 AM)
            if (typeof rawTime === 'number') {
                // Convert fraction day to seconds
                const totalSeconds = Math.round(rawTime * 86400); 
                HH = Math.floor(totalSeconds / 3600);
                MIN = Math.floor((totalSeconds % 3600) / 60);
                SEC = totalSeconds % 60;
            } else {
                // Jika String "7:38:00 AM"
                const tStr = String(rawTime).trim().toUpperCase();
                const isPM = tStr.includes("PM");
                const isAM = tStr.includes("AM");
                
                // Buang AM/PM dan split
                const cleanTime = tStr.replace(/[APM]/g, '').trim();
                const parts = cleanTime.split(':');
                
                if (parts.length >= 2) {
                    HH = parseInt(parts[0]);
                    MIN = parseInt(parts[1]);
                    SEC = parts[2] ? parseInt(parts[2]) : 0;
                }

                // Convert 12h -> 24h
                if (isPM && HH < 12) HH += 12;
                if (isAM && HH === 12) HH = 0;
            }
        } else {
            // Kalau tiada kolum time, default 12 tengahari
            HH = 12; 
        }

        // --- 3. GABUNGKAN ---
        const finalTime = `${String(HH).padStart(2,'0')}:${String(MIN).padStart(2,'0')}:${String(SEC).padStart(2,'0')}`;
        return `${YYYY}-${MM}-${DD}T${finalTime}`;

    } catch (e) {
        console.error("Merge Date Error:", e);
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
        const fileDateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
        const fileDateStr = fileDateMatch ? fileDateMatch[0] : manualDate;

        rawData.forEach((row: any, rowIndex) => {
            const firstVal = Object.values(row)[0] as string;
            if (firstVal && typeof firstVal === 'string' && (firstVal.toLowerCase().includes('total') || firstVal.toLowerCase().includes('jumlah'))) return;

            let amount = 0;
            if (headerMap.amount !== -1) amount = GEMINI_PARSER.cleanAmount(row[headers[headerMap.amount]]);
            else amount = GEMINI_PARSER.cleanAmount(row['Original Amount'] || row['Amount'] || row['Price'] || 0);

            if (amount > 0) {
                let rawProdName = 'Unknown Product';
                if (headerMap.product !== -1) rawProdName = row[headers[headerMap.product]];
                else rawProdName = row['ProdDesc'] || row['Product'] || 'Item';
                rawProdName = rawProdName ? String(rawProdName) : 'Unknown Product';

                // --- GUNA MERGE DATE TIME V13 ---
                // Kita ambil raw data dari kolum Date dan kolum Time
                const rawDateVal = headerMap.date !== -1 ? row[headers[headerMap.date]] : null;
                const rawTimeVal = headerMap.time !== -1 ? row[headers[headerMap.time]] : null;
                
                const timestamp = GEMINI_PARSER.mergeDateTime(rawDateVal, rawTimeVal, fileDateStr);

                let rawMachine = 'Unknown';
                if (headerMap.machine !== -1) rawMachine = row[headers[headerMap.machine]];
                else rawMachine = row['User Name'] || row['Username'] || row['TerminalID'] || 'Unknown';
                const finalMachineName = GEMINI_PARSER.resolveMachineName(rawMachine);

                let payMethod = 'Cash';
                if (headerMap.payment !== -1) payMethod = row[headers[headerMap.payment]];
                else payMethod = row['Payment Method'] || row['PayType'] || 'Cash';
                if (!payMethod || String(payMethod).trim() === '') payMethod = 'Cash';

                // ID Unik
                let uniqueRef = '';
                if (headerMap.id !== -1) uniqueRef = String(row[headers[headerMap.id]]);
                else uniqueRef = row['TransId'] || row['TransID'] || row['No'] || row['Reference'] || row['RefNo'];

                if (!uniqueRef || uniqueRef === 'undefined') {
                   const cleanTime = timestamp.replace(/[^0-9]/g, ''); 
                   const cleanMachine = finalMachineName.replace(/[^a-zA-Z0-9]/g, '');
                   uniqueRef = `GEN-${cleanMachine}-${cleanTime}-${amount}`;
                }

                allTransactions.push({
                    id: `IMP-${uniqueRef}`, 
                    refNo: String(uniqueRef), 
                    paymentId: row['Merchant RefNo'] || `XL-${rowIndex}`,
                    productName: rawProdName,
                    amount: amount,
                    currency: 'MYR',
                    status: 'SUCCESS',
                    paymentMethod: payMethod,
                    timestamp: timestamp, // Hasil gabungan Date + Time
                    machineId: finalMachineName,
                    slotId: 'UNKNOWN' 
                });
                grandTotalAmount += amount;
            }
        });
      } catch (err) {
        console.error(`❌ Gagal baca fail ${file.name}:`, err);
      }
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
            if (existingRefs.has(String(tx.refNo))) {
                skippedCount++; 
                return; 
            }

            const txProdNameSafe = (tx.productName || '').toString().toLowerCase().trim();
            const matchedSlot = currentInventory.find(s => {
                const slotNameSafe = (s.productName || '').toString().toLowerCase().trim();
                return slotNameSafe && (slotNameSafe === txProdNameSafe || txProdNameSafe.includes(slotNameSafe));
            });

            if (matchedSlot) {
                const currentCount = stockUpdates[matchedSlot.id] !== undefined 
                    ? stockUpdates[matchedSlot.id] 
                    : matchedSlot.currentStock;
                stockUpdates[matchedSlot.id] = Math.max(0, currentCount - 1);
                tx.slotId = matchedSlot.id;
            } else {
                tx.slotId = 'UNKNOWN';
            }

            newUniqueTransactions.push(tx);
            existingRefs.add(String(tx.refNo));
        });

        if (newUniqueTransactions.length > 0) {
            saveBulkTransactions(newUniqueTransactions);
            if (Object.keys(stockUpdates).length > 0) saveBulkStock(stockUpdates);
            notify(`Berjaya! ${newUniqueTransactions.length} data baru disimpan.`, 'success');
        } else {
            notify(`Tiada data baru. ${skippedCount} duplicate.`, 'info');
        }

        if (onDataImported) onDataImported(newUniqueTransactions, getInventory());
        setParsedRows([]);
        setFiles([]);
        setImportStats(null);
        setTimeout(() => window.location.reload(), 2000);

    } catch (e) {
        console.error("IMPORT ERROR:", e);
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
        } catch (error) { resolve([]); }
      };
      reader.readAsBinaryString(file);
    });
  };

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFiles(Array.from(e.target.files));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 mb-6 transition-all relative overflow-hidden group hover:shadow-xl duration-500 animate-in slide-in-from-top-4">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Cpu size={150} className="animate-pulse" />
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-md">
            <FileSpreadsheet size={24} />
        </div>
        <div>
            Smart Import V13 <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 ml-2 font-bold flex-inline items-center gap-1"><Split size={10}/> Separate Date & Time</span>
            <p className="text-xs text-slate-500 mt-0.5">Gabung Kolum Date & Kolum Time secara automatik.</p>
        </div>
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
            <div className={`
                border-2 border-dashed rounded-xl p-8 text-center relative flex flex-col items-center justify-center min-h-[200px] cursor-pointer transition-colors
                ${files.length > 0 ? 'border-emerald-400 bg-emerald-50/50' : 'border-indigo-200 bg-slate-50 hover:bg-indigo-50'}
            `}>
                <input type="file" accept=".xlsx, .xls, .csv" multiple onChange={handleFileDrop} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                {files.length > 0 ? (
                    <div className="animate-in zoom-in duration-300">
                        <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3 animate-bounce" />
                        <p className="text-emerald-800 font-bold text-lg">{files.length} Fail Dipilih</p>
                    </div>
                ) : (
                    <div>
                        <Upload size={40} className="text-indigo-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-slate-700 font-bold text-lg">Drop fail Excel di sini</p>
                        <p className="text-xs text-slate-400 mt-2">Support: Kolum 'Date' & 'Time' berasingan.</p>
                    </div>
                )}
            </div>
        </div>

        <div className="flex flex-col justify-between">
            {isProcessing ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-xl animate-pulse border border-slate-200">
                    <Loader2 className="animate-spin mb-3 text-indigo-500" size={32} />
                    <p className="font-medium">Menganalisis Tarikh & Masa...</p>
                </div>
            ) : parsedRows.length > 0 ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg">
                        <div className="flex items-center gap-2 mb-4 border-b border-white/20 pb-2">
                            <Zap size={18} className="text-yellow-300" />
                            <span className="font-bold tracking-wide text-sm uppercase">Sedia Untuk Import</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-emerald-100 uppercase font-medium">Rekod Baru</p>
                                <p className="text-3xl font-bold">{importStats?.totalRows}</p>
                            </div>
                            <div>
                                <p className="text-xs text-emerald-100 uppercase font-medium">Jumlah Nilai</p>
                                <p className="text-3xl font-bold">RM {importStats?.totalAmount?.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-start gap-2 text-xs bg-black/10 p-2 rounded text-emerald-50">
                            <ShieldCheck size={14} className="shrink-0 mt-0.5"/>
                            TransId Duplicate akan ditolak.
                        </div>
                    </div>
                    <button 
                        onClick={commitImport}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-95"
                    >
                        <span>SAHKAN & IMPORT</span>
                        <ArrowRight size={20} />
                    </button>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <BarChart3 size={32} className="mb-2 opacity-50"/>
                    <p className="text-center text-sm">Upload Excel untuk mulakan.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SmartExcelImport;