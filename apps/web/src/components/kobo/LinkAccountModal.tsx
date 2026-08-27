"use client";

import { useKobo } from "@/lib/kobo/store";

export function LinkAccountModal() {
  const { linking } = useKobo();
  if (!linking) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,16,.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 340,
          background: "#fff",
          borderRadius: 24,
          padding: "36px 28px",
          textAlign: "center",
          animation: "pop .2s ease both",
          boxShadow: "0 30px 70px rgba(0,0,0,.3)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 18px",
            borderRadius: "50%",
            border: "4px solid #EAEAF0",
            borderTopColor: "#2C6BFF",
            animation: "spin .8s linear infinite",
          }}
        />
        <div style={{ fontSize: 16, fontWeight: 800 }}>Linking your account…</div>
        <div style={{ fontSize: 13, color: "#8A8A98", marginTop: 6 }}>
          Mono is finishing the connection. This only takes a moment.
        </div>
      </div>
    </div>
  );
}
