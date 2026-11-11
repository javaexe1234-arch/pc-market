import { formatUzs } from "./format";

const MESSAGE_LIMIT = 4096;
const REQUEST_TIMEOUT_MS = 20_000;

/** The error text never includes the request URL, because the URL contains the bot token. */
export class TelegramError extends Error {}

export interface TelegramConfig {
  token: string;
  chatId: string;
  apiBase: string;
}

export function telegramConfig(): TelegramConfig | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return null;
  return { token, chatId, apiBase: process.env.TELEGRAM_API_BASE?.trim() || "https://api.telegram.org" };
}

export async function callTelegram<T = unknown>(
  config: Pick<TelegramConfig, "token" | "apiBase">,
  method: string,
  body?: FormData | Record<string, unknown>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.apiBase}/bot${config.token}/${method}`, {
      method: "POST",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(body instanceof FormData
        ? { body }
        : { body: JSON.stringify(body ?? {}), headers: { "Content-Type": "application/json" } }),
    });
  } catch {
    throw new TelegramError("Could not reach Telegram");
  }
  const data = (await response.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
  if (!response.ok || !data?.ok) {
    throw new TelegramError(data?.description || `Telegram responded with status ${response.status}`);
  }
  return data.result as T;
}

export interface ReceiptOrder {
  number: string;
  customerName: string;
  phone: string;
  address: string;
  comment: string | null;
  totalUzs: number;
  items: { brand: string; name: string; priceUzs: number; quantity: number }[];
}

/** Plain text on purpose: with no parse mode, customer input can't inject formatting or links. */
export function orderMessage(order: ReceiptOrder): string {
  const lines = [
    `🧾 Новый чек, заказ №${order.number}`,
    "",
    `Имя: ${order.customerName}`,
    `Телефон: ${order.phone}`,
    `Адрес: ${order.address}`,
    ...(order.comment ? [`Комментарий: ${order.comment}`] : []),
    "",
    "Товары:",
    ...order.items.map(
      (item) => `• ${item.brand} ${item.name} × ${item.quantity}: ${formatUzs(item.priceUzs * item.quantity, "ru")}`,
    ),
    "",
    `Итого: ${formatUzs(order.totalUzs, "ru")}`,
  ];
  return lines.join("\n").slice(0, MESSAGE_LIMIT);
}

function fileForm(config: TelegramConfig, field: "photo" | "document", file: ReceiptFile, caption: string, replyTo: number) {
  const form = new FormData();
  form.set("chat_id", config.chatId);
  form.set("caption", caption);
  form.set("reply_parameters", JSON.stringify({ message_id: replyTo }));
  form.set(field, new Blob([Buffer.from(file.bytes)], { type: file.mime }), file.fileName);
  return form;
}

export interface ReceiptFile {
  bytes: Uint8Array;
  mime: string;
  fileName: string;
  isImage: boolean;
}

/** Sends the order details, then the receipt as a reply to them. */
export async function sendReceiptToTelegram(config: TelegramConfig, order: ReceiptOrder, file: ReceiptFile) {
  const message = await callTelegram<{ message_id: number }>(config, "sendMessage", {
    chat_id: config.chatId,
    text: orderMessage(order),
  });
  const caption = `Чек к заказу №${order.number}`;
  if (file.isImage) {
    try {
      await callTelegram(config, "sendPhoto", fileForm(config, "photo", file, caption, message.message_id));
      return;
    } catch {
      // Telegram refuses photos with extreme proportions, such as long phone screenshots.
    }
  }
  await callTelegram(config, "sendDocument", fileForm(config, "document", file, caption, message.message_id));
}
