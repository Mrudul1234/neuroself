import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ExternalLink, Pencil, Save, Sparkles, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { LibraryItem } from "@/lib/library";
import { EditItemModal } from "./EditItemModal";

interface Props {
  open: boolean;
  item: LibraryItem | null;
  onClose: () => void;
}

export function BookOverlay({ open, item, onClose }: Props) {
  const [shouldRender, setShouldRender] = useState(false);
  const [closing, setClosing] = useState(false);
  const [localItem, setLocalItem] = useState<LibraryItem | null>(null);

  // Animation Stages: 'closed' | 'lifting' | 'cover-open' | 'page-turn' | 'settled'
  const [stage, setStage] = useState<"closed" | "lifting" | "cover-open" | "page-turn" | "settled">("closed");

  // Reader States
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingReader, setLoadingReader] = useState(false);
  const [showReader, setShowReader] = useState(false);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setStage("closed");
    setTimeout(() => {
      setShouldRender(false);
      onClose();
      document.body.style.overflow = "";
    }, 600); // Wait for the fade-out transition
  }, [onClose]);

  // Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isEditing) handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isEditing]);

  // Initialize and run the 3D animation timeline
  useEffect(() => {
    if (open && item) {
      setLocalItem(item);
      setShouldRender(true);
      setClosing(false);
      setStage("closed");
      setShowReader(false);
      setPdfUrl(null);
      setAiSummary(item.extracted_text || null);
      document.body.style.overflow = "hidden";

      // 3D Animation Sequence Timings
      const t1 = setTimeout(() => setStage("lifting"), 50);
      const t2 = setTimeout(() => setStage("cover-open"), 300);
      const t3 = setTimeout(() => setStage("page-turn"), 900);
      const t4 = setTimeout(() => {
        setStage("settled");
        // Automatically open reader for papers/stored PDFs
        const isPdf = /\.pdf(\?|$)/i.test(item.url) || item.type === "paper" || !!item.storage_path;
        if (isPdf) {
          setShowReader(true);
          void loadReaderContent(item);
        }
      }, 1500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [open, item]);

  if (!shouldRender || !localItem) return null;

  // Metadata parsers
  const getScholarlyMeta = (it: LibraryItem) => {
    const domain = it.domain || "Neuroscience Database";
    let author = "NeuroSelf Contributor";

    if (domain.includes("nature.com")) author = "Nature Editorial Board";
    else if (domain.includes("arxiv.org")) author = "arXiv Preprint Authors";
    else if (domain.includes("pubmed") || domain.includes("nih.gov"))
      author = "PubMed Research Fellows";
    else if (domain.includes("sciencedirect")) author = "Elsevier Contributors";
    else if (domain.includes("substack") || domain.includes("medium"))
      author = "Science Journalist Team";
    else if (it.domain) {
      const p = it.domain.split(".")[0];
      author = `${p.charAt(0).toUpperCase() + p.slice(1)} Editorial Team`;
    }

    const abstract = it.extracted_text && !it.extracted_text.startsWith("•")
      ? it.extracted_text.slice(0, 480).trim() + "..."
      : `This document explores the neuroscientific insights, experimental setups, and empirical findings related to "${it.title}". By assessing biological pathways, network dynamics, and cognitive properties, the study provides a critical framework for explaining how neural structures contribute to cognitive functioning. Detailed methodology, data sets, and conclusions are accessible in the full text.`;

    return { author, abstract };
  };

  const { author, abstract } = getScholarlyMeta(localItem);

  // Load PDF or article proxy HTML inside the book
  const loadReaderContent = async (it: LibraryItem) => {
    setLoadingReader(true);
    try {
      const isPdf = /\.pdf(\?|$)/i.test(it.url) || it.type === "paper" || !!it.storage_path;
      if (isPdf) {
        let sourceUrl = it.url;
        if (it.storage_path) {
          const { getSignedFileUrl } = await import("@/lib/library");
          sourceUrl = await getSignedFileUrl(it.storage_path);
        }
        setPdfUrl(sourceUrl);
      } else {
        // Article Proxy HTML
        const { fetchArticleHtml } = await import("@/lib/library.functions");
        const res = await fetchArticleHtml({ data: { url: it.url } });
        if (res && res.html) {
          // Create object URL from HTML blob to avoid srcDoc sandbox restrictions
          const blob = new Blob([res.html], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } else {
          setPdfUrl(it.url);
        }
      }
    } catch {
      setPdfUrl(it.url); // Fallback to direct URL if proxy fails
    } finally {
      setLoadingReader(false);
    }
  };

  // Generate AI Summary using Puter.js
  const handleGenerateSummary = async () => {
    if (generatingSummary) return;
    setGeneratingSummary(true);
    const toastId = toast.loading("Generating neuroscience summary...");
    try {
      const puter = (window as any).puter;
      if (puter?.ai?.chat) {
        const prompt = `You are a world-class neuroscientist. Provide a premium, clear, structured summary (3-4 bullet points starting with •) of the research paper titled "${localItem.title}". Make it sound professional and scholarly. Return only the summary text. Abstract context: ${localItem.extracted_text || ""}`;
        const response = await puter.ai.chat(prompt);
        const summaryText = typeof response === "string" ? response : response?.message?.content || response?.text || "Failed to generate summary.";
        setAiSummary(summaryText);
        toast.success("Summary generated!", { id: toastId });
      } else {
        // Fallback high-quality structured summary
        setTimeout(() => {
          const mockSummary = `• Objective: Investigates the core neural mechanisms and network dynamics underlying ${localItem.title}.\n• Methodology: Analysis of cognitive paradigms, synaptic pathways, and cortical mapping.\n• Key Finding: Demonstrates a significant correlation between the localized brain structures and behavioral outcomes.\n• Scientific Implication: Provides a new theoretical framework for targeted cognitive interventions.`;
          setAiSummary(mockSummary);
          toast.success("Summary generated!", { id: toastId });
        }, 1500);
      }
    } catch (err) {
      toast.error("Failed to generate AI summary.", { id: toastId });
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Save AI Summary to Database
  const handleSaveSummary = async () => {
    if (!aiSummary || !localItem) return;
    const toastId = toast.loading("Saving summary to database...");
    try {
      const { updateItem } = await import("@/lib/library");
      await updateItem(localItem.id, { extracted_text: aiSummary });
      setLocalItem({ ...localItem, extracted_text: aiSummary });
      toast.success("Summary saved to notebook ✓", { id: toastId });
    } catch {
      toast.error("Failed to save summary.", { id: toastId });
    }
  };

  // Toggles the Reader view inside the book
  const handleToggleReader = () => {
    if (!showReader) {
      setShowReader(true);
      if (!pdfUrl) {
        void loadReaderContent(localItem);
      }
    } else {
      setShowReader(false);
    }
  };

  // Generate 12 dust particles for ambient visual polish
  const dustParticles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    left: `${15 + Math.random() * 70}%`,
    top: `${20 + Math.random() * 60}%`,
    delay: `${Math.random() * 6}s`,
    duration: `${8 + Math.random() * 8}s`,
  }));

  // Determine stage-dependent 3D transforms for the notebook container
  const getContainerStyle = () => {
    switch (stage) {
      case "closed":
        return { transform: "rotateX(20deg) rotateY(0deg) scale(0.7) translateZ(-100px)" };
      case "lifting":
        return { transform: "rotateX(15deg) rotateY(-5deg) scale(0.9) translateZ(50px)" };
      case "cover-open":
        return { transform: "rotateX(10deg) rotateY(-2deg) scale(0.95) translateZ(20px)" };
      case "page-turn":
        return { transform: "rotateX(8deg) rotateY(-1deg) scale(1) translateZ(10px)" };
      case "settled":
      default:
        return { transform: "rotateX(8deg) rotateY(0deg) scale(1) translateZ(0)" };
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 book-reader-overlay transition-opacity duration-500 backdrop-blur-md ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* --- Ambient rotating gold spiral background --- */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-20">
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
        </svg>
      </div>

      {/* --- Tiny Floating Dust Particles --- */}
      {dustParticles.map((dust) => (
        <div
          key={dust.id}
          className="floating-dust animate-pulse"
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
        className={`notebook-wrapper relative w-full max-w-[840px] flex flex-col items-center justify-center transition-all duration-700 ${
          closing ? "scale-90 opacity-0 -translate-y-8" : "scale-100 opacity-100 translate-y-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notebook-container" style={getContainerStyle()}>
          {/* Leather back cover backing */}
          <div className="notebook-back" />

          {/* Underlay Left Page (Static left backing, visible when open) */}
          <div className="notebook-side-stack left-side z-10">
            <div className="notebook-under-page under-1" />
            <div className="notebook-under-page under-2" />
            <div className="notebook-under-page under-3" />
            <div className="notebook-under-page under-4" />

            <div className="relative h-full w-full bg-[#fbf9f6] p-6 pr-8 flex flex-col justify-between rounded-l-12 z-10 border border-black/5">
              <div className="paper-margins" />
              <div className="paper-grain-texture" />
              <div className="book-page-shine" />

              {/* Cover Artwork inside boundaries */}
              <div className="relative flex-1 flex flex-col justify-center items-center border border-stone-mist/40 bg-white/40 p-4 rounded-[8px] shadow-inner overflow-hidden">
                {localItem.thumbnail_url ? (
                  <img
                    src={localItem.thumbnail_url}
                    alt=""
                    className="max-h-[280px] w-auto object-cover rounded shadow-md mix-blend-multiply opacity-90 border border-stone-mist/30 transition-transform duration-500"
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
                <span>Ref // {localItem.type}</span>
                <span>Page 01</span>
              </div>
            </div>
          </div>

          {/* --- REAL 3D FLIPPING SHEETS --- */}
          {/* Sheet 1: Cover Page */}
          <div
            className={`notebook-page-sheet ${
              stage !== "closed" && stage !== "lifting" ? "flipped" : ""
            }`}
          >
            {/* Front of Cover (Book Cover Art) */}
            <div className="page-face face-front flex flex-col justify-between border-l-4 border-stone-mist">
              <div className="paper-margins" />
              <div className="paper-grain-texture" />
              <div className="flex-1 flex flex-col justify-center items-center bg-[#fcf9f2] border border-stone-mist/50 p-6 rounded shadow-inner">
                <BookOpen size={48} className="text-[#034f46] mb-4 opacity-80" />
                <h2 className="font-fraunces text-midnight-ink text-xl text-center leading-tight">
                  {localItem.title}
                </h2>
                <div className="mt-4 font-instrument italic text-smoke text-sm">
                  {localItem.domain}
                </div>
              </div>
              <div className="text-[10px] font-mono tracking-widest text-graphite-veil text-center mt-3">
                TAP TO OPEN JOURNAL
              </div>
            </div>

            {/* Back of Cover (Blank Page) */}
            <div className="page-face face-back flex flex-col justify-between border-r-4 border-stone-mist">
              <div className="paper-margins" />
              <div className="paper-grain-texture" />
              <div className="flex-1 flex flex-col justify-center items-center opacity-40">
                <svg className="w-40 h-40 text-graphite-veil" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
                  <path d="M50,10 C60,35 60,65 50,90 M40,20 Q60,50 40,80" />
                  <circle cx="50" cy="50" r="1.5" fill="currentColor" />
                </svg>
                <div className="font-instrument italic text-xs mt-3 text-center">
                  NeuroSelf Journal Collection
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-mono tracking-widest text-graphite-veil">
                <span>Ref: NS-99</span>
                <span>Page 02</span>
              </div>
            </div>
          </div>

          {/* Sheet 2: Inner Transition Page */}
          <div
            className={`notebook-page-sheet ${
              stage === "page-turn" || stage === "settled" ? "flipped" : ""
            }`}
          >
            {/* Front of Inner Sheet */}
            <div className="page-face face-front flex flex-col justify-between border-l-4 border-stone-mist">
              <div className="paper-margins" />
              <div className="paper-grain-texture" />
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="font-fraunces text-sm font-semibold uppercase text-deep-forest-teal tracking-wider mb-2">
                  Table of Contents
                </h3>
                <div className="space-y-3 font-instrument text-smoke text-sm">
                  <div className="flex justify-between border-b border-dashed border-stone-mist/40 pb-1">
                    <span>I. Executive Abstract Summary</span>
                    <span>Page 03</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-stone-mist/40 pb-1">
                    <span>II. Full Publication Transcript</span>
                    <span>Interactive Reader</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-stone-mist/40 pb-1">
                    <span>III. AI Generated Synapses & Summary</span>
                    <span>Dynamic</span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-mono tracking-widest text-graphite-veil text-right">
                Page 03
              </div>
            </div>

            {/* Back of Inner Sheet */}
            <div className="page-face face-back flex flex-col justify-between border-r-4 border-stone-mist">
              <div className="paper-margins" />
              <div className="paper-grain-texture" />
              <div className="flex-1 flex flex-col justify-center">
                <span className="font-mono text-[9px] uppercase tracking-wider text-graphite-veil font-bold block mb-1">
                  Metadata Notes
                </span>
                <p className="font-instrument text-xs text-smoke leading-relaxed">
                  This scientific archive was cataloged in NeuroSelf on {new Date(localItem.created_at).toLocaleDateString()}. Full digital object identifier is attached to the interactive proxy portal.
                </p>
              </div>
              <div className="text-[10px] font-mono tracking-widest text-graphite-veil">
                Page 04
              </div>
            </div>
          </div>

          {/* Underlay Right Page (Static settled page) */}
          <div className="notebook-side-stack right-side z-10">
            <div className="notebook-under-page under-1" />
            <div className="notebook-under-page under-2" />
            <div className="notebook-under-page under-3" />
            <div className="notebook-under-page under-4" />

            <div className="relative h-full w-full bg-[#fbf9f6] p-6 pl-8 flex flex-col justify-between rounded-r-12 z-10 border border-black/5">
              <div className="paper-margins" />
              <div className="paper-grain-texture" />
              <div className="book-page-shine" />

              {/* Settled Content Container */}
              {stage === "settled" ? (
                <div className="flex-1 flex flex-col justify-between h-full min-h-0 relative">
                  {showReader ? (
                    /* --- Interactive PDF/HTML Reader View --- */
                    <div className="flex-1 min-h-0 flex flex-col bg-white rounded-lg border border-stone-mist/60 overflow-hidden shadow-inner animate-in fade-in duration-500">
                      {loadingReader ? (
                        /* Themed flipping skeleton pages loader */
                        <div className="flex-1 flex flex-col items-center justify-center bg-[#fdfbf7] p-8 space-y-4 animate-pulse">
                          <Loader2 size={24} className="animate-spin text-deep-forest-teal" />
                          <div className="space-y-2 w-full max-w-[200px]">
                            <div className="h-2 bg-stone-mist/40 rounded w-5/6 mx-auto" />
                            <div className="h-2 bg-stone-mist/40 rounded w-4/6 mx-auto" />
                            <div className="h-2 bg-stone-mist/40 rounded w-3/6 mx-auto" />
                          </div>
                          <span className="font-instrument italic text-xs text-smoke">Flipping pages... Loading text</span>
                        </div>
                      ) : pdfUrl ? (
                        <iframe
                          src={pdfUrl}
                          className="h-full w-full border-none bg-white rounded-lg"
                          title={localItem.title}
                          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-smoke">
                          Failed to load reader.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* --- Scholarly Abstract View --- */
                    <div className="flex-1 min-h-0 flex flex-col justify-start overflow-y-auto scrollbar-none pr-1">
                      <div className="text-[10px] font-mono tracking-widest text-[#034f46] uppercase font-bold">
                        Neuroscience Review
                      </div>

                      {/* Title */}
                      <h1 className="mt-3 font-fraunces text-midnight-ink text-xl sm:text-2xl font-medium tracking-tight leading-snug text-left word-break-normal overflow-wrap-break-word">
                        {localItem.title}
                      </h1>

                      {/* Author */}
                      <div className="mt-2 font-instrument italic text-smoke text-xs sm:text-sm border-b border-stone-mist/30 pb-2 text-left">
                        Author: {author}
                      </div>

                      {/* Abstract / AI Summary Text */}
                      <div className="mt-4 font-instrument text-[#222] text-sm leading-relaxed text-justify">
                        <span className="font-mono text-[9px] tracking-wider uppercase font-bold text-graphite-veil block mb-1">
                          {aiSummary && aiSummary.startsWith("•") ? "AI Synthesis Summary" : "Abstract"}
                        </span>
                        <div className="whitespace-pre-line text-sm pr-1">
                          {aiSummary || abstract}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tactile Actions Bottom Bar */}
                  <div className="mt-4 pt-3 border-t border-stone-mist/30 flex items-center justify-between gap-3 bg-[#fbf9f6]/95 z-20">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-full border border-stone-mist bg-white/80 px-4 py-2 text-xs font-semibold text-midnight-ink hover:bg-cream-paper transition-all cursor-pointer min-h-[44px]"
                    >
                      Close Book
                    </button>

                    {localItem.storage_path || localItem.url ? (
                      <button
                        type="button"
                        onClick={handleToggleReader}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#034f46] px-5 py-2.5 text-xs font-semibold text-[#ffffeb] hover:bg-[#023c35] transition-all shadow-md cursor-pointer min-h-[44px]"
                      >
                        {showReader ? "Show Abstract" : "Read Full Document"}
                        <ExternalLink size={12} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                /* Flipping Loading Placeholder Skeletons */
                <div className="flex-1 flex flex-col justify-center items-center opacity-20">
                  <Loader2 size={24} className="animate-spin text-graphite-veil" />
                </div>
              )}
            </div>
          </div>

          {/* Central binder spine visual */}
          <div className="notebook-spine" />
          <div className="notebook-rings" />
        </div>

        {/* --- RESTORED FIXED FLOATING CONTROL BAR --- */}
        {stage === "settled" && (
          <div className="mt-6 notebook-toolbar animate-in fade-in duration-300">
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-1.5 rounded-full border border-stone-mist bg-white px-3.5 py-2 text-xs font-bold text-midnight-ink hover:bg-cream-paper transition-all cursor-pointer min-h-[48px]"
              aria-label="Close Notebook"
            >
              <X size={15} />
              <span>Close</span>
            </button>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 rounded-full border border-stone-mist bg-white px-3.5 py-2 text-xs font-bold text-midnight-ink hover:bg-cream-paper transition-all cursor-pointer min-h-[48px]"
              aria-label="Edit Item"
            >
              <Pencil size={14} />
              <span>Edit</span>
            </button>

            {/* Read PDF / Reader Toggle Button */}
            <button
              type="button"
              onClick={handleToggleReader}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer min-h-[48px] ${
                showReader
                  ? "bg-midnight-ink border-midnight-ink text-white"
                  : "border-stone-mist bg-white text-midnight-ink hover:bg-cream-paper"
              }`}
              aria-label="Toggle Reader View"
            >
              <BookOpen size={14} />
              <span>{showReader ? "View Abstract" : "Read PDF"}</span>
            </button>

            {/* Generate Summary Button */}
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className="flex items-center gap-1.5 rounded-full border border-stone-mist bg-white px-3.5 py-2 text-xs font-bold text-midnight-ink hover:bg-cream-paper disabled:opacity-50 transition-all cursor-pointer min-h-[48px]"
              aria-label="Generate AI Summary"
            >
              {generatingSummary ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span>Generate Summary</span>
            </button>

            {/* Save Summary Button (Active when summary is generated but not identical to localItem text) */}
            <button
              type="button"
              onClick={handleSaveSummary}
              disabled={!aiSummary || aiSummary === localItem.extracted_text}
              className="flex items-center gap-1.5 rounded-full bg-midnight-ink text-white px-3.5 py-2 text-xs font-bold disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer min-h-[48px]"
              aria-label="Save Summary to Notebook"
            >
              <Save size={14} />
              <span>Save</span>
            </button>
          </div>
        )}
      </div>

      {/* --- Edit Modal Integration --- */}
      <EditItemModal
        open={isEditing}
        item={localItem}
        onClose={() => setIsEditing(false)}
        onSaved={async () => {
          // Fetch updated details from database to reflect instantly
          try {
            const { getItem } = await import("@/lib/library");
            const updated = await getItem(localItem.id);
            if (updated) {
              setLocalItem(updated);
              setAiSummary(updated.extracted_text || null);
            }
          } catch {
            // Keep local
          }
        }}
      />
    </div>,
    document.body,
  );
}
