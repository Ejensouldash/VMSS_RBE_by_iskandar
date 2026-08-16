/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig((configEnv) => {
    const mode = configEnv?.mode || 'development';
    const env = loadEnv(mode, process.cwd(), '');

    return {
      server: {
        port: 3000,
        host: '0.0.0.0', 
        proxy: {
            // --- PROXY CONFIGURATION START ---
            '/api/proxy/tcn': {
              target: 'https://os.ourvend.com',
              changeOrigin: true,
              secure: false, 
              rewrite: (path) => path.replace(/^\/api\/proxy\/tcn/, ''), 
              
              configure: (proxy, _options) => {
                proxy.on('proxyReq', (proxyReq, req, _res) => {
                  console.log(`[Proxy] Sending request to: ${req.url}`);

                  // 1. Ambil cookie dari frontend
                  const secretCookie = req.headers['x-tcn-cookie'];
                  
                  if (secretCookie) {
                    proxyReq.setHeader('Cookie', secretCookie);
                    proxyReq.removeHeader('x-tcn-cookie'); 
                  }

                  // 2. SPOOFING (PENIPUAN SUCI) 😇
                  // Server TCN sensitif dengan 'Referer'. Kita kena tukar ikut jenis request.
                  
                  // Kalau request pasal SALES (SaleListJson), kita tipu cakap kita kat page Sales
                  if (req.url && req.url.includes('SaleListJson')) {
                      console.log('[Proxy] Switching Referer to SaleDetail');
                      proxyReq.setHeader('Referer', 'https://os.ourvend.com/SaleDetail/Index');
                  } 
                  // Kalau request lain (macam ListJson mesin), guna default Dashboard
                  else {
                      proxyReq.setHeader('Referer', 'https://os.ourvend.com/OperateMonitor/Index');
                  }

                  proxyReq.setHeader('Origin', 'https://os.ourvend.com');
                  proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                  proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest');
                });

                proxy.on('proxyRes', (proxyRes, req, _res) => {
                  console.log(`[Proxy] Response from TCN: ${proxyRes.statusCode} for ${req.url}`);
                });
              },
            },
			// Dalam vite.config.ts -> server -> proxy:

			// Tambah blok ini:
			'/api/transactions': {
			target: 'http://localhost:3001',
			changeOrigin: true,
			secure: false
		},
			'/api/ipay88': {
			target: 'http://localhost:3001',
			changeOrigin: true,
			secure: false
		},
            // --- PROXY CONFIGURATION END ---
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'), 
        }
      },
      test: {
        globals: true,
        environment: 'node'
      }
    };
});