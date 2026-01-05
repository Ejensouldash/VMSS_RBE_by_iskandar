import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, FileSpreadsheet, CheckCircle, Trash2, RefreshCw, Cpu, 
  AlertTriangle, FileText, BarChart3, ArrowRight, Zap, Loader2 
} from 'lucide-react';
import { saveTransaction, updateSlotConfig, getInventory, notify } from '../services/db'; // Direct DB Access
import { VM_CONFIG } from '../lib/vm-config';

interface SmartExcelImportProps {
  onDataImported: (data: any[], inventory: any[]) => void;
}

// --- 🗺️ PETA NAMA MESIN (MAPPING CONFIG) ---
const MACHINE_NAME_MAP: Record<string, string> = {
    "VMCHERAS-T4/iskandar": "VM UPTM CHERAS TINGKAT 4",
    "VMCHERAS-5": "VM UPTM CHERAS TINGKAT 5",
    "test": "KPTM Bangi",
    "HQ-Pantry": "Rozita HQ - Pantry"
    // Tuan boleh tambah lagi di sini
};

// --- 🧠 AI PARSER ENGINE V7 (SERVERLESS EDITION) ---
const GEMINI_PARSER = {
  detectHeaders: (headers: string[]) => {
    const map = {
      machine: -1, product: -1, amount: -1, date: -1, time: -1, payment: -1
    };

    headers.forEach((h, idx) => {
      const textClean = h.toLowerCase().trim(); 
      const textNoSpace = textClean.replace(/[^a-z0-9]/g, '');

      if (textClean === 'user name' || textClean === 'username') map.machine = idx;
      else if (map.machine === -1 && ['terminalid', 'merchantname', 'machine', 'mesin'].some(k => textNoSpace.includes(k))) map.machine = idx;
      
      else if (['proddesc', 'product', 'item', 'produk'].some(k => textNoSpace.includes(k))) map.product = idx;
      
      else if (['originalamount', 'amount', 'price', 'harga', 'total'].some(k => textNoSpace.includes(k)) && !textNoSpace.includes('qty')) map.amount = idx;
      
      else if (['paymentmethod', 'paytype', 'kaedah'].some(k => textNoSpace.includes(k))) map.payment = idx;

      else if (['date', 'transdate', 'tradetime', 'datetime', 'time'].some(k => textNoSpace.includes(k))) {
         if (textNoSpace === 'date' || textNoSpace === 'transdate') map.date = idx;
         else if (map.date === -1) map.time = idx;
      }
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

  parseDate: (raw: any, fileDate: string): string => {
    try {
        if (!raw) return `${fileDate}T12:00:00`;
        if (typeof raw === 'number') {
            const utc_days  = Math.floor(raw - 25569);
            const utc_value = utc_days * 86400;                                        
            const date_info = new Date(utc_value * 1000);
            return date_info.toISOString();
        }
        const str = raw.toString().trim();
        if (str.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/)) return str.replace(' ', 'T');
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString();
        return `${fileDate}T12:00:00`;
    } catch (e) {
        return `${fileDate}T12:00:00`;
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
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (files.length > 0) processFiles(files);
    else { setParsedRows([]); setImportStats(null); }
  }, [files]);

  const processFiles = async (fileList: File[]) => {
    setIsProcessing(true);
    let allTransactions: any[] = [];
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

                let timestamp = `${fileDateStr}T12:00:00`;
                if (headerMap.date !== -1) timestamp = GEMINI_PARSER.parseDate(row[headers[headerMap.date]], fileDateStr);
                else if (row['Date']) timestamp = GEMINI_PARSER.parseDate(row['Date'], fileDateStr);

                let rawMachine = 'Unknown';
                if (headerMap.machine !== -1) rawMachine = row[headers[headerMap.machine]];
                else rawMachine = row['User Name'] || row['Username'] || row['TerminalID'] || 'Unknown';
                
                const finalMachineName = GEMINI_PARSER.resolveMachineName(rawMachine);

                let payMethod = 'Cash';
                if (headerMap.payment !== -1) payMethod = row[headers[headerMap.payment]];
                else payMethod = row['Payment Method'] || row['PayType'] || 'Cash';
                if (!payMethod || payMethod.trim() === '') payMethod = 'Cash';

                allTransactions.push({
                    id: `IMP-${Date.now()}-${rowIndex}-${Math.random().toString(36).substr(2,5)}`,
                    refNo: row['TransId'] || row['No'] || `REF-${Date.now()}-${rowIndex}`,
                    paymentId: row['Merchant RefNo'] || `XL-${rowIndex}`,
                    productName: rawProdName,
                    amount: amount,
                    currency: 'MYR',
                    status: 'SUCCESS',
                    paymentMethod: payMethod,
                    timestamp: timestamp,
                    machineId: finalMachineName,
                    sourceFile: file.name
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

  // --- 🔥 BAHAGIAN PENTING: COMMIT TERUS KE DB BROWSER/SUPABASE (BYPASS SERVER) ---
  const commitImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);

    try {
        let successCount = 0;
        const currentInventory = getInventory(); // Dapatkan stok semasa dari Local/Cloud

        // Proses setiap baris dalam memory browser
        for (const tx of parsedRows) {
            
            // Logic Auto-Deduct Stock (Macam server buat dulu)
            const matchedSlot = currentInventory.find(s => 
                s.productName.toLowerCase().trim() === tx.productName.toLowerCase().trim() ||
                tx.productName.toLowerCase().includes(s.productName.toLowerCase())
            );

            if (matchedSlot) {
               tx.slotId = matchedSlot.id; // Link kan slot ID
               const newStock = Math.max(0, matchedSlot.currentStock - 1);
               // Update DB terus (Sync ke Supabase automatik via db.ts)
               updateSlotConfig(matchedSlot.id, { currentStock: newStock });
            } else {
               tx.slotId = 'UNKNOWN';
            }

            // Simpan Transaksi (Sync ke Supabase automatik via db.ts)
            saveTransaction(tx);
            successCount++;
        }

        // Siap!
        notify(`Berjaya import ${successCount} transaksi!`, 'success');
        
        if (onDataImported) onDataImported(parsedRows, getInventory());
        setParsedRows([]);
        setFiles([]);
        setImportStats(null);
        
        // Refresh page sikit untuk reflect data
        setTimeout(() => window.location.reload(), 1500);

    } catch (e) {
        console.error(e);
        notify("Gagal simpan data. Sila cuba lagi.", 'error');
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
            Smart Import V7 <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 ml-2 font-mono">Cloud Edition</span>
            <p className="text-xs text-slate-500 mt-0.5">Serverless Processing • Auto-Translate Engine Active</p>
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
                        <p className="text-xs text-slate-400 mt-2">Support: .xlsx, .csv</p>
                    </div>
                )}
            </div>
        </div>

        <div className="flex flex-col justify-between">
            {isProcessing ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-xl animate-pulse border border-slate-200">
                    <Loader2 className="animate-spin mb-3 text-indigo-500" size={32} />
                    <p className="font-medium">Memproses Data...</p>
                    <p className="text-xs text-slate-400 mt-1">Sila tunggu sebentar</p>
                </div>
            ) : parsedRows.length > 0 ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-lg">
                        <div className="flex items-center gap-2 mb-4 border-b border-white/20 pb-2">
                            <Zap size={18} className="text-yellow-300" />
                            <span className="font-bold tracking-wide text-sm uppercase">Analisis Selesai</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-emerald-100 uppercase font-medium">Transaksi</p>
                                <p className="text-3xl font-bold">{importStats?.totalRows}</p>
                            </div>
                            <div>
                                <p className="text-xs text-emerald-100 uppercase font-medium">Jumlah Jualan</p>
                                <p className="text-3xl font-bold">RM {importStats?.totalAmount?.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={commitImport}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-95"
                    >
                        <span>SAHKAN & UPLOAD KE CLOUD</span>
                        <ArrowRight size={20} />
                    </button>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <BarChart3 size={32} className="mb-2 opacity-50"/>
                    <p className="text-center text-sm">Pilih fail Excel untuk lihat analisis data.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SmartExcelImport;