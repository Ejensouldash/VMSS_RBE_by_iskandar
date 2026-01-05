
import { NextRequest, NextResponse } from 'next/server';
import { Machine } from '../../../../types';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const readSessionCookie = async () => {
  try {
    const p = path.join(process.cwd(), 'public', 'session.json');
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.cookie || null;
  } catch (e) {
    console.warn('[Proxy] Failed to read session.json:', e);
    return null;
  }
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'machines';
  const days = parseInt(searchParams.get('days') || '30', 10);

  const base = 'https://os.ourvend.com';
  let targetUrl = '';
  let method: 'GET' | 'POST' = 'GET';
  let body: any = undefined;

  if (type === 'machines') {
    targetUrl = `${base}/OperateMonitor/ListJson/?firstload=0&_search=false&nd=${Date.now()}&rows=100&page=1&sidx=MiNoline&sord=desc`;
    method = 'GET';
  } else {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - Math.max(0, days - 1));

    const form = new URLSearchParams();
    form.append('StartDate', start.toISOString().split('T')[0]);
    form.append('EndDate', end.toISOString().split('T')[0]);
    form.append('GroupId', '');
    form.append('rows', '1000');
    form.append('page', '1');
    form.append('sidx', 'TradeTime');
    form.append('sord', 'desc');

    targetUrl = `${base}/SaleDetail/SaleListJson`;
    method = 'POST';
    body = form.toString();
  }

  try {
    const sessionCookie = await readSessionCookie();
    const headerCookie = req.headers.get('x-tcn-cookie');
    const cookie = headerCookie || sessionCookie || '';

    if (!cookie) {
      console.warn('[Proxy] No session cookie found (session.json missing or empty).');
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en-GB;q=0.9,en;q=0.8',
      'Connection': 'keep-alive',
      'Referer': 'https://os.ourvend.com/OperateMonitor/Index',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (cookie) headers['Cookie'] = cookie;
    if (type === 'sales') headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';

    console.log(`[Proxy] ${method} -> ${targetUrl} (type=${type}, days=${days})`);

    const response = await fetch(targetUrl, {
      method: method,
      headers,
      body: body,
      cache: 'no-store'
    });

    const responseText = await response.text();
    console.log(`[Proxy] Response Status: ${response.status} Length: ${responseText.length}`);

    if (!response.ok) {
      console.error(`[Proxy] Upstream HTTP Error ${response.status}`);
      return NextResponse.json(
        { success: false, error: `Upstream TCN Error: ${response.status}` },
        { status: response.status }
      );
    }

    if (!responseText || responseText.trim() === '') {
      console.error('[Proxy] Empty response received from TCN');
      return NextResponse.json(
        { success: false, error: 'Empty response received from TCN server' },
        { status: 502 }
      );
    }

    let json: any;
    try {
      json = JSON.parse(responseText);
    } catch (e: any) {
      console.error('[Proxy] JSON Parse Failed. Raw start:', responseText.slice(0, 100));
      if (responseText.trim().toLowerCase().startsWith('<!doctype html') || responseText.includes('<html')) {
        return NextResponse.json(
          { success: false, error: 'Session Expired: TCN returned HTML (Login Page). Please refresh Cookie.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Invalid JSON from TCN: ${e.message}` },
        { status: 502 }
      );
    }

    if (!json.rows) {
      console.warn('[Proxy] Response missing rows. Returning empty.');
      return NextResponse.json({ success: true, data: [], raw: json });
    }

    if (type === 'machines') {
      const mapped: Machine[] = json.rows.map((row: any) => {
        const rawSignal = parseInt(row.SignalStrength || '0');
        const normalizedSignal = isNaN(rawSignal) ? 0 : Math.min(Math.floor(rawSignal / 20), 5);
        const statusVal = (row.OnLineStatus === 'OnLine' || row.NetworkState === 'OnLine' || row.IsOnline === true) ? 'ONLINE' : 'OFFLINE';

        return {
          id: row.MiNoline || row.MId || `UNKNOWN_${Math.random().toString(36).slice(2, 7)}`,
          name: row.MiName || 'Vending Machine',
          group: row.GpsAddress || 'Default Location',
          signal: normalizedSignal,
          temp: parseFloat(row.MiInsideTemp?.replace('℃', '') || row.Temp || '0') || 0,
          status: statusVal as any,
          door: 'CLOSED',
          bill: 'OK', coin: 'OK', card: 'OK', stock: 50,
          lastSync: new Date().toLocaleTimeString()
        };
      });
      return NextResponse.json({ success: true, data: mapped, raw: json });
    }

    return NextResponse.json({ success: true, data: json.rows, raw: json });

  } catch (error: any) {
    console.error('[Proxy] Critical Server Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Proxy Error' },
      { status: 500 }
    );
  }
}
