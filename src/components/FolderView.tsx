import { Pin } from "lucide-react";
import { LibraryCard } from "./LibraryCard";
import type { LibraryItem } from "@/lib/library";

interface Props {
  items: LibraryItem[];
}

export function FolderView({ items }: Props) {
  const year = new Date().getFullYear();
  // Insert sticky note after the 2nd card if possible
  const withNote: Array<{ kind: "card"; item: LibraryItem } | { kind: "note" }> = [];
  items.forEach((item, i) => {
    withNote.push({ kind: "card", item });
    if (i === 1) withNote.push({ kind: "note" });
  });
  if (items.length < 2) withNote.push({ kind: "note" });

  return (
    <div
      className="min-h-[calc(100vh-32px)] rounded-[28px] p-5"
      style={{ backgroundColor: "#f5e6a8" }}
    >
      {/* Folder tab card */}
      <div className="relative mt-2">
        <div
          className="rounded-[22px] bg-white px-6 pb-6 pt-7 shadow-[0_10px_24px_-14px_rgba(26,26,26,0.35)]"
          style={{
            clipPath:
              "polygon(0 24px, 24px 24px, 40px 0, 100% 0, 100% 100%, 0 100%)",
          }}
        >
          <h1
            className="text-midnight-ink"
            style={{
              fontFamily: '"EB Garamond", serif',
              fontStyle: "italic",
              fontSize: 44,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            My <span className="not-italic" style={{ fontWeight: 500 }}>Shelf</span>
          </h1>
          <p
            className="mt-2 text-smoke"
            style={{ fontSize: 13, fontStyle: "italic" }}
          >
            (in no particular order)
          </p>
        </div>
      </div>

      {/* Row of cards + sticky note */}
      <div className="mt-6 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-start gap-4 pr-2">
          {withNote.map((entry, i) =>
            entry.kind === "card" ? (
              <div key={entry.item.id} className="flex flex-col gap-1">
                <LibraryCard item={entry.item} width={112} />
                <div
                  className="mt-1 px-1 text-midnight-ink"
                  style={{ fontSize: 11, fontWeight: 500 }}
                >
                  {new Date(entry.item.created_at).getFullYear()}
                </div>
              </div>
            ) : (
              <StickyNote key={`note-${i}`} />
            ),
          )}
        </div>
      </div>

      <div
        className="mt-6 flex items-center justify-between px-1 text-midnight-ink"
        style={{ fontSize: 12, fontWeight: 500 }}
      >
        <a href="#" className="underline-offset-2 hover:underline">
          archive
        </a>
        <span>{year}</span>
      </div>
    </div>
  );
}

function StickyNote() {
  return (
    <div
      className="relative shrink-0 rotate-[-4deg] rounded-[6px] p-3 shadow-[0_6px_14px_-8px_rgba(26,26,26,0.45)]"
      style={{
        width: 140,
        height: 168,
        background: "linear-gradient(180deg, #fff7c2 0%, #ffe98a 100%)",
      }}
    >
      <Pin
        size={16}
        className="absolute -top-2 left-1/2 -translate-x-1/2 rotate-12 text-midnight-ink"
        fill="currentColor"
      />
      <div
        className="font-eb-garamond text-midnight-ink"
        style={{ fontSize: 16, lineHeight: 1.15, fontStyle: "italic" }}
      >
        Things I keep coming back to ✨
      </div>
    </div>
  );
}
