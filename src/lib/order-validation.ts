export const MAX_LINE_QUANTITY = 20;
export const MAX_LINES = 40;

export interface CheckoutFields {
  customerName: string;
  phone: string;
  address: string;
  comment: string;
}

export interface OrderLine {
  productId: number;
  quantity: number;
}

export type FieldErrors = Partial<Record<keyof CheckoutFields, "required" | "invalid" | "tooLong">>;

/** Accepts common ways of writing an Uzbek number and returns +998XXXXXXXXX, or null. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s()+-]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const local = digits.length === 12 && digits.startsWith("998") ? digits.slice(3) : digits;
  return local.length === 9 ? `+998${local}` : null;
}

export function validateFields(input: Partial<Record<keyof CheckoutFields, unknown>>): {
  fields: CheckoutFields;
  errors: FieldErrors;
} {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const customerName = text(input.customerName);
  const address = text(input.address);
  const comment = text(input.comment);
  const rawPhone = text(input.phone);
  const phone = normalizePhone(rawPhone);

  const errors: FieldErrors = {};
  if (!customerName) errors.customerName = "required";
  else if (customerName.length > 100) errors.customerName = "tooLong";
  if (!rawPhone) errors.phone = "required";
  else if (!phone) errors.phone = "invalid";
  if (!address) errors.address = "required";
  else if (address.length > 300) errors.address = "tooLong";
  if (comment.length > 500) errors.comment = "tooLong";

  return { fields: { customerName, phone: phone ?? rawPhone, address, comment }, errors };
}

/** Parses untrusted cart lines and merges repeats. Returns null when anything is malformed. */
export function parseLines(input: unknown): OrderLine[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_LINES) return null;
  const merged = new Map<number, number>();
  for (const line of input) {
    const { productId, quantity } = (line ?? {}) as Record<string, unknown>;
    if (!Number.isInteger(productId) || !Number.isInteger(quantity)) return null;
    if ((productId as number) <= 0 || (quantity as number) <= 0) return null;
    merged.set(productId as number, (merged.get(productId as number) ?? 0) + (quantity as number));
  }
  const lines = [...merged].map(([productId, quantity]) => ({ productId, quantity }));
  return lines.some((line) => line.quantity > MAX_LINE_QUANTITY) ? null : lines;
}
