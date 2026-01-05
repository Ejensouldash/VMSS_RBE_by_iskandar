/* FILENAME: tcn-sync.js (V3: Robust Token Hunter)
   USAGE: node tcn-sync.js
*/

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// --- SETUP FOLDER ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- KONFIGURASI ---
const CREDENTIALS = {
    username: 'RozitaBina', 
    password: 'HQRozita@_2512'
};

const SYNC_INTERVAL = 10 * 60 * 1000; 
const FETCH_DAYS = 7; 
const DB_FILE = path.join(__dirname, 'db.json');
const SESSION_FILE = path.join(__dirname, 'session-token.json');
const DEBUG_FILE = path.join(__dirname, 'debug-login.html'); // Fail untuk tengok punca error

// --- HELPER: HTTP REQUEST ---
async function httpRequest(url, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            method: method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                ...headers
            }
        };

        const req = https.request(urlObj, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ 
                statusCode: res.statusCode, 
                headers: res.headers, 
                body: data 
            }));
        });

        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

// --- FUNGSI 1: LOGIN (ROBUST TOKEN MODE) ---
async function login() {
    console.log('🔑 Sedang login ke TCN Cloud (V3 Mode)...');
    
    // 1. GET halaman login
    const pageLoad = await httpRequest('https://os.ourvend.com/Account/Login');
    
    // Ambil Cookies Awal
    let cookies = (pageLoad.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

    // 2. CARI TOKEN (Cara Lebih Bijak)
    // Kita cari input yang ada name="__RequestVerificationToken"
    // Regex ini cari: name="..." kemudian value="..." ATAU value="..." kemudian name="..."
    let verifyToken = '';
    
    // Pattern A: name dulu, baru value
    const matchA = pageLoad.body.match(/name="__RequestVerificationToken"[\s\S]*?value="([^"]+)"/i);
    // Pattern B: value dulu, baru name
    const matchB = pageLoad.body.match(/value="([^"]+)"[\s\S]*?name="__RequestVerificationToken"/i);

    if (matchA) verifyToken = matchA[1];
    else if (matchB) verifyToken = matchB[1];

    if (!verifyToken) {
        console.log('⚠️ Token tidak dijumpai! Menyimpan HTML ke debug-login.html untuk diperiksa...');
        fs.writeFileSync(DEBUG_FILE, pageLoad.body);
        console.log('   Sila buka fail debug-login.html untuk lihat kenapa token tiada (mungkin page loading/maintenance).');
    } else {
        console.log('🛡️ Token keselamatan berjaya ditangkap.');
    }
    
    // 3. Prepare POST Data
    const params = new URLSearchParams();
    params.append('UserName', CREDENTIALS.username);
    params.append('Password', CREDENTIALS.password);
    params.append('RememberMe', 'false');
    if (verifyToken) params.append('__RequestVerificationToken', verifyToken);

    const postData = params.toString();
    
    // 4. Hantar Login Request
    const loginReq = await httpRequest('https://os.ourvend.com/Account/Login', 'POST', postData, {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'Origin': 'https://os.ourvend.com',
        'Referer': 'https://os.ourvend.com/Account/Login',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1'
    });

    // 5. Update Cookies
    const newCookies = (loginReq.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    if (newCookies) {
        const cookieMap = new Map();
        cookies.split('; ').forEach(c => { const [k,v] = c.split('='); cookieMap.set(k, v); });
        newCookies.split('; ').forEach(c => { const [k,v] = c.split('='); cookieMap.set(k, v); });
        cookies = Array.from(cookieMap.entries()).map(([k,v]) => `${k}=${v}`).join('; ');
    }

    // 6. Verify Kejayaan
    // Status 302 = Berjaya Redirect
    // Status 200 = Gagal (Kekal di page login, biasanya sebab password salah atau token error)
    if (loginReq.statusCode === 302 || (loginReq.headers.location && !loginReq.headers.location.includes('Login'))) {
        console.log('✅ LOGIN BERJAYA! Token disimpan.');
        fs.writeFileSync(SESSION_FILE, JSON.stringify({ cookie: cookies, timestamp: Date.now() }));
        return cookies;
    } else {
        console.log(`❌ Login Gagal (Status: ${loginReq.statusCode}).`);
        console.log('   Menyimpan respon server ke debug-login.html...');
        fs.writeFileSync(DEBUG_FILE, loginReq.body);
        console.log('👉 Sila buka fail "debug-login.html" di browser anda untuk baca mesej error sebenar (cth: "Invalid Password").');
        throw new Error('Login ditolak oleh server.');
    }
}

// --- FUNGSI 2: GET COOKIE ---
async function getValidCookie() {
    if (fs.existsSync(SESSION_FILE)) {
        try {
            const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
            if (Date.now() - session.timestamp < 4 * 60 * 60 * 1000) return session.cookie;
        } catch(e) {}
    }
    return await login();
}

// --- FUNGSI 3: SYNC DATA ---
async function syncData() {
    try {
        const cookie = await getValidCookie();
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - FETCH_DAYS);
        const fmt = d => d.toISOString().split('T')[0];
        
        console.log(`📡 Menyedut data dari ${fmt(startDate)} hingga ${fmt(endDate)}...`);

        const apiUrl = `https://os.ourvend.com/SaleDetail/ListJson?_search=true&nd=${Date.now()}&rows=1000&page=1&sidx=TradeTime&sord=desc&startDate=${fmt(startDate)}&endDate=${fmt(endDate)}`;
        
        const res = await httpRequest(apiUrl, 'GET', null, {
            'Cookie': cookie,
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://os.ourvend.com/SaleDetail/Index'
        });

        if (res.statusCode !== 200) {
            console.log('⚠️ Session expired. Cuba login semula...');
            if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
            return syncData();
        }

        let json;
        try { json = JSON.parse(res.body); } catch (e) { console.log('⚠️ Respon bukan JSON.'); return; }
        
        if (json && json.rows) {
            console.log(`📥 Berjaya tarik ${json.rows.length} transaksi.`);
            saveToDB(json.rows);
        } else {
            console.log('zk Tiada data baru.');
        }

    } catch (e) {
        console.error('❌ Error Sync:', e.message);
    }
}

// --- FUNGSI 4: SAVE DATABASE ---
function saveToDB(newRows) {
    let db = { logs: [], transactions: [] };
    if (fs.existsSync(DB_FILE)) {
        try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) {}
    }
    if (!db.transactions) db.transactions = [];

    let count = 0;
    newRows.forEach(row => {
        const exists = db.transactions.find(t => t.refNo === row.No);
        if (!exists) {
            db.transactions.push({
                id: row.Id || `TCN-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
                refNo: row.No,
                paymentId: row.PayNo,
                productName: row.PName || row.MiName,
                amount: parseFloat(row.Amount || row.Price || 0),
                timestamp: row.TradeTime,
                paymentMethod: row.PayType,
                status: 'SUCCESS'
            });
            count++;
        }
    });

    if (count > 0) {
        db.transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        console.log(`💾 ${count} data BARU disimpan ke db.json!`);
    } else {
        console.log('zk Database up-to-date.');
    }
}

console.log('🚀 TCN SYNC V3 (FINAL FIX) STARTED');
syncData();
setInterval(syncData, SYNC_INTERVAL);