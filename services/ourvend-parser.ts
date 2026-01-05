import fs from 'fs';
import path from 'path';
import { emitRecord } from './ourvend-bus.ts';

const DB_PATH = path.resolve(process.cwd(), 'db.json');

type Captured = { url: string; status: number; body: any };

function readDb(): any {
  try {
    const txt = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(txt);
  } catch (_) {
    return {};
  }
}

function writeDb(obj: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

function normalizeRow(row: any): any {
  const rec: any = {};
  // Common mappings
  rec.machineId = row.MachineId ?? row.MachineNo ?? row.DeviceId ?? row.mid ?? row.MId ?? row.MsID ?? row.MachineID ?? null;
  rec.productId = row.ProductId ?? row.Sku ?? row.sku ?? null;
  rec.productName = row.ProductName ?? row.Name ?? row.name ?? row.title ?? row.MiAlias ?? row.MachineName ?? null;
  rec.slotId = row.SlotId ?? row.SlotNo ?? row.slot ?? row.Slot ?? row.MiNoline ?? null;
  rec.quantity = row.Quantity ?? row.Qty ?? row.qty ?? row.num ?? row.Num ?? row.colum00 ?? row.colum4 ?? 1;
  rec.amount = row.Amount ?? row.Price ?? row.Total ?? row.total ?? row.TotalFlow ?? row.colum0 ?? row.colum3 ?? null;
  rec.timestamp = row.CreateTime ?? row.Time ?? row.Date ?? row.date ?? row.createTime ?? row.EndTime ?? new Date().toISOString();
  rec.raw = row;
  return rec;
}

export function parseAndPersist(captured: Captured[]) {
  const db = readDb();
  if (!db.ourvend) db.ourvend = { records: [] };
  const prevLen = db.ourvend.records.length || 0;

  for (const c of captured) {
    let body = c.body;
    if (!body) continue;
    // If body is a JSON string, attempt to parse it
    if (typeof body === 'string') {
      const trimmed = body.trim();
      if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length < 200000) {
        try {
          body = JSON.parse(trimmed);
        } catch (_) {
          // keep as string
        }
      }
    }
    // Handle array bodies
    if (Array.isArray(body)) {
      for (const item of body) {
        const rec = normalizeRow(item);
        rec.source = c.url;
        db.ourvend.records.push(rec);
      }
      continue;
    }

    // Special-case: aggregated table rows like capture -> colum0/colum3 representation
    if (body.rows && Array.isArray(body.rows)) {
      const first = body.rows[0] || {};
      // If row contains colum* fields (aggregated per-machine totals)
      if (first.colum0 || first.colum3) {
        for (const item of body.rows) {
          const rec: any = {
            machineId: item.MachineID || item.MachineId || item.MId || item.MsID || null,
            productId: null,
            productName: item.MachineName || item.MGName || 'Machine Total',
            slotId: item.MachineID || null,
            quantity: parseInt(item.colum00 || item.colum4 || '0', 10) || 0,
            amount: parseFloat(item.colum0 || item.colum3 || '0') || 0,
            timestamp: new Date().toISOString(),
            raw: item,
            source: c.url
          };
          db.ourvend.records.push(rec);
        }
        continue;
      }

      // If rows look like payment breakdowns (AmountListJson)
      if (first.PayName || first.PayType || first.TotalAmount) {
        for (const item of body.rows) {
          const rec: any = {
            machineId: null,
            productId: null,
            productName: item.PayName || item.PayType || 'Payment Type',
            slotId: null,
            quantity: parseInt(item.TotalCount || item.Count || '0', 10) || 0,
            amount: parseFloat(item.TotalAmount || item.Total || item.Amount || '0') || 0,
            timestamp: new Date().toISOString(),
            raw: item,
            source: c.url
          };
          db.ourvend.records.push(rec);
        }
        continue;
      }

      // Default: map rows normally
      for (const item of body.rows) {
        const rec = normalizeRow(item);
        rec.source = c.url;
        db.ourvend.records.push(rec);
      }
      continue;
    }
    // Some endpoints return an object with data or result arrays
    const candidates = ['data', 'result', 'list', 'items'];
    let found = false;
    for (const k of candidates) {
      if (Array.isArray(body[k])) {
        for (const item of body[k]) {
          const rec = normalizeRow(item);
          rec.source = c.url;
          db.ourvend.records.push(rec);
        }
        found = true;
        break;
      }
    }
    if (found) continue;

    // Fallback: store raw object or string as a single record
    const rec = normalizeRow(body);
    rec.source = c.url;
    db.ourvend.records.push(rec);
  }

  // Retention: remove records older than 365 days
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 365;
  db.ourvend.records = db.ourvend.records.filter((r: any) => {
    const t = Date.parse(r.timestamp || r.raw?.CreateTime || r.raw?.Date || new Date().toISOString());
    if (isNaN(t)) return true; // keep if unknown
    return t >= cutoff;
  });

  writeDb(db);

  // Emit newly inserted records
  try {
    const newRecords = db.ourvend.records.slice(prevLen).filter(Boolean);
    for (const r of newRecords) {
      try { emitRecord(r); } catch (e) {}
    }
  } catch (e) {
    // ignore
  }

  return { inserted: db.ourvend.records.length };
}
