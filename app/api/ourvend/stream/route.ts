import { NextRequest } from 'next/server';

import { bus } from '../../../../services/ourvend-bus';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  let ping: any;
  let onRecord: any;
  const stream = new ReadableStream({
    start(controller) {
      onRecord = (rec: any) => {
        try {
          const payload = JSON.stringify(rec);
          controller.enqueue(`data: ${payload}\n\n`);
        } catch (e) {
          // ignore
        }
      };

      bus.on('record', onRecord);

      // keep-alive ping every 20s
      ping = setInterval(() => controller.enqueue('data: {"type":"ping"}\n\n'), 20000);
    },
    cancel() {
      if (ping) clearInterval(ping);
      if (onRecord) bus.off('record', onRecord);
    }
  });

  return new Response(stream, { headers });
}
