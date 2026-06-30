import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
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
  cardWidth = 132,
}: ShelfProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (cardWidth + 16) * 2, behavior: "smooth" });
  };

  return (
    <section className="space-y-3">
      {/* Row header */}
      <div className="flex items-baseline justify-between gap-3 px-1">
        <div className="flex items-baseline gap-2.5">
          <span
            className="font-instrument italic text-midnight-ink"
            style={{ fontSize: 26, lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            {label}
          </span>
          <span
            className="text-graphite-veil"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em" }}
          >
            {String(items.length).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-0.5 text-smoke">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label={`Scroll ${label} left`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-mist bg-white/80 transition-colors hover:bg-stone-mist hover:text-midnight-ink"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label={`Scroll ${label} right`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-mist bg-white/80 transition-colors hover:bg-stone-mist hover:text-midnight-ink"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Cards + acrylic shelf bar */}
      <div className="relative">
        <div
          ref={scrollerRef}
          className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x proximity" }}
        >
          <div className="flex items-end gap-5 pr-2">
            {items.length === 0 ? (
              <EmptyCard
                label={searching ? "No matches" : "Add your first one"}
                width={cardWidth}
              />
            ) : (
              items.map((item) => (
                <div key={item.id} style={{ scrollSnapAlign: "start" }}>
                  <LibraryCard item={item} width={cardWidth} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Acrylic shelf bar (cards visually rest on it) */}
        <div className="relative -mt-2 px-1">
          {/* ambient color glow under bar */}
          <div
            className="pointer-events-none absolute inset-x-8 -top-2 h-6 rounded-full opacity-60 blur-xl"
            style={{ background: accent }}
          />
          <div
            className="relative h-[22px] w-full rounded-[12px] shadow-[0_14px_22px_-12px_rgba(26,26,26,0.55),0_2px_3px_rgba(26,26,26,0.18)]"
            style={{
              background: `linear-gradient(180deg, ${tint(accent, 18)} 0%, ${tint(accent, 4)} 35%, ${accent} 60%, ${shade(accent, -22)} 100%)`,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.18)",
            }}
          >
            {/* glossy top highlight */}
            <div
              className="pointer-events-none absolute inset-x-4 top-[3px] h-[4px] rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 100%)",
              }}
            />
            {/* lower translucent rim */}
            <div
              className="pointer-events-none absolute inset-x-3 bottom-[3px] h-[2px] rounded-full"
              style={{ background: "rgba(255,255,255,0.22)" }}
            />
            {/* end bolts */}
            <Bolt position="left" />
            <Bolt position="right" />
          </div>
          {/* drop shadow beneath shelf */}
          <div
            className="absolute inset-x-8 -bottom-2 h-3 rounded-full opacity-40 blur-md"
            style={{ background: "rgba(26,26,26,0.55)" }}
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
        position === "left" ? "left-2.5" : "right-2.5"
      } flex h-3.5 w-3.5 items-center justify-center rounded-full`}
      style={{
        background:
          "radial-gradient(circle at 30% 28%, #888 0%, #2a2a2a 55%, #050505 100%)",
        boxShadow:
          "inset 0 0 0 0.5px rgba(255,255,255,0.35), 0 1px 2px rgba(0,0,0,0.55)",
      }}
    >
      <div
        className="h-[1.5px] w-2 rounded-full"
        style={{ background: "rgba(255,255,255,0.35)" }}
      />
    </div>
  );
}

function shade(hex: string, percent: number): string {
  return adjust(hex, percent);
}
function tint(hex: string, percent: number): string {
  return adjust(hex, percent);
}
function adjust(hex: string, percent: number): string {
  const m = hex.replace("#", "");
  const num = parseInt(
    m.length === 3 ? m.split("").map((c) => c + c).join("") : m,
    16,
  );
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const t = percent / 100;
  const a = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (t < 0 ? c * t : (255 - c) * t))));
  r = a(r);
  g = a(g);
  b = a(b);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
