import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuroShelf — Your brain library" },
      { name: "description", content: "A personal digital library for research papers, articles, and videos about the brain." },
    ],
  }),
  component: DesignFoundationPreview,
});

function DesignFoundationPreview() {
  return (
    <div className="min-h-screen bg-cream-paper text-midnight-ink">
      <div className="mx-auto max-w-[1200px] px-8 py-24">
        {/* Two-tone serif headline — the signature treatment */}
        <h1
          className="font-eb-garamond"
          style={{ fontSize: "120px", lineHeight: 0.85, letterSpacing: "-0.07em" }}
        >
          <span className="text-graphite-veil">Neuro</span>
          <span className="text-midnight-ink">Shelf</span>
        </h1>

        <p className="mt-8 max-w-xl text-smoke" style={{ fontSize: 16, lineHeight: 1.3 }}>
          Design foundation loaded. Figtree is wired into the body, EB Garamond carries the headlines,
          and the cream / ink / teal / lavender palette is live. Layout comes next.
        </p>

        {/* Palette swatches — visual sanity check */}
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {[
            ["Cream Paper", "bg-cream-paper", "text-midnight-ink", "border border-stone-mist"],
            ["Midnight Ink", "bg-midnight-ink", "text-white", ""],
            ["Stone Mist", "bg-stone-mist", "text-midnight-ink", ""],
            ["Graphite Veil", "bg-graphite-veil", "text-white", ""],
            ["Smoke", "bg-smoke", "text-white", ""],
            ["White", "bg-white", "text-midnight-ink", "border border-stone-mist"],
            ["Deep Forest Teal", "bg-deep-forest-teal", "text-white", ""],
            ["Lavender Whisper", "bg-lavender-whisper", "text-midnight-ink", ""],
            ["Amber Pulse", "bg-amber-pulse", "text-midnight-ink", ""],
            ["Charcoal", "bg-charcoal", "text-white", ""],
          ].map(([name, bg, fg, border]) => (
            <div
              key={name}
              className={`${bg} ${fg} ${border} flex h-24 items-end p-3 rounded-3xl`}
              style={{ fontSize: 14, fontWeight: 500 }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Type specimens */}
        <div className="mt-24 grid gap-12 lg:grid-cols-2">
          <div>
            <div className="text-smoke" style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Serif — EB Garamond
            </div>
            <div className="mt-4 font-eb-garamond text-midnight-ink" style={{ fontSize: 64, lineHeight: 0.95, letterSpacing: "-0.05em" }}>
              Research Papers
            </div>
            <div className="mt-4 font-eb-garamond text-midnight-ink" style={{ fontSize: 48, lineHeight: 0.95, letterSpacing: "-0.03em" }}>
              Articles
            </div>
          </div>
          <div>
            <div className="text-smoke" style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Sans — Figtree
            </div>
            <div className="mt-4" style={{ fontSize: 20, fontWeight: 500 }}>Nav · 500 / 20px</div>
            <div className="mt-2" style={{ fontSize: 16, fontWeight: 400 }}>Body copy — 400 / 16px with the compact 1.3 leading.</div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-[14px] border border-midnight-ink bg-lavender-whisper px-[18px] py-[10px]" style={{ fontSize: 14, fontWeight: 600 }}>
              + Add to Library
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
