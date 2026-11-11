export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const MAX_RECEIPT_ATTEMPTS = 5;

export interface ReceiptType {
  mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  extension: "jpg" | "png" | "webp" | "pdf";
  isImage: boolean;
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((value, i) => bytes[offset + i] === value);

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

/** Identifies a receipt by its content; the name and type the browser reports can't be trusted. */
export function detectReceiptType(bytes: Uint8Array): ReceiptType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", extension: "jpg", isImage: true };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", extension: "png", isImage: true };
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return { mime: "image/webp", extension: "webp", isImage: true };
  if (startsWith(bytes, ascii("%PDF-"))) return { mime: "application/pdf", extension: "pdf", isImage: false };
  return null;
}
