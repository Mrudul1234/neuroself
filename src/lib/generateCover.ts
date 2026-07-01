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
  type: "paper" | "article" | "video"
): Promise<string> => {
  const typeContext = {
    paper: "a neuroscience research paper",
    article: "a neuroscience article or blog post",
    video: "an educational neuroscience video",
  };

  const systemInstruction = `You are an expert book cover art director 
specializing in vintage academic and scientific illustration. 
Your job is to write a single detailed image generation prompt 
for a book/content cover.

STYLE RULES (always follow these exactly):
- Background: cream or parchment texture (#ffffeb base)
- Illustration style: vintage scientific engraving, 
  botanical illustration, or anatomical diagram style
- Color palette: ONLY warm teal (#034f46), gold/amber (#ffa946), 
  cream (#ffffeb), and muted ink brown — no other colors
- Subject: always related to the neuroscience/brain topic in the title
- No photorealism, no modern digital art, no neon
- No text or words in the image — illustration only
- Highly detailed, elegant, scholarly aesthetic
- Aspect ratio: portrait (2:3)

OUTPUT: Return ONLY the image prompt text. 
No explanation, no preamble, no quotes. 
Just the raw prompt string, max 120 words.`;

  const userMessage = `Write an image generation prompt for a cover 
of ${typeContext[type]} titled: "${title}"`;

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
const generateCoverImage = async (imagePrompt: string, selectedModel: string = "flux"): Promise<string> => {
  const encoded = encodeURIComponent(imagePrompt);
  const seed = Math.floor(Math.random() * 999999);
  
  // Use the user's secret API key
  const apiKey = (import.meta as any).env?.VITE_POLLINATIONS_API_KEY || "sk_3W0bDijmfLwhwIebWPPRKjpwkHegcMWe";

  const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=400&height=560&model=${selectedModel}&seed=${seed}&nologo=true&enhance=true&key=${apiKey}`;

  console.log("[NeuroShelf Cover] Requesting Pollinations Image API:", { imagePrompt, model: selectedModel, imageUrl });

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
  model: string = "flux"
): Promise<string | null> => {
  const cleanedTitle = cleanTitleForPrompt(title);

  let imagePrompt = "";
  try {
    // Step 1: Write the prompt
    imagePrompt = await writeCoverPrompt(cleanedTitle, type);
    console.log("[NeuroShelf Cover] Generated prompt:", imagePrompt);
  } catch (error) {
    console.error("[NeuroShelf Cover] Step 1 Text generation failed:", error);
    
    // Fallback template
    imagePrompt = `vintage scientific illustration, brain anatomy, 
      cream parchment background, teal and gold accents, 
      elegant engraving style, no text, ${cleanedTitle}`;
    console.log("[NeuroShelf Cover] Using fallback prompt:", imagePrompt);
  }

  try {
    // If model is turbo, map it to flux (or whatever fast model the user prefers)
    const resolvedModel = model === "turbo" ? "flux" : model;
    
    // Step 2: Image URL from that prompt
    const imageUrl = await generateCoverImage(imagePrompt, resolvedModel);
    return imageUrl;
  } catch (error) {
    console.error("[NeuroShelf Cover] Step 2 Cover generation failed:", error);
    return null;
  }
};
