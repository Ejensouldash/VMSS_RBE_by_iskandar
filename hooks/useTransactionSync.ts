import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '../types';
import { getTransactions, mergeTransactions } from '../services/db';

export const useTransactionSync = (initialData: Transaction[]) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // FUNGSI: Tarik data dari Server Bridge (db.json)
  const fetchFromServer = useCallback(async () => {
    try {
      // Tarik terus dari Supabase (Fasa 2 Cloud Migration)
      const data = await getTransactions();
      
      if (data && Array.isArray(data)) {
          setTransactions(data);
          setLastUpdated(new Date());
      }
    } catch (e) {
      console.error("Gagal menarik data transaksi dari Supabase:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // AUTO-SYNC: Jalan setiap 2 saat
  useEffect(() => {
    fetchFromServer(); // Jalan sekali masa mula
    
    const interval = setInterval(() => {
      fetchFromServer();
    }, 2000); // Ulang setiap 2 saat (Real-time update)

    return () => clearInterval(interval);
  }, [fetchFromServer]);

  return { transactions, loading, lastUpdated, refresh: fetchFromServer };
};