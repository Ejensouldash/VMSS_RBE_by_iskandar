import { NextRequest, NextResponse } from 'next/server';
import { startOurVendScheduler, stopOurVendScheduler } from '../../../../services/ourvend.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';

    if (action === 'start') {
      const intervalMs = parseInt(url.searchParams.get('intervalMs') || '60000', 10);
      startOurVendScheduler(intervalMs);
      return NextResponse.json({ success: true, started: true, intervalMs });
    }

    if (action === 'stop') {
      stopOurVendScheduler();
      return NextResponse.json({ success: true, stopped: true });
    }

    return NextResponse.json({ success: true, status: 'ok' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
  }
}
