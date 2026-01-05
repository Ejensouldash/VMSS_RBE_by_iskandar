import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

export const dynamic = 'force-dynamic';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SESSION_FILE = path.join(PUBLIC_DIR, 'session.json');
const DATA_DIR = path.join(PUBLIC_DIR, 'tcn-data');

let isRunning = false;

const writeJsonSafe = (p: string, obj: any) => {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[TCN_FETCH] Write failed', e);
    return false;
  }
};

async function loginAndGetCookie(username: string, password: string) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://os.ourvend.com/Account/Login', { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForSelector('#UserName', { timeout: 10000 });
    await page.type('#UserName', username, { delay: 50 });
    await page.waitForSelector('#Password', { timeout: 5000 });
    await page.type('#Password', password, { delay: 50 });

    // Click login (try common selectors)
    const loginBtn = await page.$('#btnLogin') || await page.$('button[type="submit"]') || await page.$('.btn-login');
    if (loginBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
        loginBtn.click()
      ]);
    } else {
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    const url = page.url();
    if (url.includes('Login') || url.includes('Account')) {
      throw new Error('Login did not succeed; still on login page');
    }

    const cookies = await page.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Save session.json
    writeJsonSafe(SESSION_FILE, { cookie: cookieString, updatedAt: new Date().toISOString() });

    await browser.close();
    return cookieString;
  } catch (e) {
    try { await browser.close(); } catch (e) {}
    throw e;
  }
}

async function fetchWithCookie(url: string, cookie: string, opts: any = {}) {
  const headers: any = opts.headers || {};
  if (cookie) headers['Cookie'] = cookie;
  if (opts.method === 'POST') headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';

  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body, cache: 'no-store' } as any);
  const text = await res.text();
  try {
    return { ok: res.ok, json: JSON.parse(text), text };
  } catch (e) {
    return { ok: res.ok, json: null, text };
  }
}

export async function GET(req: NextRequest) {
  if (isRunning) {
    return NextResponse.json({ success: false, error: 'Fetch already in progress' }, { status: 429 });
  }

  isRunning = true;
  try {
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const forceLogin = url.searchParams.get('forceLogin') === '1' || url.searchParams.get('forceLogin') === 'true';

    // 1) Get cookie from session.json if exists
    let cookie: string | null = null;
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const raw = fs.readFileSync(SESSION_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        cookie = parsed?.cookie || null;
        if (cookie) console.log('[TCN_FETCH] Using session.json cookie');
      }
    } catch (e) {
      cookie = null;
    }

    // 2) If no cookie or forceLogin => perform login using env credentials
    if ((!cookie || forceLogin) && process.env.TCN_USER && process.env.TCN_PASS) {
      try {
        console.log('[TCN_FETCH] No session cookie, attempting Puppeteer login...');
        cookie = await loginAndGetCookie(process.env.TCN_USER, process.env.TCN_PASS);
        console.log('[TCN_FETCH] Login successful, got cookie');
      } catch (e: any) {
        console.error('[TCN_FETCH] Login failed:', e.message || e);
        return NextResponse.json({ success: false, error: `Login failed: ${e.message || e}. Check .env.local or run bot to save session.json` }, { status: 500 });
      }
    } else if (!cookie) {
      console.warn('[TCN_FETCH] No session cookie and no env credentials TCN_USER/TCN_PASS');
      return NextResponse.json({ success: false, error: 'No session cookie available. Set TCN_USER/TCN_PASS in .env.local or run bot to save session.json' }, { status: 400 });
    }

    // 3) Fetch machines list
    const machinesUrl = `https://os.ourvend.com/OperateMonitor/ListJson/?firstload=0&_search=false&nd=${Date.now()}&rows=100&page=1&sidx=MiNoline&sord=desc`;
    const mResp = await fetchWithCookie(machinesUrl, cookie);
    if (!mResp.ok || !mResp.json) {
      console.warn('[TCN_FETCH] Machines fetch failed. Status:', mResp.status, 'Preview:', mResp.text?.slice(0, 200));
      if (mResp.text?.includes('<!DOCTYPE') || mResp.text?.includes('<html')) {
        return NextResponse.json({ success: false, error: 'Session cookie expired (got HTML login page). Try again or refresh cookie.' }, { status: 401 });
      }
    }

    // 4) Fetch sales for given date range
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

    const salesUrl = 'https://os.ourvend.com/SaleDetail/SaleListJson';
    const sResp = await fetchWithCookie(salesUrl, cookie, { method: 'POST', body: form.toString() });

    if (!sResp.ok || !sResp.json) {
      console.warn('[TCN_FETCH] Sales fetch failed. Status:', sResp.status, 'Preview:', sResp.text?.slice(0, 200));
      if (sResp.text?.includes('<!DOCTYPE') || sResp.text?.includes('<html')) {
        return NextResponse.json({ success: false, error: 'Session cookie expired (got HTML login page). Try again or refresh cookie.' }, { status: 401 });
      }
    }

    // 5) Save outputs to public/tcn-data
    const machinesJson = (mResp.json && mResp.json.rows) ? mResp.json : { rows: [] };
    const salesJson = (sResp.json && sResp.json.rows) ? sResp.json : { rows: [] };

    writeJsonSafe(path.join(DATA_DIR, 'machines.json'), machinesJson);
    writeJsonSafe(path.join(DATA_DIR, 'sales.json'), salesJson);

    // Also persist session cookie (updatedAt already written on login path)
    writeJsonSafe(SESSION_FILE, { cookie, updatedAt: new Date().toISOString() });

    // 6) Return summary + parsed data for direct UI update
    const mappedMachines = (machinesJson.rows || []).map((row: any) => ({
      id: row.MiNoline || row.MId || `UNKNOWN_${Math.random().toString(36).slice(2, 7)}`,
      name: row.MiName || 'Vending Machine',
      group: row.GpsAddress || 'Default Location',
      signal: Math.min(Math.floor(parseInt(row.SignalStrength || '0') / 20), 5),
      temp: parseFloat(row.MiInsideTemp?.replace('℃', '') || row.Temp || '0') || 0,
      status: (row.OnLineStatus === 'OnLine' || row.NetworkState === 'OnLine' || row.IsOnline === true) ? 'ONLINE' : 'OFFLINE',
      door: 'CLOSED',
      bill: 'OK', coin: 'OK', card: 'OK', stock: 50,
      lastSync: new Date().toLocaleTimeString()
    }));

    // Parse transactions with robust date handling
    const txs = (salesJson.rows || []).map((row: any) => {
      const raw = row.TradeTime || row.Time || row.TradeDate || row.TradeDatetime || '';
      let txDate = new Date(raw);
      const msMatch = typeof raw === 'string' && raw.match(/\/(?:Date\()?\(?(\d+)\)?\//);
      if (msMatch && msMatch[1]) txDate = new Date(parseInt(msMatch[1], 10));
      if (!raw || isNaN(txDate.getTime())) txDate = new Date();

      return {
        id: row.Id || `TCN-${Math.random().toString(36).substr(2, 9)}`,
        refNo: row.No || `ORD-${txDate.getTime()}-${Math.floor(Math.random()*1000)}`,
        paymentId: row.PayNo || `PAY-${txDate.getTime()}`,
        productName: row.PName || row.MiName || 'Unknown Product',
        slotId: row.SNo || 'SLOT??',
        amount: parseFloat(row.Amount || row.Price || '0'),
        currency: 'MYR',
        status: 'SUCCESS',
        paymentMethod: row.PayType || row.PaymentMethod || 'Cash',
        timestamp: txDate.toISOString(),
        lhdnStatus: 'PENDING'
      };
    });

    // Calculate today's total
    const today = new Date();
    const totalToday = txs
      .filter(t => {
        const d = new Date(t.timestamp);
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      })
      .reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      success: true,
      machines: mappedMachines.length,
      sales: txs.length,
      totalToday,
      transactions: txs,
      machinesData: mappedMachines
    });

  } catch (e: any) {
    console.error('[TCN_FETCH] Error:', e);
    return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
  } finally {
    isRunning = false;
  }
}
