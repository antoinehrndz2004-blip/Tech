import { useMemo } from "react";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { ThreeScene } from "../components/ThreeScene";
import { AreaChart } from "../components/charts/AreaChart";
import { BarChart } from "../components/charts/BarChart";
import { PieChart, type PieSlice } from "../components/charts/PieChart";
import { PC, T } from "../theme";
import type { MonthStat, Transaction } from "../types";
import { euro, signedEuro } from "../lib/format";

interface Props {
  transactions: Transaction[];
  monthly: MonthStat[];
  onViewAll: () => void;
}

export function Dashboard({ transactions, monthly, onViewAll }: Props) {
  const stats = useMemo(() => {
    let rev = 0;
    let exp = 0;
    let vat = 0;
    transactions.forEach((t) => {
      if (t.type === "revenue") rev += t.total;
      else exp += Math.abs(t.total);
      vat += t.vat;
    });
    return { rev, exp, prof: rev - exp, vat };
  }, [transactions]);

  const byCategory: PieSlice[] = useMemo(() => {
    const m: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.type === "expense")
        m[t.category] = (m[t.category] ?? 0) + Math.abs(t.total);
    });
    return Object.keys(m)
      .map((k) => ({ name: k, value: m[k] }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const kpis = [
    { label: "Revenue", value: euro(stats.rev), change: "+12.5%", color: T.em, glow: T.eg, icon: "↑" },
    { label: "Expenses", value: euro(stats.exp), change: "-8.2%", color: T.ro, glow: T.rg, icon: "↓" },
    {
      label: "Net Profit",
      value: euro(stats.prof),
      change: "+18.3%",
      color: stats.prof > 0 ? T.em : T.ro,
      glow: stats.prof > 0 ? T.eg : T.rg,
      icon: "◆",
    },
    { label: "VAT", value: euro(stats.vat), change: null, color: T.pu, glow: T.pg, icon: "%" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {kpis.map((s, i) => (
          <GlassCard key={i} hover style={{ padding: "22px 24px" }}>
            <div
              style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: s.glow,
                filter: "blur(30px)",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: s.glow,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: s.color,
                }}
              >
                {s.icon}
              </div>
              {s.change && (
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.change}</span>
              )}
            </div>
            <div
              style={{
                fontSize: 11,
                color: T.td,
                marginBottom: 6,
                fontWeight: 600,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                position: "relative",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: -1,
                position: "relative",
                fontFamily: "'IBM Plex Mono', monospace",
                color: T.text,
              }}
            >
              {s.value}
            </div>
          </GlassCard>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
        <GlassCard style={{ height: 340, position: "relative" }}>
          <ThreeScene variant="dashboard" />
          <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, zIndex: 2 }}>
            <div
              style={{
                fontSize: 10,
                color: T.td,
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Financial Health
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {stats.prof > 0 ? "Profitable" : "Needs Attention"}
            </div>
            <div
              style={{
                width: "100%",
                height: 3,
                background: T.gb,
                borderRadius: 4,
                marginTop: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width:
                    Math.min(100, (stats.rev / (stats.rev + stats.exp || 1)) * 100) + "%",
                  background: `linear-gradient(90deg, ${T.gold}, ${T.em})`,
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>
                Revenue vs Expenses
              </h3>
              <p style={{ margin: 0, marginTop: 4, fontSize: 11, color: T.td }}>H1 2026</p>
            </div>
            <Badge color="gold">H1 2026</Badge>
          </div>
          <AreaChart data={monthly} />
        </GlassCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        <GlassCard style={{ padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Monthly Profit
          </h3>
          <p style={{ margin: 0, marginBottom: 14, fontSize: 11, color: T.td }}>Net income</p>
          <BarChart data={monthly} />
        </GlassCard>

        <GlassCard style={{ padding: 24 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Expenses
          </h3>
          <p style={{ margin: 0, marginBottom: 12, fontSize: 11, color: T.td }}>By category</p>
          <PieChart data={byCategory.slice(0, 6)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {byCategory.slice(0, 5).map((c, i) => (
              <div
                key={c.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{ width: 8, height: 8, borderRadius: 4, background: PC[i] }}
                  />
                  <span style={{ color: T.ts }}>{c.name}</span>
                </div>
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: "'IBM Plex Mono'",
                    fontSize: 11,
                    color: T.text,
                  }}
                >
                  €{c.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>
            Recent Transactions
          </h3>
          <button
            onClick={onViewAll}
            style={{
              background: "none",
              border: "none",
              color: T.gold,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            View all →
          </button>
        </div>
        {transactions.slice(0, 5).map((t) => (
          <div
            key={t.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 120px 80px",
              gap: 12,
              alignItems: "center",
              padding: "12px 0",
              borderBottom: "1px solid " + T.gb,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: t.type === "revenue" ? T.eg : T.rg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: t.type === "revenue" ? T.em : T.ro,
                }}
              >
                {t.type === "revenue" ? "↑" : "↓"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t.company}</div>
                <div style={{ fontSize: 11, color: T.td }}>{t.category}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: T.td, fontFamily: "'IBM Plex Mono'" }}>
              {t.date}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "'IBM Plex Mono'",
                color: t.total >= 0 ? T.em : T.text,
                textAlign: "right",
              }}
            >
              {signedEuro(t.total)}
            </div>
            <div style={{ textAlign: "right" }}>
              <Badge color={t.status === "verified" ? "green" : "amber"}>{t.status}</Badge>
            </div>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
