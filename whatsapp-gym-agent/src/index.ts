import express, { type Request, type Response } from "express";
import { assertWhatsAppConfigured, config } from "./config.js";

assertWhatsAppConfigured();
import {
  extractTextMessages,
  markAsRead,
  sendText,
  verifySignature,
} from "./whatsapp.js";
import { respondToMessage } from "./agent.js";
import {
  appendMessage,
  markMessageProcessed,
  wasMessageProcessed,
} from "./storage.js";

const app = express();

// Capture the raw body so we can verify Meta's HMAC signature. Required —
// JSON reserialization changes byte order and breaks signature verification.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

/**
 * Webhook verification (GET). Meta calls this once when you configure the
 * webhook URL in the app dashboard. We must echo hub.challenge when the
 * verify token matches.
 */
app.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === config.whatsapp.verifyToken) {
    res.status(200).send(String(challenge));
    return;
  }
  res.sendStatus(403);
});

/**
 * Inbound messages (POST).
 *
 *   1. Verify HMAC signature.
 *   2. Acknowledge immediately (Meta retries after ~20s — never do work in the request cycle).
 *   3. Process each text message asynchronously.
 */
app.post("/webhook", (req: Request, res: Response) => {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!raw || !verifySignature(raw, req.header("x-hub-signature-256"))) {
    res.sendStatus(401);
    return;
  }

  // Acknowledge now. Meta retries the webhook if we take too long.
  res.sendStatus(200);

  const messages = extractTextMessages(req.body);
  for (const msg of messages) {
    // Fire-and-forget. Errors are logged inside handleIncomingMessage.
    void handleIncomingMessage(msg);
  }
});

async function handleIncomingMessage(msg: {
  waMessageId: string;
  from: string;
  text: string;
  profileName?: string;
}): Promise<void> {
  // Meta retries webhooks aggressively. Dedupe by message id so we never reply twice.
  if (wasMessageProcessed(msg.waMessageId)) {
    console.log(`[webhook] duplicate ${msg.waMessageId}, skipping`);
    return;
  }
  markMessageProcessed(msg.waMessageId);

  try {
    await markAsRead(msg.waMessageId);
    appendMessage(msg.from, "user", msg.text, msg.waMessageId);

    const reply = await respondToMessage({
      waFrom: msg.from,
      userText: msg.text,
      profileName: msg.profileName,
    });

    appendMessage(msg.from, "assistant", reply);
    await sendText(msg.from, reply);
  } catch (err) {
    console.error(`[webhook] error processing ${msg.waMessageId}:`, err);
    try {
      await sendText(
        msg.from,
        "Désolé, un problème technique nous empêche de répondre pour l'instant. Un membre de l'équipe va vous recontacter. 🙏",
      );
    } catch {
      /* swallow — the user just won't get a fallback */
    }
  }
}

app.listen(config.port, () => {
  console.log(`[server] WhatsApp gym agent listening on :${config.port}`);
});
