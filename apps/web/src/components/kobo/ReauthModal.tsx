"use client";

import { useState } from "react";
import { Icon } from "@/lib/kobo/icons";
import { useKobo } from "@/lib/kobo/store";

const LABELS: Record<string, [string, string, string]> = {
  delete: [
    "Delete your account",
    "This erases all your data permanently and cannot be undone. Re-enter your password to confirm.",
    "Delete everything",
  ],
  export: ["Confirm it's you", "Re-authenticate to generate your NDPR data export.", "Generate export"],
  removeAccount: [
    "Unlink this account",
    "Carrot will revoke access via Mono and remove this account's data. Re-enter your password.",
    "Unlink account",
  ],
};

export function ReauthModal() {
  const { reauthOpen, reauthAction, closeReauth, confirmReauth } = useKobo();
  const [showPassword, setShowPassword] = useState(false);
  if (!reauthOpen) return null;

  const [title, desc, cta] = (reauthAction && LABELS[reauthAction]) || ["", "", ""];
  const isDanger = reauthAction === "delete";
  const iconBg = isDanger ? "#FEF2F2" : "#EFF4FF";
  const iconColor = isDanger ? "#EF4444" : "#2C6BFF";
  const btnBg = isDanger ? "#EF4444" : "#2C6BFF";

  return (
    <div
      onClick={closeReauth}
      className="kb-modalwrap"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,16,.5)",
        zIndex: 55,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="kb-sheet"
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          borderRadius: 22,
          padding: 26,
          animation: "pop .2s ease both",
          boxShadow: "0 30px 70px rgba(0,0,0,.3)",
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 15,
            background: iconBg,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Icon name="lock" size={22} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#8A8A98", marginTop: 8, lineHeight: 1.5 }}>{desc}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            height: 52,
            padding: "0 16px",
            border: "1.5px solid #E6E6EB",
            borderRadius: 14,
            marginTop: 18,
          }}
        >
          <Icon name="lock" size={16} />
          <input
            type={showPassword ? "text" : "password"}
            defaultValue="Naira2026Save"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "inherit",
              fontSize: 14.5,
              color: "#15171C",
            }}
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
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={closeReauth}
            style={{
              flex: 1,
              height: 48,
              border: "1px solid #E6E6EB",
              borderRadius: 13,
              background: "#fff",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              color: "#4A4A57",
            }}
          >
            Cancel
          </button>
          <button
            onClick={confirmReauth}
            style={{
              flex: 1,
              height: 48,
              border: "none",
              borderRadius: 13,
              background: btnBg,
              color: "#fff",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
}
