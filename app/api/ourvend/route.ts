import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DB_PATH = path.join(process.cwd(), 'db.json');

function readDb() {
  try {
    const txt = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return { ourvend: { records: [] } };
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(1000, parseInt(url.searchParams.get('limit') || '200', 10)));
  const since = url.searchParams.get('since');

  const db = readDb();
  const records: any[] = (db.ourvend && Array.isArray(db.ourvend.records)) ? db.ourvend.records : [];

  let filtered = records.slice().reverse(); // newest first
  if (since) {
    const sinceTs = Date.parse(since);
    if (!isNaN(sinceTs)) filtered = filtered.filter(r => Date.parse(r.timestamp || r.raw?.CreateTime || Date.now()) > sinceTs);
  }

  const out = filtered.slice(0, limit);
  return NextResponse.json({ success: true, count: out.length, records: out });
}
