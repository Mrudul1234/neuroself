import { FileText, Newspaper, Play } from "lucide-react";
import type { LibraryItem, ItemType } from "@/lib/library";

const iconFor: Record<ItemType, typeof FileText> = {
  paper: FileText,
  article: Newspaper,
  video: Play,
};

interface CardProps {
  item: LibraryItem;
  onClick?: (item: LibraryItem) => void;
}

export function LibraryCard({ item, onClick }: CardProps) {
  const Icon = iconFor[item.type];

  const inner = (
    <>
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-[18px] rounded-b-[4px]">
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
              className="font-eb-garamond text-midnight-ink line-clamp-5"
              style={{ fontSize: 14, lineHeight: 1.05, letterSpacing: "-0.02em" }}
            >
              {item.title}
            </span>
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-multiply"
          style={{
            backgroundImage:
              "radial-gradient(rgba(0,0,0,0.6) 1px, transparent 1px)",
            backgroundSize: "3px 3px",
          }}
        />
        <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/95 shadow-sm">
          <Icon size={10} className="text-midnight-ink" strokeWidth={2.5} />
        </div>
        {/* spine highlight */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.25), rgba(0,0,0,0))",
          }}
        />
      </div>
    </>
  );

  return (
    <div className="group flex w-[88px] shrink-0 flex-col items-center sm:w-[104px]">
      <button
        type="button"
        onClick={() => onClick?.(item)}
        title={item.title}
        className="relative block w-full overflow-hidden rounded-t-[18px] rounded-b-[4px] border border-stone-mist bg-white shadow-[0_8px_14px_-10px_rgba(26,26,26,0.55)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_22px_-12px_rgba(26,26,26,0.55)]"
      >
        {inner}
      </button>
      <div
        className="mt-2 line-clamp-2 w-full text-center text-midnight-ink"
        style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.25 }}
      >
        {item.title}
      </div>
    </div>
  );
}

export function EmptyCard({ label }: { label: string }) {
  return (
    <div className="flex w-[88px] shrink-0 flex-col items-center sm:w-[104px]">
      <div className="flex aspect-[2/3] w-full items-center justify-center rounded-t-[18px] rounded-b-[4px] border-2 border-dashed border-stone-mist bg-white/40 p-2 text-center">
        <span className="text-smoke" style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.25 }}>
          {label}
        </span>
      </div>
    </div>
  );
}
