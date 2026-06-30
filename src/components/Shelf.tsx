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
    <section className="space-y-2.5">
      {/* Row header */}
      <div className="flex items-center justify-between gap-3 px-1">
        <span
          className="text-midnight-ink"
          style={{ fontSize: 17, fontWeight: 500 }}
        >
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-smoke" style={{ fontSize: 13 }}>
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-0.5 text-smoke">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label={`Scroll ${label} left`}
              className="flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-stone-mist hover:text-midnight-ink"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label={`Scroll ${label} right`}
              className="flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-stone-mist hover:text-midnight-ink"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Cards + acrylic shelf bar */}
      <div className="relative">
        <div
          ref={scrollerRef}
          className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x proximity" }}
        >
          <div className="flex items-end gap-4 pr-2">
            {items.length === 0 ? (
              <EmptyCard
                label={searching ? "No matches" : "Add your first one"}
                width={cardWidth}
              />
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  style={{ scrollSnapAlign: "start" }}
                >
                  <LibraryCard item={item} width={cardWidth} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Acrylic shelf bar (cards visually rest on it) */}
        <div className="relative -mt-3 px-1">
          <div
            className="relative h-[18px] w-full rounded-[10px] shadow-[0_10px_18px_-10px_rgba(26,26,26,0.4)]"
            style={{
              background: `linear-gradient(180deg, ${tint(accent, 8)} 0%, ${accent} 45%, ${shade(accent, -14)} 100%)`,
            }}
          >
            {/* glossy top highlight */}
            <div
              className="pointer-events-none absolute inset-x-3 top-[3px] h-[3px] rounded-full"
              style={{ background: "rgba(255,255,255,0.6)" }}
            />
            {/* inner translucent line */}
            <div
              className="pointer-events-none absolute inset-x-2 bottom-[3px] h-[2px] rounded-full"
              style={{ background: "rgba(255,255,255,0.18)" }}
            />
            {/* end bolts */}
            <Bolt position="left" />
            <Bolt position="right" />
          </div>
          {/* shadow beneath shelf */}
          <div
            className="absolute inset-x-6 -bottom-1.5 h-2.5 rounded-full opacity-45 blur-md"
            style={{ background: "rgba(26,26,26,0.5)" }}
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
      } flex h-3 w-3 items-center justify-center rounded-full`}
      style={{
        background:
          "radial-gradient(circle at 30% 30%, #5a5a5a 0%, #1a1a1a 60%, #000 100%)",
        boxShadow:
          "inset 0 0 0 0.5px rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="h-[1px] w-1.5 rounded-full"
        style={{ background: "rgba(255,255,255,0.25)" }}
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
