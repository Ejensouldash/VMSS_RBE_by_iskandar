import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, FileSpreadsheet, CheckCircle, Trash2, RefreshCw, Cpu, 
  AlertTriangle, FileText, BarChart3, ArrowRight, Zap 
} from 'lucide-react';
import { getMachines, notify } from '../services/db';
import { VM_CONFIG } from '../lib/vm-config';

interface SmartExcelImportProps {
  onDataImported: (data: any[]) => void;
}

// --- 🗺️ PETA NAMA MESIN (MAPPING CONFIG) ---
// Di sini kita ajar sistem tukar nama ID pelik kepada Nama Cantik
const MACHINE_NAME_MAP: Record<string, string> = {
    "VMCHERAS-T4/iskandar": "VM UPTM CHERAS TINGKAT 4",
    "VMCHERAS-5": "VM UPTM CHERAS TINGKAT 5",
    "test": "KPTM Bangi"
    // Tuan boleh tambah lagi di sini masa depan: "ID_PELIK": "NAMA_CANTIK"
};

// --- 🧠 AI PARSER ENGINE V7 (MAPPING EDITION) ---
const GEMINI_PARSER = {
  detectHeaders: (headers: string[]) => {
    const map = {
      machine: -1,
      product: -1,
      amount: -1,
      date: -1,
      time: -1,
      payment: -1
    };

    headers.forEach((h, idx) => {
      // Buang simbol pelik, tapi kekalkan space untuk check "User Name"
      const textClean = h.toLowerCase().trim(); 
      const textNoSpace = textClean.replace(/[^a-z0-9]/g, '');

      // MACHINE: Cari 'User Name' secara agresif
      if (textClean === 'user name' || textClean === 'username') {
          map.machine = idx;
      } 
      else if (map.machine === -1 && ['terminalid', 'merchantname', 'machine', 'mesin'].some(k => textNoSpace.includes(k))) {
          map.machine = idx;
      }
      
      // PRODUCT: ProdDesc
      else if (['proddesc', 'product', 'item', 'produk'].some(k => textNoSpace.includes(k))) {
          map.product = idx;
      }
      
      // AMOUNT
      else if (['originalamount', 'amount', 'price', 'harga', 'total'].some(k => textNoSpace.includes(k)) && !textNoSpace.includes('qty')) {
          map.amount = idx;
      }
      
      // PAYMENT METHOD
      else if (['paymentmethod', 'paytype', 'kaedah'].some(k => textNoSpace.includes(k))) {
          map.payment = idx;
      }

      // DATE
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
        // Fix format "2026-01-04 09:03:50"
        if (str.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/)) {
            return str.replace(' ', 'T');
        }
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString();
        return `${fileDate}T12:00:00`;
    } catch (e) {
        return `${fileDate}T12:00:00`;
    }
  },

  // FUNGSI TRANSLATE NAMA MESIN
  resolveMachineName: (rawName: string) => {
      if (!rawName) return 'Unknown Machine';
      const cleanRaw = rawName.toString().trim();
      
      // Check dalam PETA NAMA
      if (MACHINE_NAME_MAP[cleanRaw]) {
          return MACHINE_NAME_MAP[cleanRaw];
      }
      
      // Kalau takde dalam peta, guna nama asal
      return cleanRaw;
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
            // Skip Total Row
            const firstVal = Object.values(row)[0] as string;
            if (firstVal && typeof firstVal === 'string' && 
               (firstVal.toLowerCase().includes('total') || firstVal.toLowerCase().includes('jumlah'))) return;

            // 1. AMOUNT
            let amount = 0;
            if (headerMap.amount !== -1) amount = GEMINI_PARSER.cleanAmount(row[headers[headerMap.amount]]);
            else amount = GEMINI_PARSER.cleanAmount(row['Original Amount'] || row['Amount'] || row['Price'] || 0);

            if (amount > 0) {
                // 2. PRODUCT
                let rawProdName = 'Unknown Product';
                if (headerMap.product !== -1) rawProdName = row[headers[headerMap.product]];
                else rawProdName = row['ProdDesc'] || row['Product'] || 'Item';

                // 3. DATE
                let timestamp = `${fileDateStr}T12:00:00`;
                if (headerMap.date !== -1) timestamp = GEMINI_PARSER.parseDate(row[headers[headerMap.date]], fileDateStr);
                else if (row['Date']) timestamp = GEMINI_PARSER.parseDate(row['Date'], fileDateStr);

                // 4. MACHINE (THE FIX)
                let rawMachine = 'Unknown';
                // Cuba cari column index dulu
                if (headerMap.machine !== -1) rawMachine = row[headers[headerMap.machine]];
                // Fallback cari key specific
                else rawMachine = row['User Name'] || row['Username'] || row['TerminalID'] || 'Unknown';
                
                // Guna Mapping untuk cantikkan nama
                const finalMachineName = GEMINI_PARSER.resolveMachineName(rawMachine);

                // 5. PAYMENT
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
                    machineId: finalMachineName, // Nama yang dah dimapping
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

  const commitImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);

    try {
        const res = await fetch('http://127.0.0.1:3001/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedRows)
        });

        const json = await res.json();
        if (res.ok) {
            notify('success', `Berjaya simpan ${json.added} data!`);
            if (onDataImported) onDataImported(parsedRows);
            setParsedRows([]);
            setFiles([]);
            setImportStats(null);
            setTimeout(() => window.location.reload(), 1000);
        } else {
            alert("Ralat Server: " + (json.error || "Sila pastikan bridge-server.js berjalan."));
        }
    } catch (e) {
        alert("GAGAL SAMBUNG SERVER!\nRun 'node bridge-server.js' dulu.");
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
    <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 mb-6 transition-all relative overflow-hidden group hover:shadow-xl duration-500">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Cpu size={150} className="animate-pulse" />
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-md">
            <FileSpreadsheet size={24} />
        </div>
        <div>
            Smart Import V7 <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 ml-2 font-mono">Mapping Edition</span>
            <p className="text-xs text-slate-500 mt-0.5">Auto-Translate: "test" ➡️ "KPTM Bangi"</p>
        </div>
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
            <div className={`
                border-2 border-dashed rounded-xl p-8 text-center relative flex flex-col items-center justify-center min-h-[200px] cursor-pointer
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
                        <Upload size={40} className="text-indigo-400 mx-auto mb-3" />
                        <p className="text-slate-700 font-bold text-lg">Drop fail Excel di sini</p>
                    </div>
                )}
            </div>
        </div>

        <div className="flex flex-col justify-between">
            {isProcessing ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-xl animate-pulse">
                    <RefreshCw className="animate-spin mb-3 text-indigo-500" size={32} />
                    <p className="font-medium">Sedang Memproses...</p>
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
                        <span>SAHKAN & UPLOAD</span>
                        <ArrowRight size={20} />
                    </button>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-center text-sm">Pilih fail Excel untuk lihat pratonton.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SmartExcelImport;