import type { ArticleImageResult } from "./article-images";
import { supabaseAdmin } from "./supabase/client";

type StoredArticleImageLookup =
  | { status: "referenced"; articleId: string }
  | { status: "not_referenced" }
  | { status: "unknown"; error: unknown };

type StoredImage = Pick<ArticleImageResult, "publicUrl" | "storagePath">;

async function findStoredArticleImageReference(
  column: "id" | "slug",
  value: string,
  image: StoredImage
): Promise<StoredArticleImageLookup> {
  if (!image.storagePath) {
    return { status: "not_referenced" };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("articles")
      .select("id")
      .eq(column, value)
      .eq("featured_image_url", image.publicUrl)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { status: "unknown", error };
    }

    return data?.id
      ? { status: "referenced", articleId: data.id }
      : { status: "not_referenced" };
  } catch (error) {
    return { status: "unknown", error };
  }
}

export function findStoredArticleImageReferenceBySlug(
  slug: string,
  image: StoredImage
): Promise<StoredArticleImageLookup> {
  return findStoredArticleImageReference("slug", slug, image);
}

export function findStoredArticleImageReferenceById(
  id: string,
  image: StoredImage
): Promise<StoredArticleImageLookup> {
  return findStoredArticleImageReference("id", id, image);
}
