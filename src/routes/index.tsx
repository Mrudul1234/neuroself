import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Menu, Plus, Search } from "lucide-react";
import { AddItemModal } from "@/components/AddItemModal";
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

function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const papers = filtered.filter((i) => i.type === "paper");
  const articles = filtered.filter((i) => i.type === "article");
  const videos = filtered.filter((i) => i.type === "video");

  return (
    <div className="min-h-screen bg-cream-paper">
      {/* Sticky nav */}
      <div className="sticky top-0 z-30 px-4 pt-4 sm:px-8 sm:pt-6">
        <nav
          className="mx-auto flex max-w-[1200px] items-center justify-between rounded-[14px] border border-stone-mist bg-white px-4 py-3 sm:px-6"
          style={{ boxShadow: "0 8px 24px -16px rgba(26,26,26,0.2)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full bg-deep-forest-teal text-white"
              style={{ fontSize: 13, fontWeight: 700 }}
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

          {/* Desktop links */}
          <div className="hidden items-center gap-7 md:flex">
            {["Library", "Topics", "Add Item"].map((l) => (
              <a
                key={l}
                href="#"
                onClick={(e) => {
                  if (l === "Add Item") {
                    e.preventDefault();
                    setModalOpen(true);
                  }
                }}
                className="text-midnight-ink transition-opacity hover:opacity-60"
                style={{ fontSize: 14, fontWeight: 500 }}
              >
                {l}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="hidden items-center gap-1.5 rounded-[14px] border border-midnight-ink bg-lavender-whisper px-[18px] py-[10px] text-midnight-ink transition-opacity hover:opacity-90 md:inline-flex"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Add to Library
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-stone-mist text-midnight-ink md:hidden"
              aria-label="Menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </nav>

        {/* Mobile menu drawer */}
        {menuOpen && (
          <div className="mx-auto mt-2 max-w-[1200px] rounded-[14px] border border-stone-mist bg-white p-4 md:hidden">
            <div className="flex flex-col gap-3">
              {["Library", "Topics"].map((l) => (
                <a
                  key={l}
                  href="#"
                  className="text-midnight-ink"
                  style={{ fontSize: 14, fontWeight: 500 }}
                >
                  {l}
                </a>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setModalOpen(true);
                }}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-[14px] border border-midnight-ink bg-lavender-whisper px-4 py-2.5 text-midnight-ink"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                <Plus size={14} strokeWidth={2.5} /> Add to Library
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Page body */}
      <main className="mx-auto max-w-[1200px] px-4 pb-32 pt-12 sm:px-8 sm:pt-20">
        {/* Two-tone serif header */}
        <header className="space-y-8">
          <h1
            className="font-eb-garamond"
            style={{
              fontSize: "clamp(56px, 11vw, 120px)",
              lineHeight: 0.85,
              letterSpacing: "-0.06em",
            }}
          >
            <span className="text-graphite-veil">My </span>
            <span className="text-midnight-ink">Library</span>
          </h1>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search
              size={16}
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-smoke"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search my library"
              className="w-full rounded-full border border-stone-mist bg-white py-3.5 pl-12 pr-5 text-midnight-ink outline-none placeholder:text-smoke focus:border-graphite-veil"
              style={{ fontSize: 14, fontWeight: 500 }}
            />
          </div>
        </header>

        {/* Shelves */}
        <div className="mt-20 space-y-20">
          {loading ? (
            <div
              className="text-smoke"
              style={{ fontSize: 14, fontWeight: 500 }}
            >
              Loading your shelves…
            </div>
          ) : (
            <>
              <Shelf
                label="Research Papers"
                type="paper"
                items={papers}
                searching={!!search}
              />
              <Shelf
                label="Articles"
                type="article"
                items={articles}
                searching={!!search}
              />
              <Shelf
                label="Videos"
                type="video"
                items={videos}
                searching={!!search}
              />
            </>
          )}
        </div>

        {/* Footer note */}
        <div
          className="mt-32 border-t border-stone-mist pt-8 text-smoke"
          style={{ fontSize: 13 }}
        >
          NeuroShelf — a small, warm corner for thinking about brains.
        </div>
      </main>

      <AddItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
