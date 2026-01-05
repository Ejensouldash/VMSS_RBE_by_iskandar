
// lib/lhdn-helper.ts

/**
 * LHDN MyInvois Helper
 * Formats internal VM transaction data into the UBL 2.1 Standard required by LHDN Malaysia.
 */

export interface LhdnPayload {
  invoiceTypeCode: string; // "01" for Invoice
  invoiceDate: string;
  invoiceTime: string;
  supplier: {
    tin: string;
    brn: string; // Business Reg Number
    msic: string; // Industry Code
    name: string;
  };
  buyer: {
    tin: string; // "EI00000000010" for General Public (B2C)
    name: string;
  };
  items: {
    classification: string; // "022" for Food & Beverage
    description: string;
    unitPrice: number;
    taxType: string; // "06"
    taxAmount: number;
    subtotal: number;
  }[];
  totalExcludingTax: number;
  totalTax: number;
  totalPayable: number;
}

const ROZITA_BINA_INFO = {
  tin: "C1234567890",
  brn: "202301000001",
  msic: "47992", // Retail sale via stalls and markets/vending machines
  name: "ROZITA BINA ENTERPRISE"
};

/**
 * Converts a Transaction object into LHDN JSON format
 */
import { VM_CONFIG } from './vm-config';

export const formatForMyInvois = (transaction: any): LhdnPayload => {
  const dateObj = new Date(transaction?.timestamp || Date.now());

  // Determine tax rate from config if provided, otherwise default to 0
  const taxRate = (VM_CONFIG as any)?.TAX_RATE ?? 0.00;

  // Support older Transaction shape: if transaction.items missing, synthesize from productName/amount
  const rawItems = Array.isArray(transaction?.items) && transaction.items.length > 0
    ? transaction.items
    : [{ product: { name: transaction?.productName || 'Unknown' }, unitPrice: transaction?.amount || 0, quantity: 1 }];

  const items = rawItems.map((item: any) => {
    const unitPrice = parseFloat(item.unitPrice || (item.product?.price) || '0') || 0;
    const qty = Number(item.quantity || 1);
    const subtotal = unitPrice * qty;
    const taxAmount = subtotal * Number(taxRate || 0);

    return {
      classification: "022",
      description: (item.product?.name) || item.product?.description || String(item.description || item.productName || 'Item'),
      unitPrice: unitPrice,
      taxType: "06",
      taxAmount: taxAmount,
      subtotal: subtotal
    };
  });

  const totalExcludingTax = items.reduce((acc: number, curr: any) => acc + (curr.subtotal || 0), 0);
  const totalTax = items.reduce((acc: number, curr: any) => acc + (curr.taxAmount || 0), 0);

  return {
    invoiceTypeCode: "01",
    invoiceDate: dateObj.toISOString().split('T')[0],
    invoiceTime: dateObj.toISOString().split('T')[1].split('.')[0] + 'Z',
    supplier: ROZITA_BINA_INFO,
    buyer: {
      tin: "EI00000000010",
      name: transaction?.buyer?.name || 'General Public'
    },
    items,
    totalExcludingTax,
    totalTax,
    totalPayable: totalExcludingTax + totalTax
  };
};

export const submitToLhdn = async (payload: LhdnPayload) => {
  // If an API endpoint is configured (via VM_CONFIG.LHDN_ENDPOINT), post there.
  const endpoint = (VM_CONFIG as any)?.LHDN_ENDPOINT || '/api/lhdn/submit';
  try {
    // Attempt real HTTP submission
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      // Fall back to demo simulated response
      console.warn('LHDN submission failed, falling back to simulated response', await res.text());
      return { status: 'PENDING_SIMULATED', uuid: 'sim-' + Math.random().toString(36).substr(2,9), submissionDate: new Date() };
    }

    const json = await res.json().catch(() => null);
    return json || { status: 'UNKNOWN', uuid: 'lhdn-' + Math.random().toString(36).substr(2,9), submissionDate: new Date() };
  } catch (e) {
    // Network error: return simulated accepted response but include error message
    console.error('LHDN submit error:', e);
    return { status: 'ERROR_SIMULATED', uuid: 'sim-' + Math.random().toString(36).substr(2,9), submissionDate: new Date(), error: String(e) };
  }
};
