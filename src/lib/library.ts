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

export async function generateCover(item: LibraryItem): Promise<string> {
  const kind =
    item.type === "video"
      ? "cinematic minimalist thumbnail"
      : item.type === "article"
        ? "editorial magazine cover"
        : "scholarly book cover";

  const prompt = `Design a ${kind} for a saved item titled "${item.title}"${
    item.domain ? ` from ${item.domain}` : ""
  }. Vertical 2:3 portrait aspect. Warm cream paper background, soft grain texture, muted amber and deep teal accents, elegant italic serif typography with the title visible and legible. Editorial, tactile, understated, no logos, no watermarks, no photorealistic faces.`;

  // 1. Try Puter.js — free, runs in the browser, no API key needed
  try {
    const { puter } = await import("@heyputer/puter.js");
    console.log("[Cover Gen] Trying Puter.js (free AI image generation)…");
    const img = await (puter.ai as any).txt2img(prompt) as HTMLImageElement;
    const dataUrl = await imgElementToDataUrl(img);
    await updateItem(item.id, { thumbnail_url: dataUrl });
    return dataUrl;
  } catch (puterErr) {
    console.warn("[Cover Gen] Puter.js failed, falling back to server API:", puterErr);
  }

  // 2. Fall back to server-side API (OpenAI / Gemini / Lovable / SVG)
  const res = await fetch("/api/generate-cover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: item.title,
      type: item.type,
      domain: item.domain,
    }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `Cover generation failed (${res.status})`);
  }
  const { dataUrl } = (await res.json()) as { dataUrl: string };
  await updateItem(item.id, { thumbnail_url: dataUrl });
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
