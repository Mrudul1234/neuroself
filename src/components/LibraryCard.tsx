import { Link } from "@tanstack/react-router";
import { FileText, Newspaper, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getSignedFileUrl, type LibraryItem, type ItemType } from "@/lib/library";

const iconFor: Record<ItemType, typeof FileText> = {
  paper: FileText,
  article: Newspaper,
  video: Play,
};

interface CardProps {
  item: LibraryItem;
  /** Width in px for the cover */
  width?: number;
}

export function LibraryCard({ item, width = 132 }: CardProps) {
  const Icon = iconFor[item.type];
  const isExternalVideo = item.type === "video";
  // A paper either has a stored file (storage_path) or a remote PDF URL → open in new tab.
  const isStoredPdf = !!item.storage_path;
  const isExternalPdf = !isStoredPdf && /\.pdf(\?|$)/i.test(item.url);
  const opensInNewTab = isExternalVideo || isStoredPdf || isExternalPdf;
  const [opening, setOpening] = useState(false);

  const cover = (
    <div
      className="relative w-full overflow-hidden rounded-[14px] border border-stone-mist bg-white shadow-[0_14px_26px_-14px_rgba(26,26,26,0.55),0_2px_4px_-2px_rgba(26,26,26,0.25)] transition-all duration-200 group-hover:-translate-y-1.5 group-hover:shadow-[0_24px_36px_-16px_rgba(26,26,26,0.6),0_4px_6px_-2px_rgba(26,26,26,0.25)]"
      style={{ aspectRatio: "2 / 3" }}
    >
      {item.thumbnail_url ? (
        <img
          src={item.thumbnail_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-cream-paper px-2 text-center">
          <span
            className="font-instrument text-midnight-ink line-clamp-6"
            style={{ fontSize: 16, lineHeight: 1.05, letterSpacing: "-0.02em" }}
          >
            {item.title}
          </span>
        </div>
      )}
      {/* paper grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-multiply"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.7) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
      {/* type pill */}
      <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/95 shadow-sm">
        <Icon size={10} className="text-midnight-ink" strokeWidth={2.5} />
      </div>
      {/* book spine shadow */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
        style={{
          background: "linear-gradient(to right, rgba(0,0,0,0.28), rgba(0,0,0,0))",
        }}
      />
      {/* page-fold corner */}
      <div
        className="pointer-events-none absolute right-0 top-0"
        style={{
          width: 14,
          height: 14,
          background:
            "linear-gradient(225deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.05) 50%, transparent 60%)",
        }}
      />
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
      setOpening(false);
    }
  };

  return (
    <div className="group flex shrink-0 flex-col items-center" style={{ width }}>
      {isStoredPdf ? (
        <a
          href="#"
          onClick={handleOpenStored}
          title={item.title}
          className="block w-full"
        >
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
        className="mt-2.5 line-clamp-2 w-full text-center font-instrument text-midnight-ink"
        style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.15, letterSpacing: "-0.01em" }}
      >
        {item.title}
      </div>
      {item.domain && (
        <div
          className="mt-0.5 line-clamp-1 w-full text-center uppercase text-graphite-veil"
          style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.12em" }}
        >
          {item.domain}
        </div>
      )}
    </div>
  );
}

export function EmptyCard({ label, width = 120 }: { label: string; width?: number }) {
  return (
    <div className="flex shrink-0 flex-col items-center" style={{ width }}>
      <div
        className="flex w-full items-center justify-center rounded-[14px] border-2 border-dashed border-stone-mist bg-white/40 p-2 text-center"
        style={{ aspectRatio: "2 / 3" }}
      >
        <span
          className="text-smoke"
          style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3 }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
