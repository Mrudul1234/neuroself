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
const ACCENTS = ["#ffa946", "#a8d5e8", "#f0d7ff"];

function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    { label: "Research Papers", items: filtered.filter((i) => i.type === "paper") },
    { label: "Articles", items: filtered.filter((i) => i.type === "article") },
    { label: "Videos", items: filtered.filter((i) => i.type === "video") },
  ];

  return (
    <div className="min-h-screen bg-cream-paper">
      <div className="mx-auto max-w-[1200px] px-4 pb-32 pt-4 sm:px-8 sm:pt-6">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-midnight-ink text-white"
              style={{ fontSize: 14, fontWeight: 700 }}
            >
              N
            </div>
            <span
              className="text-midnight-ink"
              style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}
            >
              NeuroShelf
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Folder view toggle — mobile only */}
            <button
              type="button"
              onClick={() => setFolderView((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-mist bg-white text-midnight-ink transition-colors hover:bg-cream-paper md:hidden"
              aria-label="Toggle folder view"
            >
              {folderView ? <LayoutGrid size={15} /> : <FolderClosed size={15} />}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="hidden items-center gap-1.5 rounded-full bg-midnight-ink px-4 py-2 text-white hover:opacity-90 sm:inline-flex"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Add Item
            </button>
          </div>
        </header>

        {folderView ? (
          <div className="mt-6 md:hidden">
            <FolderView items={filtered} />
          </div>
        ) : (
          <>
            {/* Page title */}
            <div className="mt-10 text-center sm:mt-16">
              <div
                className="text-smoke"
                style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase" }}
              >
                My Brain Library
              </div>
              <h1
                className="mt-3 font-eb-garamond text-midnight-ink"
                style={{
                  fontSize: "clamp(48px, 9vw, 96px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.05em",
                }}
              >
                SHELVES
              </h1>
              <p
                className="mx-auto mt-4 max-w-md text-smoke"
                style={{ fontSize: 14, lineHeight: 1.4 }}
              >
                A warm corner for neuroscience papers, articles, and videos worth remembering.
              </p>
            </div>

            {/* Search */}
            <div className="mx-auto mt-8 flex max-w-md items-center">
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
                  className="w-full rounded-full border border-stone-mist bg-white py-2.5 pl-10 pr-4 text-midnight-ink outline-none placeholder:text-smoke focus:border-graphite-veil"
                  style={{ fontSize: 13, fontWeight: 500 }}
                />
              </div>
            </div>

            {/* Shelves */}
            <div className="mt-12 space-y-12 sm:mt-16 sm:space-y-14">
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

      {/* Floating add button (mobile + always-visible bottom CTA) */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-midnight-ink px-6 py-3 text-white shadow-[0_14px_30px_-12px_rgba(26,26,26,0.55)] hover:opacity-90 sm:hidden"
        style={{ fontSize: 14, fontWeight: 600 }}
      >
        <Plus size={16} strokeWidth={2.5} />
        Add Item
      </button>

      <AddItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
