import { Machine, Transaction } from "../types";

/**
 * HELPER: Baca fail JSON dengan selamat dari folder public.
 * Fungsi ini "kalis error" - jika fail tiada atau rosak (HTML), ia return null.
 */
async function fetchLocalData(filename: string) {
  try {
    // Tambah timestamp '?t=' supaya browser tak baca cache lama
    const timestamp = new Date().getTime();
    const response = await fetch(`/tcn-data/${filename}?t=${timestamp}`, {
      cache: 'no-store'
    });
    
    // Baca sebagai text dahulu untuk periksa isi kandungan
    const text = await response.text();

    // Jika isi bermula dengan '<', bermakna ia HTML (contohnya error 404 Page Not Found)
    // Kita return null senyap-senyap supaya sistem tak crash
    if (text.trim().startsWith('<')) {
        return null;
    }

    // Cuba tukar text jadi JSON
    try {
        return JSON.parse(text);
    } catch (e) {
        // Jika format JSON rosak, return null
        return null;
    }
  } catch (error) {
    // Jika network error, return null
    return null;
  }
}

// Helper: read session.json (cookie saved by bot)
async function readSessionCookie(): Promise<string | null> {
  try {
    const r = await fetch('/session.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const json = await r.json();
    return json?.cookie || null;
  } catch (e) {
    return null;
  }
}

// Helper: call proxy endpoints on our server to use bot cookie
async function fetchViaProxy(type: 'machines' | 'sales', days = 30) {
  try {
    const url = `/api/proxy/tcn?type=${type}&days=${days}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const parsed = await res.json();
    if (!parsed || !parsed.success) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

/**
 * FUNGSI 1: Dapatkan Status Mesin (Live Status)
 * Membaca dari fail 'machines.json' yang dihasilkan oleh robot.
 */
export async function fetchLiveMachineStatus(): Promise<{ success: boolean; data: Machine[]; error?: string }> {
  try {
    // 1) Try to use proxy with bot cookie (preferred)
    const cookie = await readSessionCookie();
    if (cookie) {
      const via = await fetchViaProxy('machines');
      if (via && via.data) {
        // Proxy already returns mapped machines
        return { success: true, data: via.data };
      }
      // If proxy failed, fallthrough to local file read
    }

    // 2) Fallback to local file (produced by bot) in public/tcn-data
    const json = await fetchLocalData('machines.json');

    if (!json || !json.rows) {
      return { 
        success: false, 
        data: [], 
        error: "Data tiada. Sila pastikan 'node run-bot.js' sedang berjalan atau session cookie sudah disimpan." 
      };
    }

    const mappedMachines: Machine[] = json.rows.map((row: any) => ({
      id: row.MId || row.MsID || row.MiNoline || "UNKNOWN",
      name: row.MiAlias || row.MiName || "Vending Machine",
      group: row.GpsAddress || "Default Location",
      signal: Math.min(Math.floor(parseInt(row.SignalStrength || '0') / 20), 5),
      temp: row.MiInsideTemp ? parseFloat(row.MiInsideTemp.replace('℃', '')) : parseFloat(row.Temp || '0'),
      status: (row.OnLineStatus === "OnLine" || row.NetworkState === "OnLine" || row.IsOnline === true) ? 'ONLINE' : 'OFFLINE',
      door: row.Door === 0 ? 'CLOSED' : 'OPEN',
      bill: 'OK', coin: 'OK', card: 'OK', stock: 50, lastSync: new Date().toLocaleTimeString()
    }));

    return { success: true, data: mappedMachines };

  } catch (error: any) {
    return { success: false, data: [], error: error.message };
  }
}

/**
 * FUNGSI 2: Dapatkan Sejarah Jualan (Sales History)
 * Membaca dari fail 'sales.json' yang dihasilkan oleh robot.
 */
export async function fetchSalesHistory(daysToFetch = 30): Promise<{ success: boolean; totalSalesToday: number; transactions: Transaction[] }> {
  try {
    // Prefer proxy if session cookie present
    const cookie = await readSessionCookie();
    if (cookie) {
      const via = await fetchViaProxy('sales', daysToFetch);
      if (via && via.data) {
        const rows = via.data;
          const allTransactions: Transaction[] = Array.isArray(rows) ? rows.map((row: any) => {
            // If the row looks like an aggregated "colum*" summary (captures from capture script),
            // synthesize a single transaction representing the machine/day total so the UI can show totals.
            if ((!row.Amount && !row.Price) && (row.colum0 || row.colum3)) {
              const amt = parseFloat(row.colum0 || row.colum3 || '0');
              const cnt = parseInt(row.colum00 || row.colum4 || '0', 10) || 0;
              const nowIso = new Date().toISOString();
              return {
                id: `TCN-AGG-${row.MachineID || Math.random().toString(36).slice(2,8)}`,
                refNo: `AGG-${row.MachineID || 'M'}`,
                paymentId: `AGG-${Date.now()}`,
                productName: row.MachineName || row.MGName || 'Machine Total',
                slotId: row.MachineID || 'UNKNOWN',
                amount: isNaN(amt) ? 0 : amt,
                currency: 'MYR',
                status: 'SUCCESS',
                paymentMethod: `${cnt} sales (aggregated)`,
                timestamp: nowIso,
                lhdnStatus: 'AGGREGATED'
              };
            }

            // Try to normalize time similar to previous logic for regular transaction rows
            const raw = row.TradeTime || row.Time || row.TradeDate || row.TradeDatetime || '';
            let txDate = new Date(raw);
            const msMatch = typeof raw === 'string' && raw.match(/\/(?:Date\()?\(?(\d+)\)?\//);
            if (msMatch && msMatch[1]) txDate = new Date(parseInt(msMatch[1], 10));
            if (!raw || isNaN(txDate.getTime())) txDate = new Date();
            const txISO = txDate.toISOString();
            const txMs = txDate.getTime();

            return {
              id: row.Id || `TCN-${Math.random().toString(36).substr(2, 9)}`,
              refNo: row.No || `ORD-${txMs}-${Math.floor(Math.random()*1000)}`,
              paymentId: row.PayNo || `PAY-${txMs}`,
              productName: row.PName || row.MiName || "Unknown Product",
              slotId: row.SNo || "SLOT??",
              amount: parseFloat(row.Amount || row.Price || '0'),
              currency: 'MYR',
              status: 'SUCCESS',
              paymentMethod: row.PayType || row.PaymentMethod || 'Cash',
              timestamp: txISO,
              lhdnStatus: 'PENDING'
            };
          }) : [];

        const today = new Date();
        const totalToday = allTransactions
          .filter(t => {
            const d = new Date(t.timestamp);
            return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
          })
          .reduce((s, t) => s + t.amount, 0);

        return { success: true, totalSalesToday: totalToday, transactions: allTransactions };
      }
      // else fallthrough to local file
    }

    // Fallback to file
    const json = await fetchLocalData('sales.json');

    if (!json || !json.rows) {
      return { success: true, totalSalesToday: 0, transactions: [] };
    }

    let allTransactions: Transaction[] = [];

    if (json.rows && Array.isArray(json.rows)) {
      allTransactions = json.rows.map((row: any) => {
        // Handle aggregated 'colum*' summary rows (from capture)
        if ((!row.Amount && !row.Price) && (row.colum0 || row.colum3)) {
          const amt = parseFloat(row.colum0 || row.colum3 || '0');
          const cnt = parseInt(row.colum00 || row.colum4 || '0', 10) || 0;
          const nowIso = new Date().toISOString();
          return {
            id: `TCN-AGG-${row.MachineID || Math.random().toString(36).slice(2,8)}`,
            refNo: `AGG-${row.MachineID || 'M'}`,
            paymentId: `AGG-${Date.now()}`,
            productName: row.MachineName || row.MGName || 'Machine Total',
            slotId: row.MachineID || 'UNKNOWN',
            amount: isNaN(amt) ? 0 : amt,
            currency: 'MYR',
            status: 'SUCCESS',
            paymentMethod: `${cnt} sales (aggregated)`,
            timestamp: nowIso,
            lhdnStatus: 'AGGREGATED'
          };
        }

        const raw = row.TradeTime || row.Time || row.TradeDate || row.TradeDatetime || '';
        let txDate = new Date(raw);
        const msMatch = typeof raw === 'string' && raw.match(/\/(?:Date\()?\(?(\d+)\)?\//);
        if (msMatch && msMatch[1]) {
          txDate = new Date(parseInt(msMatch[1], 10));
        }
        if (!raw || isNaN(txDate.getTime())) txDate = new Date();
        const txISO = txDate.toISOString();

        return {
          id: row.Id || `TCN-${Math.random().toString(36).substr(2, 9)}`,
          refNo: row.No || `ORD-${Date.parse(txISO)}`,
          paymentId: row.PayNo || `PAY-${Date.parse(txISO)}`,
          productName: row.PName || row.MiName || "Unknown Product",
          slotId: row.SNo || "SLOT??", 
          amount: parseFloat(row.Amount || row.Price || '0'),
          currency: 'MYR',
          status: 'SUCCESS',
          paymentMethod: row.PayType || row.PaymentMethod || "Cash", 
          timestamp: txISO,
          lhdnStatus: 'PENDING'
        };
      });
    }

    const today = new Date();
    const totalToday = allTransactions
        .filter(t => {
            const d = new Date(t.timestamp);
            return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
        })
        .reduce((sum, t) => sum + t.amount, 0);

    return { success: true, totalSalesToday: totalToday, transactions: allTransactions };

  } catch (error: any) {
    return { success: false, totalSalesToday: 0, transactions: [] };
  }
}