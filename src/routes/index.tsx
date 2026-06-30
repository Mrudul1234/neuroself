import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  FileText,
  Home,
  Menu,
  Newspaper,
  Play,
  Plus,
  Search,
  Tag,
  X,
} from "lucide-react";
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

type Tab = "shelves" | "all";

function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("shelves");
  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  const latest = items[0];

  return (
    <div
      className="min-h-screen p-3 sm:p-6"
      style={{ backgroundColor: "#eef0ef" }}
    >
      <div className="mx-auto flex max-w-[1280px] gap-6">
        {/* Sidebar — desktop */}
        <aside className="hidden w-[220px] shrink-0 flex-col justify-between lg:flex">
          <Sidebar
            onAdd={() => setModalOpen(true)}
            latest={latest}
          />
        </aside>

        {/* Sidebar drawer — mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(26,26,26,0.4)" }}
            />
            <div
              className="absolute left-0 top-0 flex h-full w-[260px] flex-col justify-between bg-[#eef0ef] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-stone-mist bg-white text-midnight-ink"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
              <Sidebar
                onAdd={() => {
                  setSidebarOpen(false);
                  setModalOpen(true);
                }}
                latest={latest}
              />
            </div>
          </div>
        )}

        {/* Main panel */}
        <main
          className="relative min-h-[calc(100vh-48px)] flex-1 overflow-hidden rounded-[32px] border border-stone-mist bg-cream-paper"
          style={{ boxShadow: "0 24px 60px -32px rgba(26,26,26,0.25)" }}
        >
          {/* Top bar: mobile menu + tabs + search */}
          <div className="flex flex-wrap items-center gap-3 border-b border-stone-mist/70 px-5 py-4 sm:px-8">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-stone-mist bg-white text-midnight-ink lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>

            <div className="flex shrink-0 items-center rounded-full bg-white p-1 ring-1 ring-stone-mist">
              <button
                type="button"
                onClick={() => setTab("shelves")}
                className={`rounded-full px-3.5 py-1.5 transition-colors ${
                  tab === "shelves"
                    ? "bg-deep-forest-teal text-white"
                    : "text-smoke hover:text-midnight-ink"
                }`}
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                Shelves
              </button>
              <button
                type="button"
                onClick={() => setTab("all")}
                className={`rounded-full px-3.5 py-1.5 transition-colors ${
                  tab === "all"
                    ? "bg-deep-forest-teal text-white"
                    : "text-smoke hover:text-midnight-ink"
                }`}
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                All Items
              </button>
            </div>

            <div className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-smoke"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search my library"
                className="w-full rounded-full border border-stone-mist bg-white py-2 pl-10 pr-4 text-midnight-ink outline-none placeholder:text-smoke focus:border-graphite-veil"
                style={{ fontSize: 13, fontWeight: 500 }}
              />
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="hidden shrink-0 items-center gap-1.5 rounded-full border border-midnight-ink bg-lavender-whisper px-3.5 py-2 text-midnight-ink transition-opacity hover:opacity-90 sm:inline-flex"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Add
            </button>
          </div>

          {/* Title */}
          <div className="px-5 pb-2 pt-8 sm:px-10 sm:pt-10">
            <h1
              className="font-eb-garamond"
              style={{
                fontSize: "clamp(40px, 6vw, 64px)",
                lineHeight: 0.9,
                letterSpacing: "-0.05em",
              }}
            >
              <span className="text-graphite-veil">My </span>
              <span className="text-midnight-ink">Library</span>
            </h1>
            <p
              className="mt-2 max-w-md text-smoke"
              style={{ fontSize: 13, lineHeight: 1.4 }}
            >
              A small, warm corner for neuroscience papers, articles, and videos worth remembering.
            </p>
          </div>

          {/* Shelves */}
          <div className="space-y-10 px-5 pb-16 pt-8 sm:px-10 sm:pb-20">
            {loading ? (
              <div className="text-smoke" style={{ fontSize: 13, fontWeight: 500 }}>
                Loading your shelves…
              </div>
            ) : tab === "shelves" ? (
              <>
                <Shelf label="Research Papers" type="paper" items={papers} searching={!!search} />
                <Shelf label="Articles" type="article" items={articles} searching={!!search} />
                <Shelf label="Videos" type="video" items={videos} searching={!!search} />
              </>
            ) : (
              <Shelf
                label="All Items"
                type="paper"
                items={filtered}
                searching={!!search}
                showViewAll={false}
              />
            )}
          </div>
        </main>
      </div>

      <AddItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}

function Sidebar({
  onAdd,
  latest,
}: {
  onAdd: () => void;
  latest: LibraryItem | undefined;
}) {
  const navItems = [
    { icon: Home, label: "Home", active: false },
    { icon: BookMarked, label: "My library", active: true },
    { icon: Tag, label: "Topics", active: false },
    { icon: Plus, label: "Add Item", active: false, onClick: onAdd },
  ];

  return (
    <div className="flex h-full min-h-[calc(100vh-48px)] flex-col justify-between">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-2 px-3 pb-8 pt-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-deep-forest-teal text-white"
            style={{ fontSize: 14, fontWeight: 700 }}
          >
            N
          </div>
          <span
            className="text-midnight-ink"
            style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}
          >
            NeuroShelf
          </span>
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {navItems.map(({ icon: Icon, label, active, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition-colors ${
                active
                  ? "bg-lavender-whisper text-midnight-ink"
                  : "text-smoke hover:bg-white hover:text-midnight-ink"
              }`}
              style={{ fontSize: 14, fontWeight: 500 }}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Continue card */}
      {latest && <ContinueCard item={latest} />}
    </div>
  );
}

function ContinueCard({ item }: { item: LibraryItem }) {
  const Icon =
    item.type === "video" ? Play : item.type === "article" ? Newspaper : FileText;

  return (
    <div className="mt-6 rounded-[20px] border border-stone-mist bg-white p-3">
      <div
        className="mb-2 text-smoke"
        style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}
      >
        Most recent
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center gap-2"
      >
        <div className="relative w-[76px] overflow-hidden rounded-t-[14px] rounded-b-[3px] border border-stone-mist shadow-[0_8px_14px_-10px_rgba(26,26,26,0.55)]">
          <div className="aspect-[2/3] w-full bg-cream-paper">
            {item.thumbnail_url ? (
              <img
                src={item.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-1 text-center">
                <span
                  className="font-eb-garamond text-midnight-ink line-clamp-4"
                  style={{ fontSize: 11, lineHeight: 1.05 }}
                >
                  {item.title}
                </span>
              </div>
            )}
          </div>
          <div className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/95">
            <Icon size={8} className="text-midnight-ink" strokeWidth={2.5} />
          </div>
        </div>
        <div
          className="line-clamp-2 w-full text-center text-midnight-ink"
          style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.25 }}
        >
          {item.title}
        </div>
      </a>
    </div>
  );
}
