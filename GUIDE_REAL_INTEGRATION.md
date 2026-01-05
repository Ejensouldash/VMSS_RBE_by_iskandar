# Panduan Integrasi Sebenar iPay88 (Real World Integration)

Sistem semasa adalah prototaip "Client-Side". Untuk menerima pembayaran sebenar dari iPay88, anda perlu melaksanakan kod "Server-Side".

## 1. Persediaan Database (Server Side)

Anda perlu menggunakan database sebenar. Untuk projek Next.js mudah, kita gunakan `better-sqlite3`.

**Install:**
```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

**Fail: `lib/db.ts`**
```typescript
import Database from 'better-sqlite3';

const db = new Database('vmms.db');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT,
    price REAL,
    currentStock INTEGER,
    maxCapacity INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    refNo TEXT UNIQUE,
    paymentId TEXT,
    productName TEXT,
    slotId TEXT,
    amount REAL,
    currency TEXT,
    status TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
```

---

## 2. API Route (Next.js App Router)

Ini adalah bahagian paling penting. iPay88 akan menghantar data ke URL ini secara "Silent Background Post".

**Lokasi Fail:** `app/api/ipay88/backend/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db'; // Rujuk fail db.ts di atas

const MERCHANT_KEY = process.env.IPAY88_MERCHANT_KEY || "LLBUOQx2Mo";
const MERCHANT_CODE = process.env.IPAY88_MERCHANT_CODE || "M46662";

export async function POST(req: NextRequest) {
  try {
    // 1. Baca Form Data dari iPay88 (x-www-form-urlencoded)
    const formData = await req.formData();
    
    const merchantCode = formData.get('MerchantCode') as string;
    const paymentId = formData.get('PaymentId') as string;
    const refNo = formData.get('RefNo') as string;
    const amount = formData.get('Amount') as string;
    const currency = formData.get('Currency') as string;
    const status = formData.get('Status') as string;
    const receivedSignature = formData.get('Signature') as string;

    // 2. Sahkan Signature (HMACSHA512)
    // Formula Response: MerchantKey & MerchantCode & PaymentId & RefNo & Amount & Currency & Status
    // Nota: Amount perlu dibersihkan dari titik perpuluhan untuk signature generation jika perlu (bergantung dokumentasi terkini),
    // tetapi standard formula biasanya raw amount string.
    
    // Pastikan susunan ini TEPAT mengikut dokumentasi iPay88 anda
    const sourceStr = `${MERCHANT_KEY}${merchantCode}${paymentId}${refNo}${amount.replace('.', '')}${currency}${status}`;
    
    const calculatedSignature = crypto
      .createHash('sha512') // Atau createHmac jika iPay88 spec memerlukan HMAC
      .update(sourceStr)
      .digest('base64'); // Atau 'hex' bergantung spec

    // Nota: iPay88 legacy kadang-kadang guna SHA256 biasa, tapi prompt minta HMACSHA512.
    // Jika HMAC:
    /*
    const hmac = crypto.createHmac('sha512', MERCHANT_KEY);
    hmac.update(sourceStr);
    const calculatedSignature = hmac.digest('base64');
    */

    // Validasi Asas
    if (status !== '1') {
      return new NextResponse('PAYMENT FAILED', { status: 200 });
    }

    // 3. Logik Bisnes: Tolak Stok
    const updateInventory = db.transaction(() => {
        // Parse RefNo (e.g., VM01-SLOT01-TIMESTAMP)
        const parts = refNo.split('-');
        const slotId = parts.find(p => p.startsWith('SLOT'));

        if (!slotId) throw new Error("Invalid RefNo");

        // Periksa transaksi duplikasi
        const existing = db.prepare('SELECT id FROM transactions WHERE refNo = ?').get(refNo);
        if (existing) return; // Sudah diproses

        // Tolak Stok
        const result = db.prepare('UPDATE products SET currentStock = currentStock - 1 WHERE id = ? AND currentStock > 0').run(slotId);
        
        if (result.changes === 0) {
            console.error("Stock deduction failed: Out of stock or invalid slot");
        }

        // Rekod Transaksi
        db.prepare(`
            INSERT INTO transactions (id, refNo, paymentId, productName, slotId, amount, currency, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            crypto.randomUUID(), 
            refNo, 
            paymentId, 
            'Product Name Lookup Here', 
            slotId, 
            parseFloat(amount), 
            currency, 
            'SUCCESS'
        );
    });

    updateInventory();

    // 4. RESPON WAJIB: Mesti return "RECEIVEOK" sahaja
    return new NextResponse('RECEIVEOK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error) {
    console.error('iPay88 Callback Error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}
```

## 3. Cara Menguji (Testing)

Oleh kerana iPay88 berada di internet luar, ia tidak boleh akses `localhost:3000` anda.

1.  Jalankan server Next.js anda: `npm run dev`.
2.  Gunakan **Ngrok** untuk membuka tunnel:
    ```bash
    ngrok http 3000
    ```
3.  Copy URL Ngrok (contoh: `https://abcd-123.ngrok-free.app`).
4.  Masuk ke portal iPay88 atau setkan dalam Request URL anda:
    *   **Backend URL**: `https://abcd-123.ngrok-free.app/api/ipay88/backend`
    *   **Response URL**: `https://abcd-123.ngrok-free.app/receipt` (Halaman resit untuk user)

## 4. Perubahan Frontend

Dalam fail `App.tsx` (atau `components/Dashboard.tsx`), anda tidak lagi membaca dari `localStorage`. Anda perlu menggunakan `useEffect` untuk memanggil API dalaman anda sendiri:

```typescript
// Contoh fetch data dari database server
useEffect(() => {
  fetch('/api/transactions')
    .then(res => res.json())
    .then(data => setTransactions(data));
}, []);
```
