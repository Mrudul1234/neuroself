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

STEP 1 — Identify the subject.
If the title names a specific brain region, structure, neurotransmitter, cell
type, or neural process, the image must depict that specific thing (e.g. "Frontal
Lobe" -> the frontal lobe highlighted in a brain cross-section; "Neurons" -> a
neuron cell with dendrites and axon; "Amygdala and Fear" -> the amygdala within
the limbic system).
If the title is generic and names nothing anatomically specific (e.g. "Report,"
"My Notes," "Untitled"), default to a general brain-and-upper-spinal-cord side
profile as the subject — do not leave the subject vague and do not invent
something unrelated to neuroscience.

STEP 2 — Apply this exact visual style, every time, regardless of subject:
Soft gradient-mesh illustration style. The main subject rendered as a smooth,
rounded, semi-abstract object with gentle airbrushed shading and soft gradient
transitions between tones — no hard outlines, no flat color blocking, no line
art. Composed over simple abstract wave or rolling-hill shapes in the
background, layered in soft flowing bands. Warm, muted, earthy color palette:
sage green, terracotta orange, and cream, with soft blended transitions between
them. Gentle, calm, minimal composition with generous negative space. Textured
paper-grain background feel. No face, no head, no human figure, no anatomical
skull or cross-section context — the subject stands alone against the
background shapes.

STEP 3 — Always end the prompt with this exact clause:
No text, no words, no letters, no numbers, no labels, no captions, no logos, no
watermark.

EXAMPLES:

Title: "Frontal Lobe"
Prompt: A soft gradient-mesh illustration of a human brain rendered as a smooth,
rounded semi-abstract object with gentle airbrushed shading, the frontal lobe
region distinguished by a subtle warm color shift within the brain form, no
hard outlines, no flat color blocking. Composed over simple abstract rolling
wave shapes in soft flowing bands. Warm muted palette of sage green, terracotta
orange, and cream with soft blended transitions. Calm, minimal composition,
generous negative space, subtle paper-grain texture background. No face, no
head, no human figure, no skull, no text, no words, no letters, no numbers, no
labels, no captions, no logos, no watermark.

Title: "Neurons: Structure and Function"
Prompt: A soft gradient-mesh illustration of a single neuron rendered as a
smooth, rounded semi-abstract form with branching dendrites and a flowing axon,
gentle airbrushed shading, no hard outlines, no flat color blocking. Composed
over simple abstract wave shapes in soft flowing bands. Warm muted palette of
sage green, terracotta orange, and cream with soft blended transitions. Calm,
minimal composition, generous negative space, subtle paper-grain texture
background. No face, no head, no human figure, no text, no words, no letters,
no numbers, no labels, no captions, no logos, no watermark.

Title: "Report"
Prompt: A soft gradient-mesh illustration of a human brain rendered as a smooth,
rounded semi-abstract object with gentle airbrushed shading, no hard outlines,
no flat color blocking. Composed over simple abstract rolling wave shapes in
soft flowing bands. Warm muted palette of sage green, terracotta orange, and
cream with soft blended transitions. Calm, minimal composition, generous
negative space, subtle paper-grain texture background. No face, no head, no
human figure, no skull, no text, no words, no letters, no numbers, no labels,
no captions, no logos, no watermark.

Now generate the prompt for this title.`;

  const userMessage = `Title: "${title}"`;

  const apiKey =
    (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_POLLINATIONS_API_KEY;

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
  const apiKey =
    (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_POLLINATIONS_API_KEY;

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
        if (error.name !== 'AbortError') {
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
      const fallbackPrompt = `A soft gradient-mesh illustration of a human brain rendered as a smooth, rounded semi-abstract object with gentle airbrushed shading and soft gradient transitions. Composed over simple abstract rolling wave shapes in soft flowing bands. Warm muted palette of sage green, terracotta orange, and cream with soft blended transitions. Calm, minimal composition, generous negative space, subtle paper-grain texture background. No text, no words, no letters, no numbers, no labels, no captions, no logos, no watermark.`;
      const resolvedModel = model === "turbo" ? "flux" : model;
      return await generateCoverImage(fallbackPrompt, resolvedModel);
    } catch (fallbackError) {
      console.error("[NeuroShelf Cover] Fallback cover generation failed:", fallbackError);
      return null;
    }
  }
};

// Clear caches periodically to prevent memory bloat (every 1 hour)
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (promptCache.size > 100) promptCache.clear();
    if (imageCache.size > 50) imageCache.clear();
  }, 3600000);
}
