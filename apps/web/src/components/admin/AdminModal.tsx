"use client";

export function AdminModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
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
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "min(600px, 85vh)",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 30px 70px rgba(0,0,0,.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #F0F0F3" }}>
          <div style={{ fontWeight: 800, fontSize: 15.5 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              border: "none",
              background: "#F2F2F5",
              borderRadius: 9,
              cursor: "pointer",
              color: "#4A4A57",
              fontSize: 15,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
