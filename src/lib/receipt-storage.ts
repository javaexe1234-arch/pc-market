import { randomBytes } from "node:crypto";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";
import type { ReceiptType } from "./receipt";

/**
 * Receipts live in the private "receipts" bucket of Neon Object Storage (see neon.ts).
 * The adapter reads the branch's AWS_* variables, which `neon deploy` / `neon env pull` write to .env.
 * Only the server reads them: the bucket is private and the site never links to it.
 */
export const RECEIPT_BUCKET = "receipts";

let files: Files | undefined;
const storage = () => (files ??= new Files({ adapter: neon({ bucket: RECEIPT_BUCKET }) }));

/** A fresh key per upload, so a replaced receipt never overwrites the previous object in place. */
export const receiptKey = (orderId: number, type: ReceiptType) =>
  `orders/${orderId}/${randomBytes(8).toString("hex")}.${type.extension}`;

export async function saveReceipt(key: string, bytes: Uint8Array, type: ReceiptType): Promise<void> {
  await storage().upload(key, bytes, { contentType: type.mime });
}

/** The stored bytes, or null when the object is missing or storage can't be reached. */
export async function readReceipt(key: string): Promise<Uint8Array | null> {
  try {
    const file = await storage().download(key);
    return new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    console.error(`Could not read receipt ${key}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export async function deleteReceipt(key: string): Promise<void> {
  await storage().delete(key).catch((error: unknown) => {
    console.error(`Could not delete receipt ${key}:`, error instanceof Error ? error.message : error);
  });
}
