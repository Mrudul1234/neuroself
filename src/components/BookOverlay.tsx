import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import type { LibraryItem } from "@/lib/library";

interface Props {
  open: boolean;
  item: LibraryItem | null;
  onClose: () => void;
}

export function BookOverlay({ open, item, onClose }: Props) {
  const [shouldRender, setShouldRender] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setShouldRender(false);
      onClose();
      document.body.style.overflow = "";
    }, 600); // Wait for the transition
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

  if (!shouldRender || !item) return null;

  // Format author and abstract from item
  const getScholarlyMeta = (item: LibraryItem) => {
    const domain = item.domain || "Neuroscience Database";
    let author = "NeuroSelf Contributor";

    if (domain.includes("nature.com")) author = "Nature Editorial Board";
    else if (domain.includes("arxiv.org")) author = "arXiv Preprint Authors";
    else if (domain.includes("pubmed") || domain.includes("nih.gov"))
      author = "PubMed Research Fellows";
    else if (domain.includes("sciencedirect")) author = "Elsevier Contributors";
    else if (domain.includes("substack") || domain.includes("medium"))
      author = "Science Journalist Team";
    else if (item.domain) {
      const p = item.domain.split(".")[0];
      author = `${p.charAt(0).toUpperCase() + p.slice(1)} Editorial Team`;
    }

    const abstract = item.extracted_text
      ? item.extracted_text.slice(0, 360).trim() + "..."
      : `This document explores the neuroscientific insights and empirical findings related to "${item.title}". By assessing biological pathways, network dynamics, and cognitive properties, the study provides a critical framework for explaining how neural structures contribute to cognitive functioning. Detailed methodology, data sets, and conclusions are accessible in the full text.`;

    return { author, abstract };
  };

  const { author, abstract } = getScholarlyMeta(item);

  // Generate 12 dust particles with random start positions
  const dustParticles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    left: `${15 + Math.random() * 70}%`,
    top: `${40 + Math.random() * 50}%`,
    delay: `${Math.random() * 6}s`,
    duration: `${8 + Math.random() * 8}s`,
  }));

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 book-reader-overlay transition-opacity duration-500 backdrop-blur-md ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* --- Ambient rotating gold spiral background --- */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-30">
        <svg
          className="rotating-spiral-glow h-[80vw] w-[80vw] max-w-[800px] max-h-[800px] text-amber-pulse/20"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        >
          <path
            d="M100,100 C110,90 100,75 85,85 C70,95 75,120 100,115 C130,110 120,70 90,75 C60,80 70,140 115,130 C150,120 135,50 85,65 C35,80 55,160 130,145 C180,135 150,30 75,55 C0,80 30,180 145,160 C210,145 160,10 65,45 C-30,80 10,200 160,175"
            strokeDasharray="2 3"
          />
          {/* Subtle dots */}
          <circle cx="100" cy="100" r="1" fill="currentColor" />
          <circle cx="85" cy="85" r="1.5" fill="currentColor" />
          <circle cx="115" cy="130" r="1" fill="currentColor" />
        </svg>
      </div>

      {/* --- Tiny Floating Dust Particles --- */}
      {dustParticles.map((dust) => (
        <div
          key={dust.id}
          className="floating-dust"
          style={{
            left: dust.left,
            top: dust.top,
            animationDelay: dust.delay,
            animationDuration: dust.duration,
          }}
        />
      ))}

      {/* --- 3D Notebook Wrapper --- */}
      <div
        className={`notebook-wrapper relative w-full max-w-[840px] flex items-center justify-center transition-all duration-700 ${
          closing ? "scale-90 opacity-0 -translate-y-8" : "scale-100 opacity-100 translate-y-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notebook-container">
          {/* Wooden back cover plate */}
          <div className="notebook-back" />

          {/* Underlay Pages (Left side thickness) */}
          <div className="notebook-side-stack left-side">
            <div className="notebook-under-page under-1" />
            <div className="notebook-under-page under-2" />
            <div className="notebook-under-page under-3" />
            <div className="notebook-under-page under-4" />

            {/* The Left Page Content */}
            <div className="relative h-full w-full bg-[#fbf9f6] p-6 pr-8 flex flex-col justify-between rounded-l-12 z-10 border border-black/5">
              <div className="paper-margins" />
              <div className="paper-grain-texture" />
              <div className="book-page-shine" />

              {/* Cover Artwork Printed Look */}
              <div className="relative flex-1 flex flex-col justify-center items-center border border-stone-mist/40 bg-white/40 p-4 rounded-[8px] shadow-inner overflow-hidden">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt=""
                    className="max-h-[300px] w-auto object-cover rounded shadow-md mix-blend-multiply opacity-90 border border-stone-mist/30"
                  />
                ) : (
                  <div className="flex h-[240px] w-[160px] flex-col justify-between p-4 border border-dashed border-stone-mist text-center rounded">
                    <div />
                    <BookOpen size={24} className="mx-auto text-graphite-veil" />
                    <span className="font-instrument italic text-smoke text-sm">NeuroSelf Lib</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-between text-[11px] font-mono tracking-widest text-graphite-veil uppercase">
                <span>Ref // {item.type}</span>
                <span>Page 01</span>
              </div>
            </div>
          </div>

          {/* Underlay Pages (Right side thickness) */}
          <div className="notebook-side-stack right-side">
            <div className="notebook-under-page under-1" />
            <div className="notebook-under-page under-2" />
            <div className="notebook-under-page under-3" />
            <div className="notebook-under-page under-4" />

            {/* The Right Page Content */}
            <div className="relative h-full w-full bg-[#fbf9f6] p-6 pl-8 flex flex-col justify-between rounded-r-12 z-10 border border-black/5">
              <div className="paper-margins" />
              <div className="paper-grain-texture" />
              <div className="book-page-shine" />

              <div className="flex-1 flex flex-col justify-start">
                <div className="text-[11px] font-mono tracking-widest text-[#034f46] uppercase font-semibold">
                  Neuroscience Review
                </div>

                {/* Title */}
                <h1 className="mt-3 font-fraunces text-midnight-ink text-2xl sm:text-3xl font-medium tracking-tight leading-tight">
                  {item.title}
                </h1>

                {/* Author */}
                <div className="mt-2 font-instrument italic text-smoke text-sm sm:text-base border-b border-stone-mist/30 pb-3">
                  Author: {author}
                </div>

                {/* Abstract Text */}
                <div className="mt-4 font-instrument text-[#222] text-sm sm:text-base leading-relaxed text-justify max-h-[220px] overflow-y-auto scrollbar-none pr-1">
                  <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-graphite-veil block mb-1">
                    Abstract
                  </span>
                  {abstract}
                </div>
              </div>

              {/* Tactile Action Buttons at bottom of right page */}
              <div className="mt-5 border-t border-stone-mist/30 pt-4 flex items-center justify-between gap-3 z-20">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full border border-stone-mist bg-white/70 px-4 py-2 text-xs font-semibold text-midnight-ink hover:bg-cream-paper transition-all"
                >
                  Close Book
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (item.storage_path) {
                      const id = toast.loading("Fetching PDF URL...");
                      try {
                        const { getSignedFileUrl } = await import("@/lib/library");
                        const url = await getSignedFileUrl(item.storage_path);
                        toast.success("Ready ✓", { id });
                        window.open(url, "_blank", "noopener,noreferrer");
                      } catch {
                        toast.error("Failed to open stored PDF.", { id });
                      }
                    } else {
                      window.open(item.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#034f46] px-5 py-2.5 text-xs font-semibold text-[#ffffeb] hover:bg-[#023c35] transition-all shadow-md cursor-pointer"
                >
                  Read Full Publication
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Central binder visual */}
          <div className="notebook-spine" />
          <div className="notebook-rings" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
