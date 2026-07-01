import { LibraryCard } from "./LibraryCard";
import type { LibraryItem } from "@/lib/library";

interface Props {
  items: LibraryItem[];
  onChanged?: () => void;
}

export function FolderView({ items, onChanged }: Props) {
  const year = new Date().getFullYear();

  return (
    <div
      className="min-h-[calc(100vh-64px)] rounded-[20px] border-[14px] border-[#5c3a21] p-4 relative shadow-[inset_0_0_60px_rgba(0,0,0,0.5),0_12px_32px_rgba(0,0,0,0.35)] overflow-hidden"
      style={{
        backgroundColor: "#c68d4a",
        backgroundImage: `
          radial-gradient(rgba(0, 0, 0, 0.15) 1.2px, transparent 0),
          radial-gradient(rgba(0, 0, 0, 0.1) 2px, transparent 0),
          linear-gradient(45deg, rgba(0, 0, 0, 0.02) 25%, transparent 25%, transparent 75%, rgba(0, 0, 0, 0.02) 75%, rgba(0, 0, 0, 0.02)),
          linear-gradient(45deg, rgba(0, 0, 0, 0.02) 25%, transparent 25%, transparent 75%, rgba(0, 0, 0, 0.02) 75%, rgba(0, 0, 0, 0.02))
        `,
        backgroundSize: "8px 8px, 16px 16px, 20px 20px, 20px 20px",
        backgroundPosition: "0 0, 8px 8px, 0 0, 10px 10px"
      }}
    >
      {/* Wooden frame inner bevel highlight */}
      <div className="absolute inset-0 pointer-events-none border border-black/15 rounded-[6px]" />

      {/* Header card pinned at the top */}
      <div className="relative mb-8 text-center select-none pt-2">
        <div
          className="inline-block bg-[#fcfbfa] px-6 py-2.5 rounded shadow-[2px_4px_8px_rgba(0,0,0,0.25)] border border-stone-mist/60 relative"
          style={{ transform: "rotate(-1.5deg)" }}
        >
          {/* Shiny pushpin for the header card */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 filter drop-shadow-[1.5px_2.5px_2px_rgba(0,0,0,0.35)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="12" cy="7" rx="5.5" ry="4.5" fill="#3b82f6" />
              <ellipse cx="10.5" cy="5.5" rx="1.8" ry="1.3" fill="white" opacity="0.65" />
              <path d="M9.5 10.5 L14.5 10.5 L13 7 L11 7 Z" fill="#3b82f6" opacity="0.9" />
              <path d="M11.5 10.5 L12.5 10.5 L12.5 17 L11.5 17 Z" fill="#9ca3af" />
              <rect x="9" y="9.5" width="6" height="1.2" rx="0.4" fill="#374151" />
            </svg>
          </div>
          <h1 
            className="font-sans text-midnight-ink font-bold tracking-tight leading-none"
            style={{ fontSize: 22, fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            My Shelf
          </h1>
          <p 
            className="text-[9px] text-smoke mt-1 font-medium font-sans tracking-wide uppercase"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            pinned items
          </p>
        </div>
      </div>

      {/* Grid of pinned content notes */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center select-none">
          <div 
            className="bg-white/90 px-6 py-4 rounded-[6px] shadow-[2px_4px_8px_rgba(0,0,0,0.15)] border border-stone-mist/40 max-w-[200px]"
            style={{ transform: "rotate(1deg)" }}
          >
            <p className="text-xs font-semibold text-midnight-ink leading-tight">
              No items pinned yet!
            </p>
            <p className="text-[10px] text-smoke mt-1 leading-normal">
              Click the "Add Item" button below to start pinning.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 pb-6">
          {items.map((item, idx) => (
            <div key={item.id} className="flex justify-center">
              <LibraryCard
                item={item}
                width={140}
                index={idx}
                isPinboard={true}
                onChanged={onChanged}
              />
            </div>
          ))}
        </div>
      )}

      {/* Footer bar */}
      <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4 text-midnight-ink/80 text-[10px] font-bold tracking-wider uppercase font-sans px-1">
        <span>archive</span>
        <span>{year}</span>
      </div>
    </div>
  );
}
