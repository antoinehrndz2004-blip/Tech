/**
 * Local chat tester — talks to the agent from your terminal instead of WhatsApp.
 *
 * Run with:   npm run chat
 *
 * Only OPENAI_API_KEY is required. The WHATSAPP_* env vars can be empty.
 * Tool calls (capture_lead, book_trial, handoff_to_human) still write to the
 * local SQLite database so you can verify the CRM side effects, but no message
 * is sent to any real phone (notifyStaff no-ops when STAFF_NOTIFY_NUMBER is empty).
 */
import readline from "node:readline/promises";
import { respondToMessage } from "./agent.js";
import { appendMessage } from "./storage.js";

const FAKE_WA_FROM = "352000000000"; // fake E.164 to scope conversation history

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("💬 Elysium Gym agent — local chat (Ctrl+C to quit)");
  console.log("   Write in French, English, German or Luxembourgish.\n");

  while (true) {
    const userText = (await rl.question("you> ")).trim();
    if (!userText) continue;
    if (userText === "/quit" || userText === "/exit") break;

    try {
      appendMessage(FAKE_WA_FROM, "user", userText);
      const reply = await respondToMessage({
        waFrom: FAKE_WA_FROM,
        userText,
        profileName: "Test User",
      });
      appendMessage(FAKE_WA_FROM, "assistant", reply);
      console.log(`bot> ${reply}\n`);
    } catch (err) {
      console.error("[chat] error:", err);
    }
  }

  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
