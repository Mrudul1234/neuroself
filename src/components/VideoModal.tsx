import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { LibraryItem } from "@/lib/library";

interface Props {
  open: boolean;
  item: LibraryItem | null;
  onClose: () => void;
}

export function VideoModal({ open, item, onClose }: Props) {
  const [shouldRender, setShouldRender] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setShouldRender(false);
      onClose();
      document.body.style.overflow = "";
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (open && item) {
      setShouldRender(true);
      setClosing(false);
      document.body.style.overflow = "hidden";
    }
  }, [open, item]);

  // Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // Helper to extract YouTube video ID
  const getYouTubeEmbedUrl = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&modestbranding=1&rel=0`;
    }
    return null;
  };

  if (!shouldRender || !item) return null;

  const embedUrl = getYouTubeEmbedUrl(item.url);

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-midnight-ink/80 backdrop-blur-lg transition-opacity duration-300 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`relative w-full max-w-4xl aspect-video rounded-3xl border border-white/10 bg-black/60 shadow-2xl overflow-hidden transition-all duration-300 ${
          closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white hover:bg-white/10 transition-colors"
          aria-label="Close video player"
        >
          <X size={18} />
        </button>

        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={item.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-center p-6 text-white">
            <h3 className="font-instrument text-2xl mb-4 italic">{item.title}</h3>
            <p className="text-sm text-white/60 mb-6">
              This video type is not supported for inline play.
            </p>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
            >
              Open external video link
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
