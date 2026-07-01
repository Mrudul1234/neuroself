import { createFileRoute } from "@tanstack/react-router";

/**
 * Generate an AI book-cover thumbnail for a library item using Nano Banana
 * (google/gemini-3.1-flash-image) via the Lovable AI Gateway.
 *
 * Returns { dataUrl: "data:image/png;base64,..." } for the client to store
 * as thumbnail_url on the library item.
 */
function generateSvgCover(title: string, type?: string, domain?: string): string {
  // Select color scheme based on item type or title hash
  const colors = [
    { bg: "#fffaf0", accent: "#f0b265", text: "#1a1a1a", secondary: "#5f5f59" },
    { bg: "#fffaf0", accent: "#a8d5e8", text: "#1a1a1a", secondary: "#5f5f59" },
    { bg: "#fffaf0", accent: "#dcc5f0", text: "#1a1a1a", secondary: "#5f5f59" },
  ];
  
  // Hash title to pick color scheme
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const scheme = colors[Math.abs(hash) % colors.length];
  
  // Format title: wrap lines (approx 20 chars per line)
  const words = title.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + " " + word).trim().length > 18) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + " " + word).trim();
    }
  }
  if (currentLine) {
    lines.push(currentLine.trim());
  }
  
  // Keep up to 6 lines
  const displayLines = lines.slice(0, 6);
  
  // Build SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
    <!-- Background -->
    <rect width="400" height="600" fill="${scheme.bg}" />
    
    <!-- Pattern/Grain Texture effect using SVG filters -->
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.03 0" />
      <feComposite operator="in" in2="SourceGraphic" />
    </filter>
    <rect width="400" height="600" filter="url(#noise)" />
    
    <!-- Frame / Borders -->
    <rect x="20" y="20" width="360" height="560" fill="none" stroke="${scheme.accent}" stroke-width="1.5" opacity="0.6" />
    <rect x="25" y="25" width="350" height="550" fill="none" stroke="${scheme.accent}" stroke-width="0.5" opacity="0.4" />
    
    <!-- Accent shape in center/bottom -->
    <circle cx="200" cy="460" r="45" fill="${scheme.accent}" opacity="0.15" />
    <circle cx="200" cy="460" r="25" fill="none" stroke="${scheme.accent}" stroke-width="1" opacity="0.3" />
    
    <!-- Category Tag -->
    <text x="200" y="80" font-family="'Figtree', sans-serif" font-size="11" font-weight="600" letter-spacing="0.2em" fill="${scheme.secondary}" text-anchor="middle" opacity="0.7">
      ${(type || "item").toUpperCase()}
    </text>
    
    <!-- Domain Tag -->
    ${domain ? `
    <text x="200" y="520" font-family="'Instrument Serif', serif" font-size="14" font-style="italic" fill="${scheme.secondary}" text-anchor="middle">
      ${domain}
    </text>
    ` : ""}
    
    <!-- Title Lines (wrapped) -->
    <g transform="translate(0, 180)">
      ${displayLines.map((line, idx) => `
        <text x="200" y="${idx * 40}" font-family="'Fraunces', serif" font-size="28" font-weight="500" fill="${scheme.text}" text-anchor="middle" letter-spacing="-0.02em">
          ${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </text>
      `).join("")}
    </g>
    
    <!-- Editorial brand mark at the very bottom -->
    <line x1="180" y1="550" x2="220" y2="550" stroke="${scheme.accent}" stroke-width="1" opacity="0.5" />
  </svg>`;

  return Buffer.from(svg).toString("base64");
}

export const Route = createFileRoute("/api/generate-cover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;

        let body: { title?: string; type?: string; domain?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const title = (body.title ?? "").toString().slice(0, 300).trim();
        if (!title) {
          return new Response(JSON.stringify({ error: "Missing title" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!key) {
          console.warn("[Lovable API] LOVABLE_API_KEY is not defined. Falling back to procedural cover generation.");
          const svgBase64 = generateSvgCover(title, body.type, body.domain);
          return new Response(
            JSON.stringify({ dataUrl: `data:image/svg+xml;base64,${svgBase64}` }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }


        const kind =
          body.type === "video"
            ? "cinematic minimalist thumbnail"
            : body.type === "article"
              ? "editorial magazine cover"
              : "scholarly book cover";

        const prompt = `Design a ${kind} for a saved item titled "${title}"${
          body.domain ? ` from ${body.domain}` : ""
        }. Vertical 2:3 portrait aspect. Warm cream paper background (#fffaf0), soft grain texture, muted amber and deep teal accents, elegant italic serif typography with the title visible and legible. Editorial, tactile, understated, no logos, no watermarks, no photorealistic faces. Rich but calm — like a rare-books library.`;

        try {
          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/images/generations",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3.1-flash-image",
                messages: [{ role: "user", content: prompt }],
                modalities: ["image", "text"],
              }),
            },
          );

          if (!upstream.ok) {
            const text = await upstream.text().catch(() => "");
            const status = upstream.status === 402 || upstream.status === 429
              ? upstream.status
              : 500;
            return new Response(
              JSON.stringify({
                error:
                  upstream.status === 429
                    ? "Rate limited — try again shortly."
                    : upstream.status === 402
                      ? "AI credits exhausted."
                      : `Cover generation failed: ${text || upstream.statusText}`,
              }),
              { status, headers: { "Content-Type": "application/json" } },
            );
          }

          const json = (await upstream.json()) as {
            data?: Array<{ b64_json?: string }>;
          };
          const b64 = json.data?.[0]?.b64_json;
          if (!b64) {
            return new Response(
              JSON.stringify({ error: "No image returned" }),
              { status: 502, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(
            JSON.stringify({ dataUrl: `data:image/png;base64,${b64}` }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              error:
                err instanceof Error
                  ? err.message
                  : "Unexpected error generating cover.",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
