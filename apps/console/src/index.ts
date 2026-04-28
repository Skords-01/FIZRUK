import "dotenv/config";
import { Bot } from "grammy";
import Anthropic from "@anthropic-ai/sdk";
import { parseCommand, dispatchToAgent } from "./agents/router.js";

const HELP_TEXT = [
  "*Sergeant Console* — твій AI-помічник по продукту",
  "",
  "*/ops* <питання> — запитати Ops-агента",
  "  Приклади: /ops що там у проді? | /ops скільки нових юзерів сьогодні?",
  "",
  "*/content* <тема> — запитати Marketing-агента",
  "  Приклади: /content пост про новий реліз | /content ідеї для X",
  "",
  "*Без команди* — я сам визначу агента за контекстом.",
  "",
  "_Версія: Phase 1 (Claude API + Telegram bot)_",
].join("\n");

function checkAuth(userId: number): boolean {
  const allowed = process.env.ALLOWED_USER_IDS;
  if (!allowed || allowed.trim() === "") return true;
  return allowed
    .split(",")
    .map((s) => s.trim())
    .includes(String(userId));
}

async function main() {
  const botToken = process.env.CONSOLE_BOT_TOKEN;
  if (!botToken) {
    console.error("CONSOLE_BOT_TOKEN is not set");
    process.exit(1);
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    process.exit(1);
  }

  const bot = new Bot(botToken);
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  bot.command("start", async (ctx) => {
    if (!checkAuth(ctx.from?.id ?? 0)) {
      await ctx.reply("Access denied.");
      return;
    }
    await ctx.reply(HELP_TEXT, { parse_mode: "Markdown" });
  });

  bot.command("help", async (ctx) => {
    if (!checkAuth(ctx.from?.id ?? 0)) return;
    await ctx.reply(HELP_TEXT, { parse_mode: "Markdown" });
  });

  bot.on("message:text", async (ctx) => {
    if (!checkAuth(ctx.from?.id ?? 0)) {
      await ctx.reply("Access denied.");
      return;
    }

    const text = ctx.message.text;
    const { agent, query } = parseCommand(text);

    // Send "typing..." indicator
    await ctx.replyWithChatAction("typing");

    try {
      const reply = await dispatchToAgent(anthropic, agent, query);

      // Telegram has a 4096-char limit per message
      if (reply.length <= 4000) {
        await ctx.reply(reply, { parse_mode: "Markdown" });
      } else {
        // Split into chunks
        for (let i = 0; i < reply.length; i += 4000) {
          await ctx.reply(reply.slice(i, i + 4000), { parse_mode: "Markdown" });
        }
      }
    } catch (err) {
      console.error("Agent error:", err);
      await ctx.reply(
        `❌ Помилка агента: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });

  bot.catch((err) => {
    console.error("Bot error:", err.message);
  });

  console.log("Sergeant Console starting…");
  await bot.start();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
