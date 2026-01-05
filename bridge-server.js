import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const PORT = 3001;
const HOST = '127.0.0.1'; // Guna IP sebenar, lebih stabil dari 'localhost'

// Setup Folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db.json');

// Helper Database
const readDB = () => {
    try {
        if (!fs.existsSync(DB_PATH)) {
            // Auto-create kalau tak wujud
            const emptyDB = { transactions: [] };
            fs.writeFileSync(DB_PATH, JSON.stringify(emptyDB, null, 2));
            return emptyDB;
        }
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data || '{ "transactions": [] }');
    } catch (e) { 
        console.error("⚠️ Error Baca DB:", e.message);
        return { transactions: [] }; 
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error("❌ Gagal tulis DB:", e.message);
        return false;
    }
};

// SERVER
const server = http.createServer((req, res) => {
    // 1. CORS HEADERS (Wajib supaya frontend boleh hantar data)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle Preflight Request (Browser tanya dulu sebelum hantar)
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    console.log(`🔔 Request: ${req.method} ${url.pathname}`);

    // API 1: GET Transactions
    if (url.pathname === '/api/transactions' && req.method === 'GET') {
        const db = readDB();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db));
        return;
    }

    // API 2: IMPORT Transactions (Excel)
    if (url.pathname === '/api/import' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                if (!body) throw new Error("Body kosong");
                const newRows = JSON.parse(body);
                
                if (!Array.isArray(newRows)) throw new Error("Data mesti dalam bentuk Array []");

                const db = readDB();
                if (!db.transactions) db.transactions = [];

                let addedCount = 0;
                newRows.forEach(row => {
                    // Elak duplicate based on RefNo
                    const exists = db.transactions.find(t => t.refNo === row.refNo);
                    if (!exists) {
                        db.transactions.push(row);
                        addedCount++;
                    }
                });

                // Sort (Paling baru di atas)
                db.transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                writeDB(db);
                console.log(`✅ [IMPORT] Berjaya tambah ${addedCount} transaksi baru.`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, added: addedCount }));
            } catch (e) {
                console.error("❌ Error Import:", e.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // 404 Not Found
    res.writeHead(404);
    res.end('API Not Found');
});

// Start Server
server.listen(PORT, HOST, () => {
    console.log(`\n🚀 BRIDGE SERVER READY: http://${HOST}:${PORT}`);
    console.log(`👉 API Import: http://${HOST}:${PORT}/api/import`);
    console.log(`👉 Jangan tutup window ini!\n`);
});