import { Link } from "@tanstack/react-router";
import {
  FileText,
  Loader2,
  Newspaper,
  Pencil,
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
import { EditItemModal } from "./EditItemModal";
import { PdfReader } from "./PdfReader";

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
  const [editing, setEditing] = useState(false);
  
  // Mobile / Interaction Touch states
  const [touched, setTouched] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [pdfReaderOpen, setPdfReaderOpen] = useState(false);

  const handleTouchStart = () => {
    setPressed(true);
    setTouched(true);
    // Tactile press feeling: scale down, then spring lift after 80ms
    setTimeout(() => {
      setPressed(false);
    }, 80);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Only dismiss actions after 1500ms to allow users time to tap top action bar buttons
    setTimeout(() => {
      setTouched(false);
    }, 1500);
  };

  const handleMouseDown = () => {
    setPressed(true);
  };

  const handleMouseUp = () => {
    setPressed(false);
  };

  // Lift tilt configurations matching user spec
  const cardTransformStyle = pressed
    ? "scale(0.97)"
    : touched
      ? "translateY(-12px) rotate3d(1, 0.2, 0, 8deg) scale(1.02)"
      : "";

  const [imageError, setImageError] = useState(false);

  // Gradient fallbacks per item type
  const typeGradients = {
    paper: "linear-gradient(135deg, #f0ebe0, #e4ddd0)",
    article: "linear-gradient(135deg, #e8f0eb, #d0e4d8)",
    video: "linear-gradient(135deg, #e8e0f0, #d0c8e4)",
  };

  const cover = (
    <div
      className="group/cover relative w-full overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-[0_10px_18px_-10px_rgba(26,26,26,0.55),0_2px_3px_-1px_rgba(26,26,26,0.25)] transition-all duration-300 ease-out will-change-transform group-hover:-translate-y-2 group-hover:rotate-[-0.6deg] group-hover:shadow-[0_28px_38px_-16px_rgba(26,26,26,0.55),0_6px_8px_-2px_rgba(26,26,26,0.28)]"
      style={{
        aspectRatio: "2 / 3",
        transform: cardTransformStyle || undefined,
        transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), shadow 0.25s ease-out",
      }}
    >
      {regenerating ? (
        /* Shimmer loading for regeneration */
        <div
          className="h-full w-full"
          style={{
            background: "linear-gradient(90deg, #e4e4d0 25%, #f0ebe0 50%, #e4e4d0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }}
        />
      ) : thumb && !imageError ? (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          onError={() => setImageError(true)}
        />
      ) : (
        /* Render Gradient Fallback */
        <div
          className="flex h-full w-full flex-col justify-between px-2 py-3 text-center"
          style={{ background: typeGradients[item.type] || typeGradients.paper }}
        >
          <div />
          <span
            className="font-instrument italic text-midnight-ink line-clamp-5 px-1"
            style={{ fontSize: 13, lineHeight: 1.08, letterSpacing: "-0.02em" }}
          >
            {item.title}
          </span>
          <div className="flex justify-center">
            <Icon size={16} className="text-[#8a8a80] opacity-80" />
          </div>
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
      setSignedPdfUrl(url);
      setPdfReaderOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? `Couldn't open PDF: ${err.message}` : "Couldn't open PDF.",
      );
    } finally {
      setOpening(false);
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
      const url = await generateNeuroShelfCover(item.title, item.type, "flux");
      if (url) {
        setThumb(url);
        // Save new thumbnail to database
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("library_items").update({ thumbnail_url: url }).eq("id", item.id);
        toast.success("New cover generated ✓", { id: `cover-${item.id}` });
        onChanged?.();
      } else {
        throw new Error("Generation returned empty URL");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Cover generation failed.",
        { id: `cover-${item.id}` },
      );
    } finally {
      setRegenerating(false);
    }
  };

  const showActions = touched ? "opacity-100 pointer-events-auto" : "opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto";

  return (
    <div
      className="group relative flex shrink-0 flex-col items-center select-none"
      style={{ width }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Hover/Tap actions */}
      <div className={`absolute -top-3 -right-2 z-20 flex gap-1.5 p-2 ${showActions}`}>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-midnight-ink shadow-md ring-1 ring-black/10 transition-transform active:scale-95 md:h-7 md:w-7 hover:bg-amber-pulse disabled:opacity-60"
          title="Generate AI cover"
          aria-label="Generate AI cover"
        >
          {regenerating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={13} />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEditing(true);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-midnight-ink shadow-md ring-1 ring-black/10 transition-transform active:scale-95 md:h-7 md:w-7 hover:bg-cream-paper"
          title="Edit"
          aria-label="Edit item"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-destructive shadow-md ring-1 ring-black/10 transition-transform active:scale-95 md:h-7 md:w-7 hover:bg-destructive hover:text-white"
          title="Remove"
          aria-label="Remove item"
        >
          <X size={14} strokeWidth={2.5} />
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

      {/* Edit dialog */}
      <EditItemModal
        open={editing}
        item={item}
        onClose={() => setEditing(false)}
        onSaved={onChanged}
      />

      {/* Full screen PDF Reader overlay */}
      {pdfReaderOpen && signedPdfUrl && (
        <PdfReader
          url={signedPdfUrl}
          title={item.title}
          onClose={() => setPdfReaderOpen(false)}
        />
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
