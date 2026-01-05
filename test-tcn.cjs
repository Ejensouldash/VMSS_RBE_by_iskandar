// TEST SCRIPT: TCN CONNECTION
// Run this in terminal: node test-tcn.js

const https = require('https');

// 1. URL dan Kunci (Ini yang kita copy dari cURL tadi)
const url = "https://os.ourvend.com/OperateMonitor/ListJson/?firstload=0&_search=false&nd=1765893748213&rows=10&page=1&sidx=MiNoline&sord=desc";

const options = {
  method: 'GET',
  headers: {
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en-GB;q=0.9,en;q=0.8",
    "Cookie": "aliyungf_tc=ab66a2568769d67db2c91a2b564ae3c555b66acfd68f8cc0419370b0ca2ebce0; acw_tc=ac11000117658924880083133e0036845050b9f7e36e714dc74a036b685bde; ASP.NET_SessionId=jqnsxxz43gfnto21b54s0vkc",
    "DNT": "1",
    "Referer": "https://os.ourvend.com/OperateMonitor/Index",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest"
  }
};

console.log("🚀 Testing Connection to TCN Cloud...");

const req = https.request(url, options, (res) => {
  console.log(`📡 Status Code: ${res.statusCode}`);
  
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log("\n📦 Response Body Preview:");
    console.log(data.substring(0, 200)); // Show first 200 chars

    if (data.includes("rows")) {
        console.log("\n✅ SUCCESS! Data machines dijumpai.");
    } else if (data.includes("Login") || data.includes("html")) {
        console.log("\n❌ FAILED! Session Expired (Kena ambil cURL baru).");
    } else {
        console.log("\n⚠️ ERROR! Format data pelik.");
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ NETWORK ERROR: ${e.message}`);
});

req.end();