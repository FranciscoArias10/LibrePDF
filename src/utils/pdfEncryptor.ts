import * as Crypto from 'expo-crypto';
import { encryptPDF as encryptWithLibrary } from '@pdfsmaller/pdf-encrypt';
import { PDFDocument } from 'pdf-lib';

// Ensure crypto.getRandomValues is available in Hermes/React Native environment
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}
if (typeof (globalThis.crypto as any).getRandomValues !== 'function') {
  (globalThis.crypto as any).getRandomValues = (array: ArrayBufferView) => {
    return Crypto.getRandomValues(array as any);
  };
}

/**
 * Encrypts a PDF byte array using Standard PDF Encryption (RC4 128-bit).
 * Fully compatible with ISO 32000-1 and all standard PDF readers
 * (Adobe Acrobat, Google Drive, Apple Books, Chrome, Android PDF Viewer).
 */
export async function encryptPDFBytes(
  pdfBytes: Uint8Array,
  password: string
): Promise<Uint8Array> {
  const cleanPassword = password?.trim();
  if (!cleanPassword) {
    return pdfBytes;
  }

  // Double check getRandomValues hook
  if (!(globalThis.crypto as any)?.getRandomValues) {
    (globalThis as any).crypto = (globalThis as any).crypto || {};
    (globalThis.crypto as any).getRandomValues = (array: any) => Crypto.getRandomValues(array);
  }

  const encryptedBytes = await encryptWithLibrary(pdfBytes, cleanPassword, {
    algorithm: 'RC4',
  });

  return encryptedBytes;
}

/**
 * Checks whether a given PDF (Uint8Array, base64 or ArrayBuffer) has an active encryption dictionary
 */
export async function checkIsPDFEncrypted(pdfData: Uint8Array | string): Promise<boolean> {
  try {
    const doc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
    return doc.isEncrypted;
  } catch {
    return false;
  }
}
