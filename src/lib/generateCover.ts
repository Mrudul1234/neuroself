// ─── POLLINATIONS COVER GENERATION UTILITY ───────────────────

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

// ── STEP 1: AI writes the image prompt ──────────────────
const writeCoverPrompt = async (
  title: string,
  type: "paper" | "article" | "video",
): Promise<string> => {
  const systemInstruction = `You are a creative book cover art director.
Your job is to write a single precise image generation prompt that describes a beautiful cover illustration matching the title: "${title}".

Style Guidelines:
- Design: Clean, simple, and modern editorial illustration. Bright and visually uplifting.
- Theme: The illustration should visually resemble or directly represent the core concept of the title in a simple, metaphoric way.
- Aesthetic: Bright, uncluttered composition with generous negative space and a clean, light cream background. Use a harmonious, bright, but limited color palette (3-4 colors max, e.g. soft teal, gold/amber, and cream).
- No text: NO words, NO letters, NO numbers, NO labels, NO logos, NO watermarks.

OUTPUT: Return ONLY the raw image generation prompt text under 80 words. No intro, no quotes, no explanations.`;

  const userMessage = `Create a simple, bright, and modern book cover illustration prompt for the content title: "${title}". Make the visual design closely represent and look similar to the title's meaning. No text.`;

  const textModel = getTextModel(title);

  const response = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userMessage },
      ],
      model: textModel,
      seed: Math.floor(Math.random() * 99999),
      jsonMode: false,
    }),
  });

  if (!response.ok) throw new Error(`Prompt generation failed: ${response.status}`);
  const imagePrompt = await response.text();
  return imagePrompt.trim();
};

// ── STEP 2: Generate image from AI prompt ─────────────
const generateCoverImage = async (
  imagePrompt: string,
  selectedModel: string = "flux",
): Promise<string> => {
  const encoded = encodeURIComponent(imagePrompt);
  const seed = Math.floor(Math.random() * 999999);

  // Use the user's secret API key
  const apiKey =
    (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_POLLINATIONS_API_KEY ||
    "sk_3W0bDijmfLwhwIebWPPRKjpwkHegcMWe";

  const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=400&height=560&model=${selectedModel}&seed=${seed}&nologo=true&enhance=false&key=${apiKey}`;

  console.log("[NeuroShelf Cover] Requesting Pollinations Image API:", {
    imagePrompt,
    model: selectedModel,
    imageUrl,
  });

  try {
    // Actually make the API call to force Pollinations to generate it right now
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn("[NeuroShelf Cover] Image API returned non-OK status:", response.status);
    }
  } catch (error) {
    console.error("[NeuroShelf Cover] Image API fetch failed:", error);
  }

  return imageUrl;
};

// ── MAIN EXPORT: full pipeline ───────────────────────────────
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

    // Generate the cover using the visual prompt
    const imageUrl = await generateCoverImage(imagePrompt, resolvedModel);
    return imageUrl;
  } catch (error) {
    console.error("[NeuroShelf Cover] Cover generation failed:", error);
    // Fallback: if text generation fails, use a direct fallback template
    try {
      const fallbackPrompt = `A calm, minimal, aesthetically soothing simple bright illustration about "${cleanedTitle}" in a layered papercut craft style. Bright, uncluttered composition with generous negative space. No text, no words.`;
      const resolvedModel = model === "turbo" ? "flux" : model;
      return await generateCoverImage(fallbackPrompt, resolvedModel);
    } catch (fallbackError) {
      console.error("[NeuroShelf Cover] Fallback cover generation failed:", fallbackError);
      return null;
    }
  }
};
