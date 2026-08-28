"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/lib/kobo/icons";
import { supabase } from "@/lib/supabase";
import { useKobo } from "@/lib/kobo/store";

type Step = "form" | "onboarding";

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
  background: "linear-gradient(135deg,#2C6BFF,#5B8DFF)",
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

function inputWrapStyle(hasError: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 11,
    height: 50,
    padding: "0 15px",
    border: `1.5px solid ${hasError ? "#EF4444" : "#E6E6EB"}`,
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

const errorTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#EF4444",
  marginTop: 5,
  fontWeight: 600,
};

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 52,
    border: "none",
    borderRadius: 14,
    background: disabled ? "#A9C2FF" : "#2C6BFF",
    color: "#fff",
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: 15,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const secondaryBtnStyle: React.CSSProperties = {
  width: "100%",
  height: 52,
  border: "1.5px solid #E6E6EB",
  borderRadius: 14,
  background: "#fff",
  color: "#15171C",
  fontFamily: "inherit",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(email: string): string {
  if (!email) return "Email is required";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address";
  return "";
}
function passwordError(password: string): string {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  return "";
}
function nameError(name: string): string {
  if (!name.trim()) return "Full name is required";
  return "";
}

export function AuthScreen() {
  const router = useRouter();
  const { authMode, setAuthMode, session, authLoading, dataLoading, accounts, profile, openLink, showToast } = useKobo();
  const [step, setStep] = useState<Step>("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [justAuthed, setJustAuthed] = useState(false);
  const isRegister = authMode === "register";

  // Reset the form when switching between login/register so stale values/errors don't carry over.
  useEffect(() => {
    setTouched({});
  }, [authMode]);

  const errors = useMemo(
    () => ({
      fullName: isRegister ? nameError(fullName) : "",
      email: emailError(email),
      password: passwordError(password),
    }),
    [isRegister, fullName, email, password],
  );
  const isValid = !errors.email && !errors.password && (!isRegister || (!errors.fullName && consent));

  // Once auth succeeds, wait for the session + first data fetch, then decide where to land.
  useEffect(() => {
    if (!justAuthed || !session || dataLoading) return;
    if (accounts.length > 0) {
      router.push("/dashboard");
    } else {
      setStep("onboarding");
    }
  }, [justAuthed, session, dataLoading, accounts, router]);

  // A session restored from localStorage on a fresh page load (not one just
  // created via the form above) never sets `justAuthed`, so without this the
  // already-authenticated user is stranded on the login screen. Skip
  // onboarding here — that's only for brand-new signups.
  useEffect(() => {
    if (justAuthed || authLoading || !session) return;
    router.push("/dashboard");
  }, [justAuthed, authLoading, session, router]);

  async function doAuth() {
    setTouched({ fullName: true, email: true, password: true });
    if (!isValid) {
      showToast(isRegister && !consent ? "Please consent to continue" : "Check the highlighted fields");
      return;
    }
    setSubmitting(true);
    const { error } = isRegister
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      showToast(error.message);
      return;
    }
    setJustAuthed(true);
  }

  function goDash() {
    router.push("/dashboard");
  }

  function linkFromOnboarding() {
    router.push("/dashboard");
    openLink();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "radial-gradient(700px 500px at 50% 30%, #EEF3FF 0%, #FAFAFC 60%, #F5F5F7 100%)",
      }}
    >
      <div style={cardStyle}>
        <div style={logoStyle}>◈</div>

        {step === "onboarding" ? (
          <>
            <div style={{ color: "#15171C", fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", textAlign: "center" }}>
              Welcome, {profile?.fullName.split(" ")[0] ?? "there"} 👋
            </div>
            <div style={{ color: "#6B6F7B", fontSize: 14.5, marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
              Link your first bank to see every naira across every account on one screen. Your bank credentials never
              touch Carrot — linking is handled securely by Mono.
            </div>
            <button onClick={linkFromOnboarding} style={{ ...primaryBtnStyle(false), marginTop: 26, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
              <Icon name="shield" size={19} /> Link an account
            </button>
            <button onClick={goDash} style={{ ...secondaryBtnStyle, marginTop: 12 }}>
              Skip for now
            </button>
            <div style={{ marginTop: 24, display: "flex", gap: 18, justifyContent: "center" }}>
              <div style={{ color: "#8A8A98", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="lock" size={16} /> 256-bit encrypted
              </div>
              <div style={{ color: "#8A8A98", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="eye" size={16} /> Read-only access
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ color: "#15171C", fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", textAlign: "center" }}>
              Continue to Carrot
            </div>
            <div style={{ color: "#6B6F7B", fontSize: 13.5, marginTop: 8, textAlign: "center" }}>
              {isRegister ? "Create an account to get started." : "Sign in to see all your accounts in one place."}
            </div>

            <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
              {isRegister && (
                <div>
                  <div style={fieldLabelStyle}>Full name</div>
                  <div style={inputWrapStyle(touched.fullName && !!errors.fullName)}>
                    <Icon name="user" size={17} />
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                      placeholder="Adaeze Okeke"
                      style={inputStyle}
                    />
                  </div>
                  {touched.fullName && errors.fullName && <div style={errorTextStyle}>{errors.fullName}</div>}
                </div>
              )}
              <div>
                <div style={fieldLabelStyle}>Email address</div>
                <div style={inputWrapStyle(touched.email && !!errors.email)}>
                  <Icon name="mail" size={17} />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    placeholder="your@email.com"
                    type="email"
                    style={inputStyle}
                  />
                </div>
                {touched.email && errors.email && <div style={errorTextStyle}>{errors.email}</div>}
              </div>
              <div>
                <div style={fieldLabelStyle}>Password</div>
                <div style={inputWrapStyle(touched.password && !!errors.password)}>
                  <Icon name="lock" size={15} />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      color: "#8A8A98",
                      cursor: "pointer",
                    }}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
                  </button>
                </div>
                {touched.password && errors.password && <div style={errorTextStyle}>{errors.password}</div>}
              </div>
              {isRegister && (
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#6B6F7B", fontSize: 12.5, lineHeight: 1.4, cursor: "pointer" }}>
                  <span
                    onClick={() => setConsent((c) => !c)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: consent ? "#2C6BFF" : "#fff",
                      border: consent ? "none" : "1.5px solid #C9C9D4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                      color: "#fff",
                    }}
                  >
                    {consent && <Icon name="check" size={13} strokeWidth={2.4} />}
                  </span>
                  <span>I consent to Carrot processing my financial data under the NDPR (2019). Consent is timestamped and revocable.</span>
                </label>
              )}
            </div>

            <button
              onClick={doAuth}
              disabled={submitting || !isValid}
              style={{ ...primaryBtnStyle(submitting || !isValid), marginTop: 24 }}
            >
              {submitting ? "Please wait…" : isRegister ? "Create account" : "Login"}
            </button>

            <div style={{ textAlign: "center", marginTop: 18, fontSize: 13.5, color: "#6B6F7B" }}>
              {isRegister ? "Already have an account?" : "Don't have an account yet?"}{" "}
              <span
                onClick={() => setAuthMode(isRegister ? "login" : "register")}
                style={{ color: "#2C6BFF", fontWeight: 700, cursor: "pointer" }}
              >
                {isRegister ? "Sign in" : "Create account"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
