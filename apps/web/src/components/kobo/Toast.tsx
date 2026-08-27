"use client";

import { Icon } from "@/lib/kobo/icons";
import { useKobo } from "@/lib/kobo/store";

export function Toast() {
  const { toast } = useKobo();
  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        background: "#15171C",
        color: "#fff",
        padding: "14px 20px",
        borderRadius: 14,
        boxShadow: "0 16px 40px rgba(0,0,0,.28)",
        display: "flex",
        alignItems: "center",
        gap: 11,
        fontWeight: 600,
        fontSize: 14,
        animation: "pop .2s ease both",
      }}
    >
      <span style={{ color: "#7CF2B0" }}>
        <Icon name="check" size={18} />
      </span>
      {toast}
    </div>
  );
}
