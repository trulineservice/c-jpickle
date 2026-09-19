---
name: court-interactive-map-ui
description: Use this skill when designing or implementing interactive 2D/isometric pickleball court maps, live court occupancy status visualizers, NVZ kitchen markings, and court layout selectors.
---

# Court Interactive Map UI Skill

This skill provides design standards, SVG coordinates, and interaction patterns for visual pickleball court representations within the C&J Pickleball platform.

## 1. Official Court Dimensions & SVG Scale

Official USA Pickleball Court:
- Length: 44 feet (13.41 m)
- Width: 20 feet (6.10 m)
- Non-Volley Zone (The Kitchen): 7 feet (2.13 m) on both sides of the net
- Service Courts: 15 feet x 10 feet each (Right & Left)

### Optimized SVG Court Aspect Ratio
Use `viewBox="0 0 440 200"` for horizontal landscape, or `viewBox="0 0 200 440"` for vertical mobile orientation.

```tsx
export function PickleballCourtSVG({
  status = "available", // "available" | "reserved" | "in_play" | "maintenance"
  courtNumber = 1,
  onSelect,
  isSelected = false
}: {
  status?: "available" | "reserved" | "in_play" | "maintenance";
  courtNumber?: number;
  onSelect?: () => void;
  isSelected?: boolean;
}) {
  const statusColors = {
    available: { border: "stroke-emerald-500", fill: "fill-emerald-950/30", badge: "bg-emerald-500/20 text-emerald-400" },
    reserved: { border: "stroke-amber-500", fill: "fill-amber-950/30", badge: "bg-amber-500/20 text-amber-400" },
    in_play: { border: "stroke-rose-500", fill: "fill-rose-950/30", badge: "bg-rose-500/20 text-rose-400" },
    maintenance: { border: "stroke-zinc-600", fill: "fill-zinc-900/50", badge: "bg-zinc-800 text-zinc-400" }
  };

  const current = statusColors[status];

  return (
    <div
      onClick={status === "available" ? onSelect : undefined}
      className={`group relative rounded-2xl border p-3 transition-all duration-200 ${
        isSelected
          ? "border-emerald-400 bg-emerald-950/20 ring-2 ring-emerald-500/40"
          : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
      } ${status === "available" ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-zinc-200">Court {courtNumber}</span>
        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${current.badge}`}>
          {status.replace("_", " ")}
        </span>
      </div>

      {/* SVG Court Representation */}
      <svg viewBox="0 0 440 200" className="w-full h-auto rounded-lg overflow-hidden border border-zinc-800">
        {/* Court Baseline & Playing Surface */}
        <rect x="0" y="0" width="440" height="200" className={current.fill} />

        {/* Outer Boundary Line */}
        <rect x="4" y="4" width="432" height="192" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-400/60" />

        {/* Center Net (with net posts) */}
        <line x1="220" y1="0" x2="220" y2="200" stroke="currentColor" strokeWidth="4" className="text-white" strokeDasharray="3 3" />
        <circle cx="220" cy="2" r="3" fill="#ffffff" />
        <circle cx="220" cy="198" r="3" fill="#ffffff" />

        {/* Non-Volley Zone (Kitchen) Lines - 70px on each side of net */}
        {/* Left Kitchen (150 to 220) */}
        <rect x="150" y="4" width="70" height="192" fill="currentColor" className="text-amber-500/10" />
        <line x1="150" y1="4" x2="150" y2="196" stroke="currentColor" strokeWidth="2.5" className="text-zinc-300" />

        {/* Right Kitchen (220 to 290) */}
        <rect x="220" y="4" width="70" height="192" fill="currentColor" className="text-amber-500/10" />
        <line x1="290" y1="4" x2="290" y2="196" stroke="currentColor" strokeWidth="2.5" className="text-zinc-300" />

        {/* Center Service Lines */}
        {/* Left Service Center Line (4 to 150) */}
        <line x1="4" y1="100" x2="150" y2="100" stroke="currentColor" strokeWidth="2.5" className="text-zinc-300" />
        {/* Right Service Center Line (290 to 436) */}
        <line x1="290" y1="100" x2="436" y2="100" stroke="currentColor" strokeWidth="2.5" className="text-zinc-300" />

        {/* NVZ Badges */}
        <text x="185" y="105" textAnchor="middle" fill="currentColor" className="text-[10px] font-bold fill-zinc-500 tracking-wider">
          NVZ
        </text>
        <text x="255" y="105" textAnchor="middle" fill="currentColor" className="text-[10px] font-bold fill-zinc-500 tracking-wider">
          NVZ
        </text>
      </svg>
    </div>
  );
}
```

## 2. Arena Overview Layout
When showing multiple courts (e.g. Court 1 to 4):
- Use a 2x2 grid on desktop (`grid grid-cols-1 md:grid-cols-2 gap-4`).
- Provide instant status badges:
  - **Available**: Soft glowing emerald dot (`animate-pulse`).
  - **In Play**: Live timer counter badge ("42m left").
  - **Reserved**: Player nickname or booking ID.
