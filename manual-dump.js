/* FILENAME: manual-dump.js
   USAGE: node manual-dump.js
   PURPOSE: Sedut dataikut tarikh spesifik (Lump Sum)
*/

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// --- SETUP FOLDER ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

// =================================================================
// 🔴 1. TAMPAL COOKIE DARI BROWSER DI SINI (Wajib!)
// =================================================================
const MY_COOKIE = 'aliyungf_tc=4468c664ec6d2b23a07d9048f47ee95af6fefa9703633cc36ea7531f2b8d23b6; ASP.NET_SessionId=zpzrsmf1c4a0n0krarnasocv; acw_tc=ac11000117673516642066672e00566434f8c6a8fec890f3ef7a8529eb6691'; 

// =================================================================
// 🔴 2. SET TARIKH (YYYY-MM-DD)
// =================================================================
const START_DATE = '2024-12-15'; // Tarikh Mula
const END_DATE   = '2024-12-31'; // Tarikh Akhir

// --- HELPER: HTTP REQUEST ---
async function httpRequest(url) {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            headers: {
                'Cookie': MY_COOKIE,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://os.ourvend.com/SaleDetail/Index'
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.end();
    });
}

// --- FUNGSI UTAMA ---
async function runDump() {
    console.log(`\n🚜 SEDANG MENGOREK DATA: ${START_DATE} hingga ${END_DATE}`);
    console.log(`🎯 Target: Mesin Bangi (dan semua mesin lain)...`);

    // Kita set rows=5000 untuk pastikan semua data dalam tempoh tu masuk sekali gus
    const apiUrl = `https://os.ourvend.com/SaleDetail/ListJson?_search=true&nd=${Date.now()}&rows=5000&page=1&sidx=TradeTime&sord=desc&startDate=${START_DATE}&endDate=${END_DATE}`;

    try {
        const res = await httpRequest(apiUrl);

        if (res.body.includes("Login") || res.statusCode === 302) {
            console.log("❌ GAGAL: Cookie dah expired. Sila ambil cookie baru dari Chrome.");
            return;
        }

        let json;
        try { json = JSON.parse(res.body); } catch (e) { console.log("❌ Error: Bukan JSON."); return; }

        if (json && json.rows) {
            console.log(`✅ JUMPA DATA! Ada ${json.rows.length} transaksi.`);
            
            // Tapis data Bangi sahaja (Optional - kalau tuan nak filter siap2)
            // Kalau nak simpan semua, biarkan saja code saveToDB di bawah.
            // Di sini saya simpan semua supaya Dashboard boleh baca semua.
            
            saveToDB(json.rows);
        } else {
            console.log("zk Tiada data dalam tarikh ini.");
        }

    } catch (e) {
        console.error("❌ Error Network:", e.message);
    }
}

// --- SIMPAN KE DATABASE ---
function saveToDB(newRows) {
    let db = { logs: [], transactions: [] };
    
    // Baca DB lama dulu
    if (fs.existsSync(DB_FILE)) {
        try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) {}
    }
    if (!db.transactions) db.transactions = [];

    let count = 0;
    newRows.forEach(row => {
        // Elak duplicate
        const exists = db.transactions.find(t => t.refNo === row.No);
        if (!exists) {
            db.transactions.push({
                id: row.Id || `TCN-${Math.random().toString(36).substr(2,9)}`,
                refNo: row.No,
                paymentId: row.PayNo,
                productName: row.PName || row.MiName, // Nama Produk
                slotId: row.SNo, // Slot ID
                amount: parseFloat(row.Amount || row.Price || 0),
                timestamp: row.TradeTime, // Tarikh transaksi
                paymentMethod: row.PayType,
                status: 'SUCCESS'
            });
            count++;
        }
    });

    if (count > 0) {
        // Susun ikut tarikh
        db.transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        console.log(`💾 BERJAYA! ${count} transaksi baru telah disimpan ke db.json.`);
        console.log(`👉 Tuan boleh buka Dashboard sekarang. Data akan tersusun sendiri "Day by Day".`);
    } else {
        console.log("zk Data dah ada. Tiada yang baru.");
    }
}

runDump();