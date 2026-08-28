"use client";

import { Icon } from "@/lib/kobo/icons";
import { useKobo } from "@/lib/kobo/store";

export function SettingsPage() {
  const { bio, profile, toggleBio, editProfileToast, pwToast, exportData, deleteAccount } = useKobo();

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", animation: "fadeUp .4s ease backwards", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 20, padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 17,
            background: "linear-gradient(135deg,#F26B21,#DB2777)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 20,
          }}
        >
          {profile?.initials ?? "…"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{profile?.fullName ?? ""}</div>
          <div style={{ fontSize: 13, color: "#8A8A98", marginTop: 3 }}>{profile?.email ?? ""}</div>
        </div>
        <button
          onClick={editProfileToast}
          style={{
            height: 40,
            padding: "0 16px",
            border: "1px solid #E6E6EB",
            borderRadius: 12,
            background: "#fff",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            color: "#4A4A57",
          }}
        >
          Edit profile
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", fontSize: 12.5, fontWeight: 800, color: "#A0A0AC", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #F3F3F6" }}>
          Security
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", borderBottom: "1px solid #F3F3F6" }}>
          <div style={{ color: "#2C6BFF" }}>
            <Icon name="finger" size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>Biometric login</div>
            <div style={{ fontSize: 12.5, color: "#8A8A98", marginTop: 2 }}>Use WebAuthn fingerprint or Face ID</div>
          </div>
          <div
            onClick={toggleBio}
            style={{
              width: 48,
              height: 28,
              borderRadius: 16,
              background: bio ? "#12B76A" : "#D6D6DD",
              cursor: "pointer",
              position: "relative",
              transition: "background .2s",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 3,
                left: bio ? "23px" : "3px",
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                transition: "left .2s",
              }}
            />
          </div>
        </div>
        <div onClick={pwToast} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", cursor: "pointer" }}>
          <div style={{ color: "#6B6F7B" }}>
            <Icon name="lock" size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>Change password</div>
            <div style={{ fontSize: 12.5, color: "#8A8A98", marginTop: 2 }}>Last changed 3 months ago</div>
          </div>
          <span style={{ color: "#C0C0CC" }}>
            <Icon name="chevR" size={16} />
          </span>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E6E6EB", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", fontSize: 12.5, fontWeight: 800, color: "#A0A0AC", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #F3F3F6" }}>
          Data &amp; privacy · NDPR
        </div>
        <div onClick={exportData} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", cursor: "pointer", borderBottom: "1px solid #F3F3F6" }}>
          <div style={{ color: "#2C6BFF" }}>
            <Icon name="download" size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>Export my data</div>
            <div style={{ fontSize: 12.5, color: "#8A8A98", marginTop: 2 }}>Download profile, accounts &amp; transactions</div>
          </div>
          <span style={{ color: "#C0C0CC" }}>
            <Icon name="chevR" size={16} />
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px" }}>
          <div style={{ color: "#0E9E6A" }}>
            <Icon name="shield" size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>Consent recorded</div>
            <div style={{ fontSize: 12.5, color: "#8A8A98", marginTop: 2 }}>NDPR consent given 24 Jun 2026, 09:01</div>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #FBD7D4", borderRadius: 20, padding: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 14.5, color: "#B42318" }}>Delete account</div>
        <div style={{ fontSize: 13, color: "#8A8A98", marginTop: 6, lineHeight: 1.5 }}>
          Permanently erase your profile and all financial data. Linked accounts are unlinked via Mono first. This cannot be undone.
        </div>
        <button
          onClick={deleteAccount}
          style={{
            marginTop: 16,
            height: 44,
            padding: "0 18px",
            border: "none",
            borderRadius: 12,
            background: "#EF4444",
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="trash" size={17} /> Delete my account
        </button>
      </div>
    </div>
  );
}
