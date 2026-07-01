import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  detectMetadata,
  insertItem,
  uploadPdfFile,
  type DraftItem,
  type ItemType,
} from "@/lib/library";
import { LibraryCard } from "./LibraryCard";
import { generateNeuroShelfCover } from "@/lib/generateCover";
import { extractPdfPyMuPdfServer } from "@/lib/library.functions";

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

type Mode = "url" | "file";

export function AddItemModal({ open, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<DraftItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [imageModel, setImageModel] = useState("flux");
  const fileInput = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setUrl("");
    setDraft(null);
    setError(null);
    setLoading(false);
    setSaving(false);
    setProgress(0);
    setMode("url");
    setGeneratingCover(false);
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
    setGeneratingCover(true);
    try {
      const result = await detectMetadata(url);
      setDraft(result);

      // YT oEmbed Skip check
      const isYoutube = /youtube\.com|youtu\.be/i.test(url);
      if (isYoutube && result.thumbnail_url) {
        // use YouTube thumbnail directly, don't run AI generation unless it fails
        setGeneratingCover(false);
        return;
      }

      // Trigger cover generation pipeline
      const coverUrl = await generateNeuroShelfCover(result.title, result.type, imageModel);
      if (coverUrl) {
        setDraft((prev) => (prev ? { ...prev, thumbnail_url: coverUrl } : null));
      }
    } catch (err) {
      setError("Couldn't read that link. You can still save it manually.");
      const fallbackDraft: DraftItem = {
        title: url,
        url,
        thumbnail_url: null,
        type: "article",
        domain: null,
      };
      setDraft(fallbackDraft);

      // Generate cover for manual input
      const coverUrl = await generateNeuroShelfCover(url, "article", imageModel);
      if (coverUrl) {
        setDraft((prev) => (prev ? { ...prev, thumbnail_url: coverUrl } : null));
      }
    } finally {
      setLoading(false);
      setGeneratingCover(false);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    setProgress(0);
    setGeneratingCover(true);
    try {
      const { path, size } = await uploadPdfFile(file, setProgress);
      // Clean up title: strip ext, strip spaces/hyphens/underscores, strip bracketed numbers
      const cleanTitle = file.name
        .replace(/\.pdf$/i, "")
        .replace(/\[\d+\]/g, "")
        .replace(/[-_]+/g, " ")
        .trim();

      // User requested NOT to extract text/iframe, just open PDF directly, so we skip PyMuPDF extraction
      const extractedText: string | null = null;

      const initialDraft: DraftItem = {
        title: cleanTitle,
        url: `lovable://library-files/${path}`,
        thumbnail_url: null,
        type: "paper",
        domain: null,
        storage_path: path,
        file_size: size,
        extracted_text: extractedText,
      };
      setDraft(initialDraft);
      toast.success("PDF uploaded and parsed with PyMuPDF — review and save.");

      // Trigger cover generation pipeline
      const coverUrl = await generateNeuroShelfCover(cleanTitle, "paper", imageModel);
      if (coverUrl) {
        setDraft((prev) => (prev ? { ...prev, thumbnail_url: coverUrl } : null));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setError(msg);
      toast.error(`Upload failed: ${msg}`);
    } finally {
      setLoading(false);
      setGeneratingCover(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await insertItem(draft);
      toast.success("Added to your library.");
      reset();
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save.";
      setError(msg);
      toast.error(`Save failed: ${msg}`);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      style={{ backgroundColor: "rgba(26,26,26,0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="relative my-8 w-full max-w-lg rounded-[28px] border border-stone-mist bg-white p-7 shadow-[0_24px_60px_-20px_rgba(26,26,26,0.45)] animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute right-5 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-stone-mist text-midnight-ink transition-colors hover:bg-cream-paper"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h2
          className="font-instrument text-midnight-ink"
          style={{ fontSize: 36, lineHeight: 0.95, letterSpacing: "-0.04em" }}
        >
          Add to <span className="text-graphite-veil">library</span>
        </h2>

        {/* Mode tabs */}
        <div className="mt-5 inline-flex rounded-full bg-cream-paper p-1 ring-1 ring-stone-mist">
          {(["url", "file"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setDraft(null);
                setError(null);
              }}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                mode === m ? "bg-midnight-ink text-white" : "text-smoke hover:text-midnight-ink"
              }`}
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {m === "url" ? "Paste link" : "Upload PDF"}
            </button>
          ))}
        </div>

        {mode === "url" ? (
          <form onSubmit={handleFetch} className="mt-4 flex gap-2">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="YouTube, article, or PDF URL"
              className="flex-1 rounded-[14px] border border-stone-mist bg-cream-paper px-4 py-3 text-midnight-ink outline-none placeholder:text-smoke focus:border-graphite-veil"
              style={{ fontSize: 14, fontWeight: 500 }}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="inline-flex items-center justify-center rounded-[14px] border border-midnight-ink bg-cream-paper px-4 py-3 text-midnight-ink hover:bg-stone-mist disabled:opacity-50"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Fetch"}
            </button>
          </form>
        ) : (
          <div className="mt-4">
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              className="opacity-0 absolute pointer-events-none w-0 h-0"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={loading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed border-stone-mist bg-cream-paper px-6 py-10 text-midnight-ink transition-colors hover:border-graphite-veil disabled:opacity-50"
            >
              <Upload size={20} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {loading ? `Uploading… ${progress}%` : "Choose a PDF"}
              </span>
              <span className="text-smoke" style={{ fontSize: 12 }}>
                Any size. Stored privately in your library.
              </span>
            </button>
            {loading && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-mist">
                <div
                  className="h-full bg-midnight-ink transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

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
              <div className="relative shrink-0" style={{ width: 104 }}>
                {generatingCover ? (
                  <div className="w-full">
                    {/* Shimmer Cover */}
                    <div
                      className="w-full rounded-[10px] border border-black/10 shadow-sm"
                      style={{
                        aspectRatio: "2 / 3",
                        background: "linear-gradient(90deg, #e4e4d0 25%, #f0ebe0 50%, #e4e4d0 75%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s infinite",
                      }}
                    />
                    <style>{`
                      @keyframes shimmer {
                        0% { background-position: -200% 0 }
                        100% { background-position: 200% 0 }
                      }
                      @keyframes pulseText {
                        0%, 100% { opacity: 0.6 }
                        50% { opacity: 1 }
                      }
                      .pulse-opacity {
                        animation: pulseText 2s infinite ease-in-out;
                      }
                    `}</style>
                    <div className="text-[12px] font-figtree italic text-[#5f5f59] mt-2 text-center pulse-opacity leading-tight">
                      ✦ Claude is crafting your cover...
                    </div>
                  </div>
                ) : (
                  <LibraryCard
                    item={{
                      ...draft,
                      id: "preview",
                      created_at: new Date().toISOString(),
                    }}
                    width={104}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <label
                    className="mb-1 block uppercase text-smoke"
                    style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}
                  >
                    Title
                  </label>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full rounded-[12px] border border-stone-mist bg-cream-paper px-3 py-2 text-midnight-ink outline-none focus:border-graphite-veil"
                    style={{ fontSize: 14, fontWeight: 500 }}
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block uppercase text-smoke"
                    style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}
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
                          className={`rounded-full border px-4 py-1.5 ${
                            active
                              ? "border-midnight-ink bg-midnight-ink text-white"
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

                {/* Model Selector Dropdown */}
                <div>
                  <label
                    className="mb-1.5 block uppercase text-smoke"
                    style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}
                  >
                    Cover Style Quality
                  </label>
                  <select
                    name="imageModel"
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="w-full rounded-[12px] border border-stone-mist bg-cream-paper px-3 py-2 text-midnight-ink outline-none focus:border-graphite-veil"
                    style={{ fontSize: 13, fontWeight: 500 }}
                  >
                    <option value="flux">Fast (Flux)</option>
                    <option value="gptimage-large">High Quality (GPT Image)</option>
                    <option value="ideogram-v4-quality">Artistic (Ideogram)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-stone-mist bg-white px-4 py-2.5 text-midnight-ink hover:bg-cream-paper"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || generatingCover || !draft.title.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-midnight-ink px-5 py-2.5 text-white hover:opacity-90 disabled:opacity-50"
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
