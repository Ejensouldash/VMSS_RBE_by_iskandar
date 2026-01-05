
import React, { useState, useEffect } from 'react';
import { getInventory, updateSlotConfig, notify } from '../services/db';
import { optimizeLogistics } from '../services/ai';
import { VM_CONFIG } from '../lib/vm-config';
import { ProductSlot, RouteStop } from '../types';
import { 
  Truck, Package, CheckSquare, ClipboardList, 
  Box, Play, CheckCircle, Navigation, Loader2, Info, Map as MapIcon, Zap
} from 'lucide-react';

interface ReplenishmentItem {
  slotId: string;
  name: string;
  current: number;
  max: number;
  deficit: number;
  cartonSize: number;
}

const RoutePlanning: React.FC = () => {
  const [replenishList, setReplenishList] = useState<ReplenishmentItem[]>([]);
  const [activeStage, setActiveStage] = useState<'planning' | 'picking' | 'dispatched'>('planning');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isNavigating, setIsNavigating] = useState(false);
  
  // AI Route State
  const [routes, setRoutes] = useState<RouteStop[]>(VM_CONFIG.ROUTES);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const data = getInventory();
    calculateNeeds(data);
  };

  const calculateNeeds = (slots: ProductSlot[]) => {
    const needs = slots.map(slot => ({
        slotId: slot.id,
        name: slot.name,
        current: slot.currentStock,
        max: slot.maxCapacity,
        deficit: slot.maxCapacity - slot.currentStock,
        cartonSize: slot.cartonSize || 24
      })).filter(item => item.deficit > 0);
    setReplenishList(needs);
  };

  const handleRestockAll = () => {
      // Perform actual restock: set each slot currentStock to maxCapacity
      replenishList.forEach(item => {
        try {
          updateSlotConfig(item.slotId, { currentStock: item.max });
        } catch (e) {
          console.error('Failed to update slot', item.slotId, e);
        }
      });
      notify("Stock updated.", 'success');
      const data = getInventory();
      calculateNeeds(data);
  };

  // FEATURE 4: AI ROUTE OPTIMIZATION
  const handleAiOptimize = () => {
    setIsOptimizing(true);
    notify("AI Agent analyzing traffic & stock urgency...", 'info');
    
    setTimeout(() => {
      const optimized = optimizeLogistics(routes);
      setRoutes(optimized);
      setIsOptimizing(false);
      notify("Route optimized for fuel & time efficiency.", 'success');
    }, 1500);
  };

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Aggregation Stats
  const totalCartons = replenishList.reduce((acc, item) => acc + Math.floor(item.deficit / item.cartonSize), 0);
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
           <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Truck className="text-blue-600" /> Logistics Command Center
              </h2>
              <p className="text-sm text-slate-500">Manage daily restocking and route logistics.</p>
           </div>
           <div className="flex bg-slate-100 rounded-lg p-1">
              {['planning', 'picking', 'dispatched'].map((stage) => (
                <button key={stage} onClick={() => setActiveStage(stage as any)} className={`px-4 py-2 rounded-md text-sm font-bold uppercase ${activeStage === stage ? 'bg-white shadow text-blue-700' : 'text-slate-400'}`}>{stage}</button>
              ))}
           </div>
      </div>

      {/* CONTENT: PLANNING VIEW */}
      {activeStage === 'planning' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="md:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Navigation size={20} className="text-orange-500"/> Route Optimization
                </h3>
                <button 
                  onClick={handleAiOptimize}
                  disabled={isOptimizing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-70"
                >
                  {isOptimizing ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16} fill="currentColor"/>}
                  {isOptimizing ? 'AI Re-Calculating...' : 'AI Auto-Optimize Route'}
                </button>
             </div>

             <div className="space-y-3">
               {routes.map((route, i) => (
                 <div key={route.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${i === 0 ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                       {i + 1}
                    </div>
                    <div className="flex-1">
                       <h4 className="font-bold text-slate-900">{route.locationName}</h4>
                       <p className="text-xs text-slate-500">Distance: {route.distance} • Deficit: {route.restockNeeded} units</p>
                    </div>
                    <div className="text-right">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${route.urgency === 'HIGH' ? 'bg-rose-100 text-rose-700' : route.urgency === 'MEDIUM' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                         {route.urgency}
                       </span>
                    </div>
                 </div>
               ))}
             </div>
           </div>

           {/* Stats Summary */}
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
              <p className="text-sm font-bold text-slate-500 uppercase">Total Deficit</p>
              <h3 className="text-3xl font-bold text-slate-900">{replenishList.reduce((a,b) => a + b.deficit, 0)}</h3>
           </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
              <p className="text-sm font-bold text-slate-500 uppercase">Cartons</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalCartons}</h3>
           </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
              <button onClick={() => setActiveStage('picking')} className="text-blue-600 font-bold hover:underline">Proceed to Pick &rarr;</button>
           </div>
        </div>
      )}

      {/* Picking View (Simplified for brevity as main focus is AI button above) */}
      {activeStage === 'picking' && (
        <div className="bg-white p-8 text-center rounded-xl border border-slate-200">
           <Package size={48} className="mx-auto text-slate-300 mb-4" />
           <p className="text-lg font-bold">Warehouse Picking Phase</p>
           <p className="text-slate-500 mb-6">Use handheld scanner or click items to confirm.</p>
           <button onClick={handleRestockAll} className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold">Confirm All Picked</button>
        </div>
      )}

      {/* Dispatched View (Simplified) */}
      {activeStage === 'dispatched' && (
        <div className="bg-slate-900 text-white p-8 rounded-xl shadow-lg relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-10"><MapIcon size={200} /></div>
           <h3 className="text-2xl font-bold mb-4">Driver En Route</h3>
           <p className="text-slate-400">Tracking GPS signal...</p>
        </div>
      )}

    </div>
  );
};

export default RoutePlanning;
