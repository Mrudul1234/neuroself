import { Link } from "@tanstack/react-router";
import {
  FileText,
  Loader2,
  Newspaper,
  Play,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteItemWithFile,
  generateCover,
  getSignedFileUrl,
  type ItemType,
  type LibraryItem,
} from "@/lib/library";

const iconFor: Record<ItemType, typeof FileText> = {
  paper: FileText,
  article: Newspaper,
  video: Play,
};

interface CardProps {
  item: LibraryItem;
  width?: number;
  onChanged?: () => void;
}

export function LibraryCard({ item, width = 128, onChanged }: CardProps) {
  const Icon = iconFor[item.type];
  const isExternalVideo = item.type === "video";
  const isStoredPdf = !!item.storage_path;
  const isExternalPdf = !isStoredPdf && /\.pdf(\?|$)/i.test(item.url);
  const opensInNewTab = isExternalVideo || isStoredPdf || isExternalPdf;

  const [opening, setOpening] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [thumb, setThumb] = useState(item.thumbnail_url);

  const cover = (
    <div
      className="group/cover relative w-full overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-[0_10px_18px_-10px_rgba(26,26,26,0.55),0_2px_3px_-1px_rgba(26,26,26,0.25)] transition-all duration-300 ease-out will-change-transform group-hover:-translate-y-2 group-hover:rotate-[-0.6deg] group-hover:shadow-[0_28px_38px_-16px_rgba(26,26,26,0.55),0_6px_8px_-2px_rgba(26,26,26,0.28)]"
      style={{ aspectRatio: "2 / 3" }}
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-between bg-gradient-to-b from-cream-paper to-[#f7efd8] px-2 py-2 text-center">
          <div />
          <span
            className="font-instrument italic text-midnight-ink line-clamp-5"
            style={{ fontSize: 13, lineHeight: 1.08, letterSpacing: "-0.02em" }}
          >
            {item.title}
          </span>
          <div className="mx-auto h-[2px] w-6 rounded-full bg-midnight-ink/30" />
        </div>
      )}
      {/* paper grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.7) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
      {/* type pill */}
      <div className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/95 shadow-sm">
        <Icon size={8} className="text-midnight-ink" strokeWidth={2.5} />
      </div>
      {/* book spine shadow */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.32), rgba(0,0,0,0))",
        }}
      />
      {/* glossy sheen on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      {/* opening overlay */}
      {opening && (
        <div className="absolute inset-0 flex items-center justify-center bg-midnight-ink/40 backdrop-blur-[2px] animate-in fade-in">
          <Loader2 size={18} className="animate-spin text-white" />
        </div>
      )}
    </div>
  );

  const handleOpenStored = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (opening) return;
    setOpening(true);
    try {
      const url = await getSignedFileUrl(item.storage_path!);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(
        err instanceof Error ? `Couldn't open PDF: ${err.message}` : "Couldn't open PDF.",
      );
    } finally {
      // Small delay so the user sees the spinner briefly.
      setTimeout(() => setOpening(false), 400);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteItemWithFile(item);
      toast.success("Removed.");
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? `Delete failed: ${err.message}` : "Delete failed.",
      );
      setDeleting(false);
      setConfirming(false);
    }
  };

  const handleRegenerate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (regenerating) return;
    setRegenerating(true);
    toast.loading("Generating cover…", { id: `cover-${item.id}` });
    try {
      const url = await generateCover(item);
      setThumb(url);
      toast.success("Cover ready.", { id: `cover-${item.id}` });
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Cover generation failed.",
        { id: `cover-${item.id}` },
      );
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="group relative flex shrink-0 flex-col items-center" style={{ width }}>
      {/* Hover actions */}
      <div className="pointer-events-none absolute -top-2 right-0 z-10 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white text-midnight-ink shadow-md ring-1 ring-black/10 transition-transform hover:scale-110 hover:bg-amber-pulse disabled:opacity-60"
          title="Generate AI cover"
          aria-label="Generate AI cover"
        >
          {regenerating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white text-destructive shadow-md ring-1 ring-black/10 transition-transform hover:scale-110 hover:bg-destructive hover:text-white"
          title="Remove"
          aria-label="Remove item"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>

      {isStoredPdf ? (
        <a href="#" onClick={handleOpenStored} title={item.title} className="block w-full">
          {cover}
        </a>
      ) : opensInNewTab ? (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          title={item.title}
          className="block w-full"
        >
          {cover}
        </a>
      ) : (
        <Link to="/read/$id" params={{ id: item.id }} title={item.title} className="block w-full">
          {cover}
        </Link>
      )}
      <div
        className="mt-2 line-clamp-2 w-full text-center font-instrument text-midnight-ink transition-colors group-hover:text-deep-forest-teal"
        style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.15, letterSpacing: "-0.01em" }}
      >
        {item.title}
      </div>
      {item.domain && (
        <div
          className="mt-0.5 line-clamp-1 w-full text-center uppercase text-graphite-veil"
          style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em" }}
        >
          {item.domain}
        </div>
      )}

      {/* Confirm dialog */}
      {confirming && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-midnight-ink/45 p-4 animate-in fade-in"
          onClick={() => !deleting && setConfirming(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[20px] border border-stone-mist bg-white p-6 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 size={16} />
              </div>
              <div className="min-w-0">
                <h3
                  className="font-instrument text-midnight-ink"
                  style={{ fontSize: 22, letterSpacing: "-0.02em" }}
                >
                  Remove this item?
                </h3>
                <p className="mt-1 text-sm text-smoke line-clamp-2">{item.title}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-full border border-stone-mist bg-white px-4 py-2 text-sm font-semibold text-midnight-ink hover:bg-cream-paper disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {deleting && <Loader2 size={13} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function EmptyCard({ label, width = 120 }: { label: string; width?: number }) {
  return (
    <div className="flex shrink-0 flex-col items-center" style={{ width }}>
      <div
        className="flex w-full items-center justify-center rounded-[10px] border-2 border-dashed border-stone-mist bg-white/40 p-2 text-center"
        style={{ aspectRatio: "2 / 3" }}
      >
        <span className="text-smoke" style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3 }}>
          {label}
        </span>
      </div>
    </div>
  );
}
