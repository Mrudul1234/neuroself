import { ChevronRight } from "lucide-react";
import type { LibraryItem } from "@/lib/library";
import { EmptyCard, LibraryCard } from "./LibraryCard";

interface ShelfProps {
  label: string;
  items: LibraryItem[];
  searching: boolean;
  /** Hex color for the acrylic shelf bar */
  accent: string;
  cardWidth?: number;
}

export function Shelf({
  label,
  items,
  searching,
  accent,
  cardWidth = 120,
}: ShelfProps) {
  return (
    <section className="space-y-3">
      {/* Row header */}
      <div className="flex items-end justify-between gap-4 px-1">
        <div className="flex items-baseline gap-2.5">
          <span
            className="text-midnight-ink"
            style={{ fontSize: 16, fontWeight: 500 }}
          >
            {label}
          </span>
          <span className="text-smoke" style={{ fontSize: 13 }}>
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-smoke transition-colors hover:text-midnight-ink"
          style={{ fontSize: 13, fontWeight: 500 }}
        >
          View all
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Cards + acrylic shelf bar */}
      <div className="relative">
        <div className="-mx-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-end gap-4 pr-2">
            {items.length === 0 ? (
              <EmptyCard
                label={searching ? "No matches" : "Add your first one"}
                width={cardWidth}
              />
            ) : (
              items.map((item) => (
                <LibraryCard key={item.id} item={item} width={cardWidth} />
              ))
            )}
          </div>
        </div>

        {/* Acrylic shelf bar with end-bolts */}
        <div className="relative -mt-2">
          <div
            className="relative h-3.5 w-full rounded-[12px] shadow-[0_8px_16px_-10px_rgba(26,26,26,0.35)]"
            style={{
              background: `linear-gradient(180deg, ${accent} 0%, ${shade(accent, -10)} 100%)`,
            }}
          >
            {/* gloss highlight */}
            <div
              className="pointer-events-none absolute inset-x-2 top-[2px] h-[3px] rounded-full"
              style={{ background: "rgba(255,255,255,0.55)" }}
            />
            {/* end bolts */}
            <Bolt position="left" />
            <Bolt position="right" />
          </div>
          {/* drop shadow beneath shelf */}
          <div
            className="absolute inset-x-4 -bottom-1.5 h-2 rounded-full opacity-40 blur-md"
            style={{ background: "rgba(26,26,26,0.45)" }}
          />
        </div>
      </div>
    </section>
  );
}

function Bolt({ position }: { position: "left" | "right" }) {
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 ${
        position === "left" ? "left-2" : "right-2"
      } flex h-2.5 w-2.5 items-center justify-center rounded-full`}
      style={{
        background:
          "radial-gradient(circle at 30% 30%, #4a4a4a 0%, #1a1a1a 65%, #000 100%)",
        boxShadow:
          "inset 0 0 0 0.5px rgba(255,255,255,0.25), 0 1px 1px rgba(0,0,0,0.35)",
      }}
    />
  );
}

/** Darken or lighten a hex color by a percent (-100..100). */
function shade(hex: string, percent: number): string {
  const m = hex.replace("#", "");
  const num = parseInt(
    m.length === 3
      ? m.split("").map((c) => c + c).join("")
      : m,
    16,
  );
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const t = percent / 100;
  const adjust = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (t < 0 ? c * t : (255 - c) * t))));
  r = adjust(r);
  g = adjust(g);
  b = adjust(b);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
