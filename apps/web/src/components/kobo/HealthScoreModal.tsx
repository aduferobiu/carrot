"use client";

import { Icon } from "@/lib/kobo/icons";
import { rgba } from "@/lib/kobo/format";
import { useKobo } from "@/lib/kobo/store";

function bandColor(band: string): string {
  switch (band) {
    case "Excellent":
      return "#059669";
    case "Good":
      return "#12B76A";
    case "Fair":
      return "#F59E0B";
    default:
      return "#EF4444";
  }
}

export function HealthScoreModal() {
  const { healthModalOpen, toggleHealthModal, healthScore } = useKobo();
  if (!healthModalOpen) return null;

  return (
    <div
      onClick={toggleHealthModal}
      className="kb-modalwrap"
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
        onClick={(e) => e.stopPropagation()}
        className="kb-sheet"
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          borderRadius: 24,
          animation: "pop .2s ease both",
          boxShadow: "0 30px 70px rgba(0,0,0,.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 22px",
            borderBottom: "1px solid #F0F0F3",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16 }}>Financial health</div>
          <button
            onClick={toggleHealthModal}
            style={{
              width: 34,
              height: 34,
              border: "none",
              background: "#F2F2F5",
              borderRadius: 10,
              cursor: "pointer",
              color: "#4A4A57",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="x" size={17} strokeWidth={2.1} />
          </button>
        </div>

        {!healthScore || healthScore.notEnoughData ? (
          <div style={{ padding: 22, fontSize: 13.5, color: "#8A8A98", lineHeight: 1.6 }}>
            {healthScore
              ? "Not enough transaction history yet to compute a score — check back after a week of activity."
              : "Calculating your score…"}
          </div>
        ) : (
          <div style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.02em" }}>{healthScore.score}</div>
              <div style={{ fontSize: 13, color: "#8A8A98", fontWeight: 600 }}>/ 100</div>
            </div>
            <div
              style={{
                display: "inline-flex",
                padding: "5px 11px",
                borderRadius: 9,
                fontSize: 12.5,
                fontWeight: 700,
                background: rgba(bandColor(healthScore.band), 0.12),
                color: bandColor(healthScore.band),
                marginBottom: 20,
              }}
            >
              {healthScore.band}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {healthScore.components.map((c) => (
                <div key={c.label} style={{ borderTop: "1px solid #F0F0F3", paddingTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.label}</div>
                    <div style={{ fontSize: 12.5, color: "#8A8A98", fontWeight: 600 }}>
                      {c.subScore}/100 · {c.weight}% weight
                    </div>
                  </div>
                  <div style={{ height: 7, borderRadius: 5, background: "#EFEFF3", overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", width: `${c.subScore}%`, background: bandColor(healthScore.band), borderRadius: 5 }} />
                  </div>
                  <div style={{ fontSize: 12.5, color: "#6B6F7B", lineHeight: 1.5 }}>{c.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
