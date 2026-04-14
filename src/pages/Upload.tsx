import { useCallback, useState, type CSSProperties, type ReactElement } from "react";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { ThreeScene } from "../components/ThreeScene";
import { CATEGORIES, T, type Category } from "../theme";
import type { ExtractedInvoice, Transaction } from "../types";

type Status = "idle" | "uploading" | "processing" | "done";

interface Props {
  onConfirm: (tx: Transaction) => void;
}

const VENDORS = ["Amazon AWS", "Google Cloud", "Microsoft Azure", "Slack", "Adobe"];

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

export function Upload({ onConfirm }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [extracted, setExtracted] = useState<ExtractedInvoice | null>(null);

  const simulate = useCallback(() => {
    setStatus("uploading");
    setTimeout(() => {
      setStatus("processing");
      setTimeout(() => {
        setExtracted(randomInvoice());
        setStatus("done");
      }, 2800);
    }, 1400);
  }, []);

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
      <GlassCard style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{ height: 200, position: "relative", borderBottom: "1px solid " + T.gb }}
        >
          <ThreeScene variant="upload" />
          <div style={{ position: "absolute", bottom: 20, left: 24, zIndex: 2 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>Scan Invoice</div>
            <div style={{ fontSize: 12, color: T.td, marginTop: 3 }}>
              Upload image or PDF — AI extracts everything
            </div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          {status === "idle" && (
            <div
              onClick={simulate}
              style={{
                border: "2px dashed " + T.gb,
                borderRadius: 16,
                padding: "44px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: "rgba(255,255,255,0.01)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = T.gold;
                e.currentTarget.style.background = T.gg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.gb;
                e.currentTarget.style.background = "rgba(255,255,255,0.01)";
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
              <div style={{ fontSize: 12, color: T.td }}>JPG, PNG, PDF — Max 10MB</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 22 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    simulate();
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
                    simulate();
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
                {status === "uploading" ? "Uploading…" : "AI analyzing…"}
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
              { n: "01", t: "OCR", d: "Read text from image" },
              { n: "02", t: "AI Parse", d: "Structure into JSON" },
              { n: "03", t: "Classify", d: "Category & VAT" },
              { n: "04", t: "Entry", d: "Debit/credit" },
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
