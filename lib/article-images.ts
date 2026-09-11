import { randomUUID } from "crypto";
import { supabaseAdmin } from "./supabase/client";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const SUPABASE_STORAGE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
).trim();
const IMAGE_UPLOAD_TIMEOUT_MS = 8_000;
const IMAGE_UPLOAD_MIN_BUDGET_MS = 2_500;
const IMAGE_CLEANUP_TIMEOUT_MS = 2_000;

// Track used source image URLs to prevent the same photo appearing on multiple articles
const usedSourceImages = new Set<string>();
let cacheLoaded = false;

export interface ArticleImageResult {
  publicUrl: string;
  sourceImageUrl: string | null;
  storagePath: string | null;
}

function fallbackImageResult(): ArticleImageResult {
  return {
    publicUrl: getFallbackImage(),
    sourceImageUrl: null,
    storagePath: null,
  };
}

function remainingDeadlineMs(deadlineMs?: number): number {
  return deadlineMs ? deadlineMs - Date.now() : Number.POSITIVE_INFINITY;
}

function hasDeadlineBudget(deadlineMs: number | undefined, minimumMs: number): boolean {
  return remainingDeadlineMs(deadlineMs) >= minimumMs;
}

function requestTimeoutMs(deadlineMs: number | undefined, fallbackMs: number): number {
  const remaining = remainingDeadlineMs(deadlineMs);
  if (!Number.isFinite(remaining)) return fallbackMs;

  return Math.max(1, Math.min(fallbackMs, remaining - 500));
}

function storageObjectUrl(storagePath?: string): string {
  const encodedPath = storagePath
    ?.split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return encodedPath
    ? `${SUPABASE_URL}/storage/v1/object/article-images/${encodedPath}`
    : `${SUPABASE_URL}/storage/v1/object/article-images`;
}

function articleImageStoragePath(slug: string): string {
  return `articles/${slug}-${randomUUID()}.jpg`;
}

async function uploadArticleImage(
  storagePath: string,
  imageBuffer: Buffer,
  deadlineMs?: number
): Promise<boolean> {
  try {
    if (!hasDeadlineBudget(deadlineMs, IMAGE_UPLOAD_MIN_BUDGET_MS)) return false;

    const response = await fetch(storageObjectUrl(storagePath), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_STORAGE_KEY}`,
        apikey: SUPABASE_STORAGE_KEY,
        "cache-control": "max-age=3600",
        "content-type": "image/jpeg",
        "x-upsert": "false",
      },
      body: imageBuffer as unknown as BodyInit,
      signal: AbortSignal.timeout(requestTimeoutMs(deadlineMs, IMAGE_UPLOAD_TIMEOUT_MS)),
    });

    if (!response.ok) {
      console.error(`[Images] Upload error: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[Images] Upload error:`, error);
    return false;
  }
}

async function removeStoredArticleImage(storagePath: string): Promise<void> {
  try {
    // Supabase storage-js removes objects with DELETE /object/{bucket}
    // and a { prefixes } body; use direct fetch here to keep a cleanup timeout.
    const response = await fetch(storageObjectUrl(), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SUPABASE_STORAGE_KEY}`,
        apikey: SUPABASE_STORAGE_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ prefixes: [storagePath] }),
      signal: AbortSignal.timeout(IMAGE_CLEANUP_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[Images] Cleanup error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`[Images] Cleanup error:`, error);
  }
}

export async function cleanupStoredArticleImage(
  image: Pick<ArticleImageResult, "storagePath">
): Promise<void> {
  if (!image.storagePath) return;
  await removeStoredArticleImage(image.storagePath);
}

async function loadUsedPhotos(): Promise<void> {
  if (cacheLoaded) return;

  // Load all source_image_url values from existing articles — this is the
  // authoritative record of which original images have already been used
  const { data } = await supabaseAdmin
    .from("articles")
    .select("source_image_url")
    .eq("published", true)
    .not("source_image_url", "is", null);

  if (data) {
    for (const row of data) {
      if (row.source_image_url) {
        usedSourceImages.add(row.source_image_url);
      }
    }
  }

  console.log(`[Images] Loaded ${usedSourceImages.size} previously-used source images`);
  cacheLoaded = true;
}

// ─── OG Image Extraction ──────────────────────────────────────────────────────

/**
 * Extract the og:image from a source article URL.
 * This gets the actual image the publication used for the story.
 */
export async function extractOgImage(
  url: string,
  deadlineMs?: number
): Promise<string | null> {
  try {
    if (!hasDeadlineBudget(deadlineMs, 1_500)) return null;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TheFleetDesk/1.0; +https://thefleetdesk.com)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(requestTimeoutMs(deadlineMs, 10_000)),
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
async function resolveGoogleNewsUrl(
  url: string,
  deadlineMs?: number
): Promise<string | null> {
  try {
    if (!hasDeadlineBudget(deadlineMs, 1_500)) return null;

    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TheFleetDesk/1.0)" },
      signal: AbortSignal.timeout(requestTimeoutMs(deadlineMs, 10_000)),
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
  sourceUrls: string[],
  deadlineMs?: number
): Promise<string | null> {
  for (const url of sourceUrls) {
    if (!hasDeadlineBudget(deadlineMs, 2_500)) return null;

    // Resolve Google News redirects to actual article URLs
    let resolvedUrl = url;
    if (url.includes("news.google.com")) {
      const resolved = await resolveGoogleNewsUrl(url, deadlineMs);
      if (!resolved) continue;
      resolvedUrl = resolved;
      console.log(`[Images] Resolved Google News → ${resolvedUrl.substring(0, 80)}`);
    }

    const ogImage = await extractOgImage(resolvedUrl, deadlineMs);
    if (ogImage && ogImage.startsWith("http")) {
      // Normalize URL for comparison (strip query params/resize directives)
      const normalizedOg = ogImage.split("?")[0]!;
      if (usedSourceImages.has(normalizedOg)) {
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
 *
 * Returns the public URL plus storage path so callers can delete the
 * uploaded object if the article write later fails.
 */
export async function findAndStoreArticleImage(
  slug: string,
  searchKeywords: string[],
  sourceUrls?: string[],
  deadlineMs?: number
): Promise<ArticleImageResult> {
  try {
    if (!hasDeadlineBudget(deadlineMs, 2_500)) {
      console.log(`[Images] Deadline too close for "${slug}", using fallback`);
      return fallbackImageResult();
    }

    await loadUsedPhotos();
    if (!hasDeadlineBudget(deadlineMs, 2_500)) {
      console.log(`[Images] Deadline too close after loading image cache for "${slug}", using fallback`);
      return fallbackImageResult();
    }

    let imageUrl: string | null = null;

    // 1. Try og:image from sources first
    if (sourceUrls && sourceUrls.length > 0) {
      imageUrl = await getImageFromSources(sourceUrls, deadlineMs);
    }

    // 2. Fall back to Unsplash search
    if (!imageUrl && hasDeadlineBudget(deadlineMs, 3_000)) {
      const query = searchKeywords.join(" ");
      imageUrl = await searchUnsplashUnique(query, deadlineMs);
    }

    if (!imageUrl) {
      console.log(`[Images] No image found for "${slug}", using fallback`);
      return fallbackImageResult();
    }

    // 3. Download the image
    const imageBuffer = await downloadImage(imageUrl, deadlineMs);

    if (!imageBuffer) {
      console.log(`[Images] Failed to download image, using fallback`);
      return fallbackImageResult();
    }

    if (!hasDeadlineBudget(deadlineMs, 2_000)) {
      console.log(`[Images] Deadline too close to upload image for "${slug}", using fallback`);
      return fallbackImageResult();
    }

    // 4. Upload to Supabase Storage
    const storagePath = articleImageStoragePath(slug);
    const uploaded = await uploadArticleImage(storagePath, imageBuffer, deadlineMs);

    if (!uploaded) {
      return fallbackImageResult();
    }

    if (!hasDeadlineBudget(deadlineMs, 500)) {
      console.log(`[Images] Deadline passed after image upload for "${slug}", removing stored image`);
      await removeStoredArticleImage(storagePath);
      return fallbackImageResult();
    }

    // 5. Track the source URL (normalized) so it won't be reused
    const normalizedSource = imageUrl.split("?")[0]!;
    usedSourceImages.add(normalizedSource);

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/article-images/${storagePath}`;
    console.log(`[Images] Stored image for "${slug}"`);
    return { publicUrl, sourceImageUrl: normalizedSource, storagePath };
  } catch (error) {
    console.error(`[Images] Error:`, error);
    return fallbackImageResult();
  }
}

// ─── Unsplash Search (fallback) ───────────────────────────────────────────────

async function searchUnsplashUnique(
  query: string,
  deadlineMs?: number
): Promise<string | null> {
  try {
    if (!hasDeadlineBudget(deadlineMs, 1_500)) return null;

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
        signal: AbortSignal.timeout(requestTimeoutMs(deadlineMs, 10_000)),
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
      if (url && !usedSourceImages.has(url.split("?")[0]!)) {
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

async function downloadImage(
  url: string,
  deadlineMs?: number
): Promise<Buffer | null> {
  try {
    if (!hasDeadlineBudget(deadlineMs, 1_500)) return null;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TheFleetDesk/1.0)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(requestTimeoutMs(deadlineMs, 15_000)),
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
    "Fleet Management & Technology": "fleet vehicles management technology",
    "Regulatory & Compliance": "transportation regulation compliance",
    "Fleet Safety": "fleet driver safety vehicles",
    "Industry Deals": "business deal transportation",
    "Industry Events": "fleet conference expo",
    "Electric & Alternative Fuel": "electric vehicle fleet charging",
  };

  const base = topicKeywords[topic] ?? "fleet vehicles";

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
  usedSourceImages.clear();
  cacheLoaded = false;
}
