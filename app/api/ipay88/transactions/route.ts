// app/api/transactions/route.ts

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Pastikan path ini SAMA dengan yang kita guna dalam webhook iPay88
const DB_PATH = path.join(process.cwd(), 'db.json');

export async function GET() {
  try {
    // 1. Check jika database wujud
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ transactions: [] });
    }

    // 2. Baca file database
    const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
    const db = JSON.parse(fileContent);

    // 3. Ambil array transactions
    const transactions = db.transactions || [];

    // 4. Sort ikut masa (Terbaru di atas)
    // Pastikan format timestamp valid
    const sortedTransactions = transactions.sort((a: any, b: any) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // 5. Return data ke dashboard
    return NextResponse.json({ 
      success: true, 
      count: sortedTransactions.length,
      transactions: sortedTransactions 
    });

  } catch (error) {
    console.error('[API Transactions] Error reading DB:', error);
    return NextResponse.json({ error: 'Gagal membaca pangkalan data' }, { status: 500 });
  }
}