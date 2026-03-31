import { supabaseAdmin } from "./supabase/client";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Track used Unsplash photo URLs to prevent duplicates
const usedPhotoIds = new Set<string>();
// Track used og:image URLs so the same source image isn't reused across articles
const usedOgImages = new Set<string>();

async function loadUsedPhotos(): Promise<void> {
  if (usedPhotoIds.size > 0) return;

  const { data } = await supabaseAdmin
    .from("articles")
    .select("featured_image_url")
    .eq("published", true);

  if (data) {
    for (const row of data) {
      if (row.featured_image_url) {
        usedPhotoIds.add(row.featured_image_url);
      }
    }
  }

  // Load existing og:image mappings from storage to detect reuse
  const { data: objects } = await supabaseAdmin.storage
    .from("article-images")
    .list("articles", { limit: 500 });

  if (objects) {
    // Track file sizes as a proxy for duplicate detection — same file size = same image
    const sizeSeen = new Map<number, string>();
    for (const obj of objects) {
      const size = (obj.metadata as Record<string, unknown>)?.size as number;
      if (size && sizeSeen.has(size)) {
        // This file is likely a duplicate of another
        usedOgImages.add(obj.name);
      }
      if (size) sizeSeen.set(size, obj.name);
    }
  }
}

// ─── OG Image Extraction ──────────────────────────────────────────────────────

/**
 * Extract the og:image from a source article URL.
 * This gets the actual image the publication used for the story.
 */
export async function extractOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TheFleetDesk/1.0; +https://thefleetdesk.com)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Try og:image first
    const ogMatch = html.match(
      /<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i
    );
    if (ogMatch?.[1]) return ogMatch[1];

    // Try reverse order (content before property)
    const ogMatch2 = html.match(
      /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i
    );
    if (ogMatch2?.[1]) return ogMatch2[1];

    // Try twitter:image
    const twitterMatch = html.match(
      /<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i
    );
    if (twitterMatch?.[1]) return twitterMatch[1];

    const twitterMatch2 = html.match(
      /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:image["']/i
    );
    if (twitterMatch2?.[1]) return twitterMatch2[1];

    return null;
  } catch (error) {
    console.log(`[Images] Failed to extract og:image from ${url}:`, error);
    return null;
  }
}

/**
 * Resolve a Google News redirect URL to the actual article URL.
 */
async function resolveGoogleNewsUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TheFleetDesk/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    // The final URL after redirects is the real article
    if (response.url && !response.url.includes("news.google.com")) {
      return response.url;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Try to get an image from source article URLs.
 * Follows Google News redirects and skips already-used images.
 */
export async function getImageFromSources(
  sourceUrls: string[]
): Promise<string | null> {
  for (const url of sourceUrls) {
    // Resolve Google News redirects to actual article URLs
    let resolvedUrl = url;
    if (url.includes("news.google.com")) {
      const resolved = await resolveGoogleNewsUrl(url);
      if (!resolved) continue;
      resolvedUrl = resolved;
      console.log(`[Images] Resolved Google News → ${resolvedUrl.substring(0, 80)}`);
    }

    const ogImage = await extractOgImage(resolvedUrl);
    if (ogImage && ogImage.startsWith("http")) {
      if (usedOgImages.has(ogImage)) {
        console.log(`[Images] Skipping duplicate og:image from ${resolvedUrl}`);
        continue;
      }
      console.log(`[Images] Found unique og:image from ${resolvedUrl}`);
      return ogImage;
    }
  }
  return null;
}

// ─── Main Image Pipeline ──────────────────────────────────────────────────────

/**
 * Find and store an article image. Priority:
 * 1. Extract og:image from source URLs (most relevant)
 * 2. Search Unsplash with keywords (fallback)
 * 3. Hardcoded fallback image (last resort)
 */
export async function findAndStoreArticleImage(
  slug: string,
  searchKeywords: string[],
  sourceUrls?: string[]
): Promise<string> {
  try {
    await loadUsedPhotos();

    let imageUrl: string | null = null;

    // 1. Try og:image from sources first
    if (sourceUrls && sourceUrls.length > 0) {
      imageUrl = await getImageFromSources(sourceUrls);
    }

    // 2. Fall back to Unsplash search
    if (!imageUrl) {
      const query = searchKeywords.join(" ");
      imageUrl = await searchUnsplashUnique(query);
    }

    if (!imageUrl) {
      console.log(`[Images] No image found for "${slug}", using fallback`);
      return getFallbackImage();
    }

    // 3. Download the image
    const imageBuffer = await downloadImage(imageUrl);

    if (!imageBuffer) {
      console.log(`[Images] Failed to download image, using fallback`);
      return getFallbackImage();
    }

    // 4. Upload to Supabase Storage
    const storagePath = `articles/${slug}.jpg`;
    const { error } = await supabaseAdmin.storage
      .from("article-images")
      .upload(storagePath, imageBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error(`[Images] Upload error:`, error);
      return getFallbackImage();
    }

    // 5. Return the permanent public URL and track it
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/article-images/${storagePath}`;
    usedPhotoIds.add(imageUrl);
    usedOgImages.add(imageUrl); // Prevent this og:image from being reused
    console.log(`[Images] Stored image for "${slug}"`);
    return publicUrl;
  } catch (error) {
    console.error(`[Images] Error:`, error);
    return getFallbackImage();
  }
}

// ─── Unsplash Search (fallback) ───────────────────────────────────────────────

async function searchUnsplashUnique(query: string): Promise<string | null> {
  try {
    const randomPage = Math.floor(Math.random() * 5) + 1;

    const params = new URLSearchParams({
      query,
      per_page: "15",
      page: String(randomPage),
      orientation: "landscape",
      content_filter: "high",
    });

    const response = await fetch(
      `https://api.unsplash.com/search/photos?${params}`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.log(`[Images] Unsplash API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    for (const photo of data.results) {
      const url = photo.urls?.regular;
      if (url && !usedPhotoIds.has(url)) {
        return url;
      }
    }

    const randomIdx = Math.floor(Math.random() * data.results.length);
    return data.results[randomIdx]?.urls?.regular ?? null;
  } catch (error) {
    console.error(`[Images] Unsplash search error:`, error);
    return null;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TheFleetDesk/1.0)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export function extractImageKeywords(
  title: string,
  topic: string
): string[] {
  const topicKeywords: Record<string, string> = {
    "Fleet Management & Technology": "fleet truck technology",
    "Regulatory & Compliance": "trucking regulation highway",
    "Fleet Safety": "truck driver safety road",
    "Industry Deals": "business deal transportation",
  };

  const base = topicKeywords[topic] ?? "fleet truck";

  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "as", "is", "are", "was", "were", "be", "been",
    "how", "what", "why", "new", "its", "from", "that", "this", "has",
    "have", "will", "can", "may", "more", "into", "over", "says",
  ]);

  const titleWords = title
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 3);

  return [base, ...titleWords];
}

// Rotating fallback pool — never returns the same image twice in a row
let fallbackIndex = 0;
const FALLBACK_POOL = [
  "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&h=675&fit=crop",
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&h=675&fit=crop",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=675&fit=crop",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=675&fit=crop",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=675&fit=crop",
  "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=675&fit=crop",
  "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&h=675&fit=crop",
  "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=1200&h=675&fit=crop",
  "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1200&h=675&fit=crop",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=675&fit=crop",
];

function getFallbackImage(): string {
  const url = FALLBACK_POOL[fallbackIndex % FALLBACK_POOL.length]!;
  fallbackIndex++;
  return url;
}

export function resetUsedPhotosCache(): void {
  usedPhotoIds.clear();
  usedOgImages.clear();
}
