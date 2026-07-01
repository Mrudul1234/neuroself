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
  let initialTitle = og?.title || domain || url;

  // Use Claude via Pollinations Text API to craft a short, elegant, academic title based on initial scrapped title
  try {
    const prompt = `You are a professional research librarian. Clean and refine the following web title/header into a beautiful, short, readable content title suitable for an academic library database. Focus on capturing the core subject (especially neuroscience, brain structure, medicine, or technology). 
Rules:
- Remove site names, prefixes (e.g. "YouTube", "Medium", blog author names).
- Maximum 8-12 words, elegant phrasing.
- Return ONLY the clean, refined title. No explanation, no quotes.

Raw Title: "${initialTitle}"`;

    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a professional research librarian." },
          { role: "user", content: prompt }
        ],
        model: "claude-fast",
        seed: Math.floor(Math.random() * 9999),
        jsonMode: false
      })
    });

    if (res.ok) {
      const refinedTitle = await res.text();
      if (refinedTitle && refinedTitle.trim()) {
        initialTitle = refinedTitle.trim().replace(/^"|"$/g, "");
      }
    }
  } catch (err) {
    console.warn("[detectMetadata] Title refinement with Claude skipped:", err);
  }

  return {
    title: initialTitle,
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

// ─── Topic → Visual concept mapping ────────────────────────────────────────
// Each entry: keywords that trigger it → [visual scene, color mood, art style]
const TOPIC_VISUALS: Array<{
  keywords: string[];
  scenes: string[];
  mood: string;
  style: string;
}> = [
  {
    keywords: ["brain", "neural", "neuron", "neuro", "cortex", "synapse", "cognitive", "cerebral", "hippocampus", "axon", "dendrite", "thalamus", "amygdala", "prefrontal"],
    scenes: [
      "a luminous human brain with electric synapses firing between neurons, glowing blue tendrils of light branching through dark space",
      "a cross-section of the brain with labelled regions glowing in distinct colors, like a medical atlas come to life",
      "an abstract neural network of pulsing nodes and silver threads forming the shape of a human head",
      "neurons firing in slow-motion, each synapse sparking gold against deep indigo darkness",
    ],
    mood: "deep indigo and electric cyan, luminous and scientific",
    style: "vintage scientific illustration with dramatic bioluminescent glow",
  },
  {
    keywords: ["muscle", "motor", "movement", "transcranial", "evoked", "response", "stimulation", "tms", "emg", "electromyography", "reflex", "spinal"],
    scenes: [
      "detailed anatomical illustration of muscle fibers with electrical impulse waves traveling through them",
      "a glowing human figure mid-movement with motor pathways lit up from brain to muscle",
      "electromagnetic waves emanating from a coil above a cross-section of the skull into brain tissue below",
      "a network of spinal cord neurons connecting to muscle bundles, rendered as flowing light threads",
    ],
    mood: "warm amber and gold on deep charcoal, clinical yet dramatic",
    style: "hyper-detailed medical illustration, engraving style",
  },
  {
    keywords: ["programming", "oop", "object", "software", "code", "algorithm", "data structure", "class", "function", "computer", "python", "java", "c++", "javascript"],
    scenes: [
      "cascading lines of glowing green code forming a 3D geometric structure in a dark terminal",
      "abstract floating geometric shapes connected by light beams — representing objects and inheritance",
      "a circuit board landscape stretching to the horizon, with logic gates as glowing monuments",
      "binary streams flowing like rivers through a neon-lit digital cityscape",
    ],
    mood: "neon green on pitch black, matrix-inspired",
    style: "cyberpunk digital art with glowing circuit aesthetics",
  },
  {
    keywords: ["machine learning", "deep learning", "artificial intelligence", "ai", "neural network", "model", "training", "gradient", "transformer", "gpt", "llm"],
    scenes: [
      "an abstract neural network with hundreds of layers glowing in gradient colors from blue to violet",
      "a robot hand reaching toward a human hand across a bridge of data streams",
      "a vast digital space filled with floating geometric shapes being sorted by invisible forces",
      "a glowing matrix of connections forming the shape of a human brain mid-computation",
    ],
    mood: "electric purple and cerulean blue, futuristic",
    style: "digital concept art, Syd Mead inspired futurism",
  },
  {
    keywords: ["physics", "quantum", "relativity", "particle", "wave", "field", "energy", "force", "gravity", "spacetime", "photon", "electron", "atom"],
    scenes: [
      "a particle collision visualization with spiraling energy trails in a bubble chamber",
      "spacetime fabric warped around a massive glowing sphere, grid lines bending dramatically",
      "an atom with electron clouds as soft glowing halos orbiting a luminous nucleus",
      "quantum wave interference patterns radiating outward in concentric rings of color",
    ],
    mood: "cosmic midnight blue with atomic gold, vast and precise",
    style: "scientific poster art, Feynman diagram aesthetic",
  },
  {
    keywords: ["biology", "cell", "dna", "genetics", "gene", "protein", "evolution", "organism", "species", "molecular", "biochem", "enzyme", "rna", "chromosome"],
    scenes: [
      "a glowing double helix of DNA unspooling against a microscopic cellular backdrop",
      "a single cell magnified 10,000x showing organelles as glowing islands in a transparent sea",
      "an evolutionary tree branching outward from a central glowing node into species silhouettes",
      "proteins folding in space like origami, each crease glowing with molecular energy",
    ],
    mood: "bioluminescent green and cobalt on deep black",
    style: "electron microscope aesthetic meets scientific watercolor",
  },
  {
    keywords: ["chemistry", "reaction", "molecule", "compound", "element", "periodic", "bond", "organic", "synthesis", "catalyst", "polymer", "acid", "base"],
    scenes: [
      "glass laboratory flasks glowing with colorful chemical reactions, steam rising dramatically",
      "molecular bond structures floating in space like constellations, each atom a glowing sphere",
      "a periodic table element magnified into an abstract landscape of protons and neutrons",
      "chemical reaction equations transforming into flowing rivers of colored liquid light",
    ],
    mood: "vivid jewel tones — emerald, amber, crimson — on dark slate",
    style: "Art Nouveau scientific poster with ornamental borders",
  },
  {
    keywords: ["psychology", "mental", "mind", "behavior", "emotion", "therapy", "cognitive", "perception", "memory", "consciousness", "freud", "jung"],
    scenes: [
      "a human silhouette made of layered transparent glass, each layer showing a different emotional state",
      "a surreal landscape inside a human head — mountains of memory, rivers of thought",
      "a Rorschach-inspired symmetrical ink pattern revealing hidden faces and figures",
      "two faces in profile forming a vase between them, rendered in dramatic chiaroscuro",
    ],
    mood: "deep burgundy and ivory, psychoanalytic and mysterious",
    style: "surrealist collage in the style of René Magritte",
  },
  {
    keywords: ["mathematics", "math", "calculus", "equation", "theorem", "proof", "geometry", "topology", "algebra", "statistics", "probability", "fractal"],
    scenes: [
      "the Mandelbrot fractal zooming infinitely inward, rendered in electric teal and gold",
      "a golden ratio spiral sweeping across the canvas with Fibonacci numbers as architectural arches",
      "a 3D graph of a complex equation forming a mountain range of mathematical beauty",
      "geometric Platonic solids floating and rotating in a misty space, perfectly lit",
    ],
    mood: "gold and midnight blue, elegant and infinite",
    style: "Bauhaus geometric design meets mathematical visualization",
  },
  {
    keywords: ["history", "ancient", "war", "empire", "civilization", "medieval", "century", "historical", "archaeology", "artifact", "monument"],
    scenes: [
      "ancient ruins emerging from mist at dawn, golden light catching weathered stone columns",
      "a map of an ancient civilization with illustrated sea monsters, ships, and trade routes",
      "artifacts from a lost civilization arranged as a still life, dramatically lit",
      "a timeline rendered as a flowing river through different historical eras",
    ],
    mood: "sepia, parchment, aged gold — timeless and weathered",
    style: "vintage cartographic illustration with ornate borders",
  },
  {
    keywords: ["climate", "environment", "ecology", "nature", "earth", "atmosphere", "carbon", "energy", "renewable", "sustainability", "ocean", "forest"],
    scenes: [
      "the Earth from orbit with swirling storm systems lit by golden sunlight",
      "a split world: one half thriving green forest, the other barren industrial wasteland",
      "deep ocean currents visualized as glowing blue rivers flowing through dark water",
      "a single towering tree whose roots are the planet and whose canopy is the sky",
    ],
    mood: "rich emerald and ocean blue, urgent and alive",
    style: "watercolor naturalist illustration, Audubon meets data visualization",
  },
  {
    keywords: ["economics", "market", "finance", "trade", "business", "growth", "inflation", "gdp", "supply", "demand", "investment", "wealth"],
    scenes: [
      "stock market data streams rendered as a luminous cityscape at night",
      "abstract flowing curves of supply and demand intersecting like rivers from above",
      "a world map with glowing trade routes connecting continents like a living circuit",
      "golden coins and abstract financial graphs forming a geometric still life",
    ],
    mood: "gold and deep navy, powerful and precise",
    style: "Swiss modernist infographic poster with bold geometric shapes",
  },
  {
    keywords: ["philosophy", "ethics", "logic", "existence", "consciousness", "truth", "knowledge", "reality", "metaphysics", "epistemology"],
    scenes: [
      "a figure standing at the edge of a cliff overlooking an infinite starfield below",
      "Platonic cave with shadows on the wall and a blinding light at the entrance",
      "an Escher-like impossible staircase leading to a glowing portal of understanding",
      "two mirrors facing each other creating infinite reflections of a single candle flame",
    ],
    mood: "deep charcoal and ivory, contemplative and timeless",
    style: "classical oil painting meets geometric abstraction",
  },
  {
    keywords: ["astronomy", "space", "cosmos", "galaxy", "star", "planet", "universe", "black hole", "nebula", "orbit", "telescope", "solar"],
    scenes: [
      "a nebula in the shape of a human eye looking back at the viewer, vivid in pinks and blues",
      "a black hole bending spacetime with accretion disk glowing in orange and gold",
      "multiple planets in orbital alignment, each with distinct atmospheric color bands",
      "a telescope pointed at a galaxy, with the galaxy reflected in the lens",
    ],
    mood: "cosmic midnight blue, violet, and stellar gold",
    style: "NASA concept art meets retro space poster illustration",
  },
  {
    keywords: ["language", "linguistics", "speech", "communication", "text", "writing", "literature", "poetry", "narrative", "grammar", "semantics"],
    scenes: [
      "thousands of letters from different alphabets swirling together to form a human face",
      "a quill pen writing on parchment with the ink transforming into a landscape",
      "overlapping speech bubbles from different languages forming a mosaic portrait",
      "a book open to pages that transform into a flock of birds taking flight",
    ],
    mood: "warm sepia and deep ink blue, literary and rich",
    style: "elegant engraving with Art Nouveau letterform decoration",
  },
  {
    keywords: ["medicine", "health", "disease", "anatomy", "clinical", "patient", "surgery", "diagnosis", "treatment", "pharmaceutical", "virus", "immune"],
    scenes: [
      "a transparent human body with glowing organs, arteries as rivers of light",
      "antibodies attacking a virus, rendered as medieval knights fighting abstract monsters",
      "a cross-section of human anatomy drawn as a gorgeous scientific diagram",
      "medical instruments arranged as a still life with dramatic Rembrandt lighting",
    ],
    mood: "clinical white and arterial red with deep shadow",
    style: "hyper-detailed medical engraving in Vesalius style",
  },
];

const FALLBACK_ART_STYLES = [
  "risograph print, grainy two-tone texture",
  "vintage scientific illustration, ink etching on aged paper",
  "Japanese woodblock print, flat bold colors",
  "watercolor wash, soft bleeding edges on textured paper",
  "Bauhaus geometric design, primary colors, industrial feel",
  "surrealist collage, dreamlike unexpected imagery",
  "linocut print, bold black lines, limited palette",
  "cyberpunk neon, glowing lines on dark background",
];

/**
 * Smart prompt builder — analyses the title word-by-word, finds the best
 * matching topic cluster, picks a vivid scene, and crafts a cinematically
 * rich prompt that is unique every call (timestamp-seeded).
 */
function buildCoverPrompt(item: LibraryItem): { prompt: string; seed: number } {
  const seed = Math.abs((Date.now() ^ (Math.random() * 0xffffffff)) | 0);
  const rng = (n: number, s = seed) => Math.abs(s) % n;

  const titleLower = item.title.toLowerCase();
  const domainLower = (item.domain ?? "").toLowerCase();
  const combined = `${titleLower} ${domainLower}`;

  // Score each topic cluster by how many keywords match the title
  let bestMatch = { score: 0, idx: -1 };
  TOPIC_VISUALS.forEach((topic, idx) => {
    const score = topic.keywords.filter((kw) => combined.includes(kw)).length;
    if (score > bestMatch.score) bestMatch = { score, idx };
  });

  let scene: string;
  let mood: string;
  let style: string;

  if (bestMatch.idx >= 0) {
    const topic = TOPIC_VISUALS[bestMatch.idx];
    scene = topic.scenes[rng(topic.scenes.length, seed ^ 0xdeadbeef)];
    mood = topic.mood;
    style = topic.style;
  } else {
    // Generic fallback — still content-aware via title keywords
    const keyWords = item.title
      .replace(/[^a-zA-Z ]/g, " ")
      .split(" ")
      .filter((w) => w.length > 4)
      .slice(0, 4)
      .join(", ");
    scene = keyWords
      ? `an abstract symbolic artwork representing the concept of ${keyWords}`
      : "an open book radiating light in a dramatic dark space";
    mood = "rich and editorial, deep contrast";
    style = FALLBACK_ART_STYLES[rng(FALLBACK_ART_STYLES.length)];
  }

  // Add type-specific framing
  const typeFrame =
    item.type === "video"
      ? "Cinematic widescreen composition, film grain overlay."
      : item.type === "article"
        ? "Editorial magazine cover layout, strong focal point."
        : "Academic book cover composition, portrait 2:3 ratio.";

  const prompt = [
    `${scene}.`,
    `Art style: ${style}.`,
    `Color palette: ${mood}.`,
    typeFrame,
    "Extremely detailed, award-winning illustration.",
    "No text, no letters, no words, no watermarks, no logos.",
  ].join(" ");

  return { prompt, seed: seed % 99999 };
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
