import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, CheckCircle, Save, Database, AlertCircle, Loader2, List, Trash2 } from 'lucide-react';
import { saveProductMasterList, getProductMasterList, notify } from '../services/db';
import { ProductCost } from '../types';

const ProductCostUploader: React.FC = () => {
  const [stats, setStats] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [currentMasterList, setCurrentMasterList] = useState<ProductCost[]>([]);

  useEffect(() => {
    loadMasterList();
  }, []);

  const loadMasterList = () => {
    const list = getProductMasterList();
    setCurrentMasterList(list);
  };

  const generateStableId = (name: string) => {
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
        const char = clean.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `PROD-${Math.abs(hash).toString(36).toUpperCase()}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setIsProcessing(true);
      setStats('');

      const reader = new FileReader();
      
      reader.onload = (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            const products: ProductCost[] = [];
            let successCount = 0;
            
            data.slice(1).forEach((row: any) => {
                if (row[1]) { 
                    const rawName = String(row[1]).trim();
                    const rawCategory = row[2] ? String(row[2]) : 'General';
                    const rawCost = parseFloat(row[3]);
                    const rawPrice = parseFloat(row[4]);

                    if (rawName && !isNaN(rawCost)) {
                        products.push({
                            id: generateStableId(rawName),
                            name: rawName,
                            category: rawCategory,
                            costPrice: rawCost,
                            salePrice: rawPrice || 0
                        });
                        successCount++;
                    }
                }
            });

            if (successCount > 0) {
                saveProductMasterList(products);
                setStats(`Berjaya: ${successCount} produk disimpan. Sistem kini tahu kos setiap barang!`);
                notify(`Master Data: ${successCount} produk dikemaskini.`, 'success');
                loadMasterList(); // Refresh jadual
            } else {
                setStats('Ralat: Tiada data produk dijumpai. Pastikan format Excel betul.');
                notify('Gagal membaca data produk.', 'error');
            }

        } catch (error) {
            console.error("Master Upload Error:", error);
            setStats('Ralat: Fail Excel rosak atau format tidak sah.');
            notify('Ralat memproses fail master.', 'error');
        } finally {
            setIsProcessing(false);
        }
      };
      
      reader.readAsBinaryString(file);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm('Adakah anda pasti untuk memadam semua Master Data?')) {
        saveProductMasterList([]);
        loadMasterList();
        notify('Semua Master Data telah dipadam.', 'info');
        setStats('');
        setFileName('');
    }
  };

  return (
    <div className="vm-glass rounded-2xl p-6 mb-6 animate-in fade-in slide-in-from-top-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md">
                        <Database size={20}/> 
                    </div>
                    Tetapan Kos Produk (Master Data)
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                    Upload fail "Data Produk & Keuntungan" di sini supaya sistem boleh mengira untung bersih.
                </p>
            </div>

            {stats && (
                <div className={`text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 border ${stats.includes('Ralat') ? 'bg-red-950/30 text-red-400 border-red-500/20' : 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20'}`}>
                    {stats.includes('Ralat') ? <AlertCircle size={14}/> : <CheckCircle size={14}/>}
                    {stats}
                </div>
            )}
        </div>
        
        <div className="p-6 bg-slate-900/40 border-2 border-dashed border-slate-700/60 rounded-xl hover:border-indigo-500 hover:bg-indigo-950/10 transition-all text-center mb-6">
            {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-4">
                    <Loader2 className="animate-spin text-indigo-400 mb-2" size={32}/>
                    <p className="text-sm font-bold text-slate-300">Sedang Membaca Database Produk...</p>
                </div>
            ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center py-2 group">
                    <div className="w-14 h-14 bg-slate-800 text-indigo-400 rounded-full flex items-center justify-center mb-3 border border-slate-700/50 shadow-md group-hover:scale-110 transition-transform">
                        <Upload size={24}/>
                    </div>
                    <span className="text-slate-300 font-bold text-sm mb-1">
                        {fileName ? `Tukar Fail: ${fileName}` : 'Klik untuk Upload Fail Excel Produk'}
                    </span>
                    <span className="text-slate-500 text-xs">Pastikan ada kolum: Produk, Harga Beli, Harga Jual</span>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                </label>
            )}
        </div>

        {/* Paparan Senarai Master Data */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/30">
                <h4 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                    <List size={16} className="text-indigo-400"/>
                    Senarai Master Data Aktif ({currentMasterList.length} Produk)
                </h4>
                {currentMasterList.length > 0 && (
                    <button onClick={handleDeleteAll} className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors">
                        <Trash2 size={14}/> Padam Semua
                    </button>
                )}
            </div>
            
            {currentMasterList.length > 0 ? (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="px-4 py-3">ID Pintar</th>
                                <th className="px-4 py-3">Nama Produk</th>
                                <th className="px-4 py-3">Kategori</th>
                                <th className="px-4 py-3 text-right text-emerald-400">Kos (Beli)</th>
                                <th className="px-4 py-3 text-right text-indigo-400">Harga (Jual)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {currentMasterList.map((p, idx) => (
                                <tr key={`${p.id}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="px-4 py-2 font-mono text-xs opacity-50">{p.id}</td>
                                    <td className="px-4 py-2 font-bold text-slate-200">{p.name}</td>
                                    <td className="px-4 py-2">
                                        <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                                            {p.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono font-bold text-emerald-400">
                                        RM {p.costPrice.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-right font-mono font-bold text-indigo-400">
                                        RM {p.salePrice.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-8 text-center flex flex-col items-center text-slate-500">
                    <Database size={32} className="mb-2 opacity-20"/>
                    <p className="text-sm">Tiada Master Data dijumpai.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default ProductCostUploader;