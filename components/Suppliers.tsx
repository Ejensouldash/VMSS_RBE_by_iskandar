
import React, { useState, useEffect } from 'react';
import { VM_CONFIG } from '../lib/vm-config';
import { getPurchaseOrders, createPurchaseOrder } from '../services/db';
import { Supplier, Commodity, PurchaseOrder } from '../types';
import { 
  Users, TrendingUp, Package, Phone, Mail, 
  Star, ShoppingCart, FileText, ArrowUpRight, CheckCircle, Clock 
} from 'lucide-react';

export default function Suppliers() {
  const [suppliers] = useState<Supplier[]>(VM_CONFIG.SUPPLIERS);
  const [commodities] = useState<Commodity[]>(VM_CONFIG.COMMODITIES);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'directory' | 'commodities'>('commodities');

  useEffect(() => {
    setOrders(getPurchaseOrders());
  }, []);

   const handleGeneratePO = (supplierId: string, supplierName: string) => {
      // Prefer commodities tied to supplier; pick those with oldest lastOrderDate (need restock)
      const cand = commodities.filter(c => c.supplierId === supplierId);
      if (cand.length === 0) {
         alert('No commodities found for this supplier.');
         return;
      }

      const sorted = cand.slice().sort((a,b) => {
         const da = new Date(a.lastOrderDate || 0).getTime();
         const db = new Date(b.lastOrderDate || 0).getTime();
         return da - db;
      });

      const items = sorted.slice(0, 2);
      const estimatedCost = items.reduce((a,b) => a + b.costPrice, 0) * 24; // default carton of 24

      if (confirm(`Generate Purchase Order for ${supplierName}? Estimated Cost: RM ${estimatedCost.toFixed(2)}`)) {
          const newPO: PurchaseOrder = {
               id: `PO-${Date.now().toString().slice(-6)}`,
               supplierName,
               items: `${items.length} Items (${items.map(i => i.name).join(', ')})`,
               totalCost: estimatedCost,
               status: 'PENDING',
               date: new Date().toISOString()
          };
          createPurchaseOrder(newPO);
          setOrders(getPurchaseOrders());
      }
   };

  const RatingStars = ({ rating }: { rating: number }) => (
    <div className="flex text-yellow-400">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={14} fill={i < rating ? "currentColor" : "none"} className={i < rating ? "" : "text-slate-300"} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 font-bold text-xs uppercase">Avg. Gross Margin</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">
               {(commodities.reduce((acc, c) => acc + c.marginPct, 0) / commodities.length).toFixed(1)}%
            </h3>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
               <TrendingUp size={12} /> Target: 35%
            </p>
         </div>
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 font-bold text-xs uppercase">Active Suppliers</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">{suppliers.length}</h3>
         </div>
         <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
             <div>
                <p className="font-bold text-indigo-200 text-xs uppercase">Pending Orders</p>
                <h3 className="text-3xl font-bold mt-1">{orders.filter(o => o.status === 'PENDING').length} POs</h3>
             </div>
             <button className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-50">
                View All
             </button>
         </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="flex border-b border-slate-200">
           <button 
             onClick={() => setActiveTab('commodities')}
             className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'commodities' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
           >
             <Package size={18} /> Product Costing
           </button>
           <button 
             onClick={() => setActiveTab('directory')}
             className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'directory' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
           >
             <Users size={18} /> Directory
           </button>
        </div>

        {/* COMMODITIES VIEW */}
        {activeTab === 'commodities' && (
          <div className="p-6 space-y-8">
             {/* Pending PO List */}
             {orders.length > 0 && (
                <div className="mb-8">
                   <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <Clock size={18} className="text-blue-600" /> Recent Purchase Orders
                   </h4>
                   <div className="space-y-2">
                      {orders.slice(0, 3).map(po => (
                        <div key={po.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                           <div>
                              <div className="font-bold text-slate-700">{po.id} - {po.supplierName}</div>
                              <div className="text-xs text-slate-500">{po.items}</div>
                           </div>
                           <div className="text-right">
                              <div className="font-bold text-slate-800">RM {po.totalCost.toFixed(2)}</div>
                              <div className="text-xs text-orange-500 font-bold">{po.status}</div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             )}

             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                   <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                         <th className="p-4">SKU / Product</th>
                         <th className="p-4">Supplier</th>
                         <th className="p-4 text-right">Cost Price</th>
                         <th className="p-4 text-right">Retail Price</th>
                         <th className="p-4 text-center">Margin %</th>
                         <th className="p-4 text-right">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {commodities.map(item => {
                         const supplier = suppliers.find(s => s.id === item.supplierId);
                         return (
                            <tr key={item.sku} className="hover:bg-slate-50">
                               <td className="p-4">
                                  <div className="font-bold text-slate-800">{item.name}</div>
                                  <div className="text-xs text-slate-400 font-mono">{item.sku}</div>
                               </td>
                               <td className="p-4">
                                  <div className="text-slate-700">{supplier?.name}</div>
                                  <div className="text-[10px] text-slate-400">Lead time: {supplier?.leadTimeDays} days</div>
                               </td>
                               <td className="p-4 text-right font-mono text-slate-600">RM {item.costPrice.toFixed(2)}</td>
                               <td className="p-4 text-right font-mono font-bold text-slate-800">RM {item.retailPrice.toFixed(2)}</td>
                               <td className="p-4 text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                     item.marginPct > 40 ? 'bg-emerald-100 text-emerald-700' :
                                     item.marginPct > 30 ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                                  }`}>
                                     {item.marginPct.toFixed(1)}%
                                  </span>
                               </td>
                               <td className="p-4 text-right">
                                  <button 
                                    onClick={() => handleGeneratePO(item.supplierId, supplier?.name || 'Supplier')}
                                    className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" 
                                    title="Generate PO"
                                  >
                                     <ShoppingCart size={16} />
                                  </button>
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* DIRECTORY VIEW */}
        {activeTab === 'directory' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
             {suppliers.map(sup => (
                <div key={sup.id} className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all group">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <h4 className="font-bold text-lg text-slate-800 group-hover:text-blue-700 transition-colors">{sup.name}</h4>
                         <p className="text-xs text-slate-400 font-mono">{sup.id}</p>
                      </div>
                      <RatingStars rating={sup.rating} />
                   </div>
                   
                   <div className="space-y-2 text-sm text-slate-600 mb-6">
                      <div className="flex items-center gap-3">
                         <Users size={16} className="text-slate-400" />
                         <span>{sup.contactPerson}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <Phone size={16} className="text-slate-400" />
                         <span>{sup.phone}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <Mail size={16} className="text-slate-400" />
                         <a href={`mailto:${sup.email}`} className="text-blue-500 hover:underline">{sup.email}</a>
                      </div>
                   </div>

                   <div className="flex gap-2 border-t border-slate-100 pt-4">
                      <button className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-2">
                         <FileText size={14} /> View Contract
                      </button>
                      <button 
                        onClick={() => handleGeneratePO(sup.id, sup.name)}
                        className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-2"
                      >
                         <ShoppingCart size={14} /> New Order
                      </button>
                   </div>
                </div>
             ))}
          </div>
        )}

      </div>
    </div>
  );
}
