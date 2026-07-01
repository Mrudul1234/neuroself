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

// Generate cover image URL directly using Pollinations AI Image API
export const generateNeuroShelfCover = async (
  title: string,
  type: "paper" | "article" | "video",
  model: string = "turbo"
): Promise<string> => {
  const cleanedTitle = cleanTitleForPrompt(title);

  // Position the title at the very start of the prompt for strong subject/topic alignment
  const stylePrompts = {
    paper: `"${cleanedTitle}", vintage academic book cover, cream parchment texture background, 
      elegant serif typography, subtle anatomical brain illustration, 
      warm teal #034f46 and gold #ffa946 ink accents, ornate decorative 
      border, botanical scientific engraving style, 
      no text except title, soft warm lighting, aged paper texture, 
      highly detailed illustration, editorial academic aesthetic, 
      not photorealistic, not modern digital, not neon, not white background`,

    article: `"${cleanedTitle}", vintage journal magazine cover, cream ivory background, 
      delicate neuroscience diagram illustration, 
      thin elegant line art of neural pathways or brain cross-section, 
      teal and amber color palette, clean editorial layout, 
      hand-drawn scientific illustration style, 
      scholarly yet beautiful, no cluttered elements, 
      not photorealistic, not modern digital, not neon, not white background`,

    video: `"${cleanedTitle}", modern educational book cover, cream background with 
      subtle geometric neural network pattern, 
      bold EB Garamond serif typography, 
      soft illustrated brain anatomy diagram centered, 
      deep forest teal #034f46 accent elements, 
      clean minimal academic poster style, 
      warm sophisticated palette, slight watercolor wash texture, 
      not photorealistic, not modern digital, not neon, not white background`
  };

  const prompt = encodeURIComponent(stylePrompts[type]);
  const seed = Math.floor(Math.random() * 999999);

  const url = `https://image.pollinations.ai/prompt/${prompt}?width=400&height=560&seed=${seed}&model=${model}&nologo=true`;

  console.log("[NeuroShelf Cover] Constructed URL:", { title, cleanedTitle, type, model, url });
  return url;
};
