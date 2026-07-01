// ─── TWO-STEP PARCHMENT COVER GENERATION PIPELINE ───────────────────
import { supabase } from "@/integrations/supabase/client";

// Get appropriate model based on title complexity
const getTextModel = (title: string): string => {
  if (title.length > 80) return "claude"; // Claude Sonnet 4.6
  return "claude-fast"; // Claude Haiku 4.5
};

// Step 1: Write detailed prompt using Claude via Pollinations Text API
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
- Illustration style: vintage scientific engraving, botanical illustration, or anatomical diagram style
- Color palette: ONLY warm teal (#034f46), gold/amber (#ffa946), cream (#ffffeb), and muted ink brown — no other colors
- Subject: always related to the neuroscience/brain topic in the title
- No photorealism, no modern digital art, no neon
- No text or words in the image — illustration only
- Highly detailed, elegant, scholarly aesthetic
- Aspect ratio: portrait (2:3)

OUTPUT: Return ONLY the image prompt text. 
No explanation, no preamble, no quotes. 
Just the raw prompt string, max 120 words.`;

  const userMessage = `Write an image generation prompt for a cover of ${typeContext[type]} titled: "${title}"`;
  const textModel = getTextModel(title);

  try {
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

    if (!response.ok) throw new Error("Prompt generation failed");
    const imagePrompt = await response.text();
    return imagePrompt.trim();
  } catch (error) {
    console.warn("[NeuroShelf Cover] Step 1 Claude prompt generation failed, using fallback template.", error);
    // Step 1 Fallback
    return `vintage scientific illustration, brain anatomy, cream parchment background, teal and gold accents, elegant engraving style, no text, ${title}`;
  }
};

// Step 2: Build final Pollinations Image URL
const generateCoverImage = async (
  imagePrompt: string,
  selectedModel: string = "flux"
): Promise<string> => {
  const encoded = encodeURIComponent(imagePrompt);
  const seed = Math.floor(Math.random() * 999999);
  const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=400&height=560&model=${selectedModel}&seed=${seed}&nologo=true&enhance=true`;
  return imageUrl;
};

// Main Exported Cover Generation Pipeline
export const generateNeuroShelfCover = async (
  title: string,
  type: "paper" | "article" | "video",
  selectedModel: string = "flux"
): Promise<string | null> => {
  try {
    const imagePrompt = await writeCoverPrompt(title, type);
    console.log("[NeuroShelf Cover] Prompt generated:", imagePrompt);

    const imageUrl = await generateCoverImage(imagePrompt, selectedModel);
    console.log("[NeuroShelf Cover] Final cover details:", {
      title,
      type,
      prompt: imagePrompt,
      url: imageUrl,
    });

    return imageUrl;
  } catch (error) {
    console.error("[NeuroShelf Cover] Cover generation failed:", error);
    return null;
  }
};
