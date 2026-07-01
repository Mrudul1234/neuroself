import { supabase } from "@/integrations/supabase/client";
import {
  insertItemServer,
  updateItemServer,
  deleteItemServer,
  createUploadUrlServer,
} from "./library.functions";

export type ItemType = "paper" | "article" | "video";

export interface LibraryItem {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  type: ItemType;
  domain: string | null;
  created_at: string;
  storage_path?: string | null;
  extracted_text?: string | null;
  file_size?: number | null;
}

export interface DraftItem {
  title: string;
  url: string;
  thumbnail_url: string | null;
  type: ItemType;
  domain: string | null;
  storage_path?: string | null;
  file_size?: number | null;
  extracted_text?: string | null;
}

const BUCKET = "library-files";

export function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isYouTube(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function isPdf(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

async function fetchYouTube(url: string): Promise<DraftItem | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; thumbnail_url?: string };
    return {
      title: data.title ?? url,
      url,
      thumbnail_url: data.thumbnail_url ?? null,
      type: "video",
      domain: getDomain(url),
    };
  } catch {
    return null;
  }
}

async function fetchOpenGraph(url: string): Promise<Partial<DraftItem> | null> {
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      data?: { title?: string; image?: { url?: string }; description?: string };
    };
    if (json.status !== "success" || !json.data) return null;
    return {
      title: json.data.title ?? undefined,
      thumbnail_url: json.data.image?.url ?? null,
    };
  } catch {
    return null;
  }
}

export async function detectMetadata(rawUrl: string): Promise<DraftItem> {
  const url = rawUrl.trim();
  const domain = getDomain(url);

  if (isYouTube(url)) {
    const yt = await fetchYouTube(url);
    if (yt) return yt;
    return { title: url, url, thumbnail_url: null, type: "video", domain };
  }

  if (isPdf(url)) {
    const og = await fetchOpenGraph(url);
    const fileName =
      decodeURIComponent(url.split("/").pop() ?? "")
        .replace(/\.pdf.*$/i, "")
        .replace(/[-_]+/g, " ")
        .trim() || domain || "Untitled PDF";
    return {
      title: og?.title || fileName,
      url,
      thumbnail_url: og?.thumbnail_url ?? null,
      type: "paper",
      domain,
    };
  }

  const og = await fetchOpenGraph(url);
  return {
    title: og?.title || domain || url,
    url,
    thumbnail_url: og?.thumbnail_url ?? null,
    type: "article",
    domain,
  };
}

export async function listItems(): Promise<LibraryItem[]> {
  const { data, error } = await supabase
    .from("library_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LibraryItem[];
}

export async function getItem(id: string): Promise<LibraryItem | null> {
  const { data, error } = await supabase
    .from("library_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as LibraryItem | null) ?? null;
}

export async function insertItem(draft: DraftItem): Promise<LibraryItem> {
  const data = await insertItemServer({ data: draft });
  return data as LibraryItem;
}

export async function updateItem(
  id: string,
  patch: Partial<DraftItem>,
): Promise<void> {
  await updateItemServer({ data: { id, patch } });
}

export async function deleteItem(id: string): Promise<void> {
  await deleteItemServer({ data: { id } });
}

/** Delete both the row and its uploaded PDF (if any). */
export async function deleteItemWithFile(item: LibraryItem): Promise<void> {
  await deleteItemServer({
    data: {
      id: item.id,
      storage_path: item.storage_path || null,
    },
  });
}

/** Convert an HTMLImageElement to a base64 PNG dataUrl via canvas */
async function imgElementToDataUrl(img: HTMLImageElement): Promise<string> {
  return new Promise((resolve, reject) => {
    // If the image is already loaded, draw immediately
    const draw = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 512;
        canvas.height = img.naturalHeight || 512;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas context unavailable")); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    if (img.complete && img.naturalWidth) {
      draw();
    } else {
      img.onload = draw;
      img.onerror = () => reject(new Error("Image failed to load"));
    }
  });
}

// ─── Art style pools for maximum variety ───────────────────────────────────
const ART_STYLES = [
  "risograph print, grainy texture, two-tone color separation",
  "vintage scientific illustration, ink etching, cross-hatching, aged paper",
  "Japanese woodblock print style, flat bold colors, decorative borders",
  "Swiss modernist poster, geometric shapes, bold typography, clean layout",
  "watercolor wash, loose brushstrokes, soft bleeding edges, textured paper",
  "Soviet constructivist poster, diagonal composition, stark contrast",
  "Art Nouveau ornamental, flowing organic lines, botanical motifs",
  "brutalist editorial, raw concrete textures, high contrast black and white",
  "Dutch Golden Age still life lighting, dramatic chiaroscuro, rich oil texture",
  "Memphis design movement, geometric patterns, pastel and neon colors",
  "Penguin Books vintage cover style, horizontal bands, bold typography",
  "Bauhaus design, primary colors, geometric abstraction, industrial feel",
  "linocut print, rough edges, bold black lines, limited color palette",
  "surrealist collage, dreamlike imagery, unexpected juxtapositions",
  "cyberpunk neon aesthetic, glowing lines, dark background, electric colors",
];

const VISUAL_SUBJECTS: Record<string, string[]> = {
  paper: [
    "an open book with glowing pages floating in cosmic space",
    "stacked academic journals on a wooden desk with warm lamplight",
    "a brain made of interconnected luminous nodes",
    "abstract geometric shapes forming a scientific diagram",
    "microscopic cellular structures magnified to fill the frame",
    "mathematical equations spiraling into fractal patterns",
    "an hourglass filled with swirling knowledge symbols",
    "a tree whose roots are circuits and branches are ideas",
  ],
  article: [
    "a newspaper unfolding in mid-air revealing a vivid scene inside",
    "a magnifying glass over a world map with glowing highlights",
    "ink splashes forming the silhouette of a city skyline",
    "a typewriter surrounded by floating letters and symbols",
    "a spotlight illuminating a single word on a dark stage",
    "collage of abstract news imagery layered over each other",
  ],
  video: [
    "a film reel unspooling into a galaxy of stars",
    "a vintage cinema screen glowing in a dark theater",
    "a clapperboard surrounded by cinematic light beams",
    "abstract motion blur of colorful light trails",
    "a projector casting geometric shapes onto fog",
    "a television showing static that morphs into a landscape",
  ],
};

/** Pick a random element from an array using a seed for reproducibility */
function seededPick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

/** Build a rich, unique image generation prompt */
function buildCoverPrompt(item: LibraryItem): { prompt: string; seed: number } {
  const seed = Date.now() ^ (Math.random() * 0xffffffff);
  const style = seededPick(ART_STYLES, seed);
  const subjects = VISUAL_SUBJECTS[item.type] ?? VISUAL_SUBJECTS.paper;
  const subject = seededPick(subjects, seed >> 3);

  const titleKeywords = item.title
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(" ")
    .filter((w) => w.length > 4)
    .slice(0, 3)
    .join(", ");

  const prompt = [
    `Book cover art: ${subject}.`,
    style + ".",
    titleKeywords ? `Themes: ${titleKeywords}.` : "",
    "Vertical 2:3 portrait format.",
    "High detail, award-winning cover design, no text, no letters, no words, no title, no watermarks.",
  ].filter(Boolean).join(" ");

  return { prompt, seed: Math.abs(seed) % 99999 };
}

/** Paint a rich generative SVG cover — unique geometry every time */
function generateClientSvgCover(title: string, type?: string): string {
  let hash = Date.now(); // use time so it differs on each click
  const titleHash = title.split("").reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0);
  hash ^= titleHash;

  const rand = (n: number) => { hash = (hash * 1664525 + 1013904223) & 0xffffffff; return Math.abs(hash) % n; };
  const randF = () => rand(1000) / 1000;

  // Pick a color scheme
  const schemes = [
    { bg: "#0d1117", fg: "#e8c97a", accent: "#4a9eff", mid: "#1a2332" },
    { bg: "#1a0a2e", fg: "#e879f9", accent: "#38bdf8", mid: "#2d1b4e" },
    { bg: "#0a1628", fg: "#34d399", accent: "#f59e0b", mid: "#1e3a5f" },
    { bg: "#2d0a0a", fg: "#f97316", accent: "#fbbf24", mid: "#4a1010" },
    { bg: "#fffaf0", fg: "#1c1410", accent: "#c8a96e", mid: "#f5e6d0" },
    { bg: "#f0f0ff", fg: "#1a0a3e", accent: "#7c3aed", mid: "#e0d0ff" },
    { bg: "#0a2818", fg: "#d1fae5", accent: "#10b981", mid: "#1a4030" },
  ];
  const s = schemes[rand(schemes.length)];

  // Generate unique shapes
  const shapes: string[] = [];

  // Background gradient-like layers
  shapes.push(`<rect width="320" height="480" fill="${s.bg}"/>`);
  shapes.push(`<rect x="0" y="${rand(240)}" width="320" height="${80 + rand(120)}" fill="${s.mid}" opacity="0.6"/>`);

  // Random geometric elements (circles, rects, lines)
  for (let i = 0; i < 5; i++) {
    const x = rand(320); const y = rand(480); const r = 20 + rand(80);
    shapes.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 2 === 0 ? s.accent : s.fg}" opacity="${0.05 + randF() * 0.15}"/>`);
  }
  for (let i = 0; i < 3; i++) {
    const x1 = rand(320); const y1 = rand(480);
    shapes.push(`<line x1="${x1}" y1="${y1}" x2="${rand(320)}" y2="${rand(480)}" stroke="${s.accent}" stroke-width="${1 + rand(3)}" opacity="${0.2 + randF() * 0.4}"/>`);
  }

  // Central decorative element based on type
  const cx = 160; const cy = 200;
  if (type === "video") {
    shapes.push(`<polygon points="${cx},${cy - 50} ${cx + 45},${cy} ${cx},${cy + 50}" fill="${s.accent}" opacity="0.8"/>`);
    shapes.push(`<circle cx="${cx}" cy="${cy}" r="60" fill="none" stroke="${s.accent}" stroke-width="2" opacity="0.5"/>`);
  } else if (type === "article") {
    for (let i = 0; i < 5; i++) shapes.push(`<rect x="${cx - 55}" y="${cy - 40 + i * 16}" width="${30 + rand(80)}" height="4" fill="${s.fg}" opacity="${0.3 + randF() * 0.4}" rx="2"/>`);
  } else {
    // Paper/book — abstract open book shape
    shapes.push(`<path d="M${cx - 50},${cy - 40} Q${cx},${cy - 60} ${cx + 50},${cy - 40} L${cx + 50},${cy + 40} Q${cx},${cy + 20} ${cx - 50},${cy + 40} Z" fill="${s.accent}" opacity="0.2"/>`);
    shapes.push(`<line x1="${cx}" y1="${cy - 50}" x2="${cx}" y2="${cy + 45}" stroke="${s.fg}" stroke-width="1.5" opacity="0.6"/>`);
  }

  // Border
  shapes.push(`<rect x="12" y="12" width="296" height="456" fill="none" stroke="${s.accent}" stroke-width="1" opacity="0.4" rx="2"/>`);

  // Type label
  shapes.push(`<text x="160" y="56" font-family="Georgia,serif" font-size="9" font-weight="bold" letter-spacing="0.2em" fill="${s.accent}" text-anchor="middle" opacity="0.9">${(type ?? "item").toUpperCase()}</text>`);

  // Title text — wrapped, bottom area
  const words = title.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 18) { lines.push(cur.trim()); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur.trim());
  const display = lines.slice(0, 4);
  const startY = 360;
  display.forEach((line, i) => {
    const esc = line.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    shapes.push(`<text x="160" y="${startY + i * 28}" font-family="Georgia,serif" font-size="${i === 0 ? 20 : 17}" fill="${s.fg}" text-anchor="middle" font-weight="${i === 0 ? 'bold' : 'normal'}">${esc}</text>`);
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 480" width="320" height="480">${shapes.join("")}</svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/** Load an image via <img> tag (bypasses CORS fetch restrictions) and convert to dataUrl */
function loadImageViaTag(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timeout = setTimeout(() => reject(new Error("Image load timeout")), 25000);
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 512;
        canvas.height = img.naturalHeight || 768;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch { reject(new Error("Canvas tainted — CORS blocked")); }
    };
    img.onerror = () => { clearTimeout(timeout); reject(new Error("Image failed to load")); };
    img.src = src;
  });
}

export async function generateCover(item: LibraryItem): Promise<string> {
  const { prompt, seed } = buildCoverPrompt(item);
  console.log("[Cover Gen] Prompt:", prompt);

  /** Save thumbnail directly with anon client (no service role key needed) */
  const saveThumbnail = async (dataUrl: string) => {
    await supabase.from("library_items").update({ thumbnail_url: dataUrl }).eq("id", item.id);
  };

  // 1. Try Puter.js with DALL-E-3 — free with Puter account, high quality
  try {
    const puter = (window as any).puter;
    if (puter?.ai?.txt2img) {
      console.log("[Cover Gen] Trying Puter.js (dall-e-3)…");
      const img = await puter.ai.txt2img({
        prompt,
        model: "dall-e-3",
        provider: "openai",
      }) as HTMLImageElement;
      const dataUrl = await imgElementToDataUrl(img);
      await saveThumbnail(dataUrl);
      return dataUrl;
    }
  } catch (e) {
    console.warn("[Cover Gen] Puter.js dall-e-3 failed, trying default:", e);
    // Try Puter with default model
    try {
      const puter = (window as any).puter;
      if (puter?.ai?.txt2img) {
        const img = await puter.ai.txt2img(prompt) as HTMLImageElement;
        const dataUrl = await imgElementToDataUrl(img);
        await saveThumbnail(dataUrl);
        return dataUrl;
      }
    } catch (e2) {
      console.warn("[Cover Gen] Puter.js default failed:", e2);
    }
  }

  // 2. Try Pollinations.ai via img tag — multiple model options
  const pollinationsModels = ["flux-realism", "flux", "turbo"];
  for (const model of pollinationsModels) {
    try {
      console.log(`[Cover Gen] Trying Pollinations.ai (${model})…`);
      const encodedPrompt = encodeURIComponent(prompt);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=768&seed=${seed}&nologo=true&model=${model}&enhance=true`;
      const dataUrl = await loadImageViaTag(url);
      await saveThumbnail(dataUrl);
      return dataUrl;
    } catch (e) {
      console.warn(`[Cover Gen] Pollinations ${model} failed:`, e);
    }
  }

  // 3. Unique generative SVG — different every time (uses current timestamp)
  console.log("[Cover Gen] Using generative SVG fallback");
  const dataUrl = generateClientSvgCover(item.title, item.type);
  await saveThumbnail(dataUrl);
  return dataUrl;
}



export async function uploadPdfFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ path: string; size: number }> {
  // Emulate progressive loading
  let currentPct = 5;
  onProgress?.(currentPct);
  
  const intervalId = setInterval(() => {
    if (currentPct < 90) {
      currentPct += Math.max(1, Math.floor((90 - currentPct) / 10)); // slower as it gets closer
      onProgress?.(currentPct);
    }
  }, 300);

  const uploadPromise = async () => {
    const { signedUrl, path } = await createUploadUrlServer({
      data: {
        contentType: file.type || "application/pdf",
        fileSize: file.size,
        fileName: file.name,
      },
    });

    const res = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/pdf",
      },
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }

    return { path };
  };

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Upload timed out (30s). Please check your internet connection or verify that the 'library-files' storage bucket exists in your Supabase project.")), 30000)
  );

  try {
    const { path } = await Promise.race([uploadPromise(), timeoutPromise]);
    clearInterval(intervalId);
    
    onProgress?.(100);
    return { path, size: file.size };
  } catch (err) {
    clearInterval(intervalId);
    throw err;
  }
}


export async function getSignedFileUrl(
  path: string,
  expiresIn = 60 * 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
