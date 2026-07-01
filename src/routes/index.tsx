import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FolderClosed, LayoutGrid, Plus, Search } from "lucide-react";
import { AddItemModal } from "@/components/AddItemModal";
import { FolderView } from "@/components/FolderView";
import { Shelf } from "@/components/Shelf";
import { listItems, type LibraryItem } from "@/lib/library";
import { motion } from "framer-motion";

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
      (i) => i.title.toLowerCase().includes(q) || (i.domain ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const shelves: Array<{ label: string; items: LibraryItem[] }> = [
    { label: "Papers", items: filtered.filter((i) => i.type === "paper") },
    { label: "Articles", items: filtered.filter((i) => i.type === "article") },
    { label: "Videos", items: filtered.filter((i) => i.type === "video") },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: "#f8f9ff" }}>
      {/* ── Soft-luminous animated background ────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {/* Large rotating blue-violet radial — primary atmosphere */}
        <div
          className="spiral-bg absolute"
          style={{
            width: "120vw",
            height: "120vw",
            top: "-30vw",
            left: "-10vw",
            background:
              "radial-gradient(ellipse at center, rgba(180, 200, 255, 0.18) 0%, rgba(200, 180, 255, 0.10) 40%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        {/* Secondary warm-amber pulse glow — bottom right */}
        <div
          className="absolute"
          style={{
            width: "70vw",
            height: "70vw",
            bottom: "-15vw",
            right: "-10vw",
            background:
              "radial-gradient(ellipse at center, rgba(255, 169, 70, 0.10) 0%, rgba(240, 178, 101, 0.05) 50%, transparent 70%)",
            borderRadius: "50%",
            animation: "slowRotateReverse 120s linear infinite",
          }}
        />
        {/* Soft violet accent — top right */}
        <div
          className="absolute"
          style={{
            width: "50vw",
            height: "50vw",
            top: "5vw",
            right: "-5vw",
            background:
              "radial-gradient(ellipse at center, rgba(180, 140, 255, 0.12) 0%, transparent 70%)",
            borderRadius: "50%",
            animation: "slowRotate 150s linear infinite",
          }}
        />

        {/* Faint Neural Connection lines (top left) */}
        <svg
          className="absolute top-10 left-10 w-[300px] h-[300px] text-midnight-ink opacity-[0.03] bg-float-wave"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        >
          <circle cx="20" cy="20" r="1.5" fill="currentColor" />
          <circle cx="50" cy="40" r="1.5" fill="currentColor" />
          <circle cx="80" cy="30" r="1.5" fill="currentColor" />
          <circle cx="30" cy="70" r="1.5" fill="currentColor" />
          <circle cx="70" cy="80" r="1.5" fill="currentColor" />
          <line x1="20" y1="20" x2="50" y2="40" />
          <line x1="50" y1="40" x2="80" y2="30" />
          <line x1="20" y1="20" x2="30" y2="70" />
          <line x1="50" y1="40" x2="30" y2="70" />
          <line x1="50" y1="40" x2="70" y2="80" />
          <line x1="80" y1="30" x2="70" y2="80" />
        </svg>

        {/* Faint DNA double helix strand (middle right) */}
        <svg
          className="absolute right-[10%] top-[40%] w-[120px] h-[400px] text-midnight-ink opacity-[0.025] bg-float-wave"
          viewBox="0 0 40 120"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
          style={{ animationDelay: "-4s", animationDuration: "25s" }}
        >
          <path d="M10,10 C30,25 30,35 10,50 C-10,65 -10,75 10,90 C30,105 30,115 10,130" />
          <path d="M30,10 C10,25 10,35 30,50 C50,65 50,75 30,90 C10,105 10,115 30,130" />
          <line x1="13" y1="18" x2="27" y2="18" />
          <line x1="18" y1="30" x2="22" y2="30" />
          <line x1="27" y1="42" x2="13" y2="42" />
          <line x1="13" y1="58" x2="27" y2="58" />
          <line x1="18" y1="70" x2="22" y2="70" />
          <line x1="27" y1="82" x2="13" y2="82" />
          <line x1="13" y1="98" x2="27" y2="98" />
        </svg>

        {/* Floating Brain Wave Waves (bottom left) */}
        <svg
          className="absolute bottom-[10%] left-[5%] w-[400px] h-[150px] text-midnight-ink opacity-[0.02] bg-float-wave"
          viewBox="0 0 200 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
          style={{ animationDelay: "-8s", animationDuration: "20s" }}
        >
          <path d="M0,30 Q25,10 50,30 T100,30 T150,30 T200,30" />
          <path d="M0,35 Q25,20 50,35 T100,35 T150,35 T200,35" style={{ opacity: 0.5 }} />
        </svg>
      </div>
      {/* ──────────────────────────────────────────────────────────── */}

      <div className="relative mx-auto max-w-[1200px] px-5 pb-36 pt-5 sm:px-8 sm:pt-6">
        {/* Top utility bar */}
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/70 text-midnight-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-white/90"
            aria-label="Search"
          >
            <Search size={15} />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFolderView((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/70 text-midnight-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-white/90 md:hidden"
              aria-label="Toggle folder view"
            >
              {folderView ? <LayoutGrid size={15} /> : <FolderClosed size={15} />}
            </button>
          </div>
        </header>

        {folderView ? (
          <div className="mt-6 md:hidden">
            <FolderView items={filtered} onChanged={refresh} />
          </div>
        ) : (
          <>
            {/* Title block */}
            <div className="mt-6 text-center sm:mt-10 content-card">
              <div
                className="uppercase text-graphite-veil"
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em" }}
              >
                My Brain Library
              </div>
              <h1
                className="mt-2 font-fraunces text-midnight-ink"
                style={{
                  fontSize: "clamp(64px, 16vw, 132px)",
                  lineHeight: 0.88,
                  letterSpacing: "-0.055em",
                  fontWeight: 500,
                  fontVariationSettings: '"opsz" 144',
                }}
              >
                Shelves<span className="text-amber-pulse">.</span>
              </h1>
              <div
                className="mx-auto mt-3 font-instrument italic text-smoke"
                style={{ fontSize: 15, lineHeight: 1.2, maxWidth: 320 }}
              >
                a quiet place for the things your brain wants to keep
              </div>
            </div>

            {/* Collapsible search */}
            {searchOpen && (
              <div className="mx-auto mt-5 max-w-md content-card">
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
                    className="w-full rounded-full border border-white/70 bg-white/80 py-2.5 pl-10 pr-4 text-midnight-ink shadow-sm outline-none placeholder:text-smoke backdrop-blur-sm focus:border-graphite-veil focus:bg-white"
                    style={{ fontSize: 13, fontWeight: 500 }}
                  />
                </div>
              </div>
            )}

            {/* Shelves */}
            <div className="mt-8 space-y-9 sm:mt-12 sm:space-y-12">
              {loading ? (
                <div
                  className="text-center text-smoke content-card"
                  style={{ fontSize: 13, fontWeight: 500 }}
                >
                  Loading your shelves…
                </div>
              ) : (
                shelves.map((s, idx) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.12, ease: "easeOut" }}
                    className="content-card"
                  >
                    <Shelf
                      label={s.label}
                      items={s.items}
                      searching={!!search}
                      accent={ACCENTS[idx % ACCENTS.length]}
                      onChanged={refresh}
                    />
                  </motion.div>
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
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/30 bg-midnight-ink/90 px-7 py-3.5 text-white shadow-[0_14px_30px_-12px_rgba(26,26,26,0.55)] backdrop-blur-md transition-opacity hover:opacity-90"
          style={{ fontSize: 15, fontWeight: 600 }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Item
        </button>
      </div>

      <AddItemModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={refresh} />
    </div>
  );
}
