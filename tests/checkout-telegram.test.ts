import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizePhone, parseLines, validateFields } from "../src/lib/order-validation";
import { allowRequest } from "../src/lib/rate-limit";
import { detectReceiptType } from "../src/lib/receipt";
import { orderMessage, sendReceiptToTelegram, TelegramError, telegramConfig } from "../src/lib/telegram";

describe("normalizePhone", () => {
  it.each(["+998 90 123-45-67", "998901234567", "901234567", "(90) 123 45 67"])("accepts %s", (raw) => {
    expect(normalizePhone(raw)).toBe("+998901234567");
  });
  it.each(["12345", "+7 900 123 45 67", "abc", "99890123456789"])("rejects %s", (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });
});

describe("validateFields", () => {
  it("requires name, phone and address, and allows no comment", () => {
    expect(validateFields({}).errors).toEqual({ customerName: "required", phone: "required", address: "required" });
  });
  it("normalizes and trims valid input", () => {
    const { fields, errors } = validateFields({ customerName: " Ali ", phone: "901234567", address: " Tashkent " });
    expect(errors).toEqual({});
    expect(fields).toMatchObject({ customerName: "Ali", phone: "+998901234567", address: "Tashkent" });
  });
  it("limits lengths and ignores non-text values", () => {
    expect(validateFields({ customerName: "x".repeat(101) }).errors.customerName).toBe("tooLong");
    expect(validateFields({ comment: "x".repeat(501) }).errors.comment).toBe("tooLong");
    expect(validateFields({ customerName: { a: 1 } }).errors.customerName).toBe("required");
  });
});

describe("parseLines", () => {
  it("merges repeated products", () => {
    expect(parseLines([{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }])).toEqual([{ productId: 1, quantity: 3 }]);
  });
  it.each([
    [[]],
    ["x"],
    [[{ productId: 1 }]],
    [[{ productId: 1, quantity: 0 }]],
    [[{ productId: 1, quantity: -1 }]],
    [[{ productId: 1.5, quantity: 1 }]],
    [[{ productId: 1, quantity: 21 }]],
    [[null]],
  ])("rejects %j", (input) => {
    expect(parseLines(input)).toBeNull();
  });
});

describe("detectReceiptType", () => {
  const bytes = (...values: number[]) => new Uint8Array(values);
  const text = (s: string) => new TextEncoder().encode(s);
  it("recognizes JPEG, PNG, WebP and PDF by content", () => {
    expect(detectReceiptType(bytes(0xff, 0xd8, 0xff, 0xe0))?.extension).toBe("jpg");
    expect(detectReceiptType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.extension).toBe("png");
    expect(detectReceiptType(text("RIFF0000WEBPVP8 "))?.extension).toBe("webp");
    expect(detectReceiptType(text("%PDF-1.7"))?.extension).toBe("pdf");
  });
  it("refuses anything else", () => {
    expect(detectReceiptType(text("<svg onload=alert(1)>"))).toBeNull();
    expect(detectReceiptType(text("MZ executable"))).toBeNull();
    expect(detectReceiptType(bytes())).toBeNull();
  });
});

describe("rate limit", () => {
  it("blocks over the limit and recovers after the window", () => {
    const key = `test-${Math.random()}`;
    expect(allowRequest(key, 1, 1000, 0)).toBe(true);
    expect(allowRequest(key, 1, 1000, 1)).toBe(false);
    expect(allowRequest(key, 1, 1000, 1001)).toBe(true);
  });
});

const ORDER = {
  number: "000012",
  customerName: "Ali <b>",
  phone: "+998901234567",
  address: "Tashkent",
  comment: null,
  totalUzs: 5_400_000,
  items: [{ brand: "AMD", name: "Ryzen", priceUzs: 2_700_000, quantity: 2 }],
};
const CONFIG = { token: "SECRET-TOKEN", chatId: "42", apiBase: "http://telegram.test" };
const IMAGE = { bytes: new Uint8Array([1]), mime: "image/png", fileName: "r.png", isImage: true };

describe("telegram", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const stub = (handler: (method: string) => unknown) => {
    const calls: { method: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      const method = url.split("/").pop()!;
      calls.push({ method, init });
      const result = handler(method);
      return new Response(JSON.stringify(result ?? { ok: true, result: { message_id: 7 } }));
    });
    return calls;
  };

  it("is off until both settings are present", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "t");
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    expect(telegramConfig()).toBeNull();
    vi.stubEnv("TELEGRAM_CHAT_ID", "1");
    expect(telegramConfig()).toMatchObject({ token: "t", chatId: "1", apiBase: "https://api.telegram.org" });
  });

  it("describes the order in plain text", () => {
    const text = orderMessage(ORDER);
    expect(text).toContain("№000012");
    expect(text).toContain("AMD Ryzen × 2: 5 400 000 сум");
    expect(text).toContain("Ali <b>");
  });

  it("sends the details, then the image as a reply", async () => {
    const calls = stub(() => null);
    await sendReceiptToTelegram(CONFIG, ORDER, IMAGE);
    expect(calls.map((c) => c.method)).toEqual(["sendMessage", "sendPhoto"]);
    expect(JSON.parse(calls[0].init.body as string).parse_mode).toBeUndefined();
    const form = calls[1].init.body as FormData;
    expect(form.get("chat_id")).toBe("42");
    expect(JSON.parse(form.get("reply_parameters") as string)).toEqual({ message_id: 7 });
  });

  it("falls back to a document when Telegram refuses the photo", async () => {
    const calls = stub((method) => (method === "sendPhoto" ? { ok: false, description: "PHOTO_INVALID_DIMENSIONS" } : null));
    await sendReceiptToTelegram(CONFIG, ORDER, IMAGE);
    expect(calls.map((c) => c.method)).toEqual(["sendMessage", "sendPhoto", "sendDocument"]);
  });

  it("sends a PDF as a document", async () => {
    const calls = stub(() => null);
    await sendReceiptToTelegram(CONFIG, ORDER, { ...IMAGE, mime: "application/pdf", isImage: false });
    expect(calls.map((c) => c.method)).toEqual(["sendMessage", "sendDocument"]);
  });

  it("reports failures without exposing the token", async () => {
    stub(() => ({ ok: false, description: "chat not found" }));
    await expect(sendReceiptToTelegram(CONFIG, ORDER, IMAGE)).rejects.toThrow("chat not found");

    vi.stubGlobal("fetch", async () => {
      throw new Error(`failed http://telegram.test/bot${CONFIG.token}/sendMessage`);
    });
    const error = await sendReceiptToTelegram(CONFIG, ORDER, IMAGE).catch((e) => e);
    expect(error).toBeInstanceOf(TelegramError);
    expect(error.message).not.toContain(CONFIG.token);
  });
});
