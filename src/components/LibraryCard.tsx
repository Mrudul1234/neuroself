import {
  FileText,
  Loader2,
  Newspaper,
  Pencil,
  Play,
  Sparkles,
  Trash2,
  X,
  BookOpen,
  Globe,
  Youtube,
  HardDrive,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  deleteItemWithFile,
  getSignedFileUrl,
  type ItemType,
  type LibraryItem,
} from "@/lib/library";
import { EditItemModal } from "./EditItemModal";
import { BookOverlay } from "./BookOverlay";
import { motion } from "framer-motion";
import { VideoModal } from "./VideoModal";
import { generateNeuroShelfCover } from "@/lib/generateCover";

const iconFor: Record<ItemType, typeof FileText> = {
  paper: FileText,
  article: Newspaper,
  video: Play,
};

// Platform detector with premium styling classes
function getPlatformInfo(url: string, storagePath?: string | null) {
  if (storagePath) {
    return {
      name: "Local File",
      icon: FileText,
      color: "bg-[#034f46]/10 text-[#034f46] border-[#034f46]/20",
    };
  }
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return { name: "YouTube", icon: Youtube, color: "bg-red-50 text-red-600 border-red-200" };
  }
  if (lower.includes("nature.com")) {
    return { name: "Nature", icon: BookOpen, color: "bg-red-50 text-red-700 border-red-200" };
  }
  if (lower.includes("ncbi.nlm.nih.gov") || lower.includes("pubmed")) {
    return { name: "PubMed", icon: BookOpen, color: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  if (lower.includes("sciencedirect.com")) {
    return {
      name: "ScienceDirect",
      icon: BookOpen,
      color: "bg-orange-50 text-orange-700 border-orange-200",
    };
  }
  if (lower.includes("ieee.org")) {
    return { name: "IEEE", icon: FileText, color: "bg-cyan-50 text-cyan-700 border-cyan-200" };
  }
  if (lower.includes("springer.com")) {
    return {
      name: "Springer",
      icon: BookOpen,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (lower.includes("arxiv.org")) {
    return { name: "arXiv", icon: BookOpen, color: "bg-red-50 text-[#b31b1b] border-red-200" };
  }
  if (lower.includes("substack.com")) {
    return {
      name: "Substack",
      icon: Newspaper,
      color: "bg-orange-50 text-orange-600 border-orange-200",
    };
  }
  if (lower.includes("medium.com")) {
    return {
      name: "Medium",
      icon: Newspaper,
      color: "bg-stone-100 text-stone-900 border-stone-300",
    };
  }
  if (lower.includes("researchgate.net")) {
    return { name: "ResearchGate", icon: Globe, color: "bg-teal-50 text-teal-600 border-teal-200" };
  }
  if (lower.includes("drive.google.com")) {
    return {
      name: "Google Drive",
      icon: HardDrive,
      color: "bg-green-50 text-green-700 border-green-200",
    };
  }
  if (lower.endsWith(".pdf") || lower.includes("/pdf/")) {
    return { name: "PDF", icon: FileText, color: "bg-rose-50 text-rose-700 border-rose-200" };
  }

  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return { name: domain, icon: Globe, color: "bg-stone-50 text-smoke border-stone-200" };
  } catch {
    return { name: "Web", icon: Globe, color: "bg-stone-50 text-smoke border-stone-200" };
  }
}

interface CardProps {
  item: LibraryItem;
  width?: number;
  onChanged?: () => void;
  previewOnly?: boolean;
}

export function LibraryCard({ item, width = 128, onChanged, previewOnly }: CardProps) {
  const Icon = iconFor[item.type];
  const isVideo = item.type === "video";

  const [opening, setOpening] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [thumb, setThumb] = useState(item.thumbnail_url);

  useEffect(() => {
    setThumb(item.thumbnail_url);
  }, [item.thumbnail_url]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [pressed, setPressed] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0, time: 0 });

  // Close card selection when clicking outside (mobile)
  useEffect(() => {
    if (!isSelected) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        cardRef.current &&
        !cardRef.current.contains(target) &&
        !target.closest(".mobile-glass-capsule")
      ) {
        setIsSelected(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isSelected]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Standard browser tap/click handlers are preferred to prevent open lag
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Standard browser tap/click handlers are preferred to prevent open lag
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".book-reader-overlay")) return;
    setPressed(true);
  };

  const handleMouseUp = () => {
    setPressed(false);
  };

  const cardTransformStyle = pressed ? "scale(0.97)" : "";

  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [thumb]);

  // Gradient fallbacks per item type
  const typeGradients = {
    paper: "linear-gradient(135deg, #e8f0ff, #d0d8f5)",
    article: "linear-gradient(135deg, #e8f0eb, #d0e4d8)",
    video: "linear-gradient(135deg, #e8e0f0, #d0c8e4)",
  };

  const cover = isVideo ? (
    /* --- VIDEO CARD LAYOUT (No book opening) --- */
    <div
      className="video-card-glow group/cover relative w-full overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-[0_10px_18px_-10px_rgba(26,26,26,0.55),0_2px_3px_-1px_rgba(26,26,26,0.25)] transition-all duration-300 ease-out"
      style={{
        aspectRatio: "2 / 3",
        transform: cardTransformStyle || undefined,
      }}
    >
      {regenerating ? (
        <div className="h-full w-full animate-shimmer" />
      ) : thumb && !imageError ? (
        <>
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover/cover:scale-[1.06]"
            style={{
              objectPosition: "center top",
              opacity: imageLoaded ? 1 : 0,
              position: imageLoaded ? "static" : "absolute",
              pointerEvents: imageLoaded ? "auto" : "none",
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {!imageLoaded && <div className="h-full w-full animate-shimmer" />}
        </>
      ) : (
        <div
          className="flex h-full w-full flex-col justify-between px-2 py-3 text-center"
          style={{ background: typeGradients.video }}
        >
          <div />
          <span className="font-instrument italic text-midnight-ink line-clamp-5 px-1 text-[13px] leading-tight">
            {item.title}
          </span>
          <div className="flex justify-center">
            <Play size={16} className="text-[#8a8a80] opacity-80" />
          </div>
        </div>
      )}

      {/* Translucent overlay with pulsing play button */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover/cover:bg-black/35">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-midnight-ink shadow-lg play-icon-pulse transition-transform group-hover/cover:scale-110">
          <Play size={20} fill="currentColor" className="ml-1" />
        </div>
      </div>

      {/* Paper grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.7) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
      {/* Sheen effect */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover/cover:translate-x-full" />
    </div>
  ) : (
    /* --- ARTICLE & PAPER 3D BOOK LAYOUT --- */
    (() => {
      const W = width;
      const H = Math.round(width * 1.5);
      const spineW = Math.round(width * 0.12);

      return (
        <div 
          className="book-container-3d group/cover relative overflow-visible"
          style={{ width: W, height: H, perspective: "1000px" }}
        >
          <div
            className="book-3d relative w-full h-full rounded-[4px] transition-all duration-500 ease-out"
            style={{
              transformStyle: "preserve-3d",
              boxShadow: "5px 5px 12px rgba(0,0,0,0.25)",
            }}
          >
            {/* Front side of the book (translated forward by spineW/2) */}
            <div
              className="absolute inset-0 rounded-[4px] overflow-hidden border border-black/10 bg-white"
              style={{
                transform: `translate3d(0, 0, ${spineW / 2}px)`,
                transformStyle: "preserve-3d",
                zIndex: 10,
              }}
            >
              {regenerating ? (
                <div className="h-full w-full animate-shimmer" />
              ) : thumb && !imageError ? (
                <>
                  <img
                    src={thumb}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover/cover:scale-[1.04]"
                    style={{
                      objectPosition: "center top",
                      opacity: imageLoaded ? 1 : 0,
                      position: imageLoaded ? "static" : "absolute",
                      pointerEvents: imageLoaded ? "auto" : "none",
                    }}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                  />
                  {!imageLoaded && <div className="h-full w-full animate-shimmer" />}
                </>
              ) : (
                <div
                  className="flex h-full w-full flex-col justify-between px-2 py-3 text-center"
                  style={{ background: typeGradients[item.type] || typeGradients.paper }}
                >
                  <div />
                  <span className="font-instrument italic text-midnight-ink line-clamp-5 px-1 text-[13px] leading-tight">
                    {item.title}
                  </span>
                  <div className="flex justify-center">
                    <Icon size={16} className="text-[#8a8a80] opacity-80" />
                  </div>
                </div>
              )}

              {/* Paper grain */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
                style={{
                  backgroundImage: "radial-gradient(rgba(0,0,0,0.7) 1px, transparent 1px)",
                  backgroundSize: "3px 3px",
                }}
              />
              {/* Type pill */}
              <div className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/95 shadow-sm">
                <Icon size={8} className="text-midnight-ink" strokeWidth={2.5} />
              </div>
              {/* Glossy sheen */}
              <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover/cover:translate-x-full" />
            </div>

            {/* Left side of the book (spine) */}
            <div
              className="absolute top-0 bottom-0 overflow-hidden flex items-center justify-center border-y border-black/10"
              style={{
                width: spineW,
                left: -spineW / 2,
                backgroundColor: "#e2dee4",
                transform: "rotate3d(0, 1, 0, -90deg)",
                zIndex: 5,
                boxShadow: "inset -2px 0 5px rgba(0,0,0,0.15)",
              }}
            >
              <div
                className="whitespace-nowrap font-instrument text-midnight-ink opacity-70 font-medium select-none"
                style={{
                  transform: "rotate(90deg)",
                  fontSize: Math.max(8, Math.round(W * 0.075)),
                  width: H,
                  textAlign: "center",
                }}
              >
                <span>{item.domain || "Archive"}</span>
                <span className="mx-2 opacity-40">|</span>
                <span className="font-semibold truncate max-w-[80px] inline-block align-middle">{item.title}</span>
              </div>
            </div>
          </div>
        </div>
      );
    })()
  );

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteItemWithFile(item);
      toast.success("Removed.");
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? `Delete failed: ${err.message}` : "Delete failed.");
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
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("library_items").update({ thumbnail_url: url }).eq("id", item.id);
        toast.success("New cover generated ✓", { id: `cover-${item.id}` });
        onChanged?.();
      } else {
        throw new Error("Generation returned empty URL");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cover generation failed.", {
        id: `cover-${item.id}`,
      });
    } finally {
      setRegenerating(false);
    }
  };

  // Actions menu classes for desktop (prevents clipping)
  const showActionsDesktop =
    "hidden md:flex opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto";

  if (previewOnly) {
    return (
      <div className="flex flex-col items-center select-none" style={{ width }}>
        {cover}
        <div
          className="mt-2.5 library-title-wrap w-full text-center font-instrument text-midnight-ink"
          style={{ fontSize: 13, fontWeight: 500, padding: "0 2px" }}
        >
          {item.title}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="group relative flex shrink-0 flex-col items-center select-none overflow-visible"
      style={{ width }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Desktop Hover Action Menu (positioned above the card) */}
      <div
        className={`absolute -top-6 left-1/2 -translate-x-1/2 z-30 gap-1.5 p-1 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-stone-mist/60 ${showActionsDesktop}`}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-midnight-ink shadow-md ring-1 ring-black/10 transition-transform active:scale-95 hover:bg-amber-pulse disabled:opacity-60 cursor-pointer"
          title="Generate AI cover"
          aria-label="Generate AI cover"
        >
          {regenerating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={12} />}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-midnight-ink shadow-md ring-1 ring-black/10 transition-transform active:scale-95 hover:bg-cream-paper cursor-pointer"
          title="Edit"
          aria-label="Edit item"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-destructive shadow-md ring-1 ring-black/10 transition-transform active:scale-95 hover:bg-destructive hover:text-white cursor-pointer"
          title="Remove"
          aria-label="Remove item"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>

      {/* Card Button Wrapper */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isEditing || confirming) return;

          if (isVideo) {
            setIsVideoOpen(true);
          } else {
            setIsBookOpen(true);
          }
        }}
        title={item.title}
        className="block w-full text-left outline-none cursor-pointer"
      >
        {cover}
      </button>

      {/* Typography with Ellipsis prevention, proper spacing */}
      <div
        className="mt-2.5 library-title-wrap w-full text-center font-instrument text-midnight-ink transition-colors group-hover:text-deep-forest-teal"
        style={{ fontSize: 13, fontWeight: 500, padding: "0 2px" }}
      >
        {item.title}
      </div>

      {/* Dynamic Platform Badge Instead of Raw URLs */}
      <div className="mt-1.5 flex justify-center w-full">
        {(() => {
          const platform = getPlatformInfo(item.url, item.storage_path);
          const PlatformIcon = platform.icon;
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-medium tracking-wide uppercase transition-all shadow-sm ${platform.color}`}
            >
              <PlatformIcon size={8} className="shrink-0" />
              {platform.name}
            </span>
          );
        })()}
      </div>

      {/* Mobile Card Actions (Generate Cover, Edit, Remove) */}
      <div className="flex md:hidden items-center justify-center gap-4 mt-3 z-20">
        {/* Generate cover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void handleRegenerate(e);
          }}
          disabled={regenerating}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-pulse/10 text-amber-pulse shadow-sm border border-amber-pulse/20 active:scale-90 disabled:opacity-50 cursor-pointer"
          aria-label="Generate cover"
        >
          {regenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        </button>

        {/* Edit */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fbf9f6] text-midnight-ink shadow-sm border border-stone-mist active:scale-90 cursor-pointer"
          aria-label="Edit item"
        >
          <Pencil size={13} />
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-destructive shadow-sm border border-red-100 active:scale-90 cursor-pointer"
          aria-label="Remove item"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Confirm delete dialog — Portaled to body */}
      {confirming &&
        createPortal(
          <div
            className="fixed inset-0 z-[250] flex items-center justify-center bg-midnight-ink/55 p-4 animate-in fade-in"
            onClick={() => !deleting && setConfirming(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[24px] border border-stone-mist bg-white p-6 shadow-2xl animate-in zoom-in-95"
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
                  className="rounded-full border border-stone-mist bg-white px-4 py-2 text-sm font-semibold text-midnight-ink hover:bg-cream-paper disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
                >
                  {deleting && <Loader2 size={13} className="animate-spin" />}
                  Remove
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Edit dialog — Portaled to body */}
      <EditItemModal
        open={isEditing}
        item={item}
        onClose={() => setIsEditing(false)}
        onSaved={() => onChanged?.()}
      />

      {/* Premium 3D Book overlay */}
      <BookOverlay open={isBookOpen} item={item} onClose={() => setIsBookOpen(false)} />

      {/* Premium Video Modal */}
      <VideoModal open={isVideoOpen} item={item} onClose={() => setIsVideoOpen(false)} />
    </motion.div>
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
