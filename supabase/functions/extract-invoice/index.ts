// @ts-nocheck — this file runs on Deno (Supabase Edge Runtime), not Node/Vite.
/**
 * extract-invoice — multimodal OCR for invoices & receipts.
 *
 * Auto-selects a provider based on which env var is set:
 *   - OPENAI_API_KEY    → GPT-4o (images only, not PDF)
 *   - ANTHROPIC_API_KEY → Claude Sonnet (images + PDF)
 *
 * Receives:  { file: <base64 string>, mediaType: "image/jpeg" | "image/png"
 *                                                | "image/webp" | "image/gif"
 *                                                | "application/pdf" }
 * Returns :  { company, date, total, vat, category, type, conf }
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

const SCHEMA = {
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
      description: "VAT amount in EUR. 0 if not applicable or not visible.",
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
      description: "Integer 0-100. Your overall confidence in the extraction.",
    },
  },
  required: ["company", "date", "total", "vat", "category", "type", "conf"],
} as const;

const SYSTEM_PROMPT =
  "You are an expert accounting assistant for Luxembourg SMEs. " +
  "Given an invoice, receipt, or bill, extract its structured data and " +
  "ALWAYS respond by calling the `record_invoice` tool — never in plain " +
  "text. Luxembourg VAT is typically 17% (standard), 14%, 8% or 3%. " +
  "Amounts use `.` as decimal separator. Dates must be YYYY-MM-DD. If " +
  "something is unreadable, use your best guess and lower `conf`.";

const USER_PROMPT =
  "Extract this document and call record_invoice with the structured data.";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const D: any = (globalThis as any).Deno;

async function callOpenAI(
  apiKey: string,
  file: string,
  mediaType: string,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; error: string }> {
  if (mediaType === "application/pdf") {
    return {
      ok: false,
      status: 415,
      error:
        "OpenAI Chat Completions does not accept PDF directly. Take a " +
        "photo/screenshot of the invoice (JPG/PNG) or switch to Anthropic.",
    };
  }
  const body = {
    model: "gpt-4o-mini",
    max_tokens: 1024,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mediaType};base64,${file}`,
              detail: "high",
            },
          },
          { type: "text", text: USER_PROMPT },
        ],
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "record_invoice",
          description: "Record structured invoice data.",
          parameters: SCHEMA,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "record_invoice" } },
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, error: "OpenAI API error: " + text };
  }

  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  const args = call?.function?.arguments;
  if (!args) {
    return {
      ok: false,
      status: 502,
      error:
        "OpenAI did not return a tool_call. Raw: " +
        JSON.stringify(data).slice(0, 500),
    };
  }
  try {
    return { ok: true, data: JSON.parse(args) };
  } catch {
    return {
      ok: false,
      status: 502,
      error: "OpenAI returned invalid JSON in tool_call.arguments: " + args,
    };
  }
}

async function callAnthropic(
  apiKey: string,
  file: string,
  mediaType: string,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; error: string }> {
  const isPdf = mediaType === "application/pdf";
  const sourceBlock = {
    type: isPdf ? "document" : "image",
    source: { type: "base64", media_type: mediaType, data: file },
  };
  const body = {
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "record_invoice",
        description: "Record structured invoice data.",
        input_schema: SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "record_invoice" },
    messages: [
      {
        role: "user",
        content: [sourceBlock, { type: "text", text: USER_PROMPT }],
      },
    ],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      status: res.status,
      error: "Claude API error: " + text,
    };
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolUse = (data.content ?? []).find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => c?.type === "tool_use" && c?.name === "record_invoice",
  );
  if (!toolUse) {
    return {
      ok: false,
      status: 502,
      error:
        "Claude did not return a tool_use block. Raw: " +
        JSON.stringify(data).slice(0, 500),
    };
  }
  return { ok: true, data: toolUse.input };
}

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

    const openaiKey = D.env.get("OPENAI_API_KEY");
    const anthropicKey = D.env.get("ANTHROPIC_API_KEY");
    if (!openaiKey && !anthropicKey) {
      return json(
        {
          error:
            "No AI provider configured. Set OPENAI_API_KEY or " +
            "ANTHROPIC_API_KEY via `supabase secrets set` and redeploy.",
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
    if (file.length > 20_000_000) {
      return json({ error: "File too large (max ~15MB)" }, 413);
    }

    const provider = openaiKey ? "openai" : "anthropic";
    console.log(
      "[extract-invoice] provider=" +
        provider +
        " mediaType=" +
        mediaType +
        " base64Len=" +
        file.length,
    );

    const result = openaiKey
      ? await callOpenAI(openaiKey, file, mediaType)
      : await callAnthropic(anthropicKey!, file, mediaType);

    console.log(
      "[extract-invoice] " +
        provider +
        " finished in " +
        (Date.now() - t0) +
        "ms, ok=" +
        result.ok,
    );

    if (!result.ok) {
      console.error("[extract-invoice] provider error:", result.error);
      return json({ error: result.error }, result.status);
    }

    return json(result.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[extract-invoice] unhandled error:", msg, stack);
    return json({ error: "Unhandled server error: " + msg }, 500);
  }
});
