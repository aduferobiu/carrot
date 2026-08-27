"use client";

import { useState } from "react";

export function ChartBar({
  height,
  color,
  label,
  width = 15,
}: {
  height: string;
  color: string;
  label: string;
  width?: number;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{ position: "relative", display: "flex", alignItems: "flex-end" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {hover && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#15171C",
            color: "#fff",
            padding: "5px 9px",
            borderRadius: 8,
            fontSize: 11.5,
            fontWeight: 700,
            whiteSpace: "nowrap",
            zIndex: 5,
            pointerEvents: "none",
            boxShadow: "0 8px 20px rgba(0,0,0,.25)",
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          width,
          height,
          minHeight: 2,
          background: color,
          borderRadius: "5px 5px 0 0",
          transformOrigin: "bottom",
          animation: "growBar .5s ease both",
          cursor: "default",
        }}
      />
    </div>
  );
}
