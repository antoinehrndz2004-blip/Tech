import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  // Always required — used by both the WhatsApp server and the CLI chat tester.
  openaiApiKey: required("OPENAI_API_KEY"),

  // Only required when running the Express server (index.ts validates before listen).
  // Left as possibly-empty strings so the CLI chat tester can run without Meta setup.
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    appSecret: process.env.WHATSAPP_APP_SECRET ?? "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  },

  staffNotifyNumber: process.env.STAFF_NOTIFY_NUMBER ?? "",
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_PATH ?? "./data/agent.db",
} as const;

/** Called by the Express server on startup — fatal if any WhatsApp var is missing. */
export function assertWhatsAppConfigured(): void {
  const missing = (Object.entries(config.whatsapp) as Array<[string, string]>)
    .filter(([, v]) => !v)
    .map(([k]) => `WHATSAPP_${k.replace(/[A-Z]/g, c => `_${c}`).toUpperCase().replace(/^_/, "")}`);
  if (missing.length > 0) {
    throw new Error(
      `Missing WhatsApp env vars: ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill them in, or run \`npm run chat\` for offline testing.`,
    );
  }
}
