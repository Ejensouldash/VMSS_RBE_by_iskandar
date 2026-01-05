// app/kiosk/page.tsx

import React, { useState } from 'react';
import { VM_CONFIG } from '@/lib/vm-config';
import { ShoppingCart, CreditCard, Store } from 'lucide-react';
import PaymentModal from '@/components/PaymentModal'; // Import komponen modal kita

// Ini adalah skrin Kiosk yang dilihat oleh pelanggan
export default function KioskPage() {
  // State untuk pilihan produk
  const [selectedSlot, setSelectedSlot] = useState(VM_CONFIG.SLOTS[0]);
  
  // State untuk kawal Modal Pembayaran
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Function bila butang "Pay Now" ditekan
  const handleBuyClick = () => {
    if (selectedSlot) {
      setIsPaymentModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-center shadow-md z-10 relative">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
              <Store className="text-white h-8 w-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vending Kiosk</h1>
          <p className="text-indigo-100 text-sm mt-1 opacity-90">Sila pilih minuman anda</p>
        </div>

        {/* Product Selection Area */}
        <div className="p-6 space-y-6 bg-slate-50 h-[400px] overflow-y-auto">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
              Senarai Produk
            </label>
            <div className="grid grid-cols-1 gap-3">
              {VM_CONFIG.SLOTS.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group ${
                    selectedSlot.id === slot.id 
                      ? 'border-indigo-600 bg-white shadow-lg ring-1 ring-indigo-600' 
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                       selectedSlot.id === slot.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {slot.id.replace('SLOT', '')}
                    </div>
                    <div className="text-left">
                      <div className={`font-bold ${selectedSlot.id === slot.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {slot.name}
                      </div>
                      <div className="text-xs text-slate-400">Stok: {slot.currentStock || 10}</div>
                    </div>
                  </div>
                  <div className={`font-bold text-lg ${selectedSlot.id === slot.id ? 'text-indigo-600' : 'text-slate-600'}`}>
                    RM {slot.price.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer / Action Area */}
        <div className="bg-white p-6 border-t border-slate-100 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-20 relative">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-slate-400 text-xs uppercase mb-1">Jumlah Bayaran</p>
              <p className="text-slate-800 text-sm font-medium">{selectedSlot.name}</p>
            </div>
            <div className="text-3xl font-extrabold text-indigo-600 tracking-tight">
              RM {selectedSlot.price.toFixed(2)}
            </div>
          </div>

          <button
            onClick={handleBuyClick}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-200"
          >
            <CreditCard size={20} />
            Bayar Sekarang
          </button>
          
          <p className="text-[10px] text-center text-slate-400 mt-4 flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Secured by iPay88 Payment Gateway
          </p>
        </div>
      </div>

      {/* --- INTEGRASI MODAL DI SINI --- */}
      {/* Modal ini hanya muncul bila isPaymentModalOpen = true */}
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        product={selectedSlot ? {
          slotId: selectedSlot.id,
          name: selectedSlot.name,
          price: selectedSlot.price
        } : null}
      />
      
    </div>
  );
}