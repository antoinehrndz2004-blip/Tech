import { useState, type FormEvent } from "react";
import { GlassCard } from "../components/GlassCard";
import { Background } from "../components/Background";
import { T } from "../theme";

type Mode = "signin" | "signup";

interface Props {
  onSignIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
}

export function AuthPage({ onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { error: authError } =
        mode === "signin" ? await onSignIn(email, password) : await onSignUp(email, password);
      if (authError) {
        setError(authError.message);
      } else if (mode === "signup") {
        setInfo("Check your email to confirm your account, then sign in.");
        setMode("signin");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid " + T.gb,
    background: "rgba(255,255,255,0.03)",
    color: T.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: T.bg,
        color: T.text,
        padding: 24,
      }}
    >
      <Background />
      <GlassCard
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 36,
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: T.bg,
              fontWeight: 800,
            }}
          >
            ◈
          </div>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: -0.5,
                background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              LedgerAI
            </div>
            <div
              style={{
                fontSize: 10,
                color: T.td,
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Smart Accounting
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, marginBottom: 4 }}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p style={{ fontSize: 13, color: T.td, margin: 0, marginBottom: 26 }}>
          {mode === "signin"
            ? "Sign in to your LedgerAI workspace."
            : "Start automating your Luxembourg accounting."}
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
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
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@company.lu"
            />
          </div>
          <div>
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
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: T.ro,
                background: T.rg,
                border: "1px solid rgba(244,63,94,0.25)",
                padding: "10px 14px",
                borderRadius: 10,
              }}
            >
              {error}
            </div>
          )}
          {info && (
            <div
              style={{
                fontSize: 12,
                color: T.em,
                background: T.eg,
                border: "1px solid rgba(52,211,153,0.25)",
                padding: "10px 14px",
                borderRadius: 10,
              }}
            >
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "14px",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg, ${T.gold}, ${T.gl})`,
              color: T.bg,
              fontSize: 14,
              fontWeight: 800,
              cursor: submitting ? "default" : "pointer",
              boxShadow: "0 4px 20px " + T.gg,
              opacity: submitting ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {submitting
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: T.td }}>
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: T.gold,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
