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

/** Generate an elegant SVG cover client-side — always works, no API key needed */
function generateClientSvgCover(title: string, type?: string): string {
  const palettes = [
    { bg: "#fffaf0", accent: "#c8a96e", text: "#1c1410" },
    { bg: "#f0f4ff", accent: "#6e8ec8", text: "#0e1420" },
    { bg: "#f0fff4", accent: "#6ec8a9", text: "#0e2018" },
    { bg: "#fff0f4", accent: "#c86e8e", text: "#200e14" },
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  const p = palettes[Math.abs(hash) % palettes.length];
  const words = title.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 16) { lines.push(cur.trim()); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur.trim());
  const display = lines.slice(0, 5);
  const totalH = display.length * 36;
  const startY = 280 - totalH / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 480" width="320" height="480">
    <rect width="320" height="480" fill="${p.bg}"/>
    <rect x="16" y="16" width="288" height="448" fill="none" stroke="${p.accent}" stroke-width="1.5" opacity="0.5"/>
    <rect x="22" y="22" width="276" height="436" fill="none" stroke="${p.accent}" stroke-width="0.5" opacity="0.3"/>
    <circle cx="160" cy="380" r="40" fill="${p.accent}" opacity="0.12"/>
    <text x="160" y="64" font-family="Georgia,serif" font-size="9" font-weight="bold" letter-spacing="0.18em" fill="${p.accent}" text-anchor="middle" opacity="0.8">${(type ?? "item").toUpperCase()}</text>
    ${display.map((line, i) => `<text x="160" y="${startY + i * 36}" font-family="Georgia,serif" font-size="22" font-weight="normal" fill="${p.text}" text-anchor="middle">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>`).join("")}
    <line x1="140" y1="440" x2="180" y2="440" stroke="${p.accent}" stroke-width="1" opacity="0.4"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/** Load an image via <img> tag (bypasses CORS fetch restrictions) and convert to dataUrl */
function loadImageViaTag(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timeout = setTimeout(() => reject(new Error("Image load timeout")), 20000);
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
  const kind =
    item.type === "video" ? "cinematic minimalist thumbnail"
    : item.type === "article" ? "editorial magazine cover"
    : "scholarly book cover";

  const prompt = `${kind}: "${item.title}"${item.domain ? ` from ${item.domain}` : ""}. Warm cream paper background, elegant serif typography, editorial minimal style, no logos`;

  /** Save thumbnail directly with anon client (no service role key needed) */
  const saveThumbnail = async (dataUrl: string) => {
    await supabase.from("library_items").update({ thumbnail_url: dataUrl }).eq("id", item.id);
  };

  // 1. Try Puter.js — free, user signs in once via popup
  try {
    const puter = (window as any).puter;
    if (puter?.ai?.txt2img) {
      console.log("[Cover Gen] Trying Puter.js…");
      const img = await puter.ai.txt2img(prompt) as HTMLImageElement;
      const dataUrl = await imgElementToDataUrl(img);
      await saveThumbnail(dataUrl);
      return dataUrl;
    }
  } catch (e) {
    console.warn("[Cover Gen] Puter.js failed:", e);
  }

  // 2. Try Pollinations.ai via img tag (free, no API key)
  try {
    console.log("[Cover Gen] Trying Pollinations.ai…");
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 99999);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=768&seed=${seed}&nologo=true&model=flux`;
    const dataUrl = await loadImageViaTag(pollinationsUrl);
    await saveThumbnail(dataUrl);
    return dataUrl;
  } catch (e) {
    console.warn("[Cover Gen] Pollinations failed:", e);
  }

  // 3. Guaranteed client-side SVG — always works, no API key needed
  console.log("[Cover Gen] Using SVG fallback");
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
