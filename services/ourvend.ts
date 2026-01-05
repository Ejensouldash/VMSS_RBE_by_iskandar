import 'dotenv/config';
import puppeteer from 'puppeteer';
import { parseAndPersist } from './ourvend-parser.ts';
import fs from 'fs';
import path from 'path';

const LOGIN_URL = 'https://os.ourvend.com/Account/Login';

const USERNAME = process.env.OURVEND_USERNAME;
const PASSWORD = process.env.OURVEND_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.warn('OURVEND_USERNAME or OURVEND_PASSWORD not set in environment');
}

export async function fetchOurVendOnce(options?: { headless?: boolean }) {
  const browser = await puppeteer.launch({ headless: options?.headless ?? true });
  const page = await browser.newPage();
  // collect XHR/fetch responses here
  const capturedResponses: Array<{ url: string; status: number; body: any }> = [];
  page.on('response', async (response) => {
    try {
      const req = response.request();
      const url = req.url();
      const resource = req.resourceType();
      // Heuristic: capture XHR/fetch or api/report/sale paths
      if (
        resource === 'xhr' ||
        resource === 'fetch' ||
        /\/api\//i.test(url) ||
        /report|sale|order|machine|transaction|device|product/i.test(url)
      ) {
        const headers = response.headers();
        const ct = (headers['content-type'] || '') as string;
        if (ct.includes('application/json')) {
          const body = await response.json().catch(() => null);
          capturedResponses.push({ url, status: response.status(), body });
        } else {
          const text = await response.text().catch(() => null);
          capturedResponses.push({ url, status: response.status(), body: text });
        }
      }
    } catch (e) {
      // ignore per-response errors
    }
  });

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });

    // Attempt to fill login form — try multiple common selectors to be robust
    const usernameSelectors = [
      'input[name="UserName"]',
      'input[name="username"]',
      'input#UserName',
      'input#username',
      'input[type="email"]',
      'input[placeholder*="User"]',
      'input[placeholder*="Email"]',
    ];
    const passwordSelectors = [
      'input[name="Password"]',
      'input[name="password"]',
      'input#Password',
      'input#password',
      'input[type="password"]',
      'input[placeholder*="Pass"]',
    ];

    async function tryType(selectors: string[], value: string) {
      for (const sel of selectors) {
        try {
          await page.waitForSelector(sel, { timeout: 1500 });
          await page.focus(sel);
          await page.click(sel, { clickCount: 3 }).catch(() => null);
          await page.type(sel, value);
          return sel;
        } catch (e) {
          // ignore and try next
        }
      }
      return null;
    }

    const usedUserSel = await tryType(usernameSelectors, USERNAME || '');
    const usedPassSel = await tryType(passwordSelectors, PASSWORD || '');

    if (!usedUserSel || !usedPassSel) {
      // save a screenshot to help debugging
      try {
        await page.screenshot({ path: 'ourvend-login-debug.png', fullPage: true });
      } catch {}
      throw new Error(`Could not find login inputs (user:${!!usedUserSel} pass:${!!usedPassSel}). Screenshot saved to ourvend-login-debug.png`);
    }

    // click submit — try common button selectors
    const submitSelectors = ['button[type="submit"]', 'button.login', 'input[type="submit"]', 'button.btn-primary'];
    let clicked = false;
    for (const s of submitSelectors) {
      try {
        const el = await page.$(s);
        if (el) {
          await Promise.all([
            el.click(),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
          ]);
          clicked = true;
          break;
        }
      } catch (e) {
        // ignore
      }
    }

      // Extract possible anti-forgery tokens / cookies for use with authenticated calls
      let discoveredToken: string | null = null;
      try {
        discoveredToken = await page.evaluate(() => {
          const inp = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement | null;
          if (inp && inp.value) return inp.value;
          const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
          if (meta && meta.content) return meta.content;
          return null;
        }).catch(() => null);
      } catch (e) {
        discoveredToken = null;
      }

      // dump auth debug info (cookies + token) to help debugging 403
      try {
        const cookies = await page.cookies();
        const info = { token: discoveredToken, cookies, capturedAt: new Date().toISOString() };
        const DATA_DIR = path.join(process.cwd(), 'public', 'tcn-data');
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(path.join(DATA_DIR, 'ourvend-auth-debug.json'), JSON.stringify(info, null, 2), 'utf8');
        // Also write a simple session.json containing cookie header string for server-side proxy
        try {
          const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
          fs.writeFileSync(path.join(process.cwd(), 'session.json'), JSON.stringify({ cookie: cookieHeader }, null, 2), 'utf8');
          // also write to public/session.json for the server proxy to read
          const publicPath = path.join(process.cwd(), 'public');
          fs.mkdirSync(publicPath, { recursive: true });
          fs.writeFileSync(path.join(publicPath, 'session.json'), JSON.stringify({ cookie: cookieHeader }, null, 2), 'utf8');
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore
      }

      // Attempt to fetch sales data (authenticated) via POST to SaleDetail/SaleListJson
      try {
        const fetchDays = parseInt(process.env.OURVEND_FETCH_DAYS || '1', 10);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - Math.max(0, fetchDays - 1));
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const salesUrl = new URL('/SaleDetail/SaleListJson', LOGIN_URL).toString();
        const currentPage = page.url();
        const salesResp = await page.evaluate(async (u: string, start: string, end: string, referer: string, token: string | null) => {
          try {
            const form = new URLSearchParams();
            form.append('StartDate', start);
            form.append('EndDate', end);
            form.append('GroupId', '');
            form.append('rows', '1000');
            form.append('page', '1');
            form.append('sidx', 'TradeTime');
            form.append('sord', 'desc');

            const headers: any = {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest',
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'Referer': referer
            };
            if (token) {
              // try common token placements
              headers['RequestVerificationToken'] = token;
              headers['X-CSRF-Token'] = token;
            }

            // if server expects token as form field, include it too
            if (token) form.append('__RequestVerificationToken', token);

            const r = await fetch(u, {
              method: 'POST',
              body: form.toString(),
              headers,
              credentials: 'same-origin'
            });
            const text = await r.text();
            const ct = r.headers.get('content-type') || '';
            try { return { url: u, status: r.status, contentType: ct, body: JSON.parse(text) }; } catch { return { url: u, status: r.status, contentType: ct, body: text }; }
          } catch (e) { return { url: u, status: 0, body: String(e) }; }
        }, salesUrl, startStr, endStr, currentPage, discoveredToken).catch(() => null);

        if (salesResp) {
          capturedResponses.push(salesResp as any);
          // Save detailed debug info for inspection
          try {
            const DATA_DIR = path.join(process.cwd(), 'public', 'tcn-data');
            fs.mkdirSync(DATA_DIR, { recursive: true });
            let salesJson: any = null;
            if (salesResp.body && typeof salesResp.body === 'object' && salesResp.body.rows) salesJson = salesResp.body;
            else if (typeof salesResp.body === 'string') {
              try { salesJson = JSON.parse(salesResp.body); } catch { salesJson = null; }
            }
            if (salesJson) {
              fs.writeFileSync(path.join(DATA_DIR, 'sales.json'), JSON.stringify(salesJson, null, 2), 'utf8');
            }

            // Always write debug file with status + raw body
            const dbg = {
              url: salesResp.url,
              status: salesResp.status,
              bodyType: typeof salesResp.body,
              bodyPreview: (typeof salesResp.body === 'string') ? salesResp.body.slice(0, 2000) : (JSON.stringify(salesResp.body || '').slice(0, 2000)),
              savedAt: new Date().toISOString()
            };
            fs.writeFileSync(path.join(DATA_DIR, 'sales-debug.json'), JSON.stringify(dbg, null, 2), 'utf8');
          } catch (e) {
            console.error('Failed to save sales debug', e);
          }
        }
      } catch (e) {
        // ignore sales fetch errors
        console.error('sales fetch failed', e);
      }
    if (!clicked) {
      // fallback: press Enter in password field
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null);
    }

    // At this point we're (likely) logged in. You should inspect the page and
    // replace the following extraction with specific endpoints or selectors
    // that contain sales, slot and product data.

    const content = await page.content();

    // TODO: parse `content` or call JSON endpoints using `fetch` via page.evaluate
    // Example: const data = await page.evaluate(() => fetch('/api/whatever').then(r=>r.json()));

    // Wait briefly to let any post-login XHR finish (use portable delay)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Proactively call likely JSON endpoints to surface sales/monitoring data.
    try {
      const nd = Date.now();
      const endpoints = [
        `/OperateMonitor/ListJson/?firstload=0&_search=false&nd=${nd}&rows=50&page=1&sidx=MiNoline&sord=desc`,
        '/AssetsManage/GetStringMachineGroup',
        '/PersonalSettings/GetPersonals',
        '/MessagePush/IfPushList',
      ];

      for (const ep of endpoints) {
        try {
          const full = new URL(ep, LOGIN_URL).toString();
          // request via page.evaluate so authentication cookies are sent
          const body = await page.evaluate(async (u: string) => {
            try {
              const r = await fetch(u, { credentials: 'same-origin' });
              const ct = r.headers.get('content-type') || '';
              if (ct.includes('application/json')) return { url: u, status: r.status, body: await r.json() };
              return { url: u, status: r.status, body: await r.text() };
            } catch (e) {
              return { url: u, status: 0, body: String(e) };
            }
          }, full).catch(() => null);
          if (body) {
            capturedResponses.push(body as any);
          }
        } catch (e) {
          // ignore per-endpoint errors
        }
      }
    } catch (e) {
      // ignore
    }

    // Persist parsed records (best-effort)
    try {
      parseAndPersist(capturedResponses as any);
    } catch (e) {
      console.error('parseAndPersist failed', e);
    }

    return { success: true, content, capturedResponses };
  } catch (err) {
    return { success: false, error: String(err) };
  } finally {
    await browser.close();
  }
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startOurVendScheduler(intervalMs = 60_000 * 5) {
  if (intervalHandle) return;
  // Run immediately, then at interval
  (async () => {
    try {
      await fetchOurVendOnce({ headless: true });
    } catch (e) {
      console.error('initial ourvend fetch failed', e);
    }
  })();

  intervalHandle = setInterval(async () => {
    try {
      const res = await fetchOurVendOnce({ headless: true });
      // TODO: persist `res` into DB via your existing `services/db.ts` or Prisma layer
      console.log('ourvend poll result', res && (res as any).success);
    } catch (e) {
      console.error('ourvend scheduled fetch failed', e);
    }
  }, intervalMs);
}

export function stopOurVendScheduler() {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
}
