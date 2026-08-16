import { describe, it, expect } from 'vitest';
import { getUnitCost, enrichTransaction, enrichTransactions, computeDashboardMetrics, DEFAULT_COST_RATIO } from '../services/profit';
import { Transaction } from '../types';

describe('Profit Engine Unit Tests', () => {
  it('computes unit cost using explicit transaction cost if provided', () => {
    const tx: Transaction = {
      id: 'tx-1',
      refNo: 'REF-1',
      paymentId: 'P-1',
      productName: 'Custom Beverage',
      amount: 5.0,
      currency: 'MYR',
      status: 'SUCCESS',
      paymentMethod: 'QR',
      timestamp: '2026-08-16T10:00:00Z',
      cost: 2.2,
    };

    expect(getUnitCost(tx)).toBe(2.2);
  });

  it('computes unit cost from SKU matching when slotId matches commodity SKU', () => {
    const tx: Transaction = {
      id: 'tx-2',
      refNo: 'REF-2',
      paymentId: 'P-2',
      productName: 'Maggi Instant Noodles Big Curry (5x111g)',
      amount: 3.5,
      currency: 'MYR',
      status: 'SUCCESS',
      paymentMethod: 'CASH',
      timestamp: '2026-08-16T11:00:00Z',
      slotId: 'SLOT01',
    };

    const unitCost = getUnitCost(tx);
    expect(unitCost).toBe(1.3);
  });

  it('falls back to DEFAULT_COST_RATIO when no cost or SKU match is found', () => {
    const tx: Transaction = {
      id: 'tx-3',
      refNo: 'REF-3',
      paymentId: 'P-3',
      productName: 'Completely Unknown Item XYZ',
      amount: 10.0,
      currency: 'MYR',
      status: 'SUCCESS',
      paymentMethod: 'CARD',
      timestamp: '2026-08-16T12:00:00Z',
    };

    expect(getUnitCost(tx)).toBe(+(10.0 * DEFAULT_COST_RATIO).toFixed(4));
  });

  it('enriches transactions with profit = amount - cost and filters uncounted statuses', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-ok',
        refNo: 'REF-OK',
        paymentId: 'P-OK',
        productName: 'Item 1',
        amount: 10.0,
        currency: 'MYR',
        status: 'SUCCESS',
        paymentMethod: 'QR',
        timestamp: '2026-08-16T10:00:00Z',
        cost: 4.0,
      },
      {
        id: 'tx-fail',
        refNo: 'REF-FAIL',
        paymentId: 'P-FAIL',
        productName: 'Item 2',
        amount: 10.0,
        currency: 'MYR',
        status: 'FAILED',
        paymentMethod: 'QR',
        timestamp: '2026-08-16T10:05:00Z',
        cost: 4.0,
      },
      {
        id: 'tx-pending',
        refNo: 'REF-PEND',
        paymentId: 'P-PEND',
        productName: 'Item 3',
        amount: 10.0,
        currency: 'MYR',
        status: 'PENDING',
        paymentMethod: 'QR',
        timestamp: '2026-08-16T10:10:00Z',
        cost: 4.0,
      },
    ];

    const enriched = enrichTransactions(txs);
    expect(enriched).toHaveLength(1);
    expect(enriched[0].id).toBe('tx-ok');
    expect(enriched[0].profit).toBe(6.0);
  });

  it('computeDashboardMetrics handles empty transaction list gracefully', () => {
    const metrics = computeDashboardMetrics([]);
    expect(metrics.all.count).toBe(0);
    expect(metrics.all.revenue).toBe(0);
    expect(metrics.all.profit).toBe(0);
    expect(metrics.all.margin).toBe(0);
    expect(metrics.hourlyToday).toHaveLength(24);
  });
});
