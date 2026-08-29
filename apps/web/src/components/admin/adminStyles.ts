import type { CSSProperties } from "react";

export const card: CSSProperties = {
  background: "#fff",
  border: "1px solid #E6E6EB",
  borderRadius: 16,
  padding: 20,
};

export const sectionTitle: CSSProperties = { fontSize: 15.5, fontWeight: 800, marginBottom: 4 };
export const sectionSub: CSSProperties = { fontSize: 12.5, color: "#6B7280", marginBottom: 16 };

export const table: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
export const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 11.5,
  fontWeight: 700,
  color: "#6B7280",
  textTransform: "uppercase",
  letterSpacing: ".03em",
  borderBottom: "1px solid #E6E6EB",
};
export const td: CSSProperties = { padding: "9px 10px", borderBottom: "1px solid #F0F0F3", verticalAlign: "middle" };

export const input: CSSProperties = {
  height: 36,
  padding: "0 11px",
  border: "1px solid #E6E6EB",
  borderRadius: 9,
  fontFamily: "inherit",
  fontSize: 13,
  background: "#fff",
  color: "#15171C",
};

export const select: CSSProperties = { ...input, cursor: "pointer" };

function btn(bg: string, color: string): CSSProperties {
  return {
    height: 32,
    padding: "0 12px",
    border: "none",
    borderRadius: 8,
    background: bg,
    color,
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: 12.5,
    cursor: "pointer",
  };
}

export const btnPrimary = btn("#15171C", "#fff");
export const btnDanger = btn("#FEE2E2", "#B91C1C");
export const btnGood = btn("#DCFCE7", "#15803D");
export const btnNeutral = btn("#F2F2F5", "#3A3A47");
export const btnGhost: CSSProperties = { ...btn("transparent", "#6B7280"), border: "1px solid #E6E6EB" };

export const badge = (bg: string, color: string): CSSProperties => ({
  display: "inline-flex",
  padding: "2px 8px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 700,
  background: bg,
  color,
});

export const tabBtn = (active: boolean): CSSProperties => ({
  height: 38,
  padding: "0 16px",
  border: "none",
  borderRadius: 10,
  background: active ? "#15171C" : "transparent",
  color: active ? "#fff" : "#4A4A57",
  fontFamily: "inherit",
  fontWeight: 700,
  fontSize: 13.5,
  cursor: "pointer",
});
