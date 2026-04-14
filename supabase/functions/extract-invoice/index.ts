// @ts-nocheck — this file runs on Deno (Supabase Edge Runtime), not Node/Vite.
/**
 * extract-invoice — Claude Vision OCR for invoices & receipts.
 *
 * Receives:  { file: <base64 string>, mediaType: "image/jpeg" | "image/png"
 *                                                | "image/webp" | "image/gif"
 *                                                | "application/pdf" }
 * Returns :  { company, date, total, vat, category, type, conf }
 *
 * The function authenticates the caller via the Supabase-injected JWT (default
 * edge-function behaviour) so only signed-in users can burn Claude tokens.
 */
import { corsHeaders } from "../_shared/cors.ts";

const CATEGORIES = [
  "Rent",
  "Food & Dining",
  "Transport",
  "Office Supplies",
  "Software",
  "Marketing",
  "Utilities",
  "Insurance",
  "Professional Services",
  "Other",
] as const;

const TOOL = {
  name: "record_invoice",
  description:
    "Record the structured data extracted from an invoice or receipt.",
  input_schema: {
    type: "object",
    properties: {
      company: {
        type: "string",
        description:
          "Supplier / vendor name exactly as written on the document " +
          "(for a sales invoice, the client name).",
      },
      date: {
        type: "string",
        description:
          "Invoice issue date in strict YYYY-MM-DD format. If only a " +
          "month/year is visible, use day 01.",
      },
      total: {
        type: "number",
        description:
          "Amount EXCLUDING VAT (HT / hors TVA / net) in EUR. If the " +
          "document only shows TTC and a VAT figure, compute HT = TTC - VAT.",
      },
      vat: {
        type: "number",
        description:
          "VAT amount in EUR. 0 if not applicable or not visible.",
      },
      category: {
        type: "string",
        enum: [...CATEGORIES],
        description:
          "Best-matching expense category. Use 'Other' when uncertain.",
      },
      type: {
        type: "string",
        enum: ["expense", "revenue"],
        description:
          "'expense' for bills/receipts the business pays; 'revenue' for " +
          "invoices the business issues to its own clients.",
      },
      conf: {
        type: "number",
        description:
          "Integer 0-100. Your overall confidence in the extraction.",
      },
    },
    required: ["company", "date", "total", "vat", "category", "type", "conf"],
  },
} as const;

const SYSTEM_PROMPT =
  "You are an expert accounting assistant for Luxembourg SMEs. " +
  "Given an invoice, receipt, or bill, extract its structured data and " +
  "ALWAYS respond by calling the `record_invoice` tool — never in plain " +
  "text. Luxembourg VAT is typically 17% (standard), 14%, 8% or 3%. " +
  "Amounts use `.` as decimal separator. Dates must be YYYY-MM-DD. If " +
  "something is unreadable, use your best guess and lower `conf`.";

interface Payload {
  file?: string;
  mediaType?: string;
}

const ALLOWED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Supabase Edge Runtime provides `Deno.serve`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const D: any = (globalThis as any).Deno;

D.serve(async (req: Request) => {
  const t0 = Date.now();
  console.log("[extract-invoice] " + req.method + " received");

  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const apiKey = D.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("[extract-invoice] ANTHROPIC_API_KEY missing");
      return json(
        {
          error:
            "ANTHROPIC_API_KEY is not set. Run `supabase secrets set " +
            "ANTHROPIC_API_KEY=sk-ant-…` and redeploy.",
        },
        500,
      );
    }

    let payload: Payload;
    try {
      payload = await req.json();
    } catch (e) {
      console.error("[extract-invoice] JSON parse failed", e);
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { file, mediaType } = payload;
    if (!file || typeof file !== "string") {
      return json({ error: "Missing base64 `file` field" }, 400);
    }
    if (!mediaType || !ALLOWED_MEDIA.has(mediaType)) {
      return json(
        {
          error:
            "Unsupported mediaType. Allowed: " + [...ALLOWED_MEDIA].join(", "),
        },
        400,
      );
    }
    console.log(
      "[extract-invoice] payload ok: " +
        mediaType +
        ", base64 len=" +
        file.length,
    );

    if (file.length > 20_000_000) {
      return json({ error: "File too large (max ~15MB)" }, 413);
    }

    const isPdf = mediaType === "application/pdf";
    const sourceBlock = {
      type: isPdf ? "document" : "image",
      source: { type: "base64", media_type: mediaType, data: file },
    };

    const body = {
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            sourceBlock,
            {
              type: "text",
              text:
                "Extract this document and call record_invoice with the " +
                "structured data.",
            },
          ],
        },
      ],
    };

    console.log("[extract-invoice] calling Anthropic…");
    let anthropicRes: Response;
    try {
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[extract-invoice] fetch threw", msg);
      return json({ error: "Network error calling Claude: " + msg }, 502);
    }
    console.log(
      "[extract-invoice] Claude HTTP " +
        anthropicRes.status +
        " in " +
        (Date.now() - t0) +
        "ms",
    );

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text();
      console.error("[extract-invoice] Claude error body:", text);
      return json(
        { error: "Claude API error: " + text },
        anthropicRes.status,
      );
    }

    const data = await anthropicRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolUse = (data.content ?? []).find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c?.type === "tool_use" && c?.name === TOOL.name,
    );
    if (!toolUse) {
      console.error(
        "[extract-invoice] no tool_use block, raw=",
        JSON.stringify(data).slice(0, 1000),
      );
      return json(
        {
          error:
            "Claude did not return a tool_use block. Raw response: " +
            JSON.stringify(data).slice(0, 500),
        },
        502,
      );
    }

    console.log("[extract-invoice] done in " + (Date.now() - t0) + "ms");
    return json(toolUse.input);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[extract-invoice] unhandled error:", msg, stack);
    return json({ error: "Unhandled server error: " + msg }, 500);
  }
});
