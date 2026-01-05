/**
 * Generates an HMAC-SHA512 signature using the Web Crypto API.
 * Compatible with iPay88 OPSG v1.6.4.4
 */
export const generateSignature = async (
  sourceString: string,
  secretKey: string
): Promise<string> => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const data = encoder.encode(sourceString);

  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign('HMAC', key, data);
  
  // Convert ArrayBuffer to Base64 (Standard for iPay88 HMACSHA512)
  let binary = '';
  const bytes = new Uint8Array(signature);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * Constructs the signature string based on iPay88 specifications.
 * 
 * RULE (Page 23/24): 
 * - Remove "." and "," from Amount (e.g., "1.00" -> "100")
 */
export const constructRequestSignature = (
  merchantKey: string,
  merchantCode: string,
  refNo: string,
  amount: string,
  currency: string,
  xfield1: string = ""
) => {
  // Order: MerchantKey & MerchantCode & RefNo & Amount & Currency & Xfield1
  const cleanAmount = amount.replace(/[.,]/g, ''); 
  return `${merchantKey}${merchantCode}${refNo}${cleanAmount}${currency}${xfield1}`;
};

export const constructResponseSignature = (
  merchantKey: string,
  merchantCode: string,
  paymentId: string,
  refNo: string,
  amount: string,
  currency: string,
  status: string
) => {
  // Order: MerchantKey & MerchantCode & PaymentId & RefNo & Amount & Currency & Status
  const cleanAmount = amount.replace(/[.,]/g, '');
  return `${merchantKey}${merchantCode}${paymentId}${refNo}${cleanAmount}${currency}${status}`;
};