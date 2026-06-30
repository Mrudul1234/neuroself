import { FileText, Newspaper, Play } from "lucide-react";
import type { LibraryItem, ItemType } from "@/lib/library";

const iconFor: Record<ItemType, typeof FileText> = {
  paper: FileText,
  article: Newspaper,
  video: Play,
};

interface CardProps {
  item: LibraryItem;
}

export function LibraryCard({ item }: CardProps) {
  const Icon = iconFor[item.type];

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group block w-[200px] shrink-0 rounded-[32px] border border-stone-mist bg-white transition-all duration-200 hover:-translate-y-1 hover:border-graphite-veil hover:shadow-[0_18px_40px_-20px_rgba(26,26,26,0.35)] sm:w-[220px]"
    >
      {/* Thumbnail — 2:3 ratio, rounded only on top */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-[32px]">
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-cream-paper px-4 text-center">
            <span
              className="font-eb-garamond text-midnight-ink"
              style={{ fontSize: 24, lineHeight: 1.05, letterSpacing: "-0.03em" }}
            >
              {item.title}
            </span>
          </div>
        )}

        {/* Grain overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
          style={{
            backgroundImage:
              "radial-gradient(rgba(0,0,0,0.6) 1px, transparent 1px)",
            backgroundSize: "3px 3px",
          }}
        />

        {/* Type badge */}
        <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
          <Icon size={14} className="text-midnight-ink" strokeWidth={2.25} />
        </div>
      </div>

      {/* Meta */}
      <div className="px-4 py-4">
        <div
          className="line-clamp-2 text-midnight-ink"
          style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}
        >
          {item.title}
        </div>
        {item.domain && (
          <div
            className="mt-1 truncate text-smoke"
            style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.3 }}
          >
            {item.domain}
          </div>
        )}
      </div>
    </a>
  );
}

export function EmptyCard({ label }: { label: string }) {
  return (
    <div className="flex aspect-[2/3] w-[200px] shrink-0 items-center justify-center rounded-[32px] border-2 border-dashed border-stone-mist bg-transparent p-6 text-center sm:w-[220px]">
      <span className="text-smoke" style={{ fontSize: 14, fontWeight: 500 }}>
        {label}
      </span>
    </div>
  );
}
