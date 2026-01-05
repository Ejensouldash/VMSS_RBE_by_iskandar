import 'dotenv/config';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const LOGIN_URL = 'https://os.ourvend.com/Account/Login';

async function run() {
  console.log('Starting interactive capture. A browser window will open.');
  console.log('Please login and manually navigate to pages (Sale List, Machine Monitor, etc.).');
  console.log('Captured JSON/XHR responses will be saved to public/tcn-data/*.json');

  const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
  const page = await browser.newPage();

  const DATA_DIR = path.join(process.cwd(), 'public', 'tcn-data');
  fs.mkdirSync(DATA_DIR, { recursive: true });

  let captureIndex = 0;

  page.on('response', async (response) => {
    try {
      const req = response.request();
      const url = req.url();
      const resource = req.resourceType();
      if (!(resource === 'xhr' || resource === 'fetch' || /Sale|SaleListJson|ListJson|SaleDetail/i.test(url))) return;

      const headers = response.headers();
      const ct = (headers['content-type'] || '');
      let body: any = null;
      if (ct.includes('application/json')) {
        body = await response.json().catch(() => null);
      } else {
        body = await response.text().catch(() => null);
      }

      const fileBase = `capture-${Date.now()}-${captureIndex++}`;
      const out = { url, status: response.status(), contentType: ct, body };
      fs.writeFileSync(path.join(DATA_DIR, `${fileBase}.json`), JSON.stringify(out, null, 2), 'utf8');
      console.log('Captured:', url, '-> saved to', `${fileBase}.json`);

      // If this looks like sales JSON with rows, also write to sales.json for dashboard consumption
      try {
        if (body && typeof body === 'object' && Array.isArray(body.rows || body.data || body.result || body.list || body.items)) {
          const salesFile = path.join(DATA_DIR, 'sales.json');
          fs.writeFileSync(salesFile, JSON.stringify(body, null, 2), 'utf8');
          console.log('Saved sales.json (dashboard will pick this up)');
        }
      } catch (e) {}
    } catch (e) {
      // ignore
    }
  });

  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' }).catch(() => null);

  console.log('Browser opened. Interact with the site. Capture will run in background.');
  console.log('When finished, close the browser window or press Ctrl+C here to exit.');
}

run().catch((e) => {
  console.error('Capture failed', e);
  process.exit(1);
});
