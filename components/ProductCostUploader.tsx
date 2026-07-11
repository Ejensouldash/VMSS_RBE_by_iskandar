import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, CheckCircle, Save, Database, AlertCircle, Loader2 } from 'lucide-react';
import { saveProductMasterList, notify } from '../services/db';
import { ProductCost } from '../types';

const ProductCostUploader: React.FC = () => {
  const [stats, setStats] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string>('');

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
            
            // Baca data sebagai Array of Arrays (Baris demi baris)
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            // Analisis Fail Excel Tuan:
            // Row 0: Header (Bil, Produk, Kategori...)
            // Data bermula dari Row 1
            // Col 1 (Index 1): Nama Produk
            // Col 2 (Index 2): Kategori
            // Col 3 (Index 3): Harga Beli (Cost)
            // Col 4 (Index 4): Harga Jual (Price)
            
            const products: ProductCost[] = [];
            let successCount = 0;
            
            // Mula loop dari baris ke-2 (Index 1) untuk skip header utama
            data.slice(1).forEach((row: any) => {
                // Pastikan ada Nama Produk (Column 1)
                if (row[1]) { 
                    const rawName = String(row[1]).trim();
                    const rawCategory = row[2] ? String(row[2]) : 'General';
                    const rawCost = parseFloat(row[3]);
                    const rawPrice = parseFloat(row[4]);

                    // Validasi mudah
                    if (rawName && !isNaN(rawCost)) {
                        products.push({
                            id: `PROD-${Math.random().toString(36).substr(2,6).toUpperCase()}`,
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
        
        <div className="p-6 bg-slate-900/40 border-2 border-dashed border-slate-700/60 rounded-xl hover:border-indigo-500 hover:bg-indigo-950/10 transition-all text-center">
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
    </div>
  );
};

export default ProductCostUploader;