
import React, { useState, useEffect } from 'react';
import { WarehouseItem } from '../types';
import { getWarehouseInventory, transferStock, notify } from '../services/db';
import { Package, Truck, Home, ArrowRight, ArrowLeftRight, X, Plus, Download } from 'lucide-react';

export default function Warehouse() {
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [transferModal, setTransferModal] = useState<{ isOpen: boolean, sku: string, name: string } | null>(null);
  const [receiveModal, setReceiveModal] = useState<{ isOpen: boolean, sku: string, name: string } | null>(null);
  
  const [transferQty, setTransferQty] = useState(0);
  const [receiveQty, setReceiveQty] = useState(100);
  const [transferDirection, setTransferDirection] = useState<'HQ_TO_TRUCK' | 'TRUCK_TO_HQ'>('HQ_TO_TRUCK');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setItems(getWarehouseInventory());
  };

  const openTransfer = (item: WarehouseItem) => {
    setTransferModal({ isOpen: true, sku: item.sku, name: item.name });
    setTransferQty(10);
  };

  const openReceive = (item: WarehouseItem) => {
    setReceiveModal({ isOpen: true, sku: item.sku, name: item.name });
    setReceiveQty(100);
  };

  const handleTransfer = () => {
    if (!transferModal) return;
    
    const from = transferDirection === 'HQ_TO_TRUCK' ? 'HQ' : 'TRUCK';
    const to = transferDirection === 'HQ_TO_TRUCK' ? 'TRUCK' : 'HQ';

    const success = transferStock(transferModal.sku, from, to, transferQty);
    
    if (success) {
      refreshData();
      setTransferModal(null);
    }
  };

  const handleReceiveStock = () => {
    if (!receiveModal) return;
    
    // Simulating Receiving Stock (Updating DB directly would require a new function, 
    // but for now we can leverage transferStock logic or create a dedicated one. 
    // Since transferStock moves between HQ/Truck, we'll manually update localStorage here for the demo 
    // OR ideally add 'receiveStock' to db.ts. 
    // For this constraint, I'll update localStorage directly here to emulate 'receiveStock'.)
    
    try {
      const currentData = getWarehouseInventory();
      const updated = currentData.map(i => {
         if (i.sku === receiveModal.sku) {
           return { ...i, hqStock: i.hqStock + receiveQty };
         }
         return i;
      });
      localStorage.setItem('vmms_warehouse', JSON.stringify(updated));
      
      notify(`Received ${receiveQty} units of ${receiveModal.name} at HQ.`, 'success');
      refreshData();
      setReceiveModal(null);
    } catch(e) {
      notify("Failed to update inventory", 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-900 text-white p-6 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Home className="text-orange-400" />
            <h3 className="font-bold text-lg">Main HQ Warehouse</h3>
          </div>
          <p className="text-3xl font-bold">{items.reduce((a,b) => a + b.hqStock, 0)} <span className="text-sm font-normal text-blue-200">Units</span></p>
          <p className="text-xs text-blue-300 mt-2">Kajang Distribution Center</p>
        </div>
        
        <div className="bg-white border border-slate-200 text-slate-900 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="text-blue-600" />
            <h3 className="font-bold text-lg">Mobile Inventory (Trucks)</h3>
          </div>
          <p className="text-3xl font-bold">{items.reduce((a,b) => a + b.truckStock, 0)} <span className="text-sm font-normal text-slate-500">Units</span></p>
          <p className="text-xs text-slate-500 mt-2">On Road - Truck A & B</p>
        </div>
      </div>

      {/* Stock Hierarchy Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
           <h3 className="text-lg font-bold text-slate-800">Stock Hierarchy</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">SKU / Product</th>
              <th className="px-6 py-4 text-center bg-blue-50 text-blue-900">HQ Stock</th>
              <th className="px-6 py-4 text-center"><ArrowRight size={16} className="mx-auto text-slate-400"/></th>
              <th className="px-6 py-4 text-center bg-orange-50 text-orange-900">Truck Stock</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.sku} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.sku}</div>
                </td>
                <td className="px-6 py-4 text-center font-mono font-medium bg-blue-50/50">
                   {item.hqStock}
                   <button 
                     onClick={() => openReceive(item)}
                     className="block mx-auto mt-1 text-[10px] text-blue-600 hover:underline flex items-center justify-center gap-1"
                   >
                     <Plus size={8} /> Restock
                   </button>
                </td>
                <td className="px-6 py-4 text-center"></td>
                <td className="px-6 py-4 text-center font-mono font-medium bg-orange-50/50">{item.truckStock}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => openTransfer(item)}
                    className="text-blue-600 hover:text-white hover:bg-blue-600 font-bold text-xs border border-blue-200 px-3 py-1.5 rounded transition-all flex items-center gap-1 ml-auto"
                  >
                    <ArrowLeftRight size={12} /> Transfer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TRANSFER MODAL */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
               <h3 className="font-bold text-slate-800">Transfer Stock</h3>
               <button onClick={() => setTransferModal(null)} className="text-slate-400 hover:text-slate-600">
                 <X size={20} />
               </button>
            </div>
            <div className="p-6 space-y-4">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Product</label>
                  <div className="font-bold text-slate-800">{transferModal.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{transferModal.sku}</div>
               </div>

               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Direction</label>
                 <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setTransferDirection('HQ_TO_TRUCK')}
                      className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${transferDirection === 'HQ_TO_TRUCK' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                    >
                      <Home size={12} /> <ArrowRight size={10} /> <Truck size={12} />
                    </button>
                    <button 
                      onClick={() => setTransferDirection('TRUCK_TO_HQ')}
                      className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all ${transferDirection === 'TRUCK_TO_HQ' ? 'bg-white shadow text-orange-600' : 'text-slate-500'}`}
                    >
                      <Truck size={12} /> <ArrowRight size={10} /> <Home size={12} />
                    </button>
                 </div>
               </div>

               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    value={transferQty}
                    onChange={(e) => setTransferQty(parseInt(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>

               <button 
                 onClick={handleTransfer}
                 className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
               >
                 Confirm Transfer
               </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVE STOCK MODAL */}
      {receiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in duration-200">
            <div className="bg-emerald-600 p-4 flex justify-between items-center rounded-t-xl text-white">
               <h3 className="font-bold flex items-center gap-2"><Download size={18}/> Receive Shipment</h3>
               <button onClick={() => setReceiveModal(null)} className="text-emerald-200 hover:text-white">
                 <X size={20} />
               </button>
            </div>
            <div className="p-6 space-y-4">
               <p className="text-sm text-slate-500">Add stock from Supplier to HQ.</p>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Product</label>
                  <div className="font-bold text-slate-800">{receiveModal.name}</div>
               </div>

               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Received Quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(parseInt(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
               </div>

               <button 
                 onClick={handleReceiveStock}
                 className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
               >
                 Update HQ Stock
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
