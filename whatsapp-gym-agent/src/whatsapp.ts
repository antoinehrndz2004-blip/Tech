import crypto from "node:crypto";
import { config } from "./config.js";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

/** Send a plain text message to a WhatsApp user. */
export async function sendText(to: string, body: string): Promise<void> {
  const url = `${GRAPH_BASE}/${config.whatsapp.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsapp.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      // WhatsApp caps text messages at 4096 characters. Truncate defensively.
      text: { body: body.length > 4000 ? `${body.slice(0, 3990)}…` : body },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp sendText failed (${res.status}): ${err}`);
  }
}

/** Mark an incoming message as read so the user sees the blue ticks. */
export async function markAsRead(waMessageId: string): Promise<void> {
  const url = `${GRAPH_BASE}/${config.whatsapp.phoneNumberId}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsapp.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: waMessageId,
    }),
  }).catch(() => {
    // Non-fatal — read receipts are best-effort.
  });
}

/**
 * Verify the X-Hub-Signature-256 header Meta sends on every webhook POST.
 * Returns true if the HMAC-SHA256 of the raw body with our app secret matches.
 */
export function verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = crypto
    .createHmac("sha256", config.whatsapp.appSecret)
    .update(rawBody)
    .digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Shape of the relevant pieces of an incoming WhatsApp webhook. */
export interface IncomingTextMessage {
  waMessageId: string;
  from: string;
  text: string;
  timestamp: number;
  profileName?: string;
}

/**
 * Parse a WhatsApp webhook body and return every text message it contains.
 * Non-text messages (images, audio, stickers…) are ignored — the agent is text-only.
 */
export function extractTextMessages(body: unknown): IncomingTextMessage[] {
  const out: IncomingTextMessage[] = [];
  const entries = (body as { entry?: unknown[] } | undefined)?.entry;
  if (!Array.isArray(entries)) return out;

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] }).changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> }).value;
      if (!value) continue;
      const messages = value.messages as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(messages)) continue;
      const contacts = value.contacts as Array<{ profile?: { name?: string }; wa_id?: string }> | undefined;
      for (const msg of messages) {
        if (msg.type !== "text") continue;
        const id = String(msg.id ?? "");
        const from = String(msg.from ?? "");
        const text = (msg.text as { body?: string } | undefined)?.body ?? "";
        const timestamp = Number(msg.timestamp ?? 0);
        if (!id || !from || !text) continue;
        const profileName = contacts?.find(c => c.wa_id === from)?.profile?.name;
        out.push({ waMessageId: id, from, text, timestamp, profileName });
      }
    }
  }
  return out;
}
