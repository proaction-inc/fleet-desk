import { supabaseAdmin } from "./supabase/client";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Find a relevant image for an article, download it, and store it permanently
 * in Supabase Storage. Returns the public URL.
 *
 * Flow:
 * 1. Search Unsplash with article-specific keywords
 * 2. Download the best match
 * 3. Upload to Supabase Storage (article-images bucket)
 * 4. Return the permanent public URL
 */
export async function findAndStoreArticleImage(
  slug: string,
  searchKeywords: string[]
): Promise<string> {
  try {
    // 1. Search Unsplash
    const query = searchKeywords.join(" ");
    const imageUrl = await searchUnsplash(query);

    if (!imageUrl) {
      console.log(`[Images] No Unsplash result for "${query}", using fallback`);
      return getFallbackImage();
    }

    // 2. Download the image
    const imageBuffer = await downloadImage(imageUrl);

    if (!imageBuffer) {
      console.log(`[Images] Failed to download image, using fallback`);
      return getFallbackImage();
    }

    // 3. Upload to Supabase Storage
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

    // 4. Return the permanent public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/article-images/${storagePath}`;
    console.log(`[Images] Stored image for "${slug}" at ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(`[Images] Error:`, error);
    return getFallbackImage();
  }
}

/**
 * Search Unsplash for a relevant image.
 * Returns the raw download URL of the best match.
 */
async function searchUnsplash(query: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      query,
      per_page: "1",
      orientation: "landscape",
      content_filter: "high",
    });

    const response = await fetch(
      `https://api.unsplash.com/search/photos?${params}`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
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

    // Use the "regular" size (1080px wide) — good balance of quality and size
    const photo = data.results[0];
    return photo.urls?.regular ?? null;
  } catch (error) {
    console.error(`[Images] Unsplash search error:`, error);
    return null;
  }
}

/**
 * Download an image and return it as a Buffer.
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/**
 * Generate image search keywords from article title and topic.
 * Called by Claude as part of synthesis — but we also have a fallback
 * that extracts keywords from the title.
 */
export function extractImageKeywords(
  title: string,
  topic: string
): string[] {
  // Base keywords from topic
  const topicKeywords: Record<string, string> = {
    "Fleet Management & Technology": "fleet truck technology",
    "Regulatory & Compliance": "trucking regulation highway",
    "Fleet Safety": "truck driver safety road",
    "Industry Deals": "business deal transportation",
  };

  const base = topicKeywords[topic] ?? "fleet truck";

  // Extract meaningful words from title (skip common words)
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

/**
 * Fallback image — a reliable, generic fleet image stored directly
 * in Supabase Storage. We upload it once on first use.
 */
function getFallbackImage(): string {
  // Use a known working Unsplash URL as fallback
  return "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&h=675&fit=crop";
}
