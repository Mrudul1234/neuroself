import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  detectMetadata,
  insertItem,
  type DraftItem,
  type ItemType,
} from "@/lib/library";
import { LibraryCard } from "./LibraryCard";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TYPES: { value: ItemType; label: string }[] = [
  { value: "paper", label: "Paper" },
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
];

export function AddItemModal({ open, onClose, onSaved }: Props) {
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<DraftItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setUrl("");
    setDraft(null);
    setError(null);
    setLoading(false);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const result = await detectMetadata(url);
      setDraft(result);
    } catch {
      setError("Couldn't read that link. You can still save it manually.");
      setDraft({
        title: url,
        url,
        thumbnail_url: null,
        type: "article",
        domain: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await insertItem(draft);
      reset();
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      style={{ backgroundColor: "rgba(26,26,26,0.4)" }}
      onClick={handleClose}
    >
      <div
        className="relative my-8 w-full max-w-lg rounded-[32px] border border-stone-mist bg-white p-8 shadow-[0_24px_60px_-20px_rgba(26,26,26,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-stone-mist text-midnight-ink transition-colors hover:bg-cream-paper"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h2
          className="font-eb-garamond text-midnight-ink"
          style={{ fontSize: 40, lineHeight: 0.95, letterSpacing: "-0.04em" }}
        >
          Add to <span className="text-graphite-veil">library</span>
        </h2>
        <p
          className="mt-2 text-smoke"
          style={{ fontSize: 14, lineHeight: 1.3 }}
        >
          Paste a YouTube video, an article URL, or a PDF link.
        </p>

        <form onSubmit={handleFetch} className="mt-6 flex gap-2">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a link (YouTube, article, or PDF)"
            className="flex-1 rounded-[14px] border border-stone-mist bg-cream-paper px-4 py-3 text-midnight-ink outline-none placeholder:text-smoke focus:border-graphite-veil"
            style={{ fontSize: 14, fontWeight: 500 }}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="inline-flex items-center justify-center rounded-[14px] border border-midnight-ink bg-cream-paper px-4 py-3 text-midnight-ink transition-colors hover:bg-stone-mist disabled:opacity-50"
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Fetch"}
          </button>
        </form>

        {error && (
          <div
            className="mt-4 rounded-[14px] border border-stone-mist bg-cream-paper px-4 py-3 text-smoke"
            style={{ fontSize: 13 }}
          >
            {error}
          </div>
        )}

        {draft && (
          <div className="mt-6 space-y-5">
            <div className="flex items-start gap-5">
              <div className="shrink-0">
                <LibraryCard
                  item={{
                    ...draft,
                    id: "preview",
                    created_at: new Date().toISOString(),
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <label
                    className="mb-1 block uppercase text-smoke"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                    }}
                  >
                    Title
                  </label>
                  <input
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                    className="w-full rounded-[14px] border border-stone-mist bg-cream-paper px-3 py-2 text-midnight-ink outline-none focus:border-graphite-veil"
                    style={{ fontSize: 14, fontWeight: 500 }}
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block uppercase text-smoke"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                    }}
                  >
                    Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TYPES.map((t) => {
                      const active = draft.type === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setDraft({ ...draft, type: t.value })}
                          className={`rounded-full border px-4 py-1.5 transition-colors ${
                            active
                              ? "border-midnight-ink bg-deep-forest-teal text-white"
                              : "border-stone-mist bg-white text-midnight-ink hover:bg-cream-paper"
                          }`}
                          style={{ fontSize: 13, fontWeight: 600 }}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-[14px] border border-stone-mist bg-white px-4 py-2.5 text-midnight-ink transition-colors hover:bg-cream-paper"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !draft.title.trim()}
                className="inline-flex items-center gap-2 rounded-[14px] border border-midnight-ink bg-lavender-whisper px-5 py-2.5 text-midnight-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save to library
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
