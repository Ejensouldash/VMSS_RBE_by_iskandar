
import React, { useState, useEffect } from 'react';
import { ProductSlot } from '../types';
import { 
  AlertTriangle, Package, Edit2, LayoutGrid, List as ListIcon, 
  Search, Save, X, PlusCircle, DollarSign, Archive, RefreshCw 
} from 'lucide-react';
import { updateSlotConfig, getInventory, notify } from '../services/db';

interface InventoryProps {
  slots: ProductSlot[];
}

const Inventory: React.FC<InventoryProps> = ({ slots: initialSlots }) => {
  // Use local state initialized from props, but capable of refreshing
  const [slots, setSlots] = useState<ProductSlot[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [editingSlot, setEditingSlot] = useState<ProductSlot | null>(null);

  // Load fresh data on mount
  useEffect(() => {
    setSlots(getInventory());
  }, []);

  // Stats Calculation
  const totalStock = slots.reduce((acc, s) => acc + s.currentStock, 0);
  const totalCapacity = slots.reduce((acc, s) => acc + s.maxCapacity, 0);
  const totalValue = slots.reduce((acc, s) => acc + (s.currentStock * s.price), 0);
  const lowStockCount = slots.filter(s => s.currentStock < 5).length;
  const occupancyRate = totalCapacity > 0 ? (totalStock / totalCapacity) * 100 : 0;

  // Filter
  const filteredSlots = slots.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (slot: ProductSlot) => {
    setEditingSlot({ ...slot });
  };

  const handleSave = () => {
    if (editingSlot) {
      const success = updateSlotConfig(editingSlot.id, {
        name: editingSlot.name,
        price: editingSlot.price,
        currentStock: editingSlot.currentStock
      });

      if (success) {
        // Refresh local state immediately
        const updated = getInventory();
        setSlots(updated);
        setEditingSlot(null);
        notify(`Updated ${editingSlot.id} successfully.`, 'success');
      }
    }
  };

  const handleRestockMax = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;

    // Direct update without confirmation spam, just a toast
    updateSlotConfig(slotId, { currentStock: slot.maxCapacity });
    
    // Refresh UI
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, currentStock: s.maxCapacity } : s));
    
    // If inside modal, update modal state too
    if (editingSlot && editingSlot.id === slotId) {
       setEditingSlot(prev => prev ? ({ ...prev, currentStock: slot.maxCapacity }) : null);
    }

    notify(`${slot.name} restocked to full capacity (${slot.maxCapacity}).`, 'success');
  };

  // --- SUB-COMPONENTS ---
  
  const StatsWidget = ({ label, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-full bg-${color}-50 text-${color}-600`}>
        <Icon size={24} />
      </div>
      <div>
         <p className="text-sm text-slate-500 font-medium">{label}</p>
         <p className="text-xl font-bold text-slate-800">{value}</p>
         {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );

  const StatusBadge = ({ stock, max }: { stock: number, max: number }) => {
    const pct = (stock / max) * 100;
    if (pct === 0) return <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded">EMPTY</span>;
    if (pct < 20) return <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1 rounded animate-pulse">LOW</span>;
    return <span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded">OK</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatsWidget 
           icon={Package} color="blue" 
           label="Total Inventory" value={`${totalStock} Units`} 
           sub={`${occupancyRate.toFixed(1)}% Capacity Usage`} 
         />
         <StatsWidget 
           icon={DollarSign} color="emerald" 
           label="Inventory Value" value={`RM ${totalValue.toFixed(2)}`} 
           sub="Potential Revenue" 
         />
         <StatsWidget 
           icon={AlertTriangle} color="orange" 
           label="Low Stock Alerts" value={lowStockCount} 
           sub="Items require attention" 
         />
         <StatsWidget 
           icon={Archive} color="slate" 
           label="Total SKUs" value={slots.length} 
           sub="Active Slots" 
         />
      </div>

      {/* 2. Controls Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search Product Name or Slot ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button 
             onClick={() => setViewMode('list')}
             className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100'}`}
          >
             <ListIcon size={20} />
          </button>
          <button 
             onClick={() => setViewMode('grid')}
             className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100'}`}
          >
             <LayoutGrid size={20} />
          </button>
        </div>

      </div>

      {/* 3. Main Content Area */}
      {viewMode === 'list' ? (
        
        /* LIST VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Slot</th>
                  <th className="px-6 py-4">Product Info</th>
                  <th className="px-6 py-4 text-center">Stock Level</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSlots.map((slot) => {
                  const percentage = (slot.currentStock / slot.maxCapacity) * 100;
                  return (
                    <tr key={slot.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">{slot.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{slot.name}</div>
                        <div className="text-xs text-slate-400">Max: {slot.maxCapacity}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 justify-center">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                percentage < 20 ? 'bg-rose-500' : percentage < 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-mono font-bold w-6">{slot.currentStock}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">RM {slot.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge stock={slot.currentStock} max={slot.maxCapacity} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                             onClick={() => handleRestockMax(slot.id)}
                             className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                             title="Quick Restock Max"
                          >
                             <RefreshCw size={16} />
                          </button>
                          <button 
                            onClick={() => handleEdit(slot)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Slot"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* GRID VIEW (VISUAL PLANOGRAM) */
        <div className="bg-slate-800 p-8 rounded-xl shadow-inner border border-slate-700">
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {filteredSlots.map((slot) => {
                 const pct = (slot.currentStock / slot.maxCapacity) * 100;
                 return (
                   <div 
                     key={slot.id} 
                     onClick={() => handleEdit(slot)}
                     className="bg-slate-900 border border-slate-700 rounded-lg p-4 relative group cursor-pointer hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/20 transition-all"
                   >
                      {/* Slot ID Badge */}
                      <span className="absolute top-2 right-2 text-[10px] font-mono text-slate-500 bg-slate-800 px-1 rounded">{slot.id}</span>
                      
                      {/* Product Image Placeholder */}
                      <div className="h-24 flex items-center justify-center mb-2">
                        <Package 
                          size={40} 
                          className={`${pct === 0 ? 'text-slate-700' : 'text-blue-500'} transition-transform group-hover:scale-110`} 
                          strokeWidth={1}
                        />
                      </div>

                      {/* Info */}
                      <div className="text-center">
                        <h4 className="text-white text-sm font-medium truncate mb-1">{slot.name}</h4>
                        <p className="text-blue-400 font-bold text-xs">RM {slot.price.toFixed(2)}</p>
                      </div>

                      {/* Stock Bar */}
                      <div className="mt-3 w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div 
                           className={`h-full ${pct < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                           style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                        <span>{slot.currentStock} left</span>
                        <span className="group-hover:text-white transition-colors">Edit</span>
                      </div>
                   </div>
                 );
              })}
           </div>
           
           <div className="mt-8 text-center text-slate-500 text-xs">
              <p>Front View Representation • Click any slot to manage stock & price</p>
           </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-blue-900 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2">
                <Edit2 size={16} /> Edit Slot: {editingSlot.id}
              </h3>
              <button onClick={() => setEditingSlot(null)} className="text-blue-200 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name</label>
                <input 
                  type="text" 
                  value={editingSlot.name} 
                  onChange={(e) => setEditingSlot({ ...editingSlot, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price (RM)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400">RM</span>
                      <input 
                        type="number" 
                        step="0.10"
                        value={editingSlot.price} 
                        onChange={(e) => setEditingSlot({ ...editingSlot, price: parseFloat(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Stock</label>
                    <div className="flex items-center gap-2">
                       <input 
                          type="number" 
                          max={editingSlot.maxCapacity}
                          value={editingSlot.currentStock} 
                          onChange={(e) => setEditingSlot({ ...editingSlot, currentStock: parseInt(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                       />
                       <span className="text-xs text-slate-400">/ {editingSlot.maxCapacity}</span>
                    </div>
                 </div>
              </div>

              <div className="pt-4 flex gap-3">
                 <button 
                   onClick={() => handleRestockMax(editingSlot.id)}
                   className="flex-1 py-3 bg-emerald-50 text-emerald-600 font-bold rounded-xl text-sm hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                 >
                   <PlusCircle size={16} /> Refill Max
                 </button>
                 <button 
                   onClick={handleSave}
                   className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                 >
                   <Save size={16} /> Save Changes
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
