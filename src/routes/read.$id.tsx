import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Moon,
  Sun,
  Type,
} from "lucide-react";
import { getItem, getSignedFileUrl, type LibraryItem } from "@/lib/library";
import { cacheExtractedText } from "@/lib/library.functions";

export const Route = createFileRoute("/read/$id")({
  component: ReaderPage,
});

type Theme = "light" | "sepia" | "dark";

const THEME_BG: Record<Theme, string> = {
  light: "#ffffeb",
  sepia: "#f3e7c9",
  dark: "#1a1a1a",
};
const THEME_FG: Record<Theme, string> = {
  light: "#1a1a1a",
  sepia: "#3a2f1a",
  dark: "#f3efe1",
};

function ReaderPage() {
  const { id } = useParams({ from: "/read/$id" });
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("Loading…");
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [fontSize, setFontSize] = useState(19);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const it = await getItem(id);
        if (!it) {
          setError("Item not found.");
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setItem(it);

        // Already cached?
        if (it.extracted_text && it.extracted_text.length > 0) {
          setText(it.extracted_text);
          setLoading(false);
          return;
        }

        // Resolve source URL
        let sourceUrl = it.url;
        if (it.storage_path) {
          sourceUrl = await getSignedFileUrl(it.storage_path);
        }

        if (it.type === "video") {
          setError("Videos open in their original platform.");
          setLoading(false);
          return;
        }

        const isPdf =
          /\.pdf(\?|$)/i.test(sourceUrl) || it.type === "paper" || !!it.storage_path;

        if (isPdf) {
          setStatus("Extracting PDF text…");
          const { extractPdfText } = await import("@/lib/pdf");
          const { fullText } = await extractPdfText(sourceUrl, (done, total) => {
            if (!cancelled) setStatus(`Reading page ${done} of ${total}…`);
          });
          if (cancelled) return;
          setText(fullText);
          // Cache extracted text server-side so subsequent opens skip pdf.js.
          cacheExtractedText({ data: { id: it.id, text: fullText } }).catch(
            (e) => console.warn("Failed to cache extracted text", e),
          );
        } else {
          // Article: fetch readable text via microlink
          setStatus("Fetching article…");
          try {
            const res = await fetch(
              `https://api.microlink.io/?url=${encodeURIComponent(it.url)}&palette=true&audio=false&video=false&iframe=false&meta=true`,
            );
            const json = (await res.json()) as {
              data?: { description?: string; title?: string };
            };
            const body = json.data?.description ?? "";
            setText(body || "We couldn't extract readable text. Open the original link.");
          } catch {
            setText("We couldn't fetch this article's text.");
          }
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load.");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const minutes = useMemo(() => {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 220));
  }, [text]);

  const paragraphs = useMemo(
    () => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    [text],
  );

  return (
    <div
      className="min-h-screen transition-colors"
      style={{ backgroundColor: THEME_BG[theme], color: THEME_FG[theme] }}
    >
      {/* Back */}
      <div className="px-5 pt-5 sm:px-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 opacity-70 transition-opacity hover:opacity-100"
          style={{ fontSize: 13, fontWeight: 500 }}
        >
          <ArrowLeft size={15} />
          Back
        </Link>
      </div>

      {/* Reader */}
      <article className="mx-auto max-w-[640px] px-5 pb-40 pt-8 sm:px-8 sm:pt-12">
        {item && (
          <h1
            className="font-eb-garamond text-center"
            style={{
              fontSize: "clamp(28px, 5vw, 44px)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              marginBottom: 32,
            }}
          >
            {item.title}
          </h1>
        )}
        {item?.domain && (
          <div
            className="mb-10 text-center opacity-60"
            style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            {item.domain}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16 opacity-70">
            <Loader2 size={20} className="animate-spin" />
            <span style={{ fontSize: 13 }}>{status}</span>
          </div>
        ) : error ? (
          <div className="text-center opacity-70" style={{ fontSize: 14 }}>
            {error}
            {item && (
              <div className="mt-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                  style={{ fontSize: 13 }}
                >
                  Open original ↗
                </a>
              </div>
            )}
          </div>
        ) : (
          <div
            className="font-eb-garamond"
            style={{ fontSize, lineHeight: 1.65 }}
          >
            {paragraphs.map((p, i) => (
              <p key={i} style={{ marginBottom: "1.1em" }}>
                {p}
              </p>
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="mt-16 flex justify-center opacity-50">
            <ChevronDown size={20} />
          </div>
        )}
      </article>

      {/* Bottom floating control bar */}
      <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2">
        <div
          className="flex items-center gap-3 rounded-full px-3 py-2 text-white shadow-[0_18px_36px_-12px_rgba(0,0,0,0.55)]"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          <span className="pl-2" style={{ fontSize: 12, fontWeight: 600 }}>
            {loading ? "…" : `${minutes}:00`}
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1" style={{ fontSize: 12, fontWeight: 600 }}>
            Read
          </span>
          <button
            type="button"
            onClick={() =>
              setTheme((t) => (t === "light" ? "sepia" : t === "sepia" ? "dark" : "light"))
            }
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            type="button"
            onClick={() => setFontSize((s) => (s >= 24 ? 16 : s + 2))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
            aria-label="Cycle font size"
          >
            <Type size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
