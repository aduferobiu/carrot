"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/lib/kobo/icons";

const cardStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 408,
  background: "#fff",
  borderRadius: 28,
  padding: "40px 36px",
  boxShadow: "0 30px 70px rgba(15,23,42,.10), 0 4px 14px rgba(15,23,42,.06)",
  animation: "fadeUp .5s ease both",
};

const logoStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 13,
  background: "linear-gradient(135deg,#15171C,#3A3A47)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 800,
  fontSize: 21,
  margin: "0 auto 20px",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: "#4A4A57",
  marginBottom: 6,
};

function inputWrapStyle(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 11,
    height: 50,
    padding: "0 15px",
    border: "1.5px solid #E6E6EB",
    borderRadius: 13,
    background: "#F9F9FB",
    color: "#8A8A98",
  };
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#15171C",
  fontFamily: "inherit",
  fontSize: 14.5,
};

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 52,
    border: "none",
    borderRadius: 14,
    background: disabled ? "#5A5A66" : "#15171C",
    color: "#fff",
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: 15,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function doLogin() {
    if (!email || !password) {
      setError("Enter both email and password");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Login failed");
        return;
      }
      router.push("/admin");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "radial-gradient(700px 500px at 50% 30%, #F1F1F3 0%, #FAFAFC 60%, #F5F5F7 100%)",
      }}
    >
      <div style={cardStyle}>
        <div style={logoStyle}>◈</div>
        <div style={{ color: "#15171C", fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", textAlign: "center" }}>
          Carrot Admin
        </div>
        <div style={{ color: "#6B6F7B", fontSize: 13.5, marginTop: 8, textAlign: "center" }}>
          Restricted access. Sign in with your admin credentials.
        </div>

        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={fieldLabelStyle}>Email address</div>
            <div style={inputWrapStyle()}>
              <Icon name="mail" size={17} />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
                placeholder="admin@carrot.app"
                type="email"
                style={inputStyle}
                autoFocus
              />
            </div>
          </div>
          <div>
            <div style={fieldLabelStyle}>Password</div>
            <div style={inputWrapStyle()}>
              <Icon name="lock" size={15} />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{ display: "flex", alignItems: "center", background: "transparent", border: "none", padding: 0, color: "#8A8A98", cursor: "pointer" }}
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
              </button>
            </div>
          </div>
          {error && <div style={{ fontSize: 12.5, color: "#EF4444", fontWeight: 600 }}>{error}</div>}
        </div>

        <button onClick={doLogin} disabled={submitting} style={{ ...primaryBtnStyle(submitting), marginTop: 24 }}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
