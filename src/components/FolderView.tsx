import { LibraryCard } from "./LibraryCard";
import type { LibraryItem } from "@/lib/library";

interface Props {
  items: LibraryItem[];
  onChanged?: () => void;
}

function PushPin({ color = "#ef4444" }: { color?: string }) {
  const gradientId = `pin-grad-${color.replace("#", "")}`;
  const darker = color === "#ef4444" ? "#991b1b" : "#2b2b2b";
  
  return (
    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 filter drop-shadow-[2px_4px_3px_rgba(0,0,0,0.38)] pointer-events-none">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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

export function FolderView({ items, onChanged }: Props) {
  return (
    /* Outer Wood Frame Container */
    <div 
      className="w-full rounded-[24px] p-3.5 sm:p-[16px] bg-gradient-to-br from-[#6b4c35] via-[#4d3220] to-[#3a2212] shadow-[0_16px_36px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.18)] relative overflow-hidden"
    >
      {/* Wood grain pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, #000, #000 2px, transparent 2px, transparent 10px)",
        }}
      />
      
      {/* Corkboard Inner Area */}
      <div
        className="min-h-[calc(100vh-140px)] rounded-[12px] p-3 sm:p-5 relative overflow-hidden shadow-[inset_0_8px_24px_rgba(0,0,0,0.6)]"
        style={{
          backgroundColor: "#d5a273", // base warm cork tone
          backgroundImage: `
            radial-gradient(circle at 30% 20%, rgba(94, 57, 33, 0.28) 1.2px, transparent 1.2px),
            radial-gradient(circle at 75% 45%, rgba(68, 38, 17, 0.32) 1.8px, transparent 1.8px),
            radial-gradient(circle at 15% 80%, rgba(94, 57, 33, 0.25) 1.5px, transparent 1.5px),
            radial-gradient(circle at 85% 85%, rgba(68, 38, 17, 0.3) 1.2px, transparent 1.2px),
            radial-gradient(circle at 50% 60%, rgba(120, 80, 50, 0.22) 2px, transparent 2px),
            radial-gradient(circle at 40% 90%, rgba(94, 57, 33, 0.28) 1.5px, transparent 1.5px),
            radial-gradient(circle at 90% 15%, rgba(68, 38, 17, 0.35) 1px, transparent 1px)
          `,
          backgroundSize: "16px 16px, 20px 20px, 24px 24px, 18px 18px, 28px 28px, 22px 22px, 14px 14px",
          backgroundPosition: "0 0, 4px 6px, 12px 8px, 8px 14px, 14px 20px, 18px 2px, 2px 10px"
        }}
      >
        {/* Soft shadow cast from the wood frame onto the cork */}
        <div className="absolute inset-0 pointer-events-none rounded-[12px] shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)]" />

        {/* Torn-paper Title Card pinned at the top */}
        <div className="relative mb-6 text-center select-none pt-2 z-10">
          <div
            className="inline-block bg-[#fcfbfa] px-6 py-2.5 shadow-[2px_5px_12px_rgba(0,0,0,0.22)] relative border border-[#e8e2d5] overflow-visible"
            style={{ 
              transform: "rotate(-1.2deg)",
              borderRadius: "3px 5px 2px 6px",
            }}
          >
            {/* Red pushpin at the top center */}
            <PushPin color="#ef4444" />
            
            <h1 
              className="font-caveat text-midnight-ink font-bold tracking-tight leading-none"
              style={{ fontSize: 26 }}
            >
              My Shelf
            </h1>
            <p 
              className="text-[9px] text-smoke mt-1 font-medium font-sans tracking-widest uppercase"
              style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              pinned items
            </p>
          </div>
        </div>

        {/* Grid of pinned polaroid cards */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none z-10 relative">
            <div 
              className="bg-white/90 px-5 py-3.5 rounded-[6px] shadow-[2px_4px_8px_rgba(0,0,0,0.15)] border border-stone-mist/40 max-w-[200px]"
              style={{ transform: "rotate(1deg)" }}
            >
              <p className="text-xs font-semibold text-midnight-ink leading-tight">
                No items pinned yet!
              </p>
              <p className="text-[10px] text-smoke mt-1 leading-normal">
                Click the "Add Item" button below to start pinning.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pb-5 z-10 relative">
            {items.map((item, idx) => (
              <div key={item.id} className="flex justify-center w-full">
                <LibraryCard
                  item={item}
                  width={140}
                  index={idx}
                  isPinboard={true}
                  onChanged={onChanged}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
