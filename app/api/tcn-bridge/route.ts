import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { type, payload } = data;

    // Tentukan lokasi simpan data
    const dataDir = path.join(process.cwd(), 'public', 'tcn-data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    let fileName = '';
    if (type === 'SALES') fileName = 'sales.json';
    if (type === 'MACHINES') fileName = 'machines.json';

    if (fileName) {
      const filePath = path.join(dataDir, fileName);
      
      // Kita format data supaya sama macam format asal ghost-bot
      // Supaya frontend tak perlu ubah apa-apa
      const finalData = {
        lastUpdated: new Date().toISOString(),
        rows: payload
      };

      fs.writeFileSync(filePath, JSON.stringify(finalData, null, 2));
      console.log(`[BRIDGE] Data ${type} berjaya disimpan di ${fileName}`);
      
      return NextResponse.json({ success: true, message: `Data ${type} saved!` });
    }

    return NextResponse.json({ success: false, message: 'Unknown data type' }, { status: 400 });

  } catch (error) {
    console.error('[BRIDGE] Error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

// Benarkan Extension akses (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}