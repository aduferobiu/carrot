type PathDef = string;
type ShapeDef = {
  t: string;
  cx?: number;
  cy?: number;
  r?: number;
  fill?: string;
};
type IconDef = (PathDef | ShapeDef)[];

export const ICONS: Record<string, IconDef> = {
  home: ["M3.5 11.5 12 4l8.5 7.5", "M6 10v9.5h12V10"],
  list: [
    "M7 3.5h10a1 1 0 0 1 1 1V20l-3-2-3 2-3-2-3 2V4.5a1 1 0 0 1 1-1z",
    "M9 8.5h6",
    "M9 12.5h6",
  ],
  target: [
    { t: "circle", cx: 12, cy: 12, r: 8 },
    { t: "circle", cx: 12, cy: 12, r: 4.2 },
    { t: "circle", cx: 12, cy: 12, r: 0.9, fill: "currentColor" },
  ],
  chart: ["M4 20V11", "M10 20V5", "M16 20V14", "M20 20V8"],
  wallet: [
    "M4 8.5 12 4l8 4.5",
    "M5 9v8.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9",
    "M3.5 8.5h17",
    "M15.5 13h1.4",
  ],
  settings: [
    "M4 7h16",
    "M4 12h16",
    "M4 17h16",
    { t: "circle", cx: 8.5, cy: 7, r: 2.1, fill: "#fff" },
    { t: "circle", cx: 15.5, cy: 12, r: 2.1, fill: "#fff" },
    { t: "circle", cx: 10, cy: 17, r: 2.1, fill: "#fff" },
  ],
  bell: [
    "M18 8.5a6 6 0 0 0-12 0c0 6-2.4 7.5-2.4 7.5h16.8S18 14.5 18 8.5z",
    "M13.5 19.5a2 2 0 0 1-3 0",
  ],
  search: [{ t: "circle", cx: 11, cy: 11, r: 6.5 }, "M20.5 20.5l-4.3-4.3"],
  plus: ["M12 5v14", "M5 12h14"],
  x: ["M6 6l12 12", "M18 6 6 18"],
  check: ["M5 12.5l4.3 4.3L19 7.5"],
  chevR: ["M9.5 5.5 16 12l-6.5 6.5"],
  chevD: ["M6 9.5 12 15.5 18 9.5"],
  upRight: ["M7.5 16.5 16.5 7.5", "M9 7.5h7.5V15"],
  downLeft: ["M16.5 7.5 7.5 16.5", "M15.5 16.5H7.5V8.5"],
  lock: [
    "M7 11h10a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1z",
    "M8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  ],
  trash: [
    "M4.5 7h15",
    "M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7",
    "M6.5 7l1 12.5h9l1-12.5",
    "M10.5 10.5v6",
    "M13.5 10.5v6",
  ],
  download: ["M12 4v11", "M7.5 11l4.5 4.5L16.5 11", "M5 20h14"],
  logout: [
    "M14 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H14",
    "M17 12H9.5",
    "M14.5 9l3 3-3 3",
  ],
  shield: [
    "M12 3.5l7.5 2.8v5.7c0 4.6-3.7 7.4-7.5 8.5-3.8-1.1-7.5-3.9-7.5-8.5V6.3z",
    "M9 12l2 2 4-4",
  ],
  sparkles: [
    "M12 4l1.6 4L18 9.6l-4.4 1.6L12 16l-1.6-4.8L6 9.6l4.4-1.6z",
    "M18.5 15l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z",
  ],
  dots: [
    { t: "circle", cx: 5, cy: 12, r: 1.7, fill: "currentColor" },
    { t: "circle", cx: 12, cy: 12, r: 1.7, fill: "currentColor" },
    { t: "circle", cx: 19, cy: 12, r: 1.7, fill: "currentColor" },
  ],
  filter: ["M4 6h16l-6 7.5V20l-4-2v-6.5z"],
  eye: [
    "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z",
    { t: "circle", cx: 12, cy: 12, r: 3 },
  ],
  eyeOff: [
    "M9.9 9.9a3 3 0 0 0 4.2 4.2",
    "M10.7 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.7",
    "M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6",
    "M2 2l20 20",
  ],
  finger: [
    "M5 11a7 7 0 0 1 14 0",
    "M8 13a4 4 0 0 1 8 0",
    "M12 13v6",
    "M9.2 18.8V14.5",
    "M14.8 15v3.8",
  ],
  refresh: ["M20 11a8 8 0 1 0-1.6 4.8", "M20 5v6h-6"],
  edit: ["M5 19l1-4.2 9.2-9.2 3.2 3.2L9.2 18z", "M14 6.8l3.2 3.2"],
  calendar: [
    "M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z",
    "M4 9.5h16",
    "M8 4v3",
    "M16 4v3",
  ],
  mail: [
    "M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
    "M4.3 7l7.7 6 7.7-6",
  ],
  user: [{ t: "circle", cx: 12, cy: 9, r: 3.5 }, "M5.5 19.2a6.6 6.6 0 0 1 13 0"],
  cart: [
    "M4 5h2l1.5 9h9l1.8-6.5H7",
    { t: "circle", cx: 9, cy: 18, r: 1.4 },
    { t: "circle", cx: 16, cy: 18, r: 1.4 },
  ],
  car: [
    "M4 12l1.6-4.2A2 2 0 0 1 7.5 6.5h9a2 2 0 0 1 1.9 1.3L20 12",
    "M3.5 12h17v4.5H3.5z",
    { t: "circle", cx: 7.5, cy: 16.5, r: 1.6 },
    { t: "circle", cx: 16.5, cy: 16.5, r: 1.6 },
  ],
  zap: ["M13 3 5 13h6l-2 8 8-10h-6z"],
  play: [{ t: "circle", cx: 12, cy: 12, r: 8.5 }, "M10.5 9l5 3-5 3z"],
  health: ["M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"],
  book: [
    "M12 4 2.5 8.5 12 13l9.5-4.5z",
    "M6 10.5v4.5c0 1.2 2.7 2.8 6 2.8s6-1.6 6-2.8v-4.5",
  ],
  bag: ["M6.5 8h11l1 12H5.5z", "M9 8V6.5a3 3 0 0 1 6 0V8"],
  swap: ["M4 9h12", "M13 6l3 3-3 3", "M20 15H8", "M11 12l-3 3 3 3"],
  trend: ["M3 16l5-5 4 4 8-8", "M21 7v5h-5"],
  building: ["M5 21V8l7-4 7 4v13", "M9 21v-5h6v5", "M12 4V2"],
  cash: [
    "M3 7.5h18v9H3z",
    { t: "circle", cx: 12, cy: 12, r: 2.4 },
    "M6.5 9.5v5",
    "M17.5 9.5v5",
  ],
  income: [
    { t: "circle", cx: 12, cy: 12, r: 8.5 },
    "M12 8v8",
    "M8.5 12.5l3.5 3.5 3.5-3.5",
  ],
  grid: [
    { t: "circle", cx: 7, cy: 7, r: 1.7, fill: "currentColor" },
    { t: "circle", cx: 17, cy: 7, r: 1.7, fill: "currentColor" },
    { t: "circle", cx: 7, cy: 17, r: 1.7, fill: "currentColor" },
    { t: "circle", cx: 17, cy: 17, r: 1.7, fill: "currentColor" },
    { t: "circle", cx: 12, cy: 12, r: 1.7, fill: "currentColor" },
  ],
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.9,
}: {
  name: string;
  size?: number;
  strokeWidth?: number;
}) {
  const defs = ICONS[name] || ICONS.grid;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {defs.map((d, i) =>
        typeof d === "string" ? (
          <path key={i} d={d} />
        ) : (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} />
        ),
      )}
    </svg>
  );
}
