import React, { useState } from 'react';
import { Loader2, CreditCard, X } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    slotId: string;
    name: string;
    price: number;
  } | null;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, product }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !product) return null;

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Minta Server Sign Transaksi
      const res = await fetch('/api/ipay88/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: product.slotId,
          productName: product.name,
          amount: product.price
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Gagal memulakan pembayaran');
      }

      // 2. Bina Form HTML secara dinamik dan Submit
      submitToIPay88(data.paymentData);

    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const submitToIPay88 = (paymentData: any) => {
    // URL Standard iPay88 (Entry Point)
    const actionUrl = 'https://payment.ipay88.com.my/epayment/entry.asp';

    // Buat form element dalam memory
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = actionUrl;

    // Masukkan semua data sebagai input hidden
    Object.keys(paymentData).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = paymentData[key];
      form.appendChild(input);
    });

    // Pasang kat body dan submit
    document.body.appendChild(form);
    console.log('Redirecting to iPay88...', paymentData);
    form.submit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <CreditCard size={20} className="text-blue-400" />
            Pengesahan Pembelian
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-slate-500 text-sm uppercase tracking-wide">Anda membeli</p>
            <h2 className="text-2xl font-bold text-slate-800">{product.name}</h2>
            <div className="inline-block bg-blue-50 text-blue-700 px-4 py-1 rounded-full font-bold text-xl mt-2 border border-blue-100">
              RM {product.price.toFixed(2)}
            </div>
            <p className="text-xs text-slate-400">Slot: {product.slotId}</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 text-center">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-lg font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Memproses...
                </>
              ) : (
                'Bayar Sekarang'
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              Anda akan dibawa ke portal pembayaran iPay88 yang selamat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;