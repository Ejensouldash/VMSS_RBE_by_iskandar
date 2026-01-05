// app/api/ipay88/backend/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { MERCHANT_KEY, MERCHANT_CODE } from '@/constants';

// Lokasi Database (db.json)
// Kita anggap db.json berada di root folder projek
const DB_PATH = path.join(process.cwd(), 'db.json');

// Interface untuk struktur data iPay88
interface IPay88Response {
  MerchantCode: string;
  PaymentId: string;
  RefNo: string;
  Amount: string;
  Currency: string;
  Remark?: string;
  TransId?: string;
  AuthCode?: string;
  Status: string;
  ErrDesc?: string;
  Signature: string;
}

// Helper: Baca Database
const readDB = () => {
  try {
    if (!fs.existsSync(DB_PATH)) return { transactions: [] };
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading DB:', error);
    return { transactions: [] };
  }
};

// Helper: Tulis Database
const writeDB = (data: any) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing DB:', error);
  }
};

export async function POST(req: NextRequest) {
  try {
    // 1. Terima Data dari iPay88 (Format: x-www-form-urlencoded)
    const formData = await req.formData();
    
    // Extract field penting
    const merchantCode = formData.get('MerchantCode')?.toString() || '';
    const paymentId = formData.get('PaymentId')?.toString() || '';
    const refNo = formData.get('RefNo')?.toString() || '';
    const amount = formData.get('Amount')?.toString() || '0.00';
    const currency = formData.get('Currency')?.toString() || 'MYR';
    const status = formData.get('Status')?.toString() || ''; // "1" = Success, "0" = Fail
    const signature = formData.get('Signature')?.toString() || '';
    const transId = formData.get('TransId')?.toString() || '';
    const errDesc = formData.get('ErrDesc')?.toString() || '';

    console.log(`[iPay88 Backend] Menerima update untuk RefNo: ${refNo}, Status: ${status}`);

    // 2. VERIFIKASI SIGNATURE (Security Check)
    // Formula PDF v2.4.3: HMACSHA512(MerchantKey + MerchantCode + PaymentId + RefNo + Amount + Currency + Status)
    
    // Penting: Amount mesti bersih dari koma (cth: "1,000.00" jadi "1000.00")
    const cleanAmount = amount.replace(/,/g, '');
    
    const sourceString = MERCHANT_KEY + merchantCode + paymentId + refNo + cleanAmount + currency + status;
    
    // Generate signature kita guna SHA512
    const calculatedSignature = crypto
      .createHmac('sha512', MERCHANT_KEY)
      .update(sourceString)
      .digest('hex'); // PDF v2.4.3 biasanya menggunakan output HEX (huruf kecil)

    // Compare signature (Case-insensitive)
    if (calculatedSignature.toLowerCase() !== signature.toLowerCase()) {
       console.error(`[iPay88 Backend] ❌ SIGNATURE MISMATCH!`);
       console.error(`Expected: ${calculatedSignature}`);
       console.error(`Received: ${signature}`);
       
       // Walaupun gagal, kita balas RECEIVEOK supaya iPay88 berhenti hantar, 
       // TAPI kita jangan update status sebagai 'SUCCESS' dalam DB.
       return new NextResponse('RECEIVEOK'); 
    }

    // 3. UPDATE DATABASE
    const db = readDB();
    
    // Cari transaksi berdasarkan RefNo
    // (Nota: Dalam db.json anda, mungkin arraynya bernama "transactions" atau "sales")
    // Kita anggap struktur db.json ada array "transactions" seperti yang biasa digunakan.
    // Jika tiada array transactions, kita akan buat baru.
    
    let transactionFound = false;
    
    if (!db.transactions) {
        db.transactions = [];
    }

    const updatedTransactions = db.transactions.map((t: any) => {
      if (t.refNo === refNo) {
        transactionFound = true;
        
        // Update status sahaja
        const newStatus = status === '1' ? 'SUCCESS' : 'FAILED';
        
        console.log(`[iPay88 Backend] ✅ Mengemaskini RefNo ${refNo} kepada status: ${newStatus}`);
        
        return {
          ...t,
          status: newStatus,
          paymentId: paymentId,
          transId: transId, // ID transaksi dari iPay88
          updatedAt: new Date().toISOString(),
          errorDescription: status === '0' ? errDesc : undefined
        };
      }
      return t;
    });

    // Jika transaksi tak jumpa (mungkin sebab create terus di payment gateway?), kita boleh insert baru (optional)
    if (!transactionFound) {
        console.log(`[iPay88 Backend] ⚠️ Transaksi ${refNo} tiada dalam DB, mencipta rekod baru...`);
        updatedTransactions.push({
            refNo,
            amount: parseFloat(cleanAmount),
            status: status === '1' ? 'SUCCESS' : 'FAILED',
            paymentId,
            transId,
            currency,
            timestamp: new Date().toISOString()
        });
    }

    // Simpan ke DB
    db.transactions = updatedTransactions;
    writeDB(db);

    // 4. BALAS 'RECEIVEOK' (Wajib!)
    return new NextResponse('RECEIVEOK');

  } catch (error) {
    console.error('[iPay88 Backend Error]', error);
    // Jika server error, balas 500 supaya iPay88 tahu untuk cuba lagi nanti (optional)
    return new NextResponse('Error processing request', { status: 500 });
  }
}