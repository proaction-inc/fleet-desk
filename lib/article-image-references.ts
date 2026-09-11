import { cleanupStoredArticleImage, type ArticleImageResult } from "./article-images";
import { supabaseAdmin } from "./supabase/client";

type StoredArticleImageLookup =
  | { status: "referenced"; articleId: string }
  | { status: "not_referenced" }
  | { status: "unknown"; error: unknown };

type StoredImage = Pick<ArticleImageResult, "publicUrl">;

async function findStoredArticleImageReference(
  column: "id" | "slug",
  value: string,
  image: StoredImage
): Promise<StoredArticleImageLookup> {
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

export async function recoverArticleInsertWithImage(
  logScope: string,
  article: { slug: string },
  image: ArticleImageResult,
  error: unknown
): Promise<string | null> {
  console.error(`[${logScope}] Insert error:`, error);

  const reference = await findStoredArticleImageReferenceBySlug(article.slug, image);
  if (reference.status === "referenced") {
    console.warn(
      `[${logScope}] Insert returned an error but "${article.slug}" exists with the uploaded image; preserving it`
    );
    return reference.articleId;
  }

  if (reference.status === "unknown") {
    console.error(
      `[${logScope}] Could not verify failed insert for "${article.slug}", preserving uploaded image`,
      reference.error
    );
    return null;
  }

  await cleanupStoredArticleImage(image);
  return null;
}
