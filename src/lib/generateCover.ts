// ─── POLLINATIONS COVER GENERATION UTILITY (OPTIMIZED) ───────────────────

// In-memory cache for generated prompts to avoid redundant API calls
const promptCache = new Map<string, string>();
const imageCache = new Map<string, string>();

export function cleanTitleForPrompt(title: string): string {
  // Strip bracketed numbers, codes, underscores, and extra whitespaces
  let cleaned = title
    .replace(/\[\d+\]/g, "")
    .replace(/\b\d+\b/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Truncate to first 60 characters
  if (cleaned.length > 60) {
    cleaned = cleaned.slice(0, 60).trim();
  }
  return cleaned || "Scientific Research";
}

const getTextModel = (title: string): string => {
  // Longer, more complex titles benefit from smarter model
  if (title.length > 80) return "openai-large"; // Fallback from claude
  return "openai"; // Fallback from claude-fast
};

// ── STEP 1: AI writes the image prompt (with caching) ──────────────────
const writeCoverPrompt = async (
  title: string,
  type: "paper" | "article" | "video",
): Promise<string> => {
  // Check cache first
  const cacheKey = `${title}:${type}`;
  if (promptCache.has(cacheKey)) {
    console.log("[NeuroShelf Cover] Using cached prompt");
    return promptCache.get(cacheKey)!;
  }

  const systemInstruction = `You are an image-prompt generator for a neuroscience and cognitive-science content
library called NeuroShelf. You will be given the title of a piece of content — a
paper, article, or video. Output a single, ready-to-use image-generation prompt.
Nothing else. No explanation, no preamble, no markdown, no quotation marks around
the output — just the prompt text itself.

STEP 1 — Choose the design elements.
Based on the mood and subject of the title, select one option for each of the following:
- Background Color: Choose from deep orange, cobalt blue, forest green, cream, coral red, mustard yellow, or navy.
- Typography: Choose one from Neue Haas Grotesk, Söhne, General Sans, Fraunces (bold serif/italic), Canela, Editorial New, Recoleta, Aeonik, or Archivo Black.
- Title Placement: Choose one from:
  1. Top-left aligned, large scale, breaking into 2–3 lines
  2. Dead-center, medium scale, single or double line
  3. Bottom-anchored, with subtitle above it
  4. Title split across the card with one word large at top and one word large at bottom
  5. Off-center/asymmetric placement with generous negative space on one side

STEP 2 — Construct the final prompt using this template:
niche neuroscience,brainparts,neuroscience,cognitive science,aiml,computer science,neuroscience the design a single flat-color poster card in a bold modern editorial/Swiss design style, similar to a minimalist typographic book cover. Background: solid flat color block in [SELECTED COLOR].
Typography: The title "[EXACT TITLE]" is set in [SELECTED TYPOGRAPHY].
Title placement: [SELECTED TITLE PLACEMENT]. The title must stay fully inside a safe margin (minimum 8–10% padding from every edge) — never cropped, cut off, or bleeding off the canvas.
Supporting elements: A small thin-lined subtitle/tagline in a lighter weight, positioned near the title. A small numbered label (e.g. "01") in a top or bottom corner, in muted, low-contrast text.
Overall style: Generous negative space, high contrast between text and background, no imagery or icons — pure typographic composition. Confident, editorial, print-like, similar to a limited-edition design zine or book cover.

Replace [SELECTED COLOR], [SELECTED TYPOGRAPHY], [SELECTED TITLE PLACEMENT], and [EXACT TITLE] with your choices and the provided title. Do not include the brackets.

Now generate the prompt for the given title.`;

  const userMessage = `Title: "${title}"`;

  const apiKey = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_POLLINATIONS_API_KEY;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userMessage },
      ],
      model: "openai",
      seed: Math.floor(Math.random() * 99999),
      jsonMode: false,
    }),
  });

  if (!response.ok) throw new Error(`Prompt generation failed: ${response.status}`);
  const data = await response.json();
  const imagePrompt = data?.choices?.[0]?.message?.content;
  if (!imagePrompt || !imagePrompt.trim()) {
    throw new Error("Empty prompt returned from chat completions.");
  }

  const cleanedPrompt = imagePrompt.trim().replace(/^"|"$/g, "");

  // Cache the prompt
  promptCache.set(cacheKey, cleanedPrompt);

  return cleanedPrompt;
};

// ── STEP 2: Generate image from AI prompt (with timeout & abort) ─────────
const generateCoverImage = async (
  imagePrompt: string,
  selectedModel: string = "flux",
): Promise<string> => {
  // Check image cache
  const imageCacheKey = `${imagePrompt}:${selectedModel}`;
  if (imageCache.has(imageCacheKey)) {
    console.log("[NeuroShelf Cover] Using cached image URL");
    return imageCache.get(imageCacheKey)!;
  }

  const encoded = encodeURIComponent(imagePrompt);
  const seed = Math.floor(Math.random() * 999999);

  // Use the user's secret API key
  const apiKey = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_POLLINATIONS_API_KEY;

  const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=400&height=600&model=${selectedModel}&seed=${seed}&nologo=true&enhance=false${apiKey ? `&key=${apiKey}` : ""}`;

  console.log("[NeuroShelf Cover] Requesting Pollinations Image API:", {
    imagePrompt,
    model: selectedModel,
    seed,
  });

  try {
    // Use AbortController with 30-second timeout for non-blocking operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Non-blocking fetch: return URL immediately, generate in background
    fetch(imageUrl, { signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          console.warn("[NeuroShelf Cover] Image API returned non-OK status:", response.status);
        } else {
          console.log("[NeuroShelf Cover] Image generated successfully");
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name !== "AbortError") {
          console.error("[NeuroShelf Cover] Image API fetch failed:", error);
        }
      });
  } catch (error) {
    console.error("[NeuroShelf Cover] Error initiating image fetch:", error);
  }

  // Cache and return URL immediately
  imageCache.set(imageCacheKey, imageUrl);

  return imageUrl;
};

// ── MAIN EXPORT: optimized parallel pipeline ───────────────────────────────
export const generateNeuroShelfCover = async (
  title: string,
  type: "paper" | "article" | "video",
  model: string = "flux",
): Promise<string | null> => {
  const cleanedTitle = cleanTitleForPrompt(title);

  try {
    // Call OpenAI to write the image generation prompt matching the title
    const imagePrompt = await writeCoverPrompt(cleanedTitle, type);
    console.log("[NeuroShelf Cover] Generated Prompt from OpenAI model:", imagePrompt);

    // If model is turbo, map it to flux (or whatever fast model the user prefers)
    const resolvedModel = model === "turbo" ? "flux" : model;

    // Generate the cover using the visual prompt (non-blocking)
    const imageUrl = await generateCoverImage(imagePrompt, resolvedModel);
    return imageUrl;
  } catch (error) {
    console.error("[NeuroShelf Cover] Cover generation failed:", error);
    // Fallback: if text generation fails, use a direct fallback template
    try {
      const fallbackPrompt = `niche neuroscience,brainparts,neuroscience,cognitive science,aiml,computer science,neuroscience the design a single flat-color poster card in a bold modern editorial/Swiss design style, similar to a minimalist typographic book cover. Background: solid flat color block in cream. Typography: The title "Neuroscience Report" is set in Neue Haas Grotesk. Title placement: Dead-center, medium scale, single or double line. The title must stay fully inside a safe margin (minimum 8–10% padding from every edge) — never cropped, cut off, or bleeding off the canvas. Supporting elements: A small thin-lined subtitle/tagline in a lighter weight, positioned near the title. A small numbered label (e.g. "01") in a top or bottom corner, in muted, low-contrast text. Overall style: Generous negative space, high contrast between text and background, no imagery or icons — pure typographic composition. Confident, editorial, print-like, similar to a limited-edition design zine or book cover.`;
      const resolvedModel = model === "turbo" ? "flux" : model;
      return await generateCoverImage(fallbackPrompt, resolvedModel);
    } catch (fallbackError) {
      console.error("[NeuroShelf Cover] Fallback cover generation failed:", fallbackError);
      return null;
    }
  }
};

// Clear caches periodically to prevent memory bloat (every 1 hour)
if (typeof window !== "undefined") {
  setInterval(() => {
    if (promptCache.size > 100) promptCache.clear();
    if (imageCache.size > 50) imageCache.clear();
  }, 3600000);
}
