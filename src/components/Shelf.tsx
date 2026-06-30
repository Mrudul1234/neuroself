import type { LibraryItem, ItemType } from "@/lib/library";
import { EmptyCard, LibraryCard } from "./LibraryCard";

interface ShelfProps {
  label: string;
  type: ItemType;
  items: LibraryItem[];
  searching: boolean;
}

export function Shelf({ label, items, searching }: ShelfProps) {
  return (
    <section className="space-y-6">
      {/* Header row */}
      <div className="flex items-end justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <span
            className="uppercase text-smoke"
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.1em",
            }}
          >
            {label}
          </span>
          <span
            className="inline-flex items-center rounded-[8px] bg-amber-pulse px-2 py-0.5 text-midnight-ink"
            style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em" }}
          >
            {items.length}
          </span>
        </div>
        <button
          type="button"
          className="text-midnight-ink transition-opacity hover:opacity-60"
          style={{ fontSize: 14, fontWeight: 500 }}
        >
          View all →
        </button>
      </div>

      {/* Shelf rail with horizontal scroll */}
      <div className="relative">
        <div className="-mx-4 overflow-x-auto px-4 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-end gap-5">
            {items.length === 0 ? (
              <EmptyCard
                label={
                  searching
                    ? "No matches on this shelf"
                    : "No items yet — add your first one"
                }
              />
            ) : (
              items.map((item) => <LibraryCard key={item.id} item={item} />)
            )}
          </div>
        </div>
        {/* Shelf ledge */}
        <div
          className="mx-1 h-[4px] rounded-full bg-stone-mist"
          style={{ boxShadow: "0 6px 14px -6px rgba(26,26,26,0.25)" }}
        />
      </div>
    </section>
  );
}
