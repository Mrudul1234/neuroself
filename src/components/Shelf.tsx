import type { LibraryItem } from "@/lib/library";
import { EmptyCard, LibraryCard } from "./LibraryCard";

interface ShelfProps {
  label: string;
  items: LibraryItem[];
  searching: boolean;
  /** Accent hue for row header underline / count chip */
  accent: string;
  cardWidth?: number;
  onChanged?: () => void;
}

/**
 * 3D wooden bookshelf row.
 * - Books wrap across multiple rows (compact grid on desktop).
 * - Each row sits on a rendered wooden plank with side supports, plus a
 *   thin reflection strip below.
 */
export function Shelf({
  label,
  items,
  searching,
  accent,
  cardWidth = 118,
  onChanged,
}: ShelfProps) {
  return (
    <section className="space-y-4">
      {/* Row header */}
      <div className="flex items-baseline justify-between gap-3 px-1">
        <div className="flex items-baseline gap-3">
          <span
            className="font-instrument italic text-midnight-ink"
            style={{ fontSize: 30, lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            {label}
          </span>
          <span
            className="inline-flex h-6 items-center rounded-full px-2 text-midnight-ink/80"
            style={{
              background: `${accent}55`,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
            }}
          >
            {String(items.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Books + wooden plank */}
      <div className="relative">
        {/* Books */}
        <div
          className="flex overflow-x-auto gap-4 px-3 pt-2 pb-3 scrollbar-none snap-x snap-mandatory md:grid md:gap-x-4 md:gap-y-5 md:pb-0"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
          }}
        >
          {items.length === 0 ? (
            <div className="snap-start flex justify-center w-full">
              <EmptyCard
                label={searching ? "No matches" : "Add your first one"}
                width={cardWidth}
              />
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex shrink-0 justify-center snap-start">
                <LibraryCard item={item} width={cardWidth} onChanged={onChanged} />
              </div>
            ))
          )}
        </div>

        {/* Mobile horizontal scroll edge fades */}
        <div className="pointer-events-none absolute bottom-[32px] left-0 top-0 w-6 bg-gradient-to-r from-cream-paper to-transparent md:hidden" />
        <div className="pointer-events-none absolute bottom-[32px] right-0 top-0 w-6 bg-gradient-to-l from-cream-paper to-transparent md:hidden" />


        {/* Wooden plank */}
        <div className="relative mt-1 px-0">
          {/* accent glow on plank */}
          <div
            className="pointer-events-none absolute inset-x-16 -top-2 h-4 rounded-full opacity-70 blur-xl"
            style={{ background: accent }}
          />
          <div
            className="relative h-[26px] w-full overflow-hidden rounded-[6px] shadow-[0_18px_28px_-14px_rgba(60,36,18,0.7),0_3px_5px_rgba(0,0,0,0.28)]"
            style={{
              background:
                "linear-gradient(180deg, #b6864e 0%, #a2703b 22%, #8a5a2b 55%, #5d3a1c 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,220,170,0.55), inset 0 -2px 0 rgba(0,0,0,0.35)",
            }}
          >
            {/* wood grain streaks */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(60,30,10,0.35) 0 1px, transparent 1px 7px), repeating-linear-gradient(90deg, rgba(255,230,190,0.18) 0 1px, transparent 1px 23px)",
              }}
            />
            {/* knot */}
            <div
              className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full opacity-70"
              style={{
                left: "22%",
                background:
                  "radial-gradient(circle, #5a3410 0%, #7a4a1e 55%, transparent 100%)",
              }}
            />
            <div
              className="pointer-events-none absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full opacity-60"
              style={{
                right: "31%",
                background:
                  "radial-gradient(circle, #4a2a08 0%, #6a3e18 60%, transparent 100%)",
              }}
            />
            {/* top glossy highlight */}
            <div
              className="pointer-events-none absolute inset-x-4 top-[3px] h-[3px] rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,240,210,0) 0%, rgba(255,240,210,0.7) 50%, rgba(255,240,210,0) 100%)",
              }}
            />
          </div>

          {/* thin front-edge reflection strip */}
          <div
            className="mx-auto h-[6px] w-[96%] rounded-b-[10px] opacity-60"
            style={{
              background:
                "linear-gradient(180deg, rgba(93,58,28,0.55) 0%, rgba(93,58,28,0) 100%)",
              filter: "blur(2px)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
