import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const CREDENTIALS = {
    username: 'RozitaBina', 
    password: 'Syintia@1234'
};

const REFRESH_RATE = 15 * 60 * 1000; // Run every 15 minutes
const DAYS_TO_FETCH = 30; // Fetch last 30 days of data

// File Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'public', 'tcn-data');
const SESSION_FILE = path.join(__dirname, 'public', 'session.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

async function runGhost() {
    console.log(`\n[${new Date().toLocaleTimeString()}] 👻 VMMS Auto-Fetcher (All Data) Starting...`);
    
    // Launch Browser (Headless "new" is better for latest Puppeteer)
    const browser = await puppeteer.launch({
        headless: "new", 
        defaultViewport: { width: 1920, height: 1080 },
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--window-size=1920,1080'
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Spoof User-Agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 1. LOGIN PROCESS
        console.log('   🔐 Authenticating with os.ourvend.com...');
        await page.goto('https://os.ourvend.com/Account/Login', { waitUntil: 'networkidle2', timeout: 60000 });

        const isOnLoginPage = await page.$('#PbUser_UserName') || await page.$('#UserName');
        if (isOnLoginPage) {
            await page.type('input[name*="UserName"]', CREDENTIALS.username, { delay: 50 });
            await page.type('input[type="password"]', CREDENTIALS.password, { delay: 50 });
            
            const loginBtn = await page.$('#btnLogin') || await page.$('button[type="submit"]');
            if (loginBtn) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
                    loginBtn.click()
                ]);
            } else {
                await page.keyboard.press('Enter');
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
            }
        }

        if (page.url().includes('Login')) throw new Error("❌ Login Failed! Check credentials.");
        console.log('   🎉 Login Successful! Session Active.');

        // 2. EXPORT SESSION (For API Proxy / other tools)
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        fs.writeFileSync(SESSION_FILE, JSON.stringify({ cookie: cookieString, updatedAt: new Date() }, null, 2));
        console.log('   💾 Session Cookie Saved.');

        // 3. FETCH MACHINE DATA (Direct API Injection)
        console.log('   🤖 Fetching Machine Status & Inventory (API)...');
        const machineData = await page.evaluate(async () => {
            try {
                const response = await fetch('/OperateMonitor/ListJson?_search=false&rows=500&page=1&sidx=MiNoline&sord=desc', {
                    method: 'GET',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                return await response.json();
            } catch (e) { return { error: e.toString() }; }
        });

        if (machineData && machineData.rows) {
            fs.writeFileSync(path.join(DATA_DIR, 'machines.json'), JSON.stringify(machineData, null, 2));
            console.log(`   📦 [Machines] Saved ${machineData.rows.length} records.`);
        } else {
            console.warn('   ⚠️ [Machines] No data found or API changed.');
        }

        // 4. FETCH SALES DATA (Historical & Current)
        console.log(`   💰 Fetching Sales History (Last ${DAYS_TO_FETCH} Days)...`);
        
        // Calculate Dates
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - DAYS_TO_FETCH);
        const fmt = d => d.toISOString().split('T')[0]; // YYYY-MM-DD

        const salesData = await page.evaluate(async (startDate, endDate) => {
            try {
                const params = new URLSearchParams({
                    _search: 'true',
                    rows: '2000',
                    page: '1',
                    sidx: 'TradeTime',
                    sord: 'desc',
                    startDate: startDate,
                    endDate: endDate,
                    filters: JSON.stringify({
                        groupOp: "AND",
                        rules: [
                            { field: "TradeTime", op: "ge", data: startDate },
                            { field: "TradeTime", op: "le", data: endDate }
                        ]
                    })
                });

                // Try Primary Endpoint
                let response = await fetch(`/SaleDetail/ListJson?${params.toString()}`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });

                // Fallback endpoint
                if (!response.ok) {
                    response = await fetch(`/SaleDetail/GetSaleList?${params.toString()}`, {
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                }

                return await response.json();
            } catch (e) { return { error: e.toString() }; }
        }, fmt(pastDate), fmt(today));

        if (salesData && salesData.rows && salesData.rows.length > 0) {
            const finalData = { 
                lastUpdated: new Date().toISOString(),
                rows: salesData.rows 
            };
            fs.writeFileSync(path.join(DATA_DIR, 'sales.json'), JSON.stringify(finalData, null, 2));
            console.log(`   📦 [Sales] SUCCESS! Captured ${salesData.rows.length} transactions.`);
            console.log(`      (Latest: ${salesData.rows[0].TradeTime} - ${salesData.rows[0].PName || salesData.rows[0].MiName})`);
        } else {
            // Plan B: UI Interception (Spy Mode)
            console.log('   ⚠️ API Direct Fetch empty. Engaging UI Interception (Spy Mode)...');
            await page.goto('https://os.ourvend.com/SaleDetail/Index', { waitUntil: 'networkidle2' });
            
            // Set Dates via DOM (Fixed: No Typescript Syntax)
            await page.evaluate((start, end) => {
                const setVal = (sel, val) => { 
                    const el = document.querySelector(sel);
                    if(el) el.value = val; 
                };
                setVal('#StartDate', start);
                setVal('#EndDate', end);
            }, fmt(pastDate), fmt(today));

            // Setup Interceptor
            const spyPromise = page.waitForResponse(res => 
                res.url().toLowerCase().includes('json') && res.request().method() !== 'OPTIONS', 
                { timeout: 15000 }
            ).catch(() => null);

            // Click Search
            await page.evaluate(() => {
                const btn = document.getElementById('btnSearch') || document.querySelector('.btn-search');
                if (btn) btn.click();
            });

            const response = await spyPromise;
            if (response) {
                const json = await response.json();
                if (json && json.rows) {
                    const finalData = { lastUpdated: new Date().toISOString(), rows: json.rows };
                    fs.writeFileSync(path.join(DATA_DIR, 'sales.json'), JSON.stringify(finalData, null, 2));
                    console.log(`   📦 [Sales-Spy] Recovered ${json.rows.length} records via UI Spy.`);
                }
            }
        }

    } catch (error) {
        console.error('   ❌ CRITICAL ERROR:', error);
        try { await page.screenshot({ path: path.join(__dirname, 'error_screenshot.png') }); } catch (e) {}
    } finally {
        await browser.close();
        console.log(`   💤 Cycle Complete. Sleeping for ${REFRESH_RATE / 60000} mins...`);
        setTimeout(runGhost, REFRESH_RATE);
    }
}

runGhost();