import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { ThreeScene } from "../components/ThreeScene";
import { CATEGORIES, T, type Category } from "../theme";
import { supabase } from "../lib/supabase";
import type { ExtractedInvoice, Transaction } from "../types";

type Status = "idle" | "uploading" | "processing" | "done";

interface Props {
  onConfirm: (tx: Transaction) => void;
}

const VENDORS = ["Amazon AWS", "Google Cloud", "Microsoft Azure", "Slack", "Adobe"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";

function randomInvoice(): ExtractedInvoice {
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
  };
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

function normalizeExtraction(raw: unknown): ExtractedInvoice | null {
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
  if (!company && !date && !total) return null;
  return { company, date, total, vat, category, type, conf };
}

export function Upload({ onConfirm }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [extracted, setExtracted] = useState<ExtractedInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  const processFile = useCallback(async (file: File) => {
    setError(null);
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
      const base64 = await fileToBase64(file);
      setStatus("processing");

      // Demo mode fallback — no Supabase configured, fake the result.
      if (!supabase) {
        await new Promise((r) => setTimeout(r, 1200));
        setExtracted(randomInvoice());
        setStatus("done");
        return;
      }

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
        setError(detail);
        setStatus("idle");
        return;
      }
      if (data && typeof data === "object" && "error" in data) {
        setError(String((data as { error: unknown }).error));
        setStatus("idle");
        return;
      }
      const normalized = normalizeExtraction(data);
      if (!normalized) {
        setError("Claude returned an empty extraction. Try a clearer scan.");
        setStatus("idle");
        return;
      }
      setExtracted(normalized);
      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("idle");
    }
  }, []);

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

  const confirm = useCallback(() => {
    if (!extracted) return;
    const tx: Transaction = {
      id: "t" + Date.now(),
      company: extracted.company,
      date: extracted.date,
      total: extracted.type === "expense" ? -extracted.total : extracted.total,
      vat: extracted.vat,
      category: extracted.category,
      type: extracted.type,
      status: "verified",
      debit:
        extracted.type === "expense"
          ? "6100 - " + extracted.category
          : "1200 - Receivables",
      credit: extracted.type === "expense" ? "5120 - Bank" : "7000 - Sales",
    };
    onConfirm(tx);
    setExtracted(null);
    setStatus("idle");
  }, [extracted, onConfirm]);

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
        gridTemplateColumns: extracted ? "1fr 1fr" : "1fr",
        gap: 24,
        maxWidth: extracted ? "100%" : 720,
        margin: extracted ? "0" : "0 auto",
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
              Upload image or PDF — Claude Vision extracts everything
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

      {extracted && (
        <ExtractedPanel
          extracted={extracted}
          onChange={setExtracted}
          onConfirm={confirm}
          onCancel={() => {
            setExtracted(null);
            setStatus("idle");
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
  onChange: (next: ExtractedInvoice) => void;
  onConfirm: () => void;
  onCancel: () => void;
  inputStyle: CSSProperties;
  label: (text: string) => ReactElement;
}

function ExtractedPanel({
  extracted,
  onChange,
  onConfirm,
  onCancel,
  inputStyle,
  label,
}: ExtractedPanelProps) {
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
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>
          Extracted Data
        </h3>
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 75px 75px",
              gap: "8px 10px",
              fontSize: 12,
            }}
          >
            <span style={{ color: T.em, fontWeight: 800 }}>DR</span>
            <span style={{ color: T.ts }}>
              {extracted.type === "expense"
                ? "6100 - " + extracted.category
                : "1200 - Recv"}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 700 }}>
              €{extracted.total.toFixed(2)}
            </span>
            <span />
            <span style={{ color: T.em, fontWeight: 800 }}>DR</span>
            <span style={{ color: T.ts }}>4456 - VAT</span>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 700 }}>
              €{extracted.vat.toFixed(2)}
            </span>
            <span />
            <span style={{ color: T.ro, fontWeight: 800 }}>CR</span>
            <span style={{ color: T.ts }}>
              {extracted.type === "expense" ? "5120 - Bank" : "7000 - Sales"}
            </span>
            <span />
            <span style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 700 }}>
              €{(extracted.total + extracted.vat).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

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
          ✓ Confirm & Save
        </button>
      </div>
    </GlassCard>
  );
}
