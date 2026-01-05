const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// --- KONFIGURASI AKAUN TCN ---
// Ganti dengan username/password sebenar jika perlu
const USERNAME = "RozitaBina";
const PASSWORD = "HQRozita@_2512";
const LOGIN_URL = "https://os.ourvend.com/Account/Login";
// -----------------------------

const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_FILE = path.join(PUBLIC_DIR, 'session.json');

// Pastikan folder 'public' wujud
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR);
}

(async () => {
  console.log("🤖 Robot TCN: Memulakan sistem...");
  
  const browser = await puppeteer.launch({ 
      headless: false, // Kita nak tengok apa dia buat
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const page = await browser.newPage();

  try {
    // 1. Buka Website
    console.log(`🌐 Melayari: ${LOGIN_URL}`);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // 2. Isi Username
    console.log("✍️  Mengisi Username...");
    await page.waitForSelector('#UserName', { timeout: 10000 });
    await page.type('#UserName', USERNAME, { delay: 100 }); // Taip perlahan-lahan

    // 3. Isi Password
    console.log("✍️  Mengisi Password...");
    await page.waitForSelector('#Password', { timeout: 5000 });
    await page.type('#Password', PASSWORD, { delay: 100 });

    // 4. Cari & Klik Butang Login
    console.log("👆 Menekan butang Login...");
    
    // Cuba cari butang dengan pelbagai cara (sebab kadang TCN ubah ID)
    const loginBtn = await page.$('#btnLogin') || await page.$('button[type="submit"]') || await page.$('.btn-login');
    
    if (loginBtn) {
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
            loginBtn.click(),
        ]);
    } else {
        console.log("⚠️ Butang login tak jumpa! Cuba tekan ENTER...");
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    // 5. Verify Kejayaan
    const currentUrl = page.url();
    console.log(`📍 URL Semasa: ${currentUrl}`);

    if (currentUrl.includes('Login') || currentUrl.includes('Account')) {
        throw new Error("Gagal login! Masih di halaman login. Mungkin password salah atau ada CAPTCHA.");
    }

    console.log("✅ BERJAYA MASUK!");

    // 6. Ambil Cookies
    const cookies = await page.cookies();
    
    // Format cookie jadi string "key=value; key=value"
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // 7. Simpan ke fail session.json
    const sessionData = { 
        cookie: cookieString, 
        updatedAt: new Date().toISOString() 
    };
    
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    console.log(`💾 Cookie disimpan di: ${SESSION_FILE}`);
    console.log("🎉 Siap! Anda boleh tekan 'Sync TCN' di Dashboard sekarang.");

    // Tutup browser selepas 3 saat
    setTimeout(async () => {
        await browser.close();
    }, 3000);

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.log("📸 Mengambil screenshot error...");
    await page.screenshot({ path: 'error-login.png' });
    console.log("Lihat 'error-login.png' untuk detail.\n");
    await browser.close();
  }
})();