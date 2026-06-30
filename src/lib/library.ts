import { supabase } from "@/integrations/supabase/client";

export type ItemType = "paper" | "article" | "video";

export interface LibraryItem {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  type: ItemType;
  domain: string | null;
  created_at: string;
}

export interface DraftItem {
  title: string;
  url: string;
  thumbnail_url: string | null;
  type: ItemType;
  domain: string | null;
}

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
    const data = (await res.json()) as {
      title?: string;
      thumbnail_url?: string;
      author_name?: string;
    };
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
  // Microlink is a free CORS-friendly OG metadata service.
  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      data?: {
        title?: string;
        image?: { url?: string };
        publisher?: string;
      };
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

export async function insertItem(draft: DraftItem): Promise<LibraryItem> {
  const { data, error } = await supabase
    .from("library_items")
    .insert(draft)
    .select()
    .single();
  if (error) throw error;
  return data as LibraryItem;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("library_items").delete().eq("id", id);
  if (error) throw error;
}
