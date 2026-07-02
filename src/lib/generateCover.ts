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
  const typeContext = {
    paper: "a neuroscience research paper",
    article: "a neuroscience article or blog post",
    video: "an educational neuroscience video",
  };

  const systemInstruction = `You are an expert vintage academic book cover illustrator.
Your job is to write a single precise image generation prompt that creates a book cover illustration matching this exact style:

REFERENCE STYLE (always follow these exactly):
- Background: warm cream/off-white (#ffffeb) with a subtle fine dot or linen grid texture, like aged paper
- Illustration style: vintage scientific engraving or 1950s medical textbook anatomical illustration — hand-drawn feel, slightly stylized
- Color palette: ONLY warm teal (#034f46), gold/amber (#ffa946), and cream (#ffffeb) — maximum 3 colors, no other hues
- Subject: always a neuroscience/brain-related anatomical illustration directly related to the title topic — centered in frame
- Decorative elements: elegant ornamental swirl flourishes or ribbon motifs in teal and gold at bottom or corners
- NO text, NO words, NO labels in the image — illustration only
- NO photorealism, NO 3D rendering, NO gradients, NO digital art effects
- Style words: vintage, botanical, engraving, anatomical, scholarly, editorial, classic book cover
- Aspect ratio: tall portrait (2:3), like a hardcover book

OUTPUT: Return ONLY the raw image prompt text.
No explanation, no preamble, no quotes.
Max 140 words.`;

  const userMessage = `Write an image generation prompt for a vintage academic book cover illustration for ${typeContext[type]} titled: "${title}"

The illustration should depict the specific neuroscience/brain concept named in the title, drawn in the style of a 1940s–1960s medical anatomy textbook engraving on cream paper. Include teal and gold ornamental swirl flourishes at the bottom. NO text.`;

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

  const promptTemplate = `A calm, minimal, aesthetically soothing illustration about "{TITLE}" in a layered papercut craft
style — soft stacked paper depth, hand-cut layered composition, contemporary
educational-illustration aesthetic. Abstract flowing lines inspired by DTI fiber
tractography and neural pathways, arranged in gentle spiral and organic wave
motifs, as the dominant visual motif. Soft Fauvist-inspired color harmony with
painterly textures. Subtle, limited pop-art color blocking used sparingly as an
accent, not a dominant style. Light impressionist brush touches, handcrafted
paper feel. Bright, uncluttered composition with generous negative space.
No text, no words, no letters, no numbers, no typography, no captions, no logos,
no watermark.`;

  const imagePrompt = promptTemplate.replace(/{TITLE}/g, cleanedTitle);

  try {
    // If model is turbo, map it to flux (or whatever fast model the user prefers)
    const resolvedModel = model === "turbo" ? "flux" : model;

    // Direct Image URL generation using our master prompt
    const imageUrl = await generateCoverImage(imagePrompt, resolvedModel);
    return imageUrl;
  } catch (error) {
    console.error("[NeuroShelf Cover] Cover generation failed:", error);
    return null;
  }
};
