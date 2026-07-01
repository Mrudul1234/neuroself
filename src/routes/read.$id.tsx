import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getItem, getSignedFileUrl, type LibraryItem } from "@/lib/library";
import { fetchArticleHtml } from "@/lib/library.functions";

export const Route = createFileRoute("/read/$id")({
  component: ReaderPage,
});

function ReaderPage() {
  const { id } = useParams({ from: "/read/$id" });
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [articleHtml, setArticleHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading…");
  const [error, setError] = useState<string | null>(null);

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

        const isPdf = /\.pdf(\?|$)/i.test(it.url) || it.type === "paper" || !!it.storage_path;

        if (isPdf) {
          setStatus("Resolving PDF link…");
          let sourceUrl = it.url;
          if (it.storage_path) {
            sourceUrl = await getSignedFileUrl(it.storage_path);
          }
          if (cancelled) return;
          setPdfUrl(sourceUrl);
        } else {
          setStatus("Preparing article iframe view…");
          try {
            const res = await fetchArticleHtml({ data: { url: it.url } });
            if (cancelled) return;
            if (res && res.html) {
              setArticleHtml(res.html);
            } else {
              throw new Error("No HTML content returned");
            }
          } catch (fetchErr: unknown) {
            console.warn("Failed to fetch proxy HTML, falling back to direct iframe:", fetchErr);
            // Fallback to direct URL if proxy fails
            setPdfUrl(it.url);
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

  return (
    <div className="flex h-screen flex-col bg-[#ffffeb] text-[#1a1a1a] overflow-hidden">
      {/* Top Navbar */}
      <header className="flex h-16 items-center justify-between border-b border-stone-mist/40 bg-white/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-mist text-midnight-ink transition-colors hover:bg-cream-paper"
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex flex-col">
            <span
              className="font-instrument italic text-midnight-ink line-clamp-1 max-w-[180px] sm:max-w-[450px]"
              style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}
            >
              {item?.title || "Reader"}
            </span>
            {item?.domain && (
              <span className="text-[10px] uppercase tracking-wider text-graphite-veil font-semibold">
                {item.domain}
              </span>
            )}
          </div>
        </div>

        {item && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-stone-mist bg-white px-3.5 py-1.5 text-midnight-ink hover:bg-cream-paper"
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            Open original ↗
          </a>
        )}
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 bg-[#ffffeb] relative">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 opacity-70">
            <Loader2 size={24} className="animate-spin text-deep-forest-teal" />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{status}</span>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center opacity-70">
            <span style={{ fontSize: 14 }}>{error}</span>
            {item && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="underline"
                style={{ fontSize: 13 }}
              >
                Open original link ↗
              </a>
            )}
          </div>
        ) : pdfUrl ? (
          <iframe src={pdfUrl} className="h-full w-full border-none bg-white" title={item?.title} />
        ) : articleHtml ? (
          <iframe
            srcDoc={articleHtml}
            className="h-full w-full border-none bg-white"
            title={item?.title}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center opacity-70"
            style={{ fontSize: 14 }}
          >
            Unable to load item.
          </div>
        )}
      </main>
    </div>
  );
}
