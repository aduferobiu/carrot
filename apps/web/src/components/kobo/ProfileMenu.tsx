"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/lib/kobo/icons";
import { useKobo } from "@/lib/kobo/store";

export function ProfileMenu() {
  const router = useRouter();
  const { profileMenu, profile, toggleProfile, signOut } = useKobo();
  if (!profileMenu) return null;

  return (
    <>
      <div onClick={toggleProfile} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div
        className="kb-pmenu"
        style={{
          position: "fixed",
          top: 68,
          right: 28,
          width: 236,
          background: "#fff",
          border: "1px solid #E6E6EB",
          borderRadius: 16,
          boxShadow: "0 18px 40px rgba(0,0,0,.14)",
          zIndex: 41,
          padding: 8,
          animation: "pop .14s ease both",
        }}
      >
        <div
          style={{
            padding: "12px 12px 10px",
            display: "flex",
            gap: 11,
            alignItems: "center",
            borderBottom: "1px solid #F0F0F3",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg,#F26B21,#DB2777)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
            }}
          >
            {profile?.initials ?? "…"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{profile?.fullName ?? ""}</div>
            <div style={{ fontSize: 12, color: "#8A8A98" }}>{profile?.email ?? ""}</div>
          </div>
        </div>
        <div
          onClick={() => {
            toggleProfile();
            router.push("/accounts");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "11px 12px",
            borderRadius: 11,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            color: "#3A3A47",
          }}
        >
          <Icon name="wallet" size={18} /> Accounts
        </div>
        <div
          onClick={() => {
            toggleProfile();
            router.push("/settings");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "11px 12px",
            borderRadius: 11,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            color: "#3A3A47",
          }}
        >
          <Icon name="settings" size={18} /> Settings
        </div>
        <div
          onClick={signOut}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "11px 12px",
            borderRadius: 11,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            color: "#EF4444",
          }}
        >
          <Icon name="logout" size={18} /> Sign out
        </div>
      </div>
    </>
  );
}
