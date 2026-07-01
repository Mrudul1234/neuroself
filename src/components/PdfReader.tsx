import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Download, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PdfReaderProps {
  url: string;
  title: string;
  onClose: () => void;
}

interface PageData {
  pageNum: number;
  textHTML: string;
  images: string[]; // Blob URLs for inline images
  error?: string;
  isScanned?: boolean;
  canvasDataUrl?: string; // fallback visual representation
}

export function PdfReader({ url, title, onClose }: PdfReaderProps) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [renderedPageCount, setRenderedPageCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [extractingMore, setExtractingMore] = useState(false);
  const [longLoading, setLongLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bottom Pill controls
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [theme, setTheme] = useState<"light" | "sepia" | "dark">("light");
  const [readingTimeLeft, setReadingTimeLeft] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const loadingTimerRef = useRef<any>(null);
  const textCacheRef = useRef<string>("");

  // Font class mapping
  const fontSizes = {
    sm: "text-[14px] leading-6",
    md: "text-[16px] leading-[1.7]",
    lg: "text-[18px] leading-[1.8]",
  };

  // Theme style mapping
  const themeStyles = {
    light: {
      bg: "bg-[#ffffeb]",
      text: "text-[#1a1a1a]",
      topBar: "bg-white border-b border-[#e4e4d0] text-[#1a1a1a]",
      progressTrack: "bg-[#e4e4d0]/50",
      progressFill: "bg-[#034f46]",
      bottomPill: "bg-[#1a1a1a] text-white",
      divider: "border-[#e4e4d0]",
      pageDividerText: "text-[#5f5f59]",
      skeletonBg: "bg-[#8a8a80]/10",
    },
    sepia: {
      bg: "bg-[#f4ecd8]",
      text: "text-[#5c4a1e]",
      topBar: "bg-[#ebdcb9] border-b border-[#d8c395] text-[#5c4a1e]",
      progressTrack: "bg-[#d8c395]/50",
      progressFill: "bg-[#a67c1e]",
      bottomPill: "bg-[#5c4a1e] text-[#f4ecd8]",
      divider: "border-[#d8c395]",
      pageDividerText: "text-[#8c743e]",
      skeletonBg: "bg-[#8c743e]/15",
    },
    dark: {
      bg: "bg-[#1a1a1a]",
      text: "text-[#e8e0d0]",
      topBar: "bg-[#222222] border-b border-[#333333] text-[#e8e0d0]",
      progressTrack: "bg-[#333333]",
      progressFill: "bg-[#ffa946]",
      bottomPill: "bg-[#333333] text-white border border-[#555555]",
      divider: "border-[#333333]",
      pageDividerText: "text-[#8a8a80]",
      skeletonBg: "bg-white/10",
    },
  };

  const activeTheme = themeStyles[theme];

  // Estimated reading time update
  const updateReadingMetrics = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Scroll progress percent
    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    setScrollProgress(progress);

    // Calculate reading time left
    // Average reading speed: 200 words per minute.
    const textLength = textCacheRef.current.split(/\s+/).length || 1;
    const totalMinutes = Math.ceil(textLength / 200);
    const timeLeft = Math.max(0, Math.ceil(totalMinutes * (1 - progress / 100)));
    setReadingTimeLeft(timeLeft);
  };

  // Setup pdf.js global lib loader
  useEffect(() => {
    const initPdf = async () => {
      // 8s long-loading indicator trigger
      loadingTimerRef.current = setTimeout(() => {
        setLongLoading(true);
      }, 8000);

      try {
        const win = window as any;
        if (!win.pdfjsLib) {
          throw new Error("PDF.js library failed to load from script tags.");
        }

        const pdfjsLib = win.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        console.log("[PdfReader] Fetching document from URL:", url);
        const loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);

        // Render first 3 pages
        await loadPageRange(1, Math.min(3, pdf.numPages));
      } catch (err: any) {
        console.error("[PdfReader] Error loading PDF:", err);
        if (err?.status === 403 || err?.status === 404 || err?.message?.includes("Unexpected server response")) {
          setErrorMsg("Can't access this PDF — it may have been deleted from storage");
        } else {
          setErrorMsg(err?.message || "Failed to parse PDF document.");
        }
      } finally {
        clearTimeout(loadingTimerRef.current);
        setLoading(false);
      }
    };

    initPdf();

    return () => {
      clearTimeout(loadingTimerRef.current);
      // Clean up blob URLs
      pages.forEach((p) => {
        p.images.forEach((imgUrl) => URL.revokeObjectURL(imgUrl));
      });
    };
  }, [url]);

  // Handle lazy loading trigger on scroll
  const handleScroll = () => {
    updateReadingMetrics();

    if (loading || extractingMore || renderedPageCount >= totalPages) return;

    const el = containerRef.current;
    if (!el) return;

    // Trigger when user scrolls within 500px of bottom
    const closeToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 500;
    if (closeToBottom) {
      const start = renderedPageCount + 1;
      const end = Math.min(renderedPageCount + 3, totalPages);
      if (start <= end) {
        setExtractingMore(true);
        loadPageRange(start, end).finally(() => setExtractingMore(false));
      }
    }
  };

  const loadPageRange = async (start: number, end: number) => {
    const pdf = pdfDocRef.current;
    if (!pdf) return;

    const pagePromises: Promise<PageData>[] = [];
    for (let i = start; i <= end; i++) {
      pagePromises.push(extractPageContent(pdf, i));
    }

    const newPages = await Promise.all(pagePromises);
    setPages((prev) => {
      const merged = [...prev];
      newPages.forEach((p) => {
        if (!merged.some((m) => m.pageNum === p.pageNum)) {
          merged.push(p);
        }
      });
      return merged.sort((a, b) => a.pageNum - b.pageNum);
    });
    setRenderedPageCount(end);
  };

  // Main pdf page extraction function (text, hierarchy and inline images)
  const extractPageContent = async (pdf: any, pageNum: number): Promise<PageData> => {
    try {
      const page = await pdf.getPage(pageNum);
      
      // 1. TEXT EXTRACTION & GROUPING
      const textContent = await page.getTextContent();
      let textHTML = "";
      const textItems = textContent.items;

      // Track text for estimated reading speed calculation
      const rawTextForPage = textItems.map((item: any) => item.str).join(" ");
      textCacheRef.current += " " + rawTextForPage;

      if (textItems.length === 0) {
        // SCANNED PDF DETECTED OR EMPTY
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

        return {
          pageNum,
          textHTML: "",
          images: [],
          isScanned: true,
          canvasDataUrl: dataUrl,
        };
      }

      // Group text items by Y position (within 5px is considered same line)
      const linesMap: Record<number, any[]> = {};
      textItems.forEach((item: any) => {
        const y = Math.round(item.transform[5]);
        let foundKey = Object.keys(linesMap).find((k) => Math.abs(Number(k) - y) <= 5);
        if (!foundKey) {
          linesMap[y] = [item];
        } else {
          linesMap[Number(foundKey)].push(item);
        }
      });

      // Sort lines top-to-bottom (Y is bottom-up, so descending sort)
      const sortedY = Object.keys(linesMap)
        .map(Number)
        .sort((a, b) => b - a);

      // Paragraph grouping: if Y gap between adjacent lines > 15px, start a new paragraph block
      let currentParagraph: string[] = [];
      const paragraphs: string[][] = [currentParagraph];
      let lastY: number | null = null;

      sortedY.forEach((y) => {
        const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4]); // sort left-to-right
        const lineStr = lineItems.map((item) => item.str).join(" ").trim();

        if (!lineStr) return;

        if (lastY !== null && Math.abs(lastY - y) > 15) {
          currentParagraph = [];
          paragraphs.push(currentParagraph);
        }

        currentParagraph.push(lineStr);
        lastY = y;
      });

      // Reconstruct headings (fontSize > 14 or bold-ish triggers header block)
      paragraphs.forEach((lines) => {
        const blockText = lines.join(" ");
        if (!blockText.trim()) return;

        // Simple check if text feels like a heading (mostly short, uppercase, or starts with numbers)
        const isHeading = blockText.length < 90 && (/^[0-9]\.?[0-9]?\s+[A-Z]/ || blockText === blockText.toUpperCase() || lines.length === 1 && blockText.length < 50);

        if (isHeading) {
          textHTML += `<h2 class="font-instrument italic text-[24px] md:text-[30px] font-bold mt-8 mb-4 tracking-tight leading-tight">${blockText}</h2>`;
        } else {
          textHTML += `<p class="mb-5 leading-relaxed text-justify opacity-95">${blockText}</p>`;
        }
      });

      // 2. IMAGE EXTRACTION (Best effort fallback logic)
      const images: string[] = [];
      try {
        const ops = await page.getOperatorList();
        const win = window as any;
        const fnArray = ops.fnArray;
        const argsArray = ops.argsArray;

        for (let i = 0; i < fnArray.length; i++) {
          // Check for paintImage operators (e.g. PaintImageXObject = 85 or PaintImage = 82)
          if (fnArray[i] === win.pdfjsLib?.OPS?.paintImageXObject || fnArray[i] === win.pdfjsLib?.OPS?.paintImage) {
            const imgName = argsArray[i][0];
            const imgObj = page.objs.get(imgName);
            if (imgObj && imgObj.src) {
              // Convert canvas-rendered image to blob URL
              images.push(imgObj.src);
            }
          }
        }
      } catch (imgErr) {
        console.warn(`[PdfReader] Page ${pageNum} image extraction skipped:`, imgErr);
      }

      return {
        pageNum,
        textHTML,
        images,
      };
    } catch (err: any) {
      console.error(`[PdfReader] Failed to render page ${pageNum}:`, err);
      return {
        pageNum,
        textHTML: "",
        images: [],
        error: `Page ${pageNum} could not be rendered: ${err?.message || err}`,
      };
    }
  };

  // Download logic
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started!");
  };

  // Share link logic
  const handleShare = () => {
    navigator.clipboard.writeText(url);
    toast.success("PDF link copied to clipboard!");
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-transform duration-350 ease-out ${activeTheme.bg} ${activeTheme.text}`}>
      {/* Top Bar */}
      <div className={`flex h-12 items-center justify-between px-4 shadow-sm z-10 ${activeTheme.topBar}`}>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/10 transition-colors"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 px-4 text-center font-medium truncate text-sm font-figtree">
          {title}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/10 transition-colors"
            title="Download PDF"
          >
            <Download size={16} />
          </button>
          <button
            onClick={handleShare}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/10 transition-colors"
            title="Share Link"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={`h-1 w-full relative z-10 ${activeTheme.progressTrack}`}>
        <div
          className={`h-full transition-all duration-100 ${activeTheme.progressFill}`}
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Main Content Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-8 md:px-8 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="max-w-[640px] mx-auto w-full font-figtree">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin mb-4 opacity-75" />
              <div className="text-sm tracking-wide opacity-80">
                Extracting your PDF...
              </div>
              {longLoading && (
                <div className="text-xs mt-2 text-[#8a8a80] animate-pulse">
                  This is a large PDF — still working…
                </div>
              )}

              {/* Skeleton Blocks */}
              <div className="w-full space-y-4 mt-8">
                <div className={`h-4 w-[80%] rounded-md animate-pulse ${activeTheme.skeletonBg}`} />
                <div className={`h-4 w-full rounded-md animate-pulse ${activeTheme.skeletonBg}`} />
                <div className={`h-4 w-[65%] rounded-md animate-pulse ${activeTheme.skeletonBg}`} />
                <div className={`h-4 w-[90%] rounded-md animate-pulse ${activeTheme.skeletonBg}`} />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="text-center py-20">
              <div className="text-red-500 font-medium mb-3">{errorMsg}</div>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[#1a1a1a] text-white hover:opacity-90"
              >
                Go Back
              </button>
            </div>
          )}

          {!loading && !errorMsg && (
            <div className={`prose max-w-none ${fontSizes[fontSize]}`}>
              {pages.map((p, idx) => (
                <div key={p.pageNum} className="relative mb-12">
                  {p.error ? (
                    <div className="p-3 text-sm border border-red-200/50 rounded bg-red-500/10 text-red-500 text-center my-6">
                      {p.error}
                    </div>
                  ) : p.isScanned ? (
                    <div className="space-y-4 my-6">
                      <div className="text-xs text-center opacity-70 italic mb-2">
                        Scanned page visual layout:
                      </div>
                      {p.canvasDataUrl && (
                        <img
                          src={p.canvasDataUrl}
                          alt={`Page ${p.pageNum}`}
                          className="w-full rounded-md border border-stone-mist/40 max-w-full block mx-auto shadow-sm"
                        />
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Render text reflow markup */}
                      <div
                        dangerouslySetInnerHTML={{ __html: p.textHTML }}
                        className="text-justify prose-headings:font-instrument"
                      />

                      {/* Extracted Inline Images */}
                      {p.images.map((imgUrl, i) => (
                        <img
                          key={i}
                          src={imgUrl}
                          alt={`Extracted from Page ${p.pageNum}`}
                          className="w-full max-w-full rounded-lg border border-black/10 my-5 mx-auto block shadow-sm"
                          style={{ maxHeight: "400px", objectFit: "contain" }}
                          onError={(e) => {
                            // Skip broken image extractions silently
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ))}
                    </>
                  )}

                  {/* Page Breaks Divider */}
                  {idx < pages.length - 1 && (
                    <div className="flex flex-col items-center my-10">
                      <div className={`w-10 border-t ${activeTheme.divider}`} />
                      <div className={`text-[11px] font-semibold tracking-wider mt-2 uppercase ${activeTheme.pageDividerText}`}>
                        Page {p.pageNum}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {extractingMore && (
                <div className="flex justify-center py-6">
                  <Loader2 size={20} className="animate-spin opacity-60" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className={`flex items-center gap-4 px-5 py-2.5 rounded-full shadow-2xl ${activeTheme.bottomPill} font-figtree font-medium text-xs tracking-wide`}>
          <span>
            {readingTimeLeft > 0 ? `${readingTimeLeft} min left` : "Finished"}
          </span>
          <span className="opacity-30">|</span>

          {/* Aa Font Size Toggle */}
          <button
            onClick={() => {
              setFontSize((prev) => (prev === "sm" ? "md" : prev === "md" ? "lg" : "sm"));
            }}
            className="flex items-center gap-1 opacity-90 hover:opacity-100 uppercase"
            title="Font Size"
          >
            Aa ({fontSize})
          </button>
          <span className="opacity-30">|</span>

          {/* Theme Selector Toggle */}
          <button
            onClick={() => {
              setTheme((prev) => (prev === "light" ? "sepia" : prev === "sepia" ? "dark" : "light"));
            }}
            className="capitalize opacity-90 hover:opacity-100"
            title="Switch Theme"
          >
            🎨 {theme}
          </button>
        </div>
      </div>
    </div>
  );
}
