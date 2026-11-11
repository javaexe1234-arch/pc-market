/**
 * Checks the Telegram settings in .env and helps find the chat id. Run: npm run telegram:setup
 * It never prints the bot token.
 */
import { callTelegram, TelegramError } from "../src/lib/telegram";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const apiBase = process.env.TELEGRAM_API_BASE?.trim() || "https://api.telegram.org";

  if (!token) {
    console.log("TELEGRAM_BOT_TOKEN is empty. Create a bot with @BotFather and put its token in .env.");
    return;
  }

  const bot = await callTelegram<{ username: string }>({ token, apiBase }, "getMe");
  console.log(`Bot found: @${bot.username}`);

  if (!chatId) {
    const updates = await callTelegram<{ message?: { chat: { id: number; first_name?: string; title?: string } } }[]>(
      { token, apiBase },
      "getUpdates",
    );
    const chats = new Map(updates.flatMap((u) => (u.message ? [[u.message.chat.id, u.message.chat] as const] : [])));
    if (chats.size === 0) {
      console.log(`Send any message to @${bot.username} in Telegram, then run this command again.`);
      return;
    }
    console.log("Put the id of your chat into TELEGRAM_CHAT_ID in .env, then run this command again:");
    for (const [id, chat] of chats) console.log(`  ${id}  ${chat.title ?? chat.first_name ?? ""}`);
    return;
  }

  await callTelegram({ token, apiBase }, "sendMessage", { chat_id: chatId, text: "✅ PC Market: бот настроен, чеки будут приходить сюда." });
  console.log("Test message sent. Check your Telegram.");
}

main().catch((error) => {
  console.error(error instanceof TelegramError ? `Telegram error: ${error.message}` : error);
  process.exitCode = 1;
});
