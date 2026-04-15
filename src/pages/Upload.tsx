import {
  Fragment,
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { ThreeScene } from "../components/ThreeScene";
import { CATEGORIES, T, type Category } from "../theme";
import { INVOICES_BUCKET, supabase } from "../lib/supabase";
import {
  SYSTEM_ACCOUNTS,
  formatAccount,
  journalEntryFor,
} from "../lib/accounts";
import { sha256Hex } from "../lib/hash";
import { euroExact } from "../lib/format";
import {
  buildSupplierMemory,
  lookupSupplier,
  type SupplierMemory,
} from "../lib/supplierMemory";
import type { Prefs } from "../hooks/usePrefs";
import type { ExtractedInvoice, InvoiceLine, Transaction } from "../types";

type Status = "idle" | "uploading" | "processing" | "done";

interface Props {
  onConfirm: (tx: Transaction) => void;
  onBatchAutoPost: (txs: Transaction[]) => void;
  companyId: string | null;
  existingTransactions: Transaction[];
  prefs: Prefs;
}

/**
 * Build a Transaction from an extracted invoice + its attachment. Pulled out
 * of the React callbacks so both manual confirm and auto-post use the exact
 * same mapping.
 */
function txFromExtracted(
  x: ExtractedInvoice,
  attachment: Attachment | null,
  status: "verified" | "pending",
): Transaction {
  const entry = journalEntryFor(x.type, x.category);
  return {
    id: "t" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    company: x.company,
    date: x.date,
    total: x.type === "expense" ? -x.total : x.total,
    vat: x.vat,
    category: x.category,
    type: x.type,
    status,
    debit: formatAccount(entry.debit),
    credit: formatAccount(entry.credit),
    fileUrl: attachment?.path ?? null,
    invoiceId: attachment?.invoiceId ?? null,
  };
}

interface Attachment {
  path: string;
  invoiceId: string;
}

interface DuplicateFile {
  file: File;
  hash: string;
  matchDate: string;
}

/** Find a transaction that looks like the one we're about to save. */
function findSimilarTransaction(
  candidate: ExtractedInvoice,
  list: Transaction[],
): Transaction | null {
  const company = candidate.company.trim().toLowerCase();
  if (!company || !candidate.date) return null;
  const target = Math.abs(candidate.total);
  return (
    list.find(
      (t) =>
        t.company.trim().toLowerCase() === company &&
        t.date === candidate.date &&
        Math.abs(Math.abs(t.total) - target) < 0.01,
    ) ?? null
  );
}

const VENDORS = ["Amazon AWS", "Google Cloud", "Microsoft Azure", "Slack", "Adobe"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";

function randomInvoice(page = 1): ExtractedInvoice {
  const total = Math.round((Math.random() * 800 + 50) * 100) / 100;
  const day = Math.floor(Math.random() * 28) + 1;
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  return {
    company: VENDORS[Math.floor(Math.random() * VENDORS.length)],
    date: "2026-04-" + String(day).padStart(2, "0"),
    total,
    vat: Math.round(total * 0.17 * 100) / 100,
    category,
    type: "expense",
    conf: Math.round(Math.random() * 8 + 90),
    pageRange: String(page),
  };
}

/**
 * Demo-mode helper: simulate a single image (1 invoice) or a multi-page PDF
 * (1-3 invoices) so the multi-invoice review UI is exercisable without a
 * backend.
 */
function randomInvoices(mediaType: string): ExtractedInvoice[] {
  const n = mediaType === "application/pdf" ? Math.floor(Math.random() * 3) + 1 : 1;
  return Array.from({ length: n }, (_, i) => randomInvoice(i + 1));
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected reader result"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function normalizeLine(raw: unknown): InvoiceLine | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const description =
    typeof r.description === "string" ? r.description.trim() : "";
  const quantity =
    typeof r.quantity === "number" ? r.quantity : Number(r.quantity) || 1;
  const unitPrice =
    typeof r.unitPrice === "number" ? r.unitPrice : Number(r.unitPrice) || 0;
  const vatRate =
    typeof r.vatRate === "number" ? r.vatRate : Number(r.vatRate) || 0;
  const lineTotal =
    typeof r.lineTotal === "number"
      ? r.lineTotal
      : Number(r.lineTotal) || quantity * unitPrice;
  if (!description && !lineTotal) return null;
  return { description, quantity, unitPrice, vatRate, lineTotal };
}

function normalizeOne(raw: unknown): ExtractedInvoice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const company = typeof r.company === "string" ? r.company : "";
  const date = typeof r.date === "string" ? r.date : "";
  const total = typeof r.total === "number" ? r.total : Number(r.total) || 0;
  const vat = typeof r.vat === "number" ? r.vat : Number(r.vat) || 0;
  const category = (
    CATEGORIES as readonly string[]
  ).includes(r.category as string)
    ? (r.category as Category)
    : "Other";
  const type = r.type === "revenue" ? "revenue" : "expense";
  const conf =
    typeof r.conf === "number" ? Math.round(r.conf) : Number(r.conf) || 80;
  const pageRange = typeof r.pageRange === "string" ? r.pageRange : undefined;
  const lines = Array.isArray(r.lines)
    ? (r.lines
        .map(normalizeLine)
        .filter((x): x is InvoiceLine => x !== null) as InvoiceLine[])
    : [];
  if (!company && !date && !total) return null;
  return { company, date, total, vat, category, type, conf, pageRange, lines };
}

/**
 * The edge function returns `{ invoices: [...] }`. Older single-invoice
 * payloads are still accepted so a stale deploy won't break the UI.
 */
function normalizeExtractions(raw: unknown): ExtractedInvoice[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  const arr: unknown[] = Array.isArray(r.invoices) ? r.invoices : [raw];
  return arr
    .map(normalizeOne)
    .filter((x): x is ExtractedInvoice => x !== null);
}

export function Upload({
  onConfirm,
  onBatchAutoPost,
  companyId,
  existingTransactions,
  prefs,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [extractions, setExtractions] = useState<ExtractedInvoice[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [duplicateFile, setDuplicateFile] = useState<DuplicateFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const supplierMemory = useMemo(
    () => buildSupplierMemory(existingTransactions),
    [existingTransactions],
  );

  const reviewing = extractions[reviewIndex] ?? null;
  const remaining = Math.max(0, extractions.length - reviewIndex);
  const similarExisting = reviewing
    ? findSimilarTransaction(reviewing, existingTransactions)
    : null;
  const reviewingMemory = reviewing
    ? lookupSupplier(supplierMemory, reviewing.company)
    : null;

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  const processFile = useCallback(
    async (file: File, opts: { force?: boolean } = {}) => {
    setError(null);
    setAttachment(null);
    setExtractions([]);
    setReviewIndex(0);
    setDuplicateFile(null);
    if (file.size > MAX_BYTES) {
      setError(
        "File is " +
          (file.size / 1024 / 1024).toFixed(1) +
          " MB — max 10 MB.",
      );
      return;
    }
    const mediaType = file.type || "application/pdf";
    setStatus("uploading");
    try {
      // Hash + duplicate check before doing any expensive work. We compute
      // the hash regardless so it can be attached to the invoices row.
      const fileHash = await sha256Hex(file);
      if (supabase && companyId && !opts.force) {
        const { data: dup } = await supabase
          .from("invoices")
          .select("id, created_at")
          .eq("company_id", companyId)
          .eq("file_hash", fileHash)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (dup) {
          setDuplicateFile({
            file,
            hash: fileHash,
            matchDate: dup.created_at,
          });
          setStatus("idle");
          return;
        }
      }

      const base64 = await fileToBase64(file);
      setStatus("processing");

      // Demo mode fallback — no Supabase configured, fake the result.
      if (!supabase) {
        await new Promise((r) => setTimeout(r, 1200));
        setExtractions(randomInvoices(mediaType));
        setReviewIndex(0);
        setStatus("done");
        return;
      }

      // Kick off the file upload to Storage in parallel with the extraction.
      // We need a company_id in the path so storage RLS accepts the write; if
      // there's none (shouldn't happen in the authed app), skip persistence.
      const uploadPromise: Promise<Attachment | null> = companyId
        ? (async () => {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const path =
              companyId +
              "/" +
              (crypto.randomUUID?.() ?? String(Date.now())) +
              "-" +
              safeName;
            const { error: upErr } = await supabase!.storage
              .from(INVOICES_BUCKET)
              .upload(path, file, {
                contentType: mediaType,
                upsert: false,
              });
            if (upErr) {
              console.error("[upload] storage upload failed:", upErr);
              return null;
            }
            const { data: invRow, error: invErr } = await supabase!
              .from("invoices")
              .insert({
                company_id: companyId,
                file_url: path,
                file_hash: fileHash,
                status: "processing",
              })
              .select("id")
              .single();
            if (invErr || !invRow) {
              console.error("[upload] invoices insert failed:", invErr);
              return null;
            }
            return { path, invoiceId: invRow.id };
          })()
        : Promise.resolve(null);

      const { data, error: fnError } = await supabase.functions.invoke<
        Record<string, unknown>
      >("extract-invoice", {
        body: { file: base64, mediaType },
      });

      if (fnError) {
        // supabase-js hides the real server error behind a generic
        // "non-2xx" message — dig into the Response to surface it.
        let detail = fnError.message || "Edge function failed";
        const res = (fnError as { context?: { response?: Response } }).context
          ?.response;
        if (res) {
          try {
            const text = await res.clone().text();
            if (text) {
              try {
                const parsed = JSON.parse(text);
                if (parsed && typeof parsed === "object" && "error" in parsed) {
                  detail = String((parsed as { error: unknown }).error);
                } else {
                  detail = text;
                }
              } catch {
                detail = text;
              }
            }
          } catch {
            /* ignore */
          }
        }
        // Mark the invoice row (if we created one) as failed.
        const att = await uploadPromise;
        if (att) {
          await supabase!
            .from("invoices")
            .update({ status: "failed" })
            .eq("id", att.invoiceId);
        }
        setError(detail);
        setStatus("idle");
        return;
      }
      if (data && typeof data === "object" && "error" in data) {
        const att = await uploadPromise;
        if (att) {
          await supabase!
            .from("invoices")
            .update({ status: "failed" })
            .eq("id", att.invoiceId);
        }
        setError(String((data as { error: unknown }).error));
        setStatus("idle");
        return;
      }
      const rawNormalized = normalizeExtractions(data);
      // Apply supplier memory: if we've seen this supplier before and a
      // category emerged, override the model's guess silently. The user can
      // still change it in the review panel.
      const normalized = rawNormalized.map((x) => {
        const mem = lookupSupplier(supplierMemory, x.company);
        return mem && mem.category !== x.category
          ? { ...x, category: mem.category }
          : x;
      });
      if (normalized.length === 0) {
        const att = await uploadPromise;
        if (att) {
          await supabase!
            .from("invoices")
            .update({ status: "failed" })
            .eq("id", att.invoiceId);
        }
        setError("The model returned an empty extraction. Try a clearer scan.");
        setStatus("idle");
        return;
      }
      // Await the parallel upload and stamp the invoice row with the full
      // extracted payload (array) so it's retrievable even if the user cancels.
      const att = await uploadPromise;
      if (att) {
        const avgConf = Math.round(
          normalized.reduce((s, x) => s + x.conf, 0) / normalized.length,
        );
        await supabase!
          .from("invoices")
          .update({
            status: "extracted",
            extracted: { invoices: normalized } as unknown as Record<string, unknown>,
            confidence: avgConf,
          })
          .eq("id", att.invoiceId);
        setAttachment(att);
      }

      // Auto-post: anything above the threshold AND with no soft-duplicate
      // match goes straight to the pending queue without a manual review.
      // Anything left goes through the normal review UI.
      if (prefs.autoPost) {
        const toReview: ExtractedInvoice[] = [];
        const toAutoPost: Transaction[] = [];
        for (const x of normalized) {
          const dup = findSimilarTransaction(x, existingTransactions);
          if (!dup && x.conf >= prefs.autoPostThreshold) {
            toAutoPost.push(txFromExtracted(x, att, "pending"));
          } else {
            toReview.push(x);
          }
        }
        if (toAutoPost.length > 0) onBatchAutoPost(toAutoPost);
        if (toReview.length === 0) {
          // Nothing left to review — go back to idle. (Inlined rather than
          // calling finishReview so processFile doesn't have to depend on it.)
          setExtractions([]);
          setReviewIndex(0);
          setAttachment(null);
          setStatus("idle");
          return;
        }
        setExtractions(toReview);
      } else {
        setExtractions(normalized);
      }
      setReviewIndex(0);
      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("idle");
    }
  },
    [companyId, prefs, existingTransactions, onBatchAutoPost, supplierMemory],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (f) void processFile(f);
    },
    [processFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) void processFile(f);
    },
    [processFile],
  );

  const finishReview = useCallback(() => {
    setExtractions([]);
    setReviewIndex(0);
    setAttachment(null);
    setStatus("idle");
  }, []);

  const confirm = useCallback(() => {
    const current = extractions[reviewIndex];
    if (!current) return;
    onConfirm(txFromExtracted(current, attachment, "verified"));
    if (reviewIndex + 1 < extractions.length) {
      setReviewIndex((i) => i + 1);
    } else {
      finishReview();
    }
  }, [extractions, reviewIndex, attachment, onConfirm, finishReview]);

  const skip = useCallback(() => {
    if (reviewIndex + 1 < extractions.length) {
      setReviewIndex((i) => i + 1);
    } else {
      finishReview();
    }
  }, [extractions.length, reviewIndex, finishReview]);

  const updateReviewing = useCallback(
    (next: ExtractedInvoice) => {
      setExtractions((prev) => {
        if (reviewIndex >= prev.length) return prev;
        const copy = prev.slice();
        copy[reviewIndex] = next;
        return copy;
      });
    },
    [reviewIndex],
  );

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid " + T.gb,
    background: "rgba(255,255,255,0.03)",
    color: T.text,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const label = (text: string): ReactElement => (
    <label
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: T.td,
        marginBottom: 6,
        display: "block",
        letterSpacing: 1.5,
        textTransform: "uppercase",
      }}
    >
      {text}
    </label>
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: reviewing ? "1fr 1fr" : "1fr",
        gap: 24,
        maxWidth: reviewing ? "100%" : 720,
        margin: reviewing ? "0" : "0 auto",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      <GlassCard style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{ height: 200, position: "relative", borderBottom: "1px solid " + T.gb }}
        >
          <ThreeScene variant="upload" />
          <div style={{ position: "absolute", bottom: 20, left: 24, zIndex: 2 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Scan Invoice</div>
            <div style={{ fontSize: 12, color: T.td, marginTop: 3 }}>
              Upload image or PDF — every invoice in the file is extracted
            </div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          {status === "idle" && (
            <div
              onClick={openPicker}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{
                border: "2px dashed " + (dragOver ? T.gold : T.gb),
                borderRadius: 16,
                padding: "44px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? T.gg : "rgba(255,255,255,0.01)",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = T.gold;
                e.currentTarget.style.background = T.gg;
              }}
              onMouseLeave={(e) => {
                if (!dragOver) {
                  e.currentTarget.style.borderColor = T.gb;
                  e.currentTarget.style.background = "rgba(255,255,255,0.01)";
                }
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: T.gg,
                  border: "1px solid " + T.gbd,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                  fontSize: 24,
                  color: T.gold,
                }}
              >
                △
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                Drop invoice here or click to upload
              </div>
              <div style={{ fontSize: 12, color: T.td }}>JPG, PNG, WebP, PDF — Max 10MB</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 22 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openPicker();
                  }}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 12,
                    border: "1px solid " + T.gb,
                    background: "rgba(255,255,255,0.03)",
                    color: T.text,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Browse Files
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openPicker();
                  }}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 12,
                    border: "none",
                    background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
                    color: T.bg,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Use Camera
                </button>
              </div>
            </div>
          )}

          {(status === "uploading" || status === "processing") && (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  margin: "0 auto 24px",
                  borderRadius: 20,
                  background: T.gg,
                  border: "1px solid " + T.gbd,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  animation: "pulse1 1.5s ease-in-out infinite",
                  color: T.gold,
                }}
              >
                {status === "uploading" ? "△" : "◈"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                {status === "uploading" ? "Uploading…" : "Claude is reading your invoice…"}
              </div>
              <div
                style={{
                  width: "100%",
                  maxWidth: 300,
                  height: 3,
                  background: T.gb,
                  borderRadius: 4,
                  margin: "24px auto 0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: `linear-gradient(90deg, ${T.gold}, ${T.em})`,
                    borderRadius: 4,
                    width: status === "uploading" ? "45%" : "82%",
                    transition: "width 1.5s ease",
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 12,
                color: T.ro,
                background: T.rg,
                border: "1px solid rgba(244,63,94,0.25)",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {duplicateFile && (
            <div
              style={{
                marginTop: 16,
                padding: "14px 16px",
                borderRadius: 12,
                fontSize: 12,
                color: T.gold,
                background: "rgba(212,168,83,0.08)",
                border: "1px solid " + T.gbd,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Possible duplicate
              </div>
              <div style={{ color: T.td }}>
                This exact file was already uploaded on{" "}
                {duplicateFile.matchDate.slice(0, 10)}. Upload it again only if
                you really meant to book it twice.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => setDuplicateFile(null)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid " + T.gb,
                    background: "transparent",
                    color: T.td,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    void processFile(duplicateFile.file, { force: true })
                  }
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "none",
                    background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
                    color: T.bg,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Upload anyway
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 24,
              padding: 20,
              background: "rgba(255,255,255,0.02)",
              borderRadius: 14,
              border: "1px solid " + T.gb,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.gold,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              How it works
            </div>
            {[
              { n: "01", t: "Upload", d: "Image or PDF, up to 10MB" },
              { n: "02", t: "Claude Vision", d: "Reads every line of your invoice" },
              { n: "03", t: "Classify", d: "Category, VAT, type" },
              { n: "04", t: "Review", d: "Edit anything, then confirm" },
            ].map((s) => (
              <div
                key={s.n}
                style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    background: T.gg,
                    border: "1px solid " + T.gbd,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    color: T.gold,
                    flexShrink: 0,
                    fontFamily: "'IBM Plex Mono'",
                  }}
                >
                  {s.n}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{s.t}</div>
                  <div style={{ fontSize: 11, color: T.td, marginTop: 2 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {reviewing && (
        <ExtractedPanel
          extracted={reviewing}
          queueIndex={reviewIndex}
          queueTotal={extractions.length}
          similar={similarExisting}
          memory={reviewingMemory}
          onChange={updateReviewing}
          onConfirm={confirm}
          onSkip={remaining > 1 ? skip : null}
          onCancel={() => {
            finishReview();
            setError(null);
          }}
          inputStyle={inputStyle}
          label={label}
        />
      )}
    </div>
  );
}

interface ExtractedPanelProps {
  extracted: ExtractedInvoice;
  queueIndex: number;
  queueTotal: number;
  similar: Transaction | null;
  memory: SupplierMemory | null;
  onChange: (next: ExtractedInvoice) => void;
  onConfirm: () => void;
  onSkip: (() => void) | null;
  onCancel: () => void;
  inputStyle: CSSProperties;
  label: (text: string) => ReactElement;
}

function ExtractedPanel({
  extracted,
  queueIndex,
  queueTotal,
  similar,
  memory,
  onChange,
  onConfirm,
  onSkip,
  onCancel,
  inputStyle,
  label,
}: ExtractedPanelProps) {
  const multi = queueTotal > 1;
  const isLast = queueIndex === queueTotal - 1;
  return (
    <GlassCard
      style={{
        padding: 28,
        display: "flex",
        flexDirection: "column",
        animation: "slideIn 0.5s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>
            Extracted Data
          </h3>
          {multi && (
            <div
              style={{
                fontSize: 11,
                color: T.td,
                fontFamily: "'IBM Plex Mono'",
                letterSpacing: 0.5,
              }}
            >
              Invoice {queueIndex + 1} of {queueTotal}
              {extracted.pageRange ? " • Page " + extracted.pageRange : ""}
            </div>
          )}
          {!multi && extracted.pageRange && (
            <div
              style={{
                fontSize: 11,
                color: T.td,
                fontFamily: "'IBM Plex Mono'",
              }}
            >
              Page {extracted.pageRange}
            </div>
          )}
        </div>
        <Badge color="green">{extracted.conf}% match</Badge>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        <div>
          {label("Company")}
          <input
            value={extracted.company}
            onChange={(e) => onChange({ ...extracted, company: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          {label("Date")}
          <input
            value={extracted.date}
            onChange={(e) => onChange({ ...extracted, date: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          {label("Category")}
          <select
            value={extracted.category}
            onChange={(e) =>
              onChange({ ...extracted, category: e.target.value as Category })
            }
            style={inputStyle}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {memory && (
            <div
              style={{
                fontSize: 10,
                color: T.td,
                marginTop: 6,
                fontStyle: "italic",
                letterSpacing: 0.3,
              }}
            >
              ↻ Learned from {memory.count} prior{" "}
              {memory.count === 1 ? "invoice" : "invoices"} from this supplier
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            {label("Total (€)")}
            <input
              type="number"
              value={extracted.total}
              onChange={(e) =>
                onChange({ ...extracted, total: parseFloat(e.target.value) || 0 })
              }
              style={{ ...inputStyle, fontFamily: "'IBM Plex Mono'", fontWeight: 600 }}
            />
          </div>
          <div>
            {label("VAT (€)")}
            <input
              type="number"
              value={extracted.vat}
              onChange={(e) =>
                onChange({ ...extracted, vat: parseFloat(e.target.value) || 0 })
              }
              style={{ ...inputStyle, fontFamily: "'IBM Plex Mono'", fontWeight: 600 }}
            />
          </div>
        </div>

        <div
          style={{
            background: "rgba(212,168,83,0.05)",
            borderRadius: 14,
            padding: 18,
            border: "1px solid " + T.gbd,
            marginTop: 8,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: T.gold,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Accounting Entry
          </div>
          <AccountingEntryRows extracted={extracted} />
        </div>

        <LineItems
          lines={extracted.lines ?? []}
          onChange={(next) => onChange({ ...extracted, lines: next })}
          onRecalcTotals={() => {
            const lines = extracted.lines ?? [];
            if (lines.length === 0) return;
            const total = lines.reduce((s, l) => s + (l.lineTotal || 0), 0);
            const vat = lines.reduce(
              (s, l) => s + ((l.lineTotal || 0) * (l.vatRate || 0)) / 100,
              0,
            );
            onChange({
              ...extracted,
              total: Math.round(total * 100) / 100,
              vat: Math.round(vat * 100) / 100,
            });
          }}
          label={label}
          inputStyle={inputStyle}
        />
      </div>

      {similar && (
        <div
          style={{
            marginTop: 18,
            padding: "12px 14px",
            borderRadius: 12,
            fontSize: 12,
            color: T.gold,
            background: "rgba(212,168,83,0.08)",
            border: "1px solid " + T.gbd,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            Similar transaction already booked
          </div>
          <div style={{ color: T.td }}>
            {similar.company} · {similar.date} · {euroExact(similar.total)}.
            Save this one only if it's genuinely a different invoice.
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: 12,
            border: "1px solid " + T.gb,
            background: "transparent",
            color: T.td,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: 12,
              border: "1px solid " + T.gb,
              background: "transparent",
              color: T.td,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Skip
          </button>
        )}
        <button
          onClick={onConfirm}
          style={{
            flex: 2,
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
            color: T.bg,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 20px " + T.gg,
          }}
        >
          ✓ {multi && !isLast ? "Confirm & Next" : "Confirm & Save"}
        </button>
      </div>
    </GlassCard>
  );
}

interface LineItemsProps {
  lines: InvoiceLine[];
  onChange: (lines: InvoiceLine[]) => void;
  onRecalcTotals: () => void;
  label: (text: string) => ReactElement;
  inputStyle: CSSProperties;
}

function LineItems({
  lines,
  onChange,
  onRecalcTotals,
  label,
  inputStyle,
}: LineItemsProps) {
  const updateLine = (i: number, patch: Partial<InvoiceLine>) => {
    const next = lines.slice();
    const merged = { ...next[i], ...patch };
    // Keep lineTotal in sync if user edits qty or unit price, unless they
    // also edited lineTotal in the same patch.
    if (
      ("quantity" in patch || "unitPrice" in patch) &&
      !("lineTotal" in patch)
    ) {
      merged.lineTotal =
        Math.round(merged.quantity * merged.unitPrice * 100) / 100;
    }
    next[i] = merged;
    onChange(next);
  };
  const addLine = () =>
    onChange([
      ...lines,
      { description: "", quantity: 1, unitPrice: 0, vatRate: 17, lineTotal: 0 },
    ]);
  const removeLine = (i: number) =>
    onChange(lines.filter((_, idx) => idx !== i));

  const cell: CSSProperties = {
    ...inputStyle,
    padding: "8px 10px",
    fontSize: 12,
  };
  const numCell: CSSProperties = {
    ...cell,
    fontFamily: "'IBM Plex Mono'",
    textAlign: "right",
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        {label("Line Items")}
        {lines.length > 0 && (
          <button
            onClick={onRecalcTotals}
            title="Set Total and VAT to the sum of the lines"
            style={{
              background: "none",
              border: "none",
              color: T.gold,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            ↺ Recalc totals
          </button>
        )}
      </div>

      {lines.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: T.td,
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed " + T.gb,
            textAlign: "center",
          }}
        >
          No line items detected.
        </div>
      )}

      {lines.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 60px 90px 60px 90px 28px",
            gap: 6,
            alignItems: "center",
          }}
        >
          {["Description", "Qty", "Unit HT", "VAT %", "Total HT", ""].map(
            (h, i) => (
              <div
                key={i}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.td,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  textAlign:
                    i === 1 || i === 2 || i === 3 || i === 4 ? "right" : "left",
                }}
              >
                {h}
              </div>
            ),
          )}
          {lines.map((line, i) => (
            <Fragment key={i}>
              <input
                value={line.description}
                onChange={(e) =>
                  updateLine(i, { description: e.target.value })
                }
                style={cell}
              />
              <input
                type="number"
                value={line.quantity}
                onChange={(e) =>
                  updateLine(i, { quantity: parseFloat(e.target.value) || 0 })
                }
                style={numCell}
              />
              <input
                type="number"
                value={line.unitPrice}
                onChange={(e) =>
                  updateLine(i, { unitPrice: parseFloat(e.target.value) || 0 })
                }
                style={numCell}
              />
              <input
                type="number"
                value={line.vatRate}
                onChange={(e) =>
                  updateLine(i, { vatRate: parseFloat(e.target.value) || 0 })
                }
                style={numCell}
              />
              <input
                type="number"
                value={line.lineTotal}
                onChange={(e) =>
                  updateLine(i, { lineTotal: parseFloat(e.target.value) || 0 })
                }
                style={numCell}
              />
              <button
                onClick={() => removeLine(i)}
                title="Remove line"
                style={{
                  background: "none",
                  border: "none",
                  color: T.td,
                  fontSize: 14,
                  cursor: "pointer",
                  opacity: 0.6,
                  padding: 0,
                }}
              >
                ✕
              </button>
            </Fragment>
          ))}
        </div>
      )}

      <button
        onClick={addLine}
        style={{
          marginTop: 10,
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px dashed " + T.gb,
          background: "transparent",
          color: T.td,
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        + Add line
      </button>
    </div>
  );
}

function AccountingEntryRows({ extracted }: { extracted: ExtractedInvoice }) {
  const entry = journalEntryFor(extracted.type, extracted.category);
  const vatAcc =
    extracted.type === "expense"
      ? SYSTEM_ACCOUNTS.vatDeductible
      : SYSTEM_ACCOUNTS.vatCollected;
  const total = extracted.total;
  const vat = extracted.vat;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr 90px",
        gap: "8px 10px",
        fontSize: 12,
        alignItems: "center",
      }}
    >
      <span style={{ color: T.em, fontWeight: 800 }}>DR</span>
      <span style={{ color: T.ts }}>{formatAccount(entry.debit)}</span>
      <span
        style={{
          fontFamily: "'IBM Plex Mono'",
          fontWeight: 700,
          textAlign: "right",
        }}
      >
        €{total.toFixed(2)}
      </span>

      {vat > 0 && (
        <>
          <span style={{ color: T.em, fontWeight: 800 }}>DR</span>
          <span style={{ color: T.ts }}>{formatAccount(vatAcc)}</span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono'",
              fontWeight: 700,
              textAlign: "right",
            }}
          >
            €{vat.toFixed(2)}
          </span>
        </>
      )}

      <span style={{ color: T.ro, fontWeight: 800 }}>CR</span>
      <span style={{ color: T.ts }}>{formatAccount(entry.credit)}</span>
      <span
        style={{
          fontFamily: "'IBM Plex Mono'",
          fontWeight: 700,
          textAlign: "right",
        }}
      >
        €{(total + vat).toFixed(2)}
      </span>
    </div>
  );
}
