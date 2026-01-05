import React, { useState } from 'react';
import { VM_CONFIG } from '../lib/vm-config';
import { analyzePlanogram } from '../services/ai';
import { getInventory, getTransactions } from '../services/db';
import { 
  Scan, RefreshCw, Flame, Lightbulb, CheckCircle, 
  Search, GripVertical, X, Package, ArrowRight, Palette, Check
} from 'lucide-react';

interface GridSlot {
  row: number;
  col: number;
  id: string; 
  assignedProduct: { id: string, name: string, price: number, color: string } | null;
  capacity: number;
  salesVelocity: number; 
}

const PRESET_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
  'bg-pink-500', 'bg-rose-500', 'bg-slate-500', 'bg-slate-800'
];

export default function Planogram() {
  const [activeTab, setActiveTab] = useState<'editor' | 'verify'>('editor');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

  // Initialize 6x6 Grid
  const [grid, setGrid] = useState<GridSlot[]>(() => {
    const slots = [];
    const txs = getTransactions();
    const now = Date.now();
    const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
    
    for(let r=1; r<=6; r++) {
      for(let c=1; c<=6; c++) {
        // Pre-fill row 1 for demo purposes
        let product = null;
        let recentCount = 0; // Fix: Declare here outside the if block

        if (r === 1 && c <= 6) {
             const prod = VM_CONFIG.PRODUCT_CATALOG[(c-1) % VM_CONFIG.PRODUCT_CATALOG.length];
             // Compute recent sales velocity from real transactions (last 30 days)
             recentCount = txs.filter(t => {
               try {
                 const ts = new Date(t.timestamp).getTime();
                 return ts >= (now - THIRTY_DAYS_MS) && (t.productName || '').toLowerCase().includes((prod.name || '').toLowerCase());
               } catch { return false; }
             }).length;
             product = { ...prod };
        }
        
        slots.push({
          row: r, col: c, id: `R${r}-C${c}`, assignedProduct: product,
          capacity: 10, salesVelocity: product ? recentCount : 0
        });
      }
    }
    return slots;
  });

  // Filter Products for Sidebar
  const filteredProducts = VM_CONFIG.PRODUCT_CATALOG.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.id.toLowerCase().includes(productSearch.toLowerCase())
  );

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, product: any) => {
    e.dataTransfer.setData("product", JSON.stringify(product));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    const productData = e.dataTransfer.getData("product");
    
    if (productData) {
      const product = JSON.parse(productData);
      setGrid(prevGrid => prevGrid.map(slot => {
        if (slot.id === slotId) {
          return { ...slot, assignedProduct: product };
        }
        return slot;
      }));
    }
  };

  const handleClearSlot = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGrid(prevGrid => prevGrid.map(slot => {
      if (slot.id === slotId) {
        return { ...slot, assignedProduct: null };
      }
      return slot;
    }));
    setActiveColorPicker(null);
  };

  const handleColorChange = (slotId: string, colorClass: string) => {
    setGrid(prevGrid => prevGrid.map(slot => {
      if (slot.id === slotId && slot.assignedProduct) {
        return { 
          ...slot, 
          assignedProduct: { ...slot.assignedProduct, color: colorClass } 
        };
      }
      return slot;
    }));
    setActiveColorPicker(null);
  };

  // --- AI ANALYSIS ---
  const handleRunAiAnalysis = () => {
     // Use real inventory to provide currentStock where possible
     const inventory = getInventory();
     const slotsForAnalysis = grid.filter(g => g.assignedProduct).map(g => {
       const pid = g.assignedProduct!.id;
       const inv = inventory.find(i => i.id === pid);
       return {
         id: pid,
         name: g.assignedProduct!.name,
         price: g.assignedProduct!.price,
         currentStock: inv ? inv.currentStock : 0,
         maxCapacity: g.capacity || 10
       } as any;
     });

     const suggestions = analyzePlanogram(slotsForAnalysis);
     setAiSuggestions(suggestions || []);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4 flex-shrink-0">
        <div>
           <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
             <Scan size={24} className="text-blue-600" /> Visual Planogram Editor
           </h2>
           <p className="text-sm text-slate-500">Drag products from the left to configure the machine layout.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
           <button onClick={() => setActiveTab('editor')} className={`px-4 py-2 text-sm font-bold rounded-md ${activeTab === 'editor' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Editor</button>
           <button onClick={() => setActiveTab('verify')} className={`px-4 py-2 text-sm font-bold rounded-md ${activeTab === 'verify' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Verify AI</button>
        </div>
      </div>

      {activeTab === 'editor' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
           
           {/* LEFT SIDEBAR: PRODUCT SOURCE */}
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Package size={16} /> Product Catalog
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
                {filteredProducts.map(product => (
                  <div 
                    key={product.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, product)}
                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:border-blue-400 transition-all group flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white shadow-sm ${product.color}`}>
                      {product.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{product.name}</p>
                      <p className="text-[10px] text-slate-400">RM {product.price.toFixed(2)}</p>
                    </div>
                    <GripVertical size={14} className="text-slate-300 group-hover:text-slate-500" />
                  </div>
                ))}
              </div>
              <div className="p-3 text-[10px] text-center text-slate-400 border-t border-slate-100">
                 Drag items to the grid on the right
              </div>
           </div>

           {/* CENTER: THE GRID (MACHINE VIEW) */}
           <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Grid Toolbar */}
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                 <div className="flex gap-2">
                    <button onClick={() => setShowHeatmap(!showHeatmap)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-colors ${showHeatmap ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <Flame size={14} /> Heatmap Mode
                    </button>
                 </div>
                 <div className="text-xs font-mono text-slate-400 px-2">Front View (6x6)</div>
              </div>

              {/* THE DROPPABLE GRID - LIGHT & FRIENDLY THEME */}
              <div className="flex-1 bg-slate-100 rounded-xl p-6 shadow-inner border border-slate-200 overflow-y-auto relative">
                 <div className="grid grid-cols-6 gap-3 h-full min-h-[400px]">
                    {grid.map((slot) => (
                        <div 
                          key={slot.id} 
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, slot.id)}
                          className={`relative rounded-xl border-2 transition-all flex flex-col items-center justify-center p-2 text-center group
                            ${slot.assignedProduct 
                              ? `border-white shadow-md ${slot.assignedProduct.color}` 
                              : 'border-dashed border-slate-300 bg-white/50 hover:bg-white hover:border-blue-400'
                            }
                            ${showHeatmap && slot.salesVelocity > 50 ? 'ring-4 ring-orange-500/50' : ''}
                          `}
                        >
                           {/* Slot ID Label */}
                           <span className={`absolute top-1 left-2 text-[8px] font-mono font-bold ${slot.assignedProduct ? 'text-white/80' : 'text-slate-400'}`}>
                             {slot.id}
                           </span>

                           {slot.assignedProduct ? (
                             <>
                               {/* Controls Overlay (Hover) */}
                               <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  {/* Color Picker Button */}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveColorPicker(activeColorPicker === slot.id ? null : slot.id); }}
                                    className="bg-white/20 hover:bg-white text-white hover:text-slate-800 rounded p-1 backdrop-blur-sm transition-colors"
                                    title="Change Color"
                                  >
                                    <Palette size={10} />
                                  </button>
                                  {/* Remove Button */}
                                  <button 
                                    onClick={(e) => handleClearSlot(slot.id, e)}
                                    className="bg-white/20 hover:bg-white text-white hover:text-rose-600 rounded p-1 backdrop-blur-sm transition-colors"
                                    title="Remove Product"
                                  >
                                    <X size={10} />
                                  </button>
                               </div>
                               
                               {/* Color Picker Popover */}
                               {activeColorPicker === slot.id && (
                                 <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white p-2 rounded-lg shadow-xl border border-slate-200 z-20 w-48 grid grid-cols-5 gap-1 animate-in zoom-in-95 duration-100">
                                   {PRESET_COLORS.map(color => (
                                     <button
                                       key={color}
                                       onClick={(e) => { e.stopPropagation(); handleColorChange(slot.id, color); }}
                                       className={`w-6 h-6 rounded-full ${color} hover:scale-110 transition-transform shadow-sm border border-black/5 ${slot.assignedProduct?.color === color ? 'ring-2 ring-slate-800 ring-offset-1' : ''}`}
                                     />
                                   ))}
                                   {/* Close Picker Overlay on Click Out is handled by logic elsewhere or simple toggle for now */}
                                 </div>
                               )}

                               {showHeatmap ? (
                                 <div className="text-white">
                                    <div className="text-2xl font-bold drop-shadow-md">{slot.salesVelocity}</div>
                                    <div className="text-[8px] uppercase font-bold text-white/90">Sales Score</div>
                                 </div>
                               ) : (
                                 <>
                                   <div className="font-bold text-white text-[11px] leading-tight line-clamp-2 mb-1 drop-shadow-sm px-1">
                                     {slot.assignedProduct.name}
                                   </div>
                                   <div className="inline-block bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold text-white shadow-sm border border-white/20">
                                     RM {slot.assignedProduct.price.toFixed(2)}
                                   </div>
                                 </>
                               )}
                             </>
                           ) : (
                             <div className="flex flex-col items-center justify-center opacity-40">
                               <Package size={16} className="text-slate-400 mb-1" />
                               <div className="text-slate-500 text-[10px] font-medium">Empty</div>
                             </div>
                           )}
                        </div>
                    ))}
                 </div>
                 
                 {/* Click backdrop to close color picker */}
                 {activeColorPicker && (
                   <div className="absolute inset-0 z-10" onClick={() => setActiveColorPicker(null)} />
                 )}
              </div>
           </div>

           {/* RIGHT: AI INSIGHTS */}
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                 <Lightbulb size={16} className="text-yellow-500" /> AI Optimization
              </h3>
              
              <div className="flex-1 bg-indigo-50/50 rounded-lg p-4 mb-4 border border-indigo-100">
                 {aiSuggestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-3">
                       <RefreshCw size={24} className="opacity-50" />
                       <p className="text-xs px-4">Arranged your layout? Click below to let AI analyze profit potential.</p>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       {aiSuggestions.map((s, i) => (
                          <div key={i} className="flex gap-2 text-xs bg-white text-indigo-900 p-3 rounded border border-indigo-100 shadow-sm">
                             <CheckCircle size={14} className="flex-shrink-0 text-emerald-500 mt-0.5" />
                             {s}
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              <button 
                onClick={handleRunAiAnalysis}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Lightbulb size={16} fill="currentColor" /> Analyze Layout
              </button>
           </div>

        </div>
      )}
    </div>
  );
}