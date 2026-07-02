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
import { useState, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  deleteItemWithFile,
  getSignedFileUrl,
  type ItemType,
  type LibraryItem,
} from "@/lib/library";
import { EditItemModal } from "./EditItemModal";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { generateNeuroShelfCover } from "@/lib/generateCover";
import { PosterCard } from "./PosterCard";

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
  isPinboard?: boolean;
  index?: number;
}

function PushPin({ color = "#ef4444" }: { color?: string }) {
  const gradientId = `pin-grad-${color.replace("#", "")}`;
  const darkerColors: Record<string, string> = {
    "#ef4444": "#991b1b",
    "#f59e0b": "#92400e",
    "#3b82f6": "#1e3a8a",
    "#10b981": "#065f46",
    "#9c27b0": "#4a0072",
  };
  const darker = darkerColors[color] || "#2b2b2b";

  return (
    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 filter drop-shadow-[2px_4px_3px_rgba(0,0,0,0.38)] pointer-events-none">
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={gradientId} cx="35%" cy="30%" r="55%" fx="35%" fy="30%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="25%" stopColor={color} />
            <stop offset="100%" stopColor={darker} />
          </radialGradient>
        </defs>

        {/* Metal pin shaft */}
        <path d="M9.5 9.5 L10.5 9.5 L10.5 15.5 L9.5 15.5 Z" fill="#b0b5bc" />
        <path d="M9.8 15.5 L10.2 15.5 L10 18 L9.8 15.5 Z" fill="#71767a" />

        {/* Pin base (cylindrical grip part) */}
        <rect x="7.5" y="7" width="5" height="2.5" rx="0.8" fill={color} />
        <rect x="7.5" y="7" width="5" height="1" rx="0.4" fill="#ffffff" opacity="0.3" />

        {/* Pin head (glossy sphere) */}
        <circle cx="10" cy="5" r="4.5" fill={`url(#${gradientId})`} />

        {/* Inner glow highlight */}
        <circle cx="9.2" cy="4" r="1.2" fill="#ffffff" opacity="0.7" />
      </svg>
    </div>
  );
}

export const LibraryCard = memo(function LibraryCard({
  item,
  width = 128,
  onChanged,
  previewOnly,
  isPinboard,
  index,
}: CardProps) {
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
  const [isOverlayActive, setIsOverlayActive] = useState(false);

  // Unconditional Framer Motion hooks for pinboard scroll sway & lift shadow
  const { scrollY } = useScroll();
  const rotation =
    (index ?? 0) % 2 === 0 ? 1.2 + ((index ?? 0) % 3) * 0.4 : -1.2 - ((index ?? 0) % 3) * 0.4;
  const speedMultiplier = 0.05 + ((index ?? 0) % 3) * 0.03;
  const directionMultiplier = (index ?? 0) % 2 === 0 ? 1 : -1;
  const maxSway = 3.5;

  const rawSway = useTransform(
    scrollY,
    [0, 300, 600, 900],
    [
      rotation,
      rotation + maxSway * directionMultiplier * speedMultiplier * 10,
      rotation - maxSway * directionMultiplier * speedMultiplier * 10,
      rotation + maxSway * 0.5 * directionMultiplier * speedMultiplier * 10,
    ],
  );
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { margin: "200px" });

  const sway = useSpring((isMobile || !isInView ? rotation : rawSway) as any, { stiffness: 60, damping: 20 });

  const shadowOpacity = useTransform(sway, (val: any) => {
    const diff = Math.abs(val - rotation);
    const factor = Math.min(diff / maxSway, 1); // 0 at rest, 1 at max sway
    return 0.16 + factor * 0.3; // Maps to ~0.16 -> 0.46
  });

  const [pressed, setPressed] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0, time: 0 });

  // Close overlay when clicking outside
  useEffect(() => {
    if (!isOverlayActive) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (cardRef.current && !cardRef.current.contains(target)) {
        setIsOverlayActive(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOverlayActive]);

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

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEditing || confirming) return;
    if (isPinboard) {
      void handleOpenContent(e);
    } else {
      // Toggle overlay on mobile/touch only
      const isMobileOrTouch =
        typeof window !== "undefined" &&
        (window.innerWidth < 768 || !window.matchMedia("(hover: hover)").matches);
      if (isMobileOrTouch) {
        setIsOverlayActive((v) => !v);
      }
    }
  };

  const handleOpenContent = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOverlayActive(false);
    try {
      let targetUrl = item.url;
      if (item.storage_path) {
        const { getSignedFileUrl } = await import("@/lib/library");
        targetUrl = await getSignedFileUrl(item.storage_path);
      }
      if (targetUrl) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Document link not available.");
      }
    } catch {
      toast.error("Could not resolve document link.");
    }
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

  const inlineOverlay = (
    <div
      className={`inline-action-overlay absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-[inherit] ${
        isOverlayActive ? "is-active" : ""
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close X (only visible on mobile/touch click-to-reveal) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOverlayActive(false);
        }}
        className="close-btn absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white/90 hover:bg-white/30 transition-colors"
        aria-label="Close"
      >
        <X size={11} strokeWidth={2.5} />
      </button>

      {/* View */}
      <button
        type="button"
        onClick={handleOpenContent}
        className="flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-midnight-ink shadow-md hover:bg-white transition-colors text-[11px] font-semibold"
      >
        <BookOpen size={12} />
        View
      </button>

      {/* Edit */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOverlayActive(false);
          setIsEditing(true);
        }}
        className="flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-midnight-ink shadow-md hover:bg-white transition-colors text-[11px] font-semibold"
      >
        <Pencil size={12} />
        Edit
      </button>

      {/* Generate Cover */}
      <button
        type="button"
        onClick={(e) => {
          setIsOverlayActive(false);
          handleRegenerate(e);
        }}
        disabled={regenerating}
        className="flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-midnight-ink shadow-md hover:bg-white transition-colors text-[11px] font-semibold disabled:opacity-60"
      >
        {regenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        Generate
      </button>
    </div>
  );

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
        <PosterCard title={item.title} subtitle="Video" index={index ?? 0} />
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

      {inlineOverlay}
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
                <PosterCard title={item.title} subtitle={item.type} index={index ?? 0} />
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

              {inlineOverlay}
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
                <span className="font-semibold truncate max-w-[80px] inline-block align-middle">
                  {item.title}
                </span>
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

  if (isPinboard) {
    const noteColors = [
      "#fefbeb", // Cream
      "#f0f6ff", // Blue
      "#f0fdf4", // Green
      "#fdf2f8", // Pink
    ];
    const bg = noteColors[(index ?? 0) % noteColors.length];
    const pinColors = ["#ef4444", "#f59e0b", "#10b981", "#9c27b0"];
    const pinColor = pinColors[(index ?? 0) % pinColors.length];
    const platform = getPlatformInfo(item.url, item.storage_path);
    const PlatformIcon = platform.icon;
    const coverImg = thumb || "/placeholder.svg";

    return (
      <motion.div
        layout
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: (index ?? 0) * 0.04,
        }}
        whileHover={{
          scale: 1.03,
          y: -4,
          zIndex: 10,
        }}
        whileTap={{
          scale: 0.98,
        }}
        className="relative flex flex-col rounded-[4px] p-2 select-none cursor-pointer border border-black/[0.04] overflow-visible"
        style={{
          width: "100%",
          maxWidth: `${width}px`,
          background: bg,
          transformOrigin: "50% 8px",
          rotate: sway,
          willChange: isInView ? "transform" : "auto",
        }}
        onClick={handleCardClick}
      >
        {/* GPU-accelerated animated shadow */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[4px]"
          style={{
            opacity: shadowOpacity,
            boxShadow: "0 11px 18px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.08)",
          }}
        />

        {/* Glossy 3D Pushpin */}
        <PushPin color={pinColor} />

        {/* Polaroid Image Wrapper */}
        <div className="relative aspect-square w-full rounded-[2px] overflow-hidden border border-black/[0.08] bg-stone-100/50">
          {thumb && !imageError ? (
            <>
              <img
                src={coverImg}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-opacity duration-500"
                style={{
                  opacity: imageLoaded ? 1 : 0,
                  position: imageLoaded ? "static" : "absolute",
                }}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
              {!imageLoaded && <div className="h-full w-full animate-shimmer bg-stone-200" />}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <Icon size={24} className="text-stone-400 opacity-60" />
            </div>
          )}
        </div>

        {/* Polaroid Text & Info Strip */}
        <div className="mt-2 px-1 flex flex-col justify-between flex-grow">
          <div
            className="font-caveat font-semibold text-midnight-ink leading-tight line-clamp-2 text-left"
            style={{ fontSize: "14px", minHeight: "36px" }}
          >
            {item.title}
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[8px] font-bold text-midnight-ink/55 uppercase tracking-wider font-sans text-left">
            <PlatformIcon size={9} className="shrink-0" />
            {platform.name}
          </div>
        </div>

        {/* Edit dialog — Portaled to body */}
        <EditItemModal
          open={isEditing}
          item={item}
          onClose={() => setIsEditing(false)}
          onSaved={() => onChanged?.()}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.9, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative flex shrink-0 flex-col items-center select-none overflow-visible"
      style={{ width }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Card Button Wrapper */}
      <button
        type="button"
        onClick={handleCardClick}
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
    </motion.div>
  );
});

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
