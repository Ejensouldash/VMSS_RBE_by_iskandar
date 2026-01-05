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
      // 1. Cuba panggil Server dulu
      const res = await fetch('http://127.0.0.1:3001/api/transactions');
      
      if (res.ok) {
        const data = await res.json();
        
        if (data && Array.isArray(data.transactions)) {
          // 2. Jika Server ada data, kita UPDATE LocalStorage
          mergeTransactions(data.transactions);
          
          // 3. Update Dashboard
          // Sort tarikh: Paling baru di atas
          const sorted = data.transactions.sort((a: Transaction, b: Transaction) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setTransactions(sorted);
          setLastUpdated(new Date());
        }
      } else {
        // Kalau server error, guna data LocalStorage je
        console.warn("Server tak jawab, guna LocalStorage.");
        setTransactions(getTransactions());
      }
    } catch (e) {
      // Kalau network error (Server tutup), guna LocalStorage
      // console.log("Offline Mode: Reading LocalDB");
      setTransactions(getTransactions());
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