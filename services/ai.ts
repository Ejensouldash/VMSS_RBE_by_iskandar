
import { Transaction, Machine, ProductSlot, RouteStop } from '../types';
import { getInventory, getTransactions, getMachines, updateSlotConfig, updateMachineStatus, notify } from './db';

// --- ADVANCED AI ENGINE CONFIG ---
type Language = 'en' | 'bm';

// Helper: Detect Language based on common Malay words
const detectLanguage = (input: string): Language => {
  const bmKeywords = [
    'awak', 'saya', 'boleh', 'buat', 'apa', 'khabar', 'salam', 
    'terima', 'kasih', 'siapa', 'macam', 'mana', 'tolong', 
    'restock', 'habis', 'jualan', 'untung', 'mesin', 'rosak', 
    'tahu', 'tak', 'bila', 'berapa', 'kat', 'sini'
  ];
  const lower = input.toLowerCase();
  
  // If input contains Malay keywords, switch to BM mode
  const bmCount = bmKeywords.filter(k => lower.includes(k)).length;
  return bmCount > 0 ? 'bm' : 'en'; // Default to English
};

// Helper: Get Time Greeting
const getGreeting = (lang: Language) => {
  const hour = new Date().getHours();
  if (lang === 'bm') {
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Tengahari";
    if (hour < 19) return "Selamat Petang";
    return "Selamat Malam";
  } else {
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }
};

// --- MAIN PROCESSOR ---

export const processNaturalLanguageQuery = (query: string): string => {
  const lowerQ = query.toLowerCase();
  const lang = detectLanguage(query);
  
  // Refresh Data Snapshot (Real-time DB Access)
  const inventory = getInventory();
  const transactions = getTransactions();
  const machines = getMachines();

  // --- 1. CONVERSATIONAL / CHIT-CHAT INTENTS ---

  // Identity & "Who are you"
  if (lowerQ.includes('siapa awak') || lowerQ.includes('who are you') || lowerQ.includes('intro')) {
    if (lang === 'bm') {
      return `🤖 **Saya Cortex AI v2.0.**\n\nSaya adalah otak digital untuk VMSRBE Enterprise. Saya bukan chatbot biasa, saya boleh kawal mesin, check stok, dan kira untung rugi syarikat.\n\nAwak Admin kan? Apa saya boleh bantu hari ni?`;
    }
    return `🤖 **I am Cortex AI v2.0.**\n\nI am the digital brain of VMSRBE Enterprise. I have direct access to machine telemetry, inventory, and financial data.\n\nHow can I help you today, Admin?`;
  }

  // Language Capability Check
  if ((lowerQ.includes('speak') || lowerQ.includes('cakap')) && (lowerQ.includes('malay') || lowerQ.includes('melayu'))) {
    return "Boleh bos! 👌 Saya memang power Bahasa Melayu. Jangan risau, sembang je santai-santai, saya faham. Nak saya check sales hari ni ke?";
  }

  // Greetings
  if (lowerQ === 'hi' || lowerQ === 'hello' || lowerQ.includes('salam') || lowerQ.includes('hey')) {
    const greeting = getGreeting(lang);
    if (lang === 'bm') return `👋 **${greeting} Bos!**\nSistem VMSRBE nampak stabil hari ni. Ada nak saya check apa-apa?`;
    return `👋 **${greeting} Admin!**\nVMSRBE systems are running smoothly. How can I assist you?`;
  }

  // Gratitude
  if (lowerQ.includes('thank') || lowerQ.includes('terima kasih') || lowerQ.includes('tq') || lowerQ.includes('mekasih')) {
    if (lang === 'bm') return "Sama-sama! Berkhidmat untuk negara... eh silap, berkhidmat untuk VMSRBE! 🫡";
    return "You're welcome! Always ready to serve. 🫡";
  }

  // --- 2. SYSTEM COMMANDS (DATA & ACTIONS) ---

  // INTENT: FINANCE & SALES (Keyword: sales, revenue, untung, duit)
  if (lowerQ.includes('sales') || lowerQ.includes('revenue') || lowerQ.includes('untung') || lowerQ.includes('profit') || lowerQ.includes('duit') || lowerQ.includes('collection')) {
    const totalRev = transactions.reduce((sum, t) => sum + t.amount, 0);
    const today = new Date().toDateString();
    const todayRev = transactions
      .filter(t => new Date(t.timestamp).toDateString() === today)
      .reduce((sum, t) => sum + t.amount, 0);

    if (lang === 'bm') {
      return `💰 **Laporan Kewangan Semasa:**\n\n• **Jumlah Kutipan (Total):** RM ${totalRev.toFixed(2)}\n• **Jualan Hari Ini:** RM ${todayRev.toFixed(2)}\n• **Jumlah Transaksi:** ${transactions.length} order\n\n📈 *Komen AI:* Sales hari ni nampak memberangsangkan. Teruskan momentum!`;
    }
    return `💰 **Financial Snapshot:**\n\n• **Total Revenue:** RM ${totalRev.toFixed(2)}\n• **Today's Sales:** RM ${todayRev.toFixed(2)}\n• **Transaction Count:** ${transactions.length} orders\n\n📈 *Insight:* Performance is solid. Keep it up!`;
  }

  // INTENT: INVENTORY CHECK (Keyword: stock, habis, empty, low)
  if (lowerQ.includes('stock') || lowerQ.includes('habis') || lowerQ.includes('low') || lowerQ.includes('kosong')) {
    const lowStock = inventory.filter(s => s.currentStock < 5);
    
    if (lowStock.length === 0) {
      return lang === 'bm' 
        ? "📦 **Status Stok:**\nSemua slot penuh bos! Tiada barang yang kritikal sekarang. Memang mantap maintenance team kita. 👍"
        : "📦 **Inventory Status:**\nAll slots are healthy! No items are critical at the moment. Great job! 👍";
    }

    const list = lowStock.map(s => `- ${s.name} (${s.currentStock} unit)`).join('\n');
    return lang === 'bm'
      ? `⚠️ **Amaran Stok Rendah:**\nBarang berikut dah nyawa-nyawa ikan:\n\n${list}\n\n💡 *Tip:* Taip "Restock semua" untuk saya isi penuhkan sekarang.`
      : `⚠️ **Low Stock Alert:**\nThe following items are running low:\n\n${list}\n\n💡 *Tip:* Type "Restock all" to refill everything instantly.`;
  }

  // INTENT: ACTION - RESTOCK SPECIFIC
  if (lowerQ.includes('restock') && lowerQ.includes('slot')) {
     const match = query.match(/(SLOT\d+)/i);
     if (match) {
        const slotId = match[0].toUpperCase();
        const slot = inventory.find(s => s.id === slotId);
        if (slot) {
           updateSlotConfig(slotId, { currentStock: slot.maxCapacity });
           notify(`🤖 AI: ${slot.name} restocked.`, 'success');
           return lang === 'bm'
             ? `✅ **Beres Bos!**\nSaya dah isi semula **${slotId}** (${slot.name}) sampai penuh (${slot.maxCapacity} unit).`
             : `✅ **Action Executed:**\nRefilled **${slotId}** (${slot.name}) to full capacity (${slot.maxCapacity} units).`;
        }
        return lang === 'bm' ? `❌ Maaf, saya tak jumpa slot ID ${slotId} dalam database.` : `❌ Sorry, I couldn't find slot ID ${slotId}.`;
     }
  }

  // INTENT: ACTION - RESTOCK ALL
  if (lowerQ.includes('restock all') || lowerQ.includes('isi semua') || lowerQ.includes('penuhkan') || lowerQ.includes('full refill')) {
     inventory.forEach(s => {
        updateSlotConfig(s.id, { currentStock: s.maxCapacity });
     });
     notify('🤖 AI: System-wide restock complete.', 'success');
     return lang === 'bm'
       ? `🚀 **Override Sistem:**\nArahan restock global diterima... *Processing*...\n\nSelesai! Semua ${inventory.length} slot kini 100% penuh. Ready untuk berniaga!`
       : `🚀 **System Override:**\nGlobal restock sequence initiated... Done!\n\nAll ${inventory.length} slots are now at 100% capacity. Ready for business!`;
  }

  // INTENT: MACHINE STATUS
  if (lowerQ.includes('machine') || lowerQ.includes('status') || lowerQ.includes('offline') || lowerQ.includes('rosak')) {
    const offline = machines.filter(m => m.status === 'OFFLINE' || m.status === 'ERROR');
    
    if (offline.length === 0) {
      return lang === 'bm'
        ? "✅ **Kesihatan Fleet:**\nSemua sistem cun melecun. 100% mesin ONLINE dan beroperasi dengan baik."
        : "✅ **Fleet Health:**\nAll systems nominal. 100% of machines are ONLINE.";
    }
    
    const list = offline.map(m => `- ${m.id} (${m.name})`).join('\n');
    return lang === 'bm'
      ? `🚨 **Amaran Fleet:**\n${offline.length} mesin tengah problem sekarang:\n\n${list}\n\n💡 *Tip:* Cuba suruh saya "Reboot VM-xxxx".`
      : `🚨 **Fleet Alert:**\n${offline.length} machines are currently down:\n\n${list}\n\n💡 *Tip:* Ask me to "Reboot [Machine ID]" to attempt a remote fix.`;
  }

  // INTENT: ACTION - REBOOT
  if (lowerQ.includes('reboot') || lowerQ.includes('restart') || lowerQ.includes('hidupkan')) {
     const match = query.match(/(VM-?\d+)/i);
     if (match) {
        let machineId = match[0].toUpperCase();
        if(!machineId.startsWith('VM-')) machineId = 'VM-' + machineId;

        const machine = machines.find(m => m.id === machineId);
        if (machine) {
           updateMachineStatus(machineId, { status: 'BOOTING', signal: 0 });
           // Simulate reboot delay in UI via notification
           setTimeout(() => {
              updateMachineStatus(machineId, { status: 'ONLINE', signal: 5 });
              notify(`🤖 AI: ${machineId} is back online.`, 'success');
           }, 3000);

           return lang === 'bm'
             ? `🔄 **Arahan Dihantar:**\nSedang reboot **${machineId}**... Tunggu sekejap ya bos, saya tengah force restart sistem dia.`
             : `🔄 **Command Sent:**\nSending remote reboot signal to **${machineId}**... Please wait for telemetry update.`;
        }
        return lang === 'bm' ? `❌ Mesin ${machineId} tak jumpa la bos. Salah ID kot?` : `❌ Machine ${machineId} not found.`;
     }
  }

  // Fallback (If AI doesn't understand)
  if (lang === 'bm') {
    return "😅 **Alamak, kurang jelas la bos.**\n\nSaya tak berapa faham ayat tu. Cuba straight to the point:\n\n- *'Sales hari ni ok tak?'* 💰\n- *'Restock semua barang'* 📦\n- *'Mesin mana offline?'* 🚨\n- Atau tanya je *'Siapa awak?'*";
  }
  return "🤖 **Cortex AI:**\nI didn't quite catch that. Try simpler commands:\n- *'Show today's sales'* 💰\n- *'Restock all items'* 📦\n- *'Any machines offline?'* 🚨\n- Or just ask *'Who are you?'*";
};

// --- EXISTING DASHBOARD HELPERS (UNCHANGED) ---
export const detectAnomalies = (machines: Machine[]) => {
  const anomalies = [];
  for (const m of machines) {
    if (m.temp > 10) anomalies.push({ id: m.id, type: 'HIGH_TEMP', message: `Compressor failure risk. Temp: ${m.temp}°C`, severity: 'high' });
    if (m.status === 'ONLINE' && m.signal < 2) anomalies.push({ id: m.id, type: 'LOW_SIGNAL', message: `Packet loss risk. Signal: ${m.signal}/5`, severity: 'medium' });
    if (m.bill === 'JAMMED' || m.bill === 'FULL') anomalies.push({ id: m.id, type: 'HARDWARE_ERR', message: `Bill acceptor ${m.bill}. Potential revenue loss.`, severity: 'high' });
  }
  const healthScore = Math.max(0, 100 - (anomalies.length * 15));
  return { score: healthScore, issues: anomalies };
};

export const forecastRevenue = (transactions: Transaction[]) => {
  const monthlyData: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.status !== 'SUCCESS') return;
    const date = new Date(t.timestamp);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    monthlyData[key] = (monthlyData[key] || 0) + t.amount;
  });
  const values = Object.values(monthlyData);
  if (values.length < 2) return 0;
  const lastMonth = values[0];
  return { nextMonth: lastMonth * 1.12, confidence: 89.5, factors: ["School Reopening", "Seasonal Heatwave", "New Product Launch"] };
};

export const optimizeLogistics = (stops: RouteStop[]): RouteStop[] => {
  return [...stops].sort((a, b) => {
    const scoreA = (a.restockNeeded) + (a.urgency === 'HIGH' ? 50 : 0);
    const scoreB = (b.restockNeeded) + (b.urgency === 'HIGH' ? 50 : 0);
    return scoreB - scoreA;
  });
};

export const analyzePlanogram = (slots: ProductSlot[]) => {
  const suggestions = [];
  const lowStockHighValue = slots.filter(s => s.price > 4 && s.currentStock < 10);
  if (lowStockHighValue.length > 0) suggestions.push(`High Profit Alert: '${lowStockHighValue[0].name}' is running low. Priority refill advised.`);
  suggestions.push("Placement Optimization: Move '100 Plus' to Row 3 (Eye Level) to increase sales by approx 15%.");
  return suggestions;
};
