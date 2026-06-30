import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FolderClosed, LayoutGrid, Plus, Search } from "lucide-react";
import { AddItemModal } from "@/components/AddItemModal";
import { FolderView } from "@/components/FolderView";
import { Shelf } from "@/components/Shelf";
import { listItems, type LibraryItem } from "@/lib/library";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuroShelf — Your brain library" },
      {
        name: "description",
        content:
          "A personal digital library for saving research papers, articles, and videos about the brain and neuroscience.",
      },
      { property: "og:title", content: "NeuroShelf — Your brain library" },
      {
        property: "og:description",
        content:
          "Save and organise neuroscience research papers, articles, and videos in one warm, editorial library.",
      },
    ],
  }),
  component: LibraryPage,
});

// Accent palette — one per shelf row, in order.
const ACCENTS = ["#f0b265", "#a8d5e8", "#dcc5f0"];

function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [folderView, setFolderView] = useState(false);

  const refresh = async () => {
    try {
      const data = await listItems();
      setItems(data);
    } catch (err) {
      console.error("Failed to load library", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.domain ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const shelves: Array<{ label: string; items: LibraryItem[] }> = [
    { label: "Papers", items: filtered.filter((i) => i.type === "paper") },
    { label: "Articles", items: filtered.filter((i) => i.type === "article") },
    { label: "Videos", items: filtered.filter((i) => i.type === "video") },
  ];

  return (
    <div className="min-h-screen bg-cream-paper">
      <div className="mx-auto max-w-[1200px] px-5 pb-36 pt-5 sm:px-8 sm:pt-6">
        {/* Top utility bar — minimal, like the reference */}
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-mist bg-white text-midnight-ink transition-colors hover:bg-cream-paper"
            aria-label="Search"
          >
            <Search size={15} />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFolderView((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-mist bg-white text-midnight-ink transition-colors hover:bg-cream-paper md:hidden"
              aria-label="Toggle folder view"
            >
              {folderView ? <LayoutGrid size={15} /> : <FolderClosed size={15} />}
            </button>
          </div>
        </header>

        {folderView ? (
          <div className="mt-6 md:hidden">
            <FolderView items={filtered} />
          </div>
        ) : (
          <>
            {/* Title block — small label over giant serif */}
            <div className="mt-6 text-center sm:mt-10">
              <div
                className="text-midnight-ink"
                style={{ fontSize: 13, fontWeight: 400 }}
              >
                My Brain Library
              </div>
              <h1
                className="mt-1 font-eb-garamond text-midnight-ink"
                style={{
                  fontSize: "clamp(56px, 14vw, 104px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  fontWeight: 500,
                }}
              >
                SHELVES
              </h1>
            </div>

            {/* Collapsible search */}
            {searchOpen && (
              <div className="mx-auto mt-5 max-w-md">
                <div className="relative w-full">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-smoke"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search my library"
                    autoFocus
                    className="w-full rounded-full border border-stone-mist bg-white py-2.5 pl-10 pr-4 text-midnight-ink outline-none placeholder:text-smoke focus:border-graphite-veil"
                    style={{ fontSize: 13, fontWeight: 500 }}
                  />
                </div>
              </div>
            )}

            {/* Shelves */}
            <div className="mt-8 space-y-9 sm:mt-12 sm:space-y-12">
              {loading ? (
                <div
                  className="text-center text-smoke"
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  Loading your shelves…
                </div>
              ) : (
                shelves.map((s, idx) => (
                  <Shelf
                    key={s.label}
                    label={s.label}
                    items={s.items}
                    searching={!!search}
                    accent={ACCENTS[idx % ACCENTS.length]}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom centered Add Item pill (mobile + desktop) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-midnight-ink px-7 py-3.5 text-white shadow-[0_14px_30px_-12px_rgba(26,26,26,0.55)] transition-opacity hover:opacity-90"
          style={{ fontSize: 15, fontWeight: 600 }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Item
        </button>
      </div>

      <AddItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
