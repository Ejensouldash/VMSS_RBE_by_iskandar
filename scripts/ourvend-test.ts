import 'dotenv/config';
import { fetchOurVendOnce } from '../services/ourvend.ts';

async function main() {
  const res = await fetchOurVendOnce({ headless: true });
  if (res.success) {
    console.log('Fetched content length:', (res as any).content?.length ?? 0);
    const caps = (res as any).capturedResponses ?? [];
    console.log('Captured responses:', caps.length);
    for (const c of caps.slice(0, 20)) {
      console.log('-', c.url, 'status=', c.status, 'bodyType=', typeof c.body);
    }
  } else {
    console.error('Fetch failed:', (res as any).error);
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
