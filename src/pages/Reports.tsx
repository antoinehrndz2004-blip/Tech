import { useMemo, type ReactNode } from "react";
import { GlassCard } from "../components/GlassCard";
import { ThreeScene } from "../components/ThreeScene";
import { T } from "../theme";
import type { Transaction } from "../types";
import { downloadCsv, toCsv } from "../lib/csv";

interface Props {
  transactions: Transaction[];
}

export function Reports({ transactions }: Props) {
  const { rev, exp, prof, vatCollected, vatDeductible, vatNet, byCategory } = useMemo(() => {
    let rev = 0;
    let exp = 0;
    let vatCollected = 0;
    let vatDeductible = 0;
    const m: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.type === "revenue") {
        rev += t.total;
        vatCollected += t.vat;
      } else {
        exp += Math.abs(t.total);
        vatDeductible += t.vat;
        m[t.category] = (m[t.category] ?? 0) + Math.abs(t.total);
      }
    });
    const byCategory = Object.keys(m)
      .map((k) => ({ name: k, value: m[k] }))
      .sort((a, b) => b.value - a.value);
    return {
      rev,
      exp,
      prof: rev - exp,
      vatCollected,
      vatDeductible,
      vatNet: vatCollected - vatDeductible,
      byCategory,
    };
  }, [transactions]);

  const exportCsv = () => {
    const rows: (readonly unknown[])[] = [
      ["Section", "Label", "Amount (EUR)"],
      ["Revenue", "Sales Revenue", rev.toFixed(2)],
      ["Revenue", "Total Revenue", rev.toFixed(2)],
      ...byCategory.map((c) => ["Expenses", c.name, c.value.toFixed(2)] as const),
      ["Expenses", "Total Expenses", exp.toFixed(2)],
      ["Result", "Net Profit / (Loss)", prof.toFixed(2)],
      [],
      ["VAT", "Collected (output, sales)", vatCollected.toFixed(2)],
      ["VAT", "Deductible (input, purchases)", vatDeductible.toFixed(2)],
      ["VAT", "Net VAT Due", vatNet.toFixed(2)],
    ];
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`ledgerai-report-${stamp}.csv`, toCsv(rows));
  };

  const exportPdf = () => {
    // Use the browser's built-in print-to-PDF. The page is designed to print
    // legibly as-is; users can "Save as PDF" from the print dialog.
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <GlassCard style={{ height: 180, position: "relative", overflow: "hidden" }}>
        <ThreeScene variant="reports" />
        <div style={{ position: "absolute", bottom: 24, left: 28, zIndex: 2 }}>
          <div
            style={{
              fontSize: 10,
              color: T.td,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Financial Statements
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            H1 2026 Reports
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 28,
            zIndex: 2,
            display: "flex",
            gap: 10,
          }}
        >
          <button
            onClick={exportCsv}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "1px solid " + T.gb,
              background: "rgba(255,255,255,0.04)",
              color: T.text,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ↓ CSV
          </button>
          <button
            onClick={exportPdf}
            style={{
              padding: "10px 22px",
              borderRadius: 12,
              border: "1px solid " + T.gbd,
              background: T.gg,
              color: T.gold,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ↓ Export PDF
          </button>
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "22px 28px", borderBottom: "1px solid " + T.gb }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>
            Profit &amp; Loss
          </h3>
          <p style={{ margin: 0, marginTop: 4, fontSize: 12, color: T.td }}>
            Jan – Jun 2026
          </p>
        </div>
        <SectionHeader color={T.em} bg={T.eg}>
          Revenue
        </SectionHeader>
        <Row label="Sales Revenue" value={rev} />
        <Row label="Total Revenue" value={rev} emphasize color={T.em} />
        <SectionHeader color={T.ro} bg={T.rg}>
          Expenses
        </SectionHeader>
        {byCategory.length === 0 ? (
          <div style={{ padding: "18px 28px", fontSize: 12, color: T.td }}>
            No expenses recorded yet.
          </div>
        ) : (
          byCategory.slice(0, 5).map((c) => (
            <Row key={c.name} label={c.name} value={c.value} />
          ))
        )}
        <Row label="Total Expenses" value={exp} emphasize color={T.ro} />
        <div
          style={{
            padding: "18px 28px",
            display: "flex",
            justifyContent: "space-between",
            background: prof >= 0 ? T.eg : T.rg,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 900, color: T.text }}>
            NET PROFIT / (LOSS)
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 900,
              fontFamily: "'IBM Plex Mono'",
              color: prof >= 0 ? T.em : T.ro,
            }}
          >
            {prof < 0 ? "(" : ""}€{Math.abs(prof).toLocaleString()}
            {prof < 0 ? ")" : ""}
          </span>
        </div>
      </GlassCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          {
            label: "VAT Collected",
            sub: "on sales (output)",
            value: vatCollected,
            color: T.em,
          },
          {
            label: "VAT Deductible",
            sub: "on purchases (input)",
            value: vatDeductible,
            color: T.bl,
          },
          {
            label: "Net VAT Due",
            sub: vatNet >= 0 ? "to pay" : "to reclaim",
            value: vatNet,
            color: vatNet >= 0 ? T.am : T.em,
          },
        ].map((x) => (
          <GlassCard key={x.label} hover style={{ padding: 24, textAlign: "center" }}>
            <div
              style={{
                fontSize: 11,
                color: T.td,
                marginBottom: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {x.label}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                fontFamily: "'IBM Plex Mono'",
                color: x.color,
                letterSpacing: -1,
              }}
            >
              {x.value < 0 ? "−" : ""}€
              {Math.abs(x.value).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div
              style={{
                fontSize: 10,
                color: T.td,
                marginTop: 8,
                fontWeight: 600,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {x.sub}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  children,
  color,
  bg,
}: {
  children: ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        padding: "10px 28px",
        background: bg,
        borderBottom: "1px solid " + T.gb,
        fontSize: 12,
        fontWeight: 800,
        color,
        letterSpacing: 1.5,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
  color,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: "12px 28px",
        display: "flex",
        justifyContent: "space-between",
        borderBottom: "1px solid " + T.gb,
        background: emphasize ? `${color}10` : undefined,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: emphasize ? 800 : 400,
          color: emphasize ? color : T.ts,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: emphasize ? 800 : 700,
          fontFamily: "'IBM Plex Mono'",
          color: emphasize ? color : T.text,
        }}
      >
        €{value.toLocaleString()}
      </span>
    </div>
  );
}
