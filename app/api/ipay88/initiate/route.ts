// app/api/ipay88/initiate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { MERCHANT_KEY, MERCHANT_CODE } from '@/constants';

const DB_PATH = path.join(process.cwd(), 'db.json');

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
    const body = await req.json();
    const { slotId, productName, amount } = body;

    // 1. Validasi Input
    if (!slotId || !amount) {
      return NextResponse.json({ error: 'Missing slotId or amount' }, { status: 400 });
    }

    // 2. Generate RefNo Unik (Contoh: ORD-YYYYMMDD-Random)
    const timestamp = new Date().getTime();
    const randomStr = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const refNo = `ORD-${timestamp}-${randomStr}`;

    // Format Amount ke 2 tempat perpuluhan (Wajib untuk iPay88: "1.00")
    const formattedAmount = parseFloat(amount).toFixed(2);
    const currency = 'MYR';

    // 3. KIRA SIGNATURE (REQUEST) - HMACSHA512
    // Formula Request Signature: 
    // HMACSHA512(MerchantKey + MerchantCode + RefNo + Amount + Currency)
    // *Nota: Amount dalam signature tidak boleh ada koma, tapi untuk RM kecil jarang ada koma.
    // Kita stringkan terus.
    
    const sourceString = MERCHANT_KEY + MERCHANT_CODE + refNo + formattedAmount.replace(/,/g, '') + currency;
    
    const signature = crypto
      .createHmac('sha512', MERCHANT_KEY)
      .update(sourceString)
      .digest('hex'); // Output HEX (huruf kecil)

    // 4. Simpan status PENDING ke Database
    const db = readDB();
    if (!db.transactions) db.transactions = [];

    const newTransaction = {
      refNo,
      slotId,
      productName,
      amount: parseFloat(formattedAmount),
      currency,
      status: 'PENDING_PAYMENT',
      paymentMethod: 'IPAY88',
      timestamp: new Date().toISOString(),
      signature // Simpan untuk rujukan debug (optional)
    };

    db.transactions.push(newTransaction);
    writeDB(db);

    console.log(`[iPay88 Initiate] Transaksi dicipta: ${refNo} (${productName})`);

    // 5. Setup URL (Sangat Penting untuk Redirect balik)
    // Di localhost, kita guna localhost. Bila live, guna domain sebenar.
    // Jika guna Ngrok, letak URL ngrok dalam .env (IPAY88_BASE_URL)
    const baseUrl = process.env.IPAY88_BASE_URL || 'http://localhost:3000'; 
    
    const responseUrl = `${baseUrl}/payment/status`; // Page untuk user tengok "Thank You"
    const backendUrl = `${baseUrl}/api/ipay88/backend`; // Webhook server-to-server

    // 6. Return data yang diperlukan oleh Frontend Form
    return NextResponse.json({
      success: true,
      paymentData: {
        MerchantCode: MERCHANT_CODE,
        PaymentId: '', // Kosongkan supaya user boleh pilih eWallet/Banking di page iPay88
        RefNo: refNo,
        Amount: formattedAmount,
        Currency: currency,
        ProdDesc: productName || 'Vending Product',
        UserName: 'Guest Customer', // Boleh letak nama kiosk
        UserEmail: 'kiosk@vmms.local',
        UserContact: '0123456789',
        Remark: slotId,
        Lang: 'UTF-8',
        Signature: signature,
        ResponseURL: responseUrl,
        BackendURL: backendUrl
      }
    });

  } catch (error) {
    console.error('[iPay88 Initiate Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}