import type { LibraryItem, ItemType } from "@/lib/library";
import { EmptyCard, LibraryCard } from "./LibraryCard";

interface ShelfProps {
  label: string;
  type: ItemType;
  items: LibraryItem[];
  searching: boolean;
  showViewAll?: boolean;
}

export function Shelf({ label, items, searching, showViewAll = true }: ShelfProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 px-1">
        <div className="flex items-center gap-2.5">
          <span
            className="text-midnight-ink"
            style={{ fontSize: 16, fontWeight: 500 }}
          >
            {label}
          </span>
          <span
            className="inline-flex items-center rounded-[8px] bg-amber-pulse/90 px-1.5 py-0.5 text-midnight-ink"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" }}
          >
            {items.length}
          </span>
        </div>
        {showViewAll && (
          <button
            type="button"
            className="text-smoke transition-colors hover:text-midnight-ink"
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            Full shelf →
          </button>
        )}
      </div>

      {/* Shelf rail */}
      <div className="relative">
        <div className="-mx-2 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-end gap-3 pb-1">
            {items.length === 0 ? (
              <EmptyCard
                label={
                  searching
                    ? "No matches"
                    : "Add your first one"
                }
              />
            ) : (
              items.map((item) => <LibraryCard key={item.id} item={item} />)
            )}
          </div>
        </div>
        {/* Shelf ledge: warm cream-mist plank with depth shadow underneath */}
        <div className="relative">
          <div
            className="h-[6px] rounded-full"
            style={{
              background:
                "linear-gradient(to bottom, #efe9d8 0%, #e4dec9 60%, #d4cdb6 100%)",
            }}
          />
          <div
            className="absolute inset-x-2 -bottom-2 h-3 rounded-full opacity-50 blur-md"
            style={{ background: "rgba(26,26,26,0.22)" }}
          />
        </div>
      </div>
    </section>
  );
}
