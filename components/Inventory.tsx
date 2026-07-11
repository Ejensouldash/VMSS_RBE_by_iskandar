
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
    getInventory().then(data => setSlots(data));
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

  const handleSave = async () => {
    if (editingSlot) {
      const success = updateSlotConfig(editingSlot.id, {
        name: editingSlot.name,
        price: editingSlot.price,
        currentStock: editingSlot.currentStock
      });

      if (success) {
        // Refresh local state immediately
        const updated = await getInventory();
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
  
  const StatsWidget = ({ label, value, sub, icon: Icon, color }: any) => {
    const colorMap: Record<string, { bg: string, text: string }> = {
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
      emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
      slate: { bg: 'bg-slate-500/10', text: 'text-slate-400' }
    };
    const mapped = colorMap[color] || { bg: 'bg-slate-500/10', text: 'text-slate-400' };

    return (
      <div className="vm-glass p-4 rounded-xl flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className={`p-3 rounded-xl ${mapped.bg} ${mapped.text}`}>
          <Icon size={24} />
        </div>
        <div>
           <p className="text-sm text-slate-400 font-medium">{label}</p>
           <p className="text-xl font-black text-white">{value}</p>
           {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
    );
  };

  const StatusBadge = ({ stock, max }: { stock: number, max: number }) => {
    const pct = (stock / max) * 100;
    if (pct === 0) return <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded border border-slate-700/50">EMPTY</span>;
    if (pct < 20) return <span className="bg-rose-950/40 text-rose-400 text-[10px] font-bold px-2.5 py-1 rounded border border-rose-900/30 animate-pulse">LOW</span>;
    return <span className="bg-emerald-950/40 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded border border-emerald-900/30">OK</span>;
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
      <div className="flex flex-col md:flex-row justify-between items-center vm-glass p-4 rounded-xl gap-4">
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search Product Name or Slot ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-500"
          />
        </div>

        <div className="flex gap-2 bg-slate-900/40 border border-slate-700/50 p-1 rounded-xl">
          <button 
             onClick={() => setViewMode('list')}
             className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
             <ListIcon size={18} />
          </button>
          <button 
             onClick={() => setViewMode('grid')}
             className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
             <LayoutGrid size={18} />
          </button>
        </div>

      </div>

      {/* 3. Main Content Area */}
      {viewMode === 'list' ? (
        
        /* LIST VIEW */
        <div className="vm-glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-200 font-bold border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4">Slot</th>
                  <th className="px-6 py-4">Product Info</th>
                  <th className="px-6 py-4 text-center">Stock Level</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredSlots.map((slot) => {
                  const percentage = (slot.currentStock / slot.maxCapacity) * 100;
                  return (
                    <tr key={slot.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-slate-400">{slot.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-100">{slot.name}</div>
                        <div className="text-xs text-slate-500">Max: {slot.maxCapacity}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 justify-center">
                          <div className="w-24 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                percentage < 20 ? 'bg-rose-500' : percentage < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-mono font-bold w-6 text-slate-300">{slot.currentStock}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-cyan-400">RM {slot.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge stock={slot.currentStock} max={slot.maxCapacity} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button 
                             onClick={() => handleRestockMax(slot.id)}
                             className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                             title="Quick Restock Max"
                          >
                             <RefreshCw size={15} />
                          </button>
                          <button 
                            onClick={() => handleEdit(slot)}
                            className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                            title="Edit Slot"
                          >
                            <Edit2 size={15} />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="vm-glass rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border border-slate-700/50">
            <div className="bg-slate-900/80 px-6 py-4 flex justify-between items-center text-white border-b border-slate-800">
              <h3 className="font-bold flex items-center gap-2 text-slate-200">
                <Edit2 size={16} className="text-indigo-400" /> Edit Slot: {editingSlot.id}
              </h3>
              <button onClick={() => setEditingSlot(null)} className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Product Name</label>
                <input 
                  type="text" 
                  value={editingSlot.name} 
                  onChange={(e) => setEditingSlot({ ...editingSlot, name: e.target.value })}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 font-medium text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Price (RM)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 font-bold">RM</span>
                      <input 
                        type="number" 
                        step="0.10"
                        value={editingSlot.price} 
                        onChange={(e) => setEditingSlot({ ...editingSlot, price: parseFloat(e.target.value) })}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 font-bold text-cyan-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Current Stock</label>
                    <div className="flex items-center gap-2">
                       <input 
                          type="number" 
                          max={editingSlot.maxCapacity}
                          value={editingSlot.currentStock} 
                          onChange={(e) => setEditingSlot({ ...editingSlot, currentStock: parseInt(e.target.value) })}
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                       />
                       <span className="text-xs text-slate-500">/ {editingSlot.maxCapacity}</span>
                    </div>
                 </div>
              </div>

              <div className="pt-4 flex gap-3">
                 <button 
                   onClick={() => handleRestockMax(editingSlot.id)}
                   className="flex-1 py-3 bg-emerald-950/30 text-emerald-400 border border-emerald-900/30 font-bold rounded-xl text-sm hover:bg-emerald-900/20 transition-colors flex items-center justify-center gap-2"
                 >
                   <PlusCircle size={16} /> Refill Max
                 </button>
                 <button 
                   onClick={handleSave}
                   className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/30"
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
