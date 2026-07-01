import { createFileRoute } from "@tanstack/react-router";

/**
 * Generate an AI book-cover thumbnail for a library item using Nano Banana
 * (google/gemini-3.1-flash-image) via the Lovable AI Gateway.
 *
 * Returns { dataUrl: "data:image/png;base64,..." } for the client to store
 * as thumbnail_url on the library item.
 */
export const Route = createFileRoute("/api/generate-cover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(
            JSON.stringify({ error: "Missing LOVABLE_API_KEY" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

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
