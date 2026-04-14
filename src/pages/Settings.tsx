import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { ThreeScene } from "../components/ThreeScene";
import { T } from "../theme";
import { DEFAULT_ACCOUNTS } from "../lib/accounts";

export function Settings() {
  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid " + T.gb,
    background: "rgba(255,255,255,0.03)",
    color: T.text,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const label = (text: string) => (
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

  const companyFields = [
    { label: "Company Name", value: "LuxDrop Logistics Sàrl" },
    { label: "VAT Number", value: "LU12345678" },
    { label: "Address", value: "12 Rue du Fort Bourbon, L-1249 Luxembourg" },
    { label: "Currency", value: "EUR (€)" },
  ];

  const integrations = [
    { name: "OpenAI API", description: "AI parsing", connected: true },
    { name: "Google Vision", description: "OCR", connected: false },
    { name: "Banking API", description: "Auto-import", connected: false },
    { name: "FIDUNAV", description: "Lux accounting", connected: true },
  ];

  const accounts = DEFAULT_ACCOUNTS;

  return (
    <div style={{ maxWidth: 660, display: "flex", flexDirection: "column", gap: 24 }}>
      <GlassCard style={{ height: 160, position: "relative", overflow: "hidden" }}>
        <ThreeScene variant="settings" />
        <div style={{ position: "absolute", bottom: 20, left: 24, zIndex: 2 }}>
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
            Configuration
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>
            Account Settings
          </div>
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 28 }}>
        <h3
          style={{ margin: 0, fontSize: 16, fontWeight: 800, marginBottom: 22, color: T.text }}
        >
          Company Details
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {companyFields.map((f) => (
            <div key={f.label}>
              {label(f.label)}
              <input defaultValue={f.value} style={inputStyle} />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 28 }}>
        <h3
          style={{ margin: 0, fontSize: 16, fontWeight: 800, marginBottom: 22, color: T.text }}
        >
          Integrations
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {integrations.map((i) => (
            <div
              key={i.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderRadius: 14,
                border: "1px solid " + T.gb,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{i.name}</div>
                <div style={{ fontSize: 11, color: T.td, marginTop: 2 }}>{i.description}</div>
              </div>
              <Badge color={i.connected ? "green" : "amber"}>
                {i.connected ? "Connected" : "Setup"}
              </Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard style={{ padding: 28 }}>
        <h3
          style={{ margin: 0, fontSize: 16, fontWeight: 800, marginBottom: 6, color: T.text }}
        >
          Chart of Accounts
        </h3>
        <p style={{ margin: 0, marginBottom: 18, fontSize: 12, color: T.td }}>
          PCN Luxembourg
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {accounts.map((a) => (
            <div
              key={a.code}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid " + T.gb,
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono'",
                  fontSize: 13,
                  fontWeight: 800,
                  color: T.gold,
                  minWidth: 50,
                }}
              >
                {a.code}
              </span>
              <span style={{ fontSize: 13, color: T.ts }}>{a.label}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
